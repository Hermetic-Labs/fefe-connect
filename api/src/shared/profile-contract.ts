import { HttpError } from "./errors";
import type { ApplicationEntity, ProfileAvailability, ProfileEntity } from "./storage";

export const collaborationModes = [
  "professional_consultation",
  "referral_network",
  "education_training",
  "policy_compliance",
  "multidisciplinary_planning",
] as const;

export type CollaborationMode = typeof collaborationModes[number];

export interface ProfileDraftInput {
  displayName: string;
  headline: string;
  about: string;
  professionalHistory: string;
  educationTraining: string;
  collaborationInterests: string;
  professionalNote: string;
  availability: ProfileAvailability;
  collaborationModes: CollaborationMode[];
}

const allowedFields = new Set([
  "display_name",
  "headline",
  "about",
  "professional_history",
  "education_training",
  "collaboration_interests",
  "professional_note",
  "availability",
  "collaboration_modes",
]);
const availabilityValues = new Set<ProfileAvailability>(["open", "limited", "not_accepting"]);
const modeValues = new Set<string>(collaborationModes);

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "invalid_profile", "The profile must be a JSON object.");
  }
  const result = value as Record<string, unknown>;
  for (const key of Object.keys(result)) {
    if (!allowedFields.has(key)) throw new HttpError(400, "invalid_profile", "The profile contains an unsupported field.");
  }
  return result;
}

function text(value: unknown, label: string, maximum: number, minimum = 0): string {
  if (typeof value !== "string") throw new HttpError(400, "invalid_profile", `${label} must be text.`);
  const normalized = value.trim().replace(/\r\n?/g, "\n");
  if (normalized.length < minimum || normalized.length > maximum) {
    throw new HttpError(400, "invalid_profile", `${label} must contain between ${minimum} and ${maximum} characters.`);
  }
  if (/[^\P{C}\n\t]/u.test(normalized)) {
    throw new HttpError(400, "invalid_profile", `${label} contains unsupported control characters.`);
  }
  return normalized;
}

export function parseProfileDraft(value: unknown): ProfileDraftInput {
  const input = record(value);
  const availability = input.availability;
  if (typeof availability !== "string" || !availabilityValues.has(availability as ProfileAvailability)) {
    throw new HttpError(400, "invalid_profile", "Choose a supported availability status.");
  }
  if (!Array.isArray(input.collaboration_modes) || input.collaboration_modes.length > collaborationModes.length) {
    throw new HttpError(400, "invalid_profile", "Choose supported collaboration interests.");
  }
  const modes = [...new Set(input.collaboration_modes)];
  if (modes.some((mode) => typeof mode !== "string" || !modeValues.has(mode))) {
    throw new HttpError(400, "invalid_profile", "Choose supported collaboration interests.");
  }
  return {
    displayName: text(input.display_name, "Display name", 80, 2),
    headline: text(input.headline, "Professional headline", 140),
    about: text(input.about, "About", 1_200),
    professionalHistory: text(input.professional_history, "Professional history", 1_200),
    educationTraining: text(input.education_training, "Education and training", 1_000),
    collaborationInterests: text(input.collaboration_interests, "Collaboration interests", 900),
    professionalNote: text(input.professional_note, "Professional note", 600),
    availability: availability as ProfileAvailability,
    collaborationModes: modes as CollaborationMode[],
  };
}

function readModes(profile?: ProfileEntity): CollaborationMode[] {
  try {
    const parsed = JSON.parse(profile?.collaborationModesJson ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((mode): mode is CollaborationMode => typeof mode === "string" && modeValues.has(mode)) : [];
  } catch {
    return [];
  }
}

function applicantName(application: ApplicationEntity): string {
  return [application.firstName, application.lastName].filter(Boolean).join(" ").trim();
}

export function profileResponse(profile: ProfileEntity | undefined, application: ApplicationEntity, accountName?: string) {
  return {
    visibility: "private" as const,
    publication_eligible: false,
    professional_type: application.professionalType,
    display_name: profile?.displayName ?? (applicantName(application) || accountName || ""),
    headline: profile?.headline ?? application.headline ?? "",
    about: profile?.about ?? application.bio ?? "",
    professional_history: profile?.professionalHistory ?? "",
    education_training: profile?.educationTraining ?? "",
    collaboration_interests: profile?.collaborationInterests ?? "",
    professional_note: profile?.professionalNote ?? "",
    availability: profile?.availability ?? "limited",
    collaboration_modes: readModes(profile),
    photo: {
      available: Boolean(profile?.photoBlobName && profile.photoStatus === "private_draft"),
      status: profile?.photoStatus ?? "missing",
      updated_at: profile?.photoUpdatedAt ?? null,
    },
    updated_at: profile?.updatedAt ?? application.updatedAt,
  };
}

export function profileEntity(
  accountId: string,
  application: ApplicationEntity,
  input: ProfileDraftInput,
  existing: ProfileEntity | undefined,
  now = new Date().toISOString(),
): ProfileEntity {
  return {
    partitionKey: "profiles",
    rowKey: accountId,
    accountId,
    professionalType: application.professionalType,
    visibility: "private",
    displayName: input.displayName,
    headline: input.headline,
    about: input.about,
    professionalHistory: input.professionalHistory,
    educationTraining: input.educationTraining,
    collaborationInterests: input.collaborationInterests,
    professionalNote: input.professionalNote,
    availability: input.availability,
    collaborationModesJson: JSON.stringify(input.collaborationModes),
    photoBlobName: existing?.photoBlobName,
    photoContentType: existing?.photoContentType,
    photoStatus: existing?.photoStatus,
    photoUpdatedAt: existing?.photoUpdatedAt,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export const maxPrivatePhotoBytes = 3 * 1024 * 1024;

export function verifiedPhotoContentType(bytes: Uint8Array, claimedType: string | null): "image/jpeg" | "image/png" | "image/webp" {
  if (bytes.length < 12 || bytes.length > maxPrivatePhotoBytes) {
    throw new HttpError(400, "invalid_photo", "Choose a JPEG, PNG, or WebP image no larger than 3 MB.");
  }
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  const webp = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  const detected = jpeg ? "image/jpeg" : png ? "image/png" : webp ? "image/webp" : undefined;
  if (!detected || claimedType?.toLowerCase() !== detected) {
    throw new HttpError(400, "invalid_photo", "The file contents must match a JPEG, PNG, or WebP image.");
  }
  return detected;
}
