import assert from "node:assert/strict";
import test from "node:test";
import { HttpError } from "../src/shared/errors";
import {
  parseProfileDraft,
  profileEntity,
  profileResponse,
  verifiedPhotoContentType,
} from "../src/shared/profile-contract";
import type { ApplicationEntity, ProfileEntity } from "../src/shared/storage";

const application: ApplicationEntity = {
  partitionKey: "applications",
  rowKey: "11111111-1111-4111-8111-111111111111",
  ownerSubject: "private-subject",
  ownerAccountId: "a".repeat(40),
  professionalType: "mental-health",
  status: "submitted",
  termsVersion: "2026-08-20",
  privacyVersion: "2026-08-20",
  intendedUseVersion: "2026-08-20",
  verificationVersion: "2026-08-20",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-02T00:00:00.000Z",
  firstName: "Fictional",
  lastName: "Clinician",
  headline: "Submitted headline",
  bio: "Submitted biography",
};

const validDraft = {
  display_name: "Fictional Clinician",
  headline: "Collaborative care professional",
  about: "A factual professional introduction.",
  collaboration_interests: "Ethical cross-disciplinary education.",
  professional_note: "I welcome clear, professional introductions.",
  availability: "open",
  collaboration_modes: ["professional_consultation", "education_training"],
};

test("accepts a bounded private profile draft", () => {
  const parsed = parseProfileDraft(validDraft);
  assert.equal(parsed.availability, "open");
  assert.deepEqual(parsed.collaborationModes, ["professional_consultation", "education_training"]);
});

test("rejects unsupported fields and collaboration values", () => {
  assert.throws(() => parseProfileDraft({ ...validDraft, verified: true }), (error: unknown) => error instanceof HttpError && error.code === "invalid_profile");
  assert.throws(() => parseProfileDraft({ ...validDraft, collaboration_modes: ["client_case_discussion"] }), HttpError);
});

test("builds an owner-only entity and preserves private photo metadata", () => {
  const existing: ProfileEntity = {
    partitionKey: "profiles",
    rowKey: "a".repeat(40),
    accountId: "a".repeat(40),
    professionalType: "mental-health",
    visibility: "private",
    availability: "limited",
    photoBlobName: `profiles/${"a".repeat(40)}/private-draft`,
    photoContentType: "image/png",
    photoStatus: "private_draft",
    photoUpdatedAt: "2026-10-02T00:00:00.000Z",
    createdAt: "2026-10-02T00:00:00.000Z",
    updatedAt: "2026-10-02T00:00:00.000Z",
  };
  const entity = profileEntity("a".repeat(40), application, parseProfileDraft(validDraft), existing, "2026-10-04T00:00:00.000Z");
  const response = profileResponse(entity, application);
  assert.equal(entity.visibility, "private");
  assert.equal(entity.photoBlobName, existing.photoBlobName);
  assert.equal(response.publication_eligible, false);
  assert.equal(response.photo.available, true);
});

test("detects allowed photo formats by signature and claimed type", () => {
  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const webp = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  assert.equal(verifiedPhotoContentType(png, "image/png"), "image/png");
  assert.equal(verifiedPhotoContentType(jpeg, "image/jpeg"), "image/jpeg");
  assert.equal(verifiedPhotoContentType(webp, "image/webp"), "image/webp");
  assert.throws(() => verifiedPhotoContentType(png, "image/jpeg"), HttpError);
  assert.throws(() => verifiedPhotoContentType(Uint8Array.from({ length: 12 }, () => 0), "image/png"), HttpError);
});
