import type { AccountEntity, ApplicationEntity, ApplicationStatus } from "./storage";

type ExperienceKind = "no_application" | "applicant" | "approved_applicant" | "member" | "inactive_member";
type Tone = "neutral" | "progress" | "action" | "positive" | "caution";

const supportTarget = "mailto:hello@fefeconnect.com?subject=My%20FEFE%20account";

interface StatusPresentation {
  kind: ExperienceKind;
  headline: string;
  summary: string;
  label: string;
  tone: Tone;
  cardState: "submitted" | "pending" | "action_required" | "complete" | "declined" | "inactive";
}

const statusPresentation: Record<ApplicationStatus, StatusPresentation> = {
  draft: {
    kind: "applicant",
    headline: "Your application has not been submitted.",
    summary: "Finish the application when you are ready. FEFE has not started a professional review.",
    label: "Draft",
    tone: "action",
    cardState: "action_required",
  },
  submitted: {
    kind: "applicant",
    headline: "Your application was received.",
    summary: "FEFE will review the professional information you submitted. No payment has been collected.",
    label: "Submitted",
    tone: "progress",
    cardState: "submitted",
  },
  under_review: {
    kind: "applicant",
    headline: "Your application is being reviewed.",
    summary: "A human reviewer is checking the professional information in your application.",
    label: "Under review",
    tone: "progress",
    cardState: "pending",
  },
  approved: {
    kind: "approved_applicant",
    headline: "Your application is approved.",
    summary: "Approval is recorded. Member activation and any professional-record presentation remain separate steps.",
    label: "Approved",
    tone: "positive",
    cardState: "complete",
  },
  activation_pending: {
    kind: "approved_applicant",
    headline: "Your approved application is preparing for membership.",
    summary: "FEFE has recorded approval. Membership activation is not completed by this status page.",
    label: "Activation pending",
    tone: "progress",
    cardState: "pending",
  },
  active: {
    kind: "member",
    headline: "Your FEFE membership record is active.",
    summary: "This page shows only records FEFE currently stores. It does not create or imply additional verification claims.",
    label: "Active",
    tone: "positive",
    cardState: "complete",
  },
  declined: {
    kind: "applicant",
    headline: "FEFE could not approve this application.",
    summary: "This decision is private. Contact FEFE if you need a correction or review of the information used.",
    label: "Not approved",
    tone: "caution",
    cardState: "declined",
  },
  inactive: {
    kind: "inactive_member",
    headline: "Your FEFE membership record is inactive.",
    summary: "Your private application history remains available. Contact FEFE if you believe this status is incorrect.",
    label: "Inactive",
    tone: "caution",
    cardState: "inactive",
  },
};

