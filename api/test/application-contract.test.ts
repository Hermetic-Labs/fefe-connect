import assert from "node:assert/strict";
import test from "node:test";
import { parseApplicationSubmission } from "../src/shared/application-contract";
import { HttpError } from "../src/shared/errors";

const applicationId = "c5c74861-1f65-4dbe-9e04-18b61ad5101b";
const policies = {
  terms: "2026-08-20",
  privacy: "2026-08-20",
  intended_use: "2026-08-20",
  verification: "2026-08-20",
};
const validSubmission = {
  contract_version: "1.0.0",
  professional_type: "mental-health",
  plan_key: "individual_monthly",
  first_name: "Test",
  last_name: "Clinician",
  email: "clinician@example.test",
  organization: "Example Practice",
  jurisdiction: "Georgia",
  credential_number: "TEST-12345",
  website: "https://example.test",
  headline: "Fictional clinician for contract testing",
  bio: "This fictional biography is long enough to exercise the application contract without describing a real professional.",
  specialties: ["Adults", "Consultation"],
  endorsement: "Fictional test endorsement",
  policy_versions: policies,
  attestations: {
    accuracy: true,
    terms: true,
    privacy: true,
    intended_use: true,
    verification: true,
  },
};

test("accepts a complete versioned membership application", () => {
  const parsed = parseApplicationSubmission(applicationId, validSubmission, policies);
  assert.equal(parsed.application_id, applicationId);
  assert.equal(parsed.professional_type, "mental-health");
  assert.deepEqual(parsed.specialties, ["Adults", "Consultation"]);
});

test("rejects unknown fields so case or clinical payloads cannot be silently stored", () => {
  assert.throws(
    () => parseApplicationSubmission(applicationId, { ...validSubmission, patient_notes: "must not be accepted" }, policies),
    (error: unknown) => error instanceof HttpError && error.code === "invalid_application",
  );
});

test("requires current policy versions and every attestation", () => {
  assert.throws(
    () => parseApplicationSubmission(applicationId, {
      ...validSubmission,
      policy_versions: { ...policies, terms: "2026-01-01" },
    }, policies),
    (error: unknown) => error instanceof HttpError && error.code === "stale_policy",
  );
  assert.throws(
    () => parseApplicationSubmission(applicationId, {
      ...validSubmission,
      attestations: { ...validSubmission.attestations, accuracy: false },
    }, policies),
    (error: unknown) => error instanceof HttpError && error.code === "consent_required",
  );
});

test("requires HTTPS for professional websites", () => {
  assert.throws(
    () => parseApplicationSubmission(applicationId, { ...validSubmission, website: "http://example.test" }, policies),
    (error: unknown) => error instanceof HttpError && error.code === "invalid_application",
  );
});
