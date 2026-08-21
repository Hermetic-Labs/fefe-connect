import assert from "node:assert/strict";
import test from "node:test";
import { normalizedSubscriptionStatus, parseCheckoutRequest, parseIdempotencyKey, safeOpaqueId } from "../src/shared/domain";
import { HttpError } from "../src/shared/errors";

const validRequest = {
  contract_version: "1.0.0",
  application_id: "c5c74861-1f65-4dbe-9e04-18b61ad5101b",
  plan_key: "individual_monthly",
  billing_disclosure_version: "2026-08-20",
  recurring_billing_accepted: true,
};

test("accepts the documented Checkout contract", () => {
  assert.deepEqual(parseCheckoutRequest(validRequest, "2026-08-20"), validRequest);
});

test("rejects client-supplied amounts and unknown fields", () => {
  assert.throws(
    () => parseCheckoutRequest({ ...validRequest, amount: 1 }, "2026-08-20"),
    (error: unknown) => error instanceof HttpError && error.code === "invalid_request",
  );
});

test("rejects a stale billing disclosure", () => {
  assert.throws(
    () => parseCheckoutRequest(validRequest, "2026-09-01"),
    (error: unknown) => error instanceof HttpError && error.code === "stale_disclosure",
  );
});

test("requires a sufficiently strong idempotency key", () => {
  assert.equal(parseIdempotencyKey("9a727d11-71fd-4b8f-9ad9-23c2bddf0fd5"), "9a727d11-71fd-4b8f-9ad9-23c2bddf0fd5");
  assert.throws(() => parseIdempotencyKey("short"), HttpError);
});

test("normalizes Stripe states without over-activating uncertain states", () => {
  assert.equal(normalizedSubscriptionStatus("active"), "active");
  assert.equal(normalizedSubscriptionStatus("past_due"), "payment_attention");
  assert.equal(normalizedSubscriptionStatus("canceled"), "inactive");
  assert.equal(normalizedSubscriptionStatus("incomplete"), "pending");
});

test("opaque storage keys are stable and do not expose the subject", () => {
  const key = safeOpaqueId("customer-subject@example.test");
  assert.equal(key.length, 40);
  assert.equal(key, safeOpaqueId("customer-subject@example.test"));
  assert.ok(!key.includes("example"));
});
