import { HttpError } from "./errors";
import type { AccountEntity, ReviewerAccessEntity } from "./storage";

export function requireReviewer(account: AccountEntity, access?: ReviewerAccessEntity): void {
  if (account.status !== "active" || access?.status !== "active" || access.role !== "reviewer") {
    throw new HttpError(403, "reviewer_access_required", "Reviewer access is required.");
  }
}

export function parseCollaborationDecision(value: unknown): { decision: "approve" | "decline"; note: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpError(400, "invalid_review", "The review must be a JSON object.");
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !["decision", "note"].includes(key))) throw new HttpError(400, "invalid_review", "The review contains an unsupported field.");
  if (input.decision !== "approve" && input.decision !== "decline") throw new HttpError(400, "invalid_review", "Choose approve or decline.");
  if (typeof input.note !== "string") throw new HttpError(400, "invalid_review", "Reviewer note must be text.");
  const note = input.note.trim().replace(/\r\n?/g, "\n");
  if (note.length > 500 || (input.decision === "decline" && note.length < 10)) throw new HttpError(400, "invalid_review", "Declines require a 10–500 character note; approval notes may contain up to 500 characters.");
  return { decision: input.decision, note };
}
