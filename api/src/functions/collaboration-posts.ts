import { app } from "@azure/functions";
import { authenticate } from "../shared/auth";
import { collaborationPostResponse, parseCollaborationPost } from "../shared/collaboration-contract";
import { HttpError } from "../shared/errors";
import { handled, jsonBody, jsonResponse, preflight } from "../shared/http";
import { latestApplication } from "../shared/member-experience";
import { getOrCreateAccount, listApplicationsForAccount, listCollaborationPostsForAccount, listOpenCollaborationPosts, saveCollaborationPost } from "../shared/storage";

export const collaborationPostsHandler = handled(async (request, _context, id) => {
  const options = preflight(request);
  if (options) return options;
  const principal = await authenticate(request);
  const account = await getOrCreateAccount(principal.subject, principal.issuer, principal.email, principal.name);
  if (account.status !== "active") throw new HttpError(403, "account_unavailable", "This account cannot use the collaboration board.");
  const application = latestApplication(await listApplicationsForAccount(account.accountId));
  if (!application) throw new HttpError(409, "application_required", "Submit a professional application before using the collaboration board.");
  if (request.method === "POST") {
    const entity = parseCollaborationPost(await jsonBody(request), application, account.accountId);
    await saveCollaborationPost(entity);
    return jsonResponse(request, 201, { post: collaborationPostResponse(entity, true), request_id: id }, id);
  }
  const now = Date.now();
  const [open, mine] = await Promise.all([listOpenCollaborationPosts(), listCollaborationPostsForAccount(account.accountId)]);
  return jsonResponse(request, 200, {
    schema_version: "1.0.0",
    board: open.filter((post) => Date.parse(post.expiresAt) > now).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 50).map((post) => collaborationPostResponse(post, post.ownerAccountId === account.accountId)),
    mine: mine.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 20).map((post) => collaborationPostResponse(post, true)),
    capabilities: { can_submit: true, public_replies: false, introductions: false },
    request_id: id,
  }, id);
});

app.http("collaborationPosts", {
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "v1/me/collaboration-posts",
  handler: collaborationPostsHandler,
});
