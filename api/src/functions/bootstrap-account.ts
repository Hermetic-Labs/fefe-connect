import { app } from "@azure/functions";
import { authenticate } from "../shared/auth";
import { handled, jsonResponse, preflight } from "../shared/http";
import { getOrCreateAccount } from "../shared/storage";

export const bootstrapAccountHandler = handled(async (request, _context, id) => {
  const options = preflight(request);
  if (options) return options;
  const principal = await authenticate(request);
  const account = await getOrCreateAccount(principal.subject, principal.issuer, principal.email, principal.name);
  return jsonResponse(request, 200, {
    account_id: account.accountId,
    status: account.status,
    display_name: account.displayName ?? null,
    email: account.email ?? null,
    request_id: id,
  }, id);
});

app.http("bootstrapAccount", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "v1/account/bootstrap",
  handler: bootstrapAccountHandler,
});
