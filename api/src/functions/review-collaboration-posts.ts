import { app } from "@azure/functions";
import { authenticate } from "../shared/auth";
import { collaborationPostResponse } from "../shared/collaboration-contract";
import { HttpError } from "../shared/errors";
import { handled, jsonBody, jsonResponse, preflight } from "../shared/http";
import { parseCollaborationDecision, requireReviewer } from "../shared/reviewer-contract";
import { getCollaborationPost, getOrCreateAccount, getReviewerAccess, listPendingCollaborationPosts, saveCollaborationDecision } from "../shared/storage";

async function reviewerAccount(request: Parameters<typeof authenticate>[0]) {
  const principal = await authenticate(request);
  const account = await getOrCreateAccount(principal.subject, principal.issuer, principal.email, principal.name);
  requireReviewer(account, await getReviewerAccess(account.accountId));
  return account;
}

export const reviewerQueueHandler = handled(async (request, _context, id) => {
  const options = preflight(request); if (options) return options;
  await reviewerAccount(request);
  const posts = await listPendingCollaborationPosts();
  return jsonResponse(request, 200, { queue: posts.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)).map((post) => collaborationPostResponse(post, false)), request_id: id }, id);
});

export const reviewerDecisionHandler = handled(async (request, _context, id) => {
  const options = preflight(request); if (options) return options;
  const account = await reviewerAccount(request);
  const postId = request.params.postId ?? "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(postId)) throw new HttpError(400, "invalid_post", "A valid post ID is required.");
  const post = await getCollaborationPost(postId);
  if (!post) throw new HttpError(404, "post_not_found", "The collaboration request was not found.");
  if (post.status !== "pending_review") throw new HttpError(409, "review_already_completed", "This request is no longer pending review.");
  const input = parseCollaborationDecision(await jsonBody(request));
  const updated = await saveCollaborationDecision(post, account.accountId, input.decision, input.note, new Date().toISOString());
  return jsonResponse(request, 200, { post: collaborationPostResponse(updated, false), request_id: id }, id);
});

app.http("reviewerCollaborationQueue", { methods: ["GET", "OPTIONS"], authLevel: "anonymous", route: "v1/reviewer/collaboration-posts", handler: reviewerQueueHandler });
app.http("reviewerCollaborationDecision", { methods: ["POST", "OPTIONS"], authLevel: "anonymous", route: "v1/reviewer/collaboration-posts/{postId}/decision", handler: reviewerDecisionHandler });
