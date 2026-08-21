import { createHash } from "node:crypto";
import { HttpError } from "./errors";
import type { PublicPlanKey } from "./config";

export const eligibleApplicationStatuses = new Set(["approved", "activation_pending"]);

export interface CheckoutRequest {
  contract_version: "1.0.0";
  application_id: string;
  plan_key: PublicPlanKey;
  billing_disclosure_version: string;
  recurring_billing_accepted: true;
}

export function parseCheckoutRequest(input: unknown, expectedDisclosureVersion: string): CheckoutRequest {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new HttpError(400, "invalid_request", "The Checkout request must be a JSON object.");
  }
  const body = input as Record<string, unknown>;
  const allowed = new Set([
    "contract_version",
    "application_id",
    "plan_key",
    "billing_disclosure_version",
    "recurring_billing_accepted",
  ]);
  if (Object.keys(body).some((key) => !allowed.has(key))) {
    throw new HttpError(400, "invalid_request", "The Checkout request contains an unsupported field.");
  }
  if (body.contract_version !== "1.0.0") {
    throw new HttpError(409, "unsupported_contract", "Refresh the page before continuing.");
  }
  if (typeof body.application_id !== "string" || !isUuid(body.application_id)) {
    throw new HttpError(400, "invalid_application", "A valid application ID is required.");
  }
  if (body.plan_key !== "individual_monthly" && body.plan_key !== "organization_monthly") {
    throw new HttpError(400, "unsupported_plan", "The selected membership is not available.");
  }
  if (body.billing_disclosure_version !== expectedDisclosureVersion) {
    throw new HttpError(409, "stale_disclosure", "The billing disclosure has changed. Refresh and review it again.");
  }
  if (body.recurring_billing_accepted !== true) {
    throw new HttpError(400, "billing_consent_required", "Recurring billing must be accepted before Checkout.");
  }
  return body as unknown as CheckoutRequest;
}

export function parseIdempotencyKey(value: string | null): string {
  const key = value?.trim() ?? "";
  if (key.length < 16 || key.length > 255 || !/^[A-Za-z0-9._:-]+$/.test(key)) {
    throw new HttpError(400, "invalid_idempotency_key", "A valid Idempotency-Key header is required.");
  }
  return key;
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function stableHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function safeOpaqueId(value: string): string {
  return stableHash(value).slice(0, 40);
}

export function normalizedSubscriptionStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
      return "payment_attention";
    case "canceled":
    case "incomplete_expired":
      return "inactive";
    default:
      return "pending";
  }
}
