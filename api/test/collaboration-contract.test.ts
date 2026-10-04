import assert from "node:assert/strict";
import test from "node:test";
import { parseCollaborationPost } from "../src/shared/collaboration-contract";
import { HttpError } from "../src/shared/errors";
import type { ApplicationEntity } from "../src/shared/storage";

const application: ApplicationEntity = {
  partitionKey: "applications",
  rowKey: "11111111-1111-4111-8111-111111111111",
  ownerSubject: "private-subject",
  ownerAccountId: "a".repeat(40),
  professionalType: "legal",
  status: "submitted",
  termsVersion: "2026-08-20",
  privacyVersion: "2026-08-20",
  intendedUseVersion: "2026-08-20",
  verificationVersion: "2026-08-20",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

const valid = {
  request_type: "professional_consultation",
  audience: "either",
  title: "Seeking a professional training partner",
  summary: "Looking for a professional collaborator for a general educational session with no client or matter details.",
  jurisdiction: "Georgia",
  location_mode: "virtual",
  response_by: "2026-10-20",
  no_sensitive_information: true,
};

test("creates a pending, owner-scoped request with automatic expiry", () => {
  const post = parseCollaborationPost(valid, application, "b".repeat(40), new Date("2026-10-04T12:00:00.000Z"));
  assert.equal(post.status, "pending_review");
  assert.equal(post.ownerAccountId, "b".repeat(40));
  assert.equal(post.expiresAt, "2026-10-20T23:59:59.999Z");
  assert.equal(post.sensitiveInformationAttested, true);
});

test("rejects missing safety attestation, unknown fields, and remote deadlines", () => {
  assert.throws(() => parseCollaborationPost({ ...valid, no_sensitive_information: false }, application, "b".repeat(40), new Date("2026-10-04T12:00:00.000Z")), (error: unknown) => error instanceof HttpError && error.code === "safety_attestation_required");
  assert.throws(() => parseCollaborationPost({ ...valid, client_name: "No" }, application, "b".repeat(40), new Date("2026-10-04T12:00:00.000Z")), HttpError);
  assert.throws(() => parseCollaborationPost({ ...valid, response_by: "2027-04-01" }, application, "b".repeat(40), new Date("2026-10-04T12:00:00.000Z")), HttpError);
});
