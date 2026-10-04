import { app } from "@azure/functions";
import { authenticate } from "../shared/auth";
import { handled, jsonResponse, preflight } from "../shared/http";
import { buildMemberHome } from "../shared/member-experience";
import { getOrCreateAccount, listApplicationsForAccount } from "../shared/storage";

export const getMemberHomeHandler = handled(async (request, _context, id) => {
  const options = preflight(request);
  if (options) return options;
  const principal = await authenticate(request);
  const account = await getOrCreateAccount(principal.subject, principal.issuer, principal.email, principal.name);
  const applications = account.status === "active" ? await listApplicationsForAccount(account.accountId) : [];
  return jsonResponse(request, 200, buildMemberHome(account, applications, id), id);
});

app.http("memberHome", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "v1/me/home",
  handler: getMemberHomeHandler,
});