function timestamp(application: ApplicationEntity): number {
  const parsed = Date.parse(application.updatedAt || application.createdAt);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function latestApplication(applications: ApplicationEntity[]): ApplicationEntity | undefined {
  return [...applications].sort((left, right) => {
    const dateDifference = timestamp(right) - timestamp(left);
    if (dateDifference) return dateDifference;
    return String(right.rowKey).localeCompare(String(left.rowKey));
  })[0];
}

function specialties(application: ApplicationEntity): string[] {
  try {
    const parsed = JSON.parse(application.specialtiesJson ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string").slice(0, 12);
  } catch {
    return [];
  }
}

function maskIdentifier(value?: string): string | null {
  const compact = value?.replace(/\s+/g, "") ?? "";
  if (!compact) return null;
  const visible = compact.slice(-4);
  return `${"•".repeat(Math.max(4, Math.min(8, compact.length - visible.length)))}${visible}`;
}

function professionalLabel(type: ApplicationEntity["professionalType"]): string {
  return type === "legal" ? "Legal professional" : "Mental-health professional";
}

function nextSteps(application: ApplicationEntity) {
  const reviewComplete = ["approved", "activation_pending", "active", "declined", "inactive"].includes(application.status);
  const reviewCurrent = ["submitted", "under_review"].includes(application.status);
  const recordAvailable = false;
  return [
    {
      step_id: "application-received",
      label: "Application received",
      state: application.status === "draft" ? "current" : "complete",
      description: application.status === "draft"
        ? "Submit the application before FEFE can begin review."
        : "FEFE stored your signed-in application and policy acknowledgments.",
    },
    {
      step_id: "human-review",
      label: "Human review",
      state: reviewComplete ? "complete" : reviewCurrent ? "current" : "not_started",
      description: reviewComplete
        ? "The application decision is recorded."
        : reviewCurrent
          ? "FEFE reviews professional information before any membership claim is presented."
          : "Review begins after a complete submission.",
    },
    {
      step_id: "professional-record",
      label: application.professionalType === "legal" ? "Legal record detail" : "Professional licence record detail",
      state: recordAvailable ? "complete" : "unavailable",
      description: "No independent member-safe professional record is available yet. FEFE will not infer one from application claims.",
    },
  ];
}

function applicationAction(application: ApplicationEntity) {
  if (application.status === "declined" || application.status === "inactive") {
    return { action: "contact_support", label: "Contact FEFE", target: supportTarget };
  }
  return {
    action: "view_application",
    label: "View submitted information",
    target: "/my-fefe.html#submitted-profile",
    resource_id: String(application.rowKey),
  };
}

function supportCard() {
  return {
    card_id: "support",
    kind: "support",
    title: "Need to correct something?",
    summary: "Tell FEFE about a material change or request a correction without sending case, client, patient, or clinical information.",
    state: "complete",
    disclosure_level: "overview",
    actions: [{ action: "contact_support", label: "Contact FEFE", target: supportTarget }],
    data: {
      contact_label: "Email FEFE support",
      contact_target: supportTarget,
      privacy_reminder: "Do not include client, patient, case, privileged, or clinical information.",
    },
  };
}

export function buildMemberHome(
  account: AccountEntity,
  applications: ApplicationEntity[],
  requestId: string,
  generatedAt = new Date().toISOString(),
) {
  if (account.status !== "active") {
    return {
      schema_version: "1.0.0",
      generated_at: generatedAt,
      account: {
        account_id: account.accountId,
        status: account.status,
        display_name: account.displayName ?? null,
        email: account.email ?? null,
      },
      experience: {
        kind: "inactive_member",
        professional_type: null,
        headline: "Your FEFE account is unavailable.",
        summary: "Contact FEFE if you believe this account status is incorrect.",
        primary_status: { code: "account_unavailable", label: "Account unavailable", tone: "caution", updated_at: account.updatedAt },
        primary_action: { action: "contact_support", label: "Contact FEFE", target: supportTarget },
        cards: [supportCard()],
      },
      request_id: requestId,
    };
  }

  const application = latestApplication(applications);
  if (!application) {
    return {
      schema_version: "1.0.0",
      generated_at: generatedAt,
      account: {
        account_id: account.accountId,
        status: account.status,
        display_name: account.displayName ?? null,
        email: account.email ?? null,
      },
      experience: {
        kind: "no_application",
        professional_type: null,
        headline: "Your FEFE account is ready.",
        summary: "Start a professional application when you are ready. Applying is free.",
        primary_status: { code: "no_application", label: "No application", tone: "neutral", updated_at: null },
        primary_action: { action: "start_application", label: "Start an application", target: "/onboarding.html" },
        cards: [
          {
            card_id: "application-status",
            kind: "application_status",
            title: "Professional application",
            summary: "No application has been submitted from this account.",
            state: "empty",
            disclosure_level: "overview",
            actions: [{ action: "start_application", label: "Start an application", target: "/onboarding.html" }],
            data: { application_id: null, professional_type: null, status: "none", submitted_at: null, updated_at: null },
          },
          supportCard(),
        ],
      },
      request_id: requestId,
    };
  }

  const presentation = statusPresentation[application.status];
  const primaryAction = applicationAction(application);
  return {
    schema_version: "1.0.0",
    generated_at: generatedAt,
    account: {
      account_id: account.accountId,
      status: account.status,
      display_name: account.displayName ?? null,
      email: account.email ?? null,
    },
    experience: {
      kind: presentation.kind,
      professional_type: application.professionalType,
      headline: presentation.headline,
      summary: presentation.summary,
      primary_status: {
        code: application.status,
        label: presentation.label,
        tone: presentation.tone,
        updated_at: application.updatedAt,
      },
      primary_action: primaryAction,
      cards: [
        {
          card_id: "application-status",
          kind: "application_status",
          title: `${professionalLabel(application.professionalType)} application`,
          summary: presentation.summary,
          state: presentation.cardState,
          disclosure_level: "overview",
          actions: [primaryAction],
          data: {
            application_id: String(application.rowKey),
            professional_type: application.professionalType,
            status: application.status,
            submitted_at: application.createdAt,
            updated_at: application.updatedAt,
          },
        },
        {
          card_id: "submitted-profile",
          kind: "submitted_profile",
          title: "Information you submitted",
          summary: "This private application information is not a published member profile.",
          state: "submitted",
          disclosure_level: "summary",
          actions: [],
          data: {
            headline: application.headline ?? null,
            bio: application.bio ?? null,
            bio_excerpt: application.bio?.slice(0, 240) ?? null,
            specialties: specialties(application),
            organization: application.organization ?? null,
            jurisdiction: application.jurisdiction ?? null,
            website: application.website ?? null,
            credential_label: application.professionalType === "legal" ? "Bar admission or registration" : "Professional licence",
            masked_identifier: maskIdentifier(application.credentialNumber),
            publication_state: "submitted_only",
          },
        },
        {
          card_id: "next-steps",
          kind: "next_steps",
          title: "What happens next",
          summary: "Each stage is separate so sign-in or submission can never be mistaken for professional verification.",
          state: application.status === "declined" ? "declined" : application.status === "inactive" ? "inactive" : "pending",
          disclosure_level: "summary",
          actions: [],
          data: { items: nextSteps(application) },
        },
        supportCard(),
      ],
    },
    request_id: requestId,
  };
}
