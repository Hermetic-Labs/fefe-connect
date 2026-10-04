import { randomUUID } from "node:crypto";
import { HttpError } from "./errors";
import type { ApplicationEntity, CollaborationPostEntity } from "./storage";

const requestTypes = new Set(["professional_consultation", "referral_partner", "education_training", "policy_compliance", "resource_exchange"]);
const audiences = new Set(["legal", "mental-health", "either"]);
const locationModes = new Set(["virtual", "in_person", "either"]);
const allowed = new Set(["request_type", "audience", "title", "summary", "jurisdiction", "location_mode", "response_by", "no_sensitive_information"]);

function bounded(value: unknown, label: string, min: number, max: number): string {
  if (typeof value !== "string") throw new HttpError(400, "invalid_collaboration_post", `${label} must be text.`);
  const result = value.trim().replace(/\r\n?/g, "\n");
  if (result.length < min || result.length > max) throw new HttpError(400, "invalid_collaboration_post", `${label} must contain between ${min} and ${max} characters.`);
  if (/[^\P{C}\n\t]/u.test(result)) throw new HttpError(400, "invalid_collaboration_post", `${label} contains unsupported control characters.`);
  return result;
}

export function parseCollaborationPost(value: unknown, application: ApplicationEntity, accountId: string, now = new Date()): CollaborationPostEntity {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpError(400, "invalid_collaboration_post", "The request must be a JSON object.");
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !allowed.has(key))) throw new HttpError(400, "invalid_collaboration_post", "The request contains an unsupported field.");
  if (typeof input.request_type !== "string" || !requestTypes.has(input.request_type)) throw new HttpError(400, "invalid_collaboration_post", "Choose a supported request type.");
  if (typeof input.audience !== "string" || !audiences.has(input.audience)) throw new HttpError(400, "invalid_collaboration_post", "Choose a supported professional audience.");
  if (typeof input.location_mode !== "string" || !locationModes.has(input.location_mode)) throw new HttpError(400, "invalid_collaboration_post", "Choose a supported location mode.");
  if (input.no_sensitive_information !== true) throw new HttpError(400, "safety_attestation_required", "Confirm that the request contains no client, patient, case, privileged, or clinical information.");
  const responseBy = bounded(input.response_by, "Response deadline", 10, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(responseBy)) throw new HttpError(400, "invalid_collaboration_post", "Enter a valid response deadline.");
  const deadline = new Date(`${responseBy}T23:59:59.999Z`);
  const tomorrow = new Date(now); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const maximum = new Date(now); maximum.setUTCDate(maximum.getUTCDate() + 90);
  if (!Number.isFinite(deadline.valueOf()) || deadline < tomorrow || deadline > maximum) throw new HttpError(400, "invalid_collaboration_post", "Choose a response deadline between tomorrow and 90 days from now.");
  const automaticExpiry = new Date(now); automaticExpiry.setUTCDate(automaticExpiry.getUTCDate() + 30);
  const postId = randomUUID();
  const timestamp = now.toISOString();
  return {
    partitionKey: "posts",
    rowKey: postId,
    postId,
    ownerAccountId: accountId,
    professionalType: application.professionalType,
    status: "pending_review",
    requestType: input.request_type,
    audience: input.audience as CollaborationPostEntity["audience"],
    title: bounded(input.title, "Title", 10, 100),
    summary: bounded(input.summary, "Request summary", 30, 800),
    jurisdiction: bounded(input.jurisdiction ?? "", "Jurisdiction", 0, 80) || undefined,
    locationMode: input.location_mode as CollaborationPostEntity["locationMode"],
    responseBy,
    expiresAt: new Date(Math.min(deadline.valueOf(), automaticExpiry.valueOf())).toISOString(),
    sensitiveInformationAttested: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function collaborationPostResponse(post: CollaborationPostEntity, mine: boolean) {
  return {
    post_id: post.postId,
    professional_type: post.professionalType,
    status: post.status,
    request_type: post.requestType,
    audience: post.audience,
    title: post.title,
    summary: post.summary,
    jurisdiction: post.jurisdiction ?? null,
    location_mode: post.locationMode,
    response_by: post.responseBy,
    expires_at: post.expiresAt,
    mine,
    created_at: post.createdAt,
  };
}
