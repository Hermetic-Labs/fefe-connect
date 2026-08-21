import { app, type HttpRequest, type InvocationContext } from "@azure/functions";
import type Stripe from "stripe";
import { normalizedSubscriptionStatus } from "../shared/domain";
import { HttpError } from "../shared/errors";
import { handled, jsonResponse } from "../shared/http";
import { stripeWebhookSecret } from "../shared/secrets";
import { stripeClient, stripeObjectId } from "../shared/stripe-client";
import {
  getApplication,
  getSubscription,
  getWebhookReceipt,
  saveApplication,
  saveSubscription,
  saveWebhookReceipt,
} from "../shared/storage";

type LooseObject = Record<string, unknown>;

function objectValue(value: unknown): LooseObject {
  return value && typeof value === "object" ? value as LooseObject : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function stripeId(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  return stringValue(objectValue(value).id);
}

function invoiceSubscriptionId(invoice: LooseObject): string | undefined {
  return stripeId(invoice.subscription)
    ?? stripeId(objectValue(objectValue(invoice.parent).subscription_details).subscription);
}

function subscriptionPeriodEnd(subscription: Stripe.Subscription): string | undefined {
  const raw = subscription as unknown as LooseObject;
  const direct = raw.current_period_end;
  const firstItem = objectValue((subscription.items?.data ?? [])[0]);
  const seconds = typeof direct === "number" ? direct : firstItem.current_period_end;
  return typeof seconds === "number" ? new Date(seconds * 1000).toISOString() : undefined;
}

async function applySubscription(subscription: Stripe.Subscription, forcedStatus?: string): Promise<void> {
  const existing = await getSubscription(subscription.id);
  const applicationId = subscription.metadata.application_id || existing?.applicationId;
  if (!applicationId) return;
  const application = await getApplication(applicationId);
  if (!application) return;
  const customerId = stripeObjectId(subscription.customer) ?? application.stripeCustomerId;
  if (!customerId) return;
  const stripeStatus = forcedStatus ?? subscription.status;
  const membershipStatus = normalizedSubscriptionStatus(stripeStatus);
  const now = new Date().toISOString();
  await saveSubscription({
    applicationId,
    ownerSubject: application.ownerSubject,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripeStatus,
    membershipStatus,
    planKey: subscription.metadata.plan_key || application.planKey,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodEnd: subscriptionPeriodEnd(subscription),
    updatedAt: now,
  });
  application.stripeCustomerId = customerId;
  application.stripeSubscriptionId = subscription.id;
  application.updatedAt = now;
  if (membershipStatus === "active") application.status = "active";
  if (membershipStatus === "inactive") application.status = "inactive";
  if (membershipStatus === "pending" && application.status !== "active") application.status = "activation_pending";
  await saveApplication(application);
}

async function processCheckoutCompleted(session: Stripe.Checkout.Session, stripe: Stripe): Promise<void> {
  const applicationId = session.metadata?.application_id || session.client_reference_id || undefined;
  const subscriptionId = stripeObjectId(session.subscription);
  if (!applicationId || !subscriptionId) return;
  const application = await getApplication(applicationId);
  if (!application) return;
  application.stripeCustomerId = stripeObjectId(session.customer) ?? application.stripeCustomerId;
  application.stripeSubscriptionId = subscriptionId;
  application.status = "activation_pending";
  application.updatedAt = new Date().toISOString();
  await saveApplication(application);
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await applySubscription(subscription);
}

async function processInvoice(invoice: LooseObject, stripe: Stripe, paid: boolean): Promise<void> {
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await applySubscription(subscription, paid ? "active" : "past_due");
}

async function processStripeEvent(event: Stripe.Event, stripe: Stripe): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await processCheckoutCompleted(event.data.object, stripe);
      break;
    case "invoice.paid":
      await processInvoice(event.data.object as unknown as LooseObject, stripe, true);
      break;
    case "invoice.payment_failed":
      await processInvoice(event.data.object as unknown as LooseObject, stripe, false);
      break;
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await applySubscription(event.data.object);
      break;
    default:
      break;
  }
}

export const stripeWebhookHandler = handled(async (request: HttpRequest, context: InvocationContext, id) => {
  const signature = request.headers.get("stripe-signature");
  if (!signature) throw new HttpError(400, "missing_signature", "The Stripe signature is required.");
  const rawBody = Buffer.from(await request.arrayBuffer());
  const stripe = await stripeClient();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, await stripeWebhookSecret(), 300);
  } catch {
    throw new HttpError(400, "invalid_signature", "The Stripe signature could not be verified.");
  }

  const existing = await getWebhookReceipt(event.id);
  if (existing?.status === "processed") {
    return jsonResponse(request, 200, { received: true, duplicate: true, request_id: id }, id);
  }
  const now = new Date().toISOString();
  const attempts = (existing?.attempts ?? 0) + 1;
  await saveWebhookReceipt(event.id, {
    eventType: event.type,
    status: "processing",
    attempts,
    firstReceivedAt: existing?.firstReceivedAt ?? now,
    updatedAt: now,
  });
  try {
    await processStripeEvent(event, stripe);
    await saveWebhookReceipt(event.id, {
      eventType: event.type,
      status: "processed",
      attempts,
      firstReceivedAt: existing?.firstReceivedAt ?? now,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    await saveWebhookReceipt(event.id, {
      eventType: event.type,
      status: "failed",
      attempts,
      firstReceivedAt: existing?.firstReceivedAt ?? now,
      updatedAt: new Date().toISOString(),
    });
    context.error({ event: "stripe_event_failed", requestId: id, stripeEventType: event.type });
    throw error;
  }
  return jsonResponse(request, 200, { received: true, request_id: id }, id);
});

app.http("stripeWebhook", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "v1/webhooks/stripe",
  handler: stripeWebhookHandler,
});
