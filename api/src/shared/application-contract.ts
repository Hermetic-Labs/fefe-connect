import { HttpError } from "./errors";
import { isUuid } from "./domain";

export type ProfessionalType = "legal" | "mental-health";
export type MembershipPlan = "individual_monthly" | "organization_monthly";

export interface PolicyVersions {
  terms: string;
  privacy: string;
  intended_use: string;
  verification: string;
}

export interface ApplicationSubmission {
  contract_version: "1.0.0";
  application_id: string;
  professional_type: ProfessionalType;
  plan_key: MembershipPlan;
  first_name: string;
  last_name: string;
  email: string;
  organization: string;
  jurisdiction: string;
  credential_number: string;
  website?: string;
  headline: string;
  bio: string;
  specialties: string[];
  endorsement?: string;
  policy_versions: PolicyVersions;
  attestations: {
    accuracy: true;
    terms: true;
    privacy: true;
    intended_use: true;
    verification: true;
  };
}

const topLevelFields = new Set([
  "contract_version",
  "professional_type",
  "plan_key",
  "first_name",
  "last_name",
  "email",
  "organization",
  "jurisdiction",
  "credential_number",
  "website",
  "headline",
  "bio",
  "specialties",
  "endorsement",
  "policy_versions",
  "attestations",
]);

function objectValue(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "invalid_application", `${field} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function textValue(value: unknown, field: string, minimum: number, maximum: number): string {
  if (typeof value !== "string") throw new HttpError(400, "invalid_application", `${field} is required.`);
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < minimum || normalized.length > maximum) {
    throw new HttpError(400, "invalid_application", `${field} must contain between ${minimum} and ${maximum} characters.`);
  }
  return normalized;
}

function optionalText(value: unknown, field: string, maximum: number): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return textValue(value, field, 2, maximum);
}

function exactKeys(value: Record<string, unknown>, expected: Set<string>, field: string): void {
  if (Object.keys(value).some((key) => !expected.has(key))) {
    throw new HttpError(400, "invalid_application", `${field} contains an unsupported field.`);
  }
}

export function parseApplicationSubmission(
  applicationId: string,
  input: unknown,
  expectedPolicies: PolicyVersions,
): ApplicationSubmission {
  if (!isUuid(applicationId)) throw new HttpError(400, "invalid_application", "A valid application ID is required.");
  const body = objectValue(input, "Application");
  exactKeys(body, topLevelFields, "Application");
  if (body.contract_version !== "1.0.0") {
    throw new HttpError(409, "unsupported_contract", "Refresh the application before submitting.");
  }
  if (body.professional_type !== "legal" && body.professional_type !== "mental-health") {
    throw new HttpError(400, "invalid_application", "Choose a supported professional path.");
  }
  if (body.plan_key !== "individual_monthly" && body.plan_key !== "organization_monthly") {
    throw new HttpError(400, "invalid_application", "Choose a supported membership plan.");
  }

  const email = textValue(body.email, "Professional email", 5, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, "invalid_application", "Enter a valid professional email address.");
  }
  const website = optionalText(body.website, "Professional website", 300);
  if (website) {
    try {
      if (new URL(website).protocol !== "https:") throw new Error("HTTPS required");
    } catch {
      throw new HttpError(400, "invalid_application", "Professional website must be a valid HTTPS URL.");
    }
  }

  if (!Array.isArray(body.specialties) || body.specialties.length < 1 || body.specialties.length > 12) {
    throw new HttpError(400, "invalid_application", "Provide between 1 and 12 professional specialties.");
  }
  const specialties = [...new Set(body.specialties.map((item) => textValue(item, "Specialty", 2, 60)))];

  const policyObject = objectValue(body.policy_versions, "Policy versions");
  exactKeys(policyObject, new Set(["terms", "privacy", "intended_use", "verification"]), "Policy versions");
  const policyVersions = {
    terms: textValue(policyObject.terms, "Terms version", 8, 32),
    privacy: textValue(policyObject.privacy, "Privacy version", 8, 32),
    intended_use: textValue(policyObject.intended_use, "Intended-use version", 8, 32),
    verification: textValue(policyObject.verification, "Verification version", 8, 32),
  };
  if (Object.entries(expectedPolicies).some(([key, value]) => policyVersions[key as keyof PolicyVersions] !== value)) {
    throw new HttpError(409, "stale_policy", "One or more policies changed. Refresh and review them before submitting.");
  }

  const attestations = objectValue(body.attestations, "Attestations");
  const attestationKeys = new Set(["accuracy", "terms", "privacy", "intended_use", "verification"]);
  exactKeys(attestations, attestationKeys, "Attestations");
  if ([...attestationKeys].some((key) => attestations[key] !== true)) {
    throw new HttpError(400, "consent_required", "All required attestations must be accepted.");
  }

  return {
    contract_version: "1.0.0",
    application_id: applicationId,
    professional_type: body.professional_type,
    plan_key: body.plan_key,
    first_name: textValue(body.first_name, "First name", 1, 80),
    last_name: textValue(body.last_name, "Last name", 1, 80),
    email,
    organization: textValue(body.organization, "Organization", 2, 160),
    jurisdiction: textValue(body.jurisdiction, "Licensing jurisdiction", 2, 80),
    credential_number: textValue(body.credential_number, "Credential number", 2, 100),
    website,
    headline: textValue(body.headline, "Professional headline", 5, 90),
    bio: textValue(body.bio, "Professional biography", 30, 700),
    specialties,
    endorsement: optionalText(body.endorsement, "Professional endorsement", 280),
    policy_versions: policyVersions,
    attestations: {
      accuracy: true,
      terms: true,
      privacy: true,
      intended_use: true,
      verification: true,
    },
  };
}
