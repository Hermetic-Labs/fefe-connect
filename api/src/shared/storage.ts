import { TableClient, type TableEntity } from "@azure/data-tables";
import { azureCredential } from "./credential";
import { loadConfig } from "./config";
import { HttpError, isNotFound } from "./errors";
import { safeOpaqueId, stableHash } from "./domain";

export type ApplicationStatus = "submitted" | "under_review" | "approved" | "activation_pending" | "active" | "declined" | "inactive";

export interface ApplicationEntity extends TableEntity {
  ownerSubject: string;
  professionalType: "legal" | "mental-health";
  status: ApplicationStatus;
  planKey?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  verificationSource?: string;
  verificationCheckedAt?: string;
  termsVersion: string;
  privacyVersion: string;
  intendedUseVersion: string;
  verificationVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingCustomerEntity extends TableEntity {
  ownerSubject: string;
  stripeCustomerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionEntity extends TableEntity {
  applicationId: string;
  ownerSubject: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripeStatus: string;
  membershipStatus: string;
  planKey?: string;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string;
  updatedAt: string;
}

export interface IdempotencyEntity extends TableEntity {
  ownerSubject: string;
  requestHash: string;
  checkoutSessionId?: string;
  checkoutUrl?: string;
  createdAt: string;
  expiresAt: string;
}

export interface WebhookReceiptEntity extends TableEntity {
  eventType: string;
  status: "processing" | "processed" | "failed";
  attempts: number;
  firstReceivedAt: string;
  updatedAt: string;
}

const names = {
  applications: "applications",
  billingCustomers: "billingcustomers",
  subscriptions: "subscriptions",
  idempotency: "idempotency",
  webhookReceipts: "webhookreceipts",
} as const;

const clients = new Map<string, TableClient>();

function table(name: string): TableClient {
  const existing = clients.get(name);
  if (existing) return existing;
  const config = loadConfig();
  const created = config.storageConnectionString
    ? TableClient.fromConnectionString(config.storageConnectionString, name)
    : config.storageTableEndpoint
      ? new TableClient(config.storageTableEndpoint, name, azureCredential())
      : undefined;
  if (!created) throw new HttpError(503, "storage_not_configured", "Member services are not available yet.");
  clients.set(name, created);
  return created;
}

async function optionalEntity<T extends TableEntity>(client: TableClient, partitionKey: string, rowKey: string): Promise<T | undefined> {
  try {
    return await client.getEntity<T>(partitionKey, rowKey);
  } catch (error) {
    if (isNotFound(error)) return undefined;
    throw error;
  }
}

export async function ensureTables(): Promise<void> {
  await Promise.all(Object.values(names).map((name) => table(name).createTable().catch((error) => {
    const status = (error as { statusCode?: number }).statusCode;
    if (status !== 409) throw error;
  })));
}

export async function getApplication(applicationId: string): Promise<ApplicationEntity | undefined> {
  return optionalEntity<ApplicationEntity>(table(names.applications), "applications", applicationId);
}

export async function saveApplication(entity: ApplicationEntity): Promise<void> {
  await table(names.applications).upsertEntity(entity, "Merge");
}

export async function getBillingCustomer(ownerSubject: string): Promise<BillingCustomerEntity | undefined> {
  return optionalEntity<BillingCustomerEntity>(table(names.billingCustomers), "customers", safeOpaqueId(ownerSubject));
}

export async function saveBillingCustomer(ownerSubject: string, stripeCustomerId: string): Promise<void> {
  const now = new Date().toISOString();
  await table(names.billingCustomers).upsertEntity({
    partitionKey: "customers",
    rowKey: safeOpaqueId(ownerSubject),
    ownerSubject,
    stripeCustomerId,
    createdAt: now,
    updatedAt: now,
  }, "Merge");
}

export async function getSubscription(subscriptionId: string): Promise<SubscriptionEntity | undefined> {
  return optionalEntity<SubscriptionEntity>(table(names.subscriptions), "subscriptions", subscriptionId);
}

export async function saveSubscription(entity: {
  applicationId: string;
  ownerSubject: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripeStatus: string;
  membershipStatus: string;
  planKey?: string;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string;
  updatedAt: string;
}): Promise<void> {
  await table(names.subscriptions).upsertEntity({
    partitionKey: "subscriptions",
    rowKey: entity.stripeSubscriptionId,
    ...entity,
  }, "Merge");
}

export async function getIdempotency(ownerSubject: string, key: string): Promise<IdempotencyEntity | undefined> {
  return optionalEntity<IdempotencyEntity>(table(names.idempotency), safeOpaqueId(ownerSubject), stableHash(key));
}

export async function saveIdempotency(entity: {
  ownerSubject: string;
  requestHash: string;
  checkoutSessionId?: string;
  checkoutUrl?: string;
  createdAt: string;
  expiresAt: string;
}, key: string): Promise<void> {
  await table(names.idempotency).upsertEntity({
    partitionKey: safeOpaqueId(entity.ownerSubject),
    rowKey: stableHash(key),
    ...entity,
  }, "Merge");
}

export async function getWebhookReceipt(eventId: string): Promise<WebhookReceiptEntity | undefined> {
  return optionalEntity<WebhookReceiptEntity>(table(names.webhookReceipts), "stripe", eventId);
}

export async function saveWebhookReceipt(eventId: string, entity: {
  eventType: string;
  status: "processing" | "processed" | "failed";
  attempts: number;
  firstReceivedAt: string;
  updatedAt: string;
}): Promise<void> {
  await table(names.webhookReceipts).upsertEntity({ partitionKey: "stripe", rowKey: eventId, ...entity }, "Merge");
}
