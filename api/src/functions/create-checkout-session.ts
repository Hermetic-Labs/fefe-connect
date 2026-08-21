import { app } from "@azure/functions";
import { authenticate } from "../shared/auth";
import { loadConfig } from "../shared/config";
import { eligibleApplicationStatuses, parseCheckoutRequest, parseIdempotencyKey, stableHash } from "../shared/domain";
import { HttpError } from "../shared/errors";
import { handled, jsonBody, jsonResponse, preflight } from "../shared/http";
import { stripeClient } from "../shared/stripe-client";
import {
  getApplication,
  getBillingCustomer,
  getIdempotency,
  getSubscription,
  saveApplication,
  saveBillingCustomer,
  saveIdempotency,
} from "../shared/storage";

export const createCheckoutSessionHandler = handled(async (request, _context, requestIdentifier) => {
  const options = preflight(request);
  if (options) return options;
  const principal = await authenticate(request);
  const config = loadConfig();
  const body = parseCheckoutRequest(await jsonBody(request), config.billingDisclosureVersion);
  const idempotencyKey = parseIdempotencyKey(request.headers.get("idempotency-key"));
  const requestHash = stableHash(JSON.stringify(body));

  const prior = await getIdempotency(principal.subject, idempotencyKey);
  if (prior) {
    if (prior.requestHash !== requestHash) {
      throw new HttpError(409, "idempotency_conflict", "This request key was already used for different Checkout details.");
    }
    if (prior.checkoutSessionId && prior.checkoutUrl) {
      return jsonResponse(request, 200, {
        checkout_session_id: prior.checkoutSessionId,
        checkout_url: prior.checkoutUrl,
        request_id: requestIdentifier,
      }, requestIdentifier);
    }
  }

  const application = await getApplication(body.application_id);
  if (!application || application.ownerSubject !== principal.subject) {
    throw new HttpError(404, "application_not_found", "The application could not be found.");
  }
  if (!eligibleApplicationStatuses.has(application.status)) {
    throw new HttpError(403, "application_not_approved", "Professional review must be completed before Checkout.");
  }
  if (application.stripeSubscriptionId) {
    const existing = await getSubscription(application.stripeSubscriptionId);
    if (existing && !["inactive", "canceled"].includes(existing.membershipStatus)) {
      throw new HttpError(409, "subscription_exists", "This application already has a membership subscription.");
    }
  }
  const priceId = config.stripePrices[body.plan_key];
  if (!priceId) throw new HttpError(503, "billing_not_configured", "The selected membership is not available yet.");

  const stripe = await stripeClient();
  let billingCustomer = await getBillingCustomer(principal.subject);
  if (!billingCustomer) {
    const customer = await stripe.customers.create({
      email: principal.email,
      name: principal.name,
      metadata: { fefe_owner: stableHash(principal.subject).slice(0, 32) },
    }, { idempotencyKey: `customer:${stableHash(principal.subject)}` });
    await saveBillingCustomer(principal.subject, customer.id);
    billingCustomer = await getBillingCustomer(principal.subject);
  }
  if (!billingCustomer) throw new HttpError(500, "customer_state_error", "Checkout could not be prepared.");

  const successUrl = `${config.siteOrigin}/activation.html?checkout=success&application=${encodeURIComponent(application.rowKey)}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${config.siteOrigin}/activation.html?checkout=canceled&application=${encodeURIComponent(application.rowKey)}&plan=${encodeURIComponent(body.plan_key)}`;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: billingCustomer.stripeCustomerId,
    client_reference_id: application.rowKey,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: false,
    billing_address_collection: "auto",
    metadata: {
      application_id: application.rowKey,
      plan_key: body.plan_key,
      disclosure_version: body.billing_disclosure_version,
    },
    subscription_data: {
      metadata: { application_id: application.rowKey, plan_key: body.plan_key },
    },
  }, { idempotencyKey });
  if (!session.url) throw new HttpError(502, "checkout_url_missing", "Stripe did not return a Checkout URL.");

  const now = new Date().toISOString();
  application.status = "activation_pending";
  application.planKey = body.plan_key;
  application.stripeCustomerId = billingCustomer.stripeCustomerId;
  application.updatedAt = now;
  await saveApplication(application);
  await saveIdempotency({
    ownerSubject: principal.subject,
    requestHash,
    checkoutSessionId: session.id,
    checkoutUrl: session.url,
    createdAt: now,
    expiresAt: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
  }, idempotencyKey);

  return jsonResponse(request, 201, {
    checkout_session_id: session.id,
    checkout_url: session.url,
    request_id: requestIdentifier,
  }, requestIdentifier);
});

app.http("createCheckoutSession", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "v1/billing/checkout-sessions",
  handler: createCheckoutSessionHandler,
});
