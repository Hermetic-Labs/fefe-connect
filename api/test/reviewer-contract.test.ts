import assert from "node:assert/strict";
import test from "node:test";
import { HttpError } from "../src/shared/errors";
import { parseCollaborationDecision, requireReviewer } from "../src/shared/reviewer-contract";
import type { AccountEntity, ReviewerAccessEntity } from "../src/shared/storage";

const account: AccountEntity = { partitionKey: "accounts", rowKey: "a".repeat(40), accountId: "a".repeat(40), ownerSubject: "private", status: "active", createdAt: "2026-10-04T00:00:00.000Z", updatedAt: "2026-10-04T00:00:00.000Z" };
const access: ReviewerAccessEntity = { partitionKey: "reviewers", rowKey: account.accountId, accountId: account.accountId, role: "reviewer", status: "active", grantedBy: "operator", grantedAt: "2026-10-04T00:00:00.000Z", updatedAt: "2026-10-04T00:00:00.000Z" };

test("requires an explicit active reviewer entitlement", () => {
  assert.doesNotThrow(() => requireReviewer(account, access));
  assert.throws(() => requireReviewer(account, undefined), (error: unknown) => error instanceof HttpError && error.code === "reviewer_access_required");
  assert.throws(() => requireReviewer(account, { ...access, status: "suspended" }), HttpError);
});

test("validates reviewer decisions and requires context for declines", () => {
  assert.deepEqual(parseCollaborationDecision({ decision: "approve", note: "" }), { decision: "approve", note: "" });
  assert.equal(parseCollaborationDecision({ decision: "decline", note: "Contains case details and must be rewritten." }).decision, "decline");
  assert.throws(() => parseCollaborationDecision({ decision: "decline", note: "No" }), HttpError);
  assert.throws(() => parseCollaborationDecision({ decision: "approve", note: "", publish: true }), HttpError);
});
