import { app } from "@azure/functions";
import { authenticate } from "../shared/auth";
import { HttpError } from "../shared/errors";
import { handled, jsonBody, jsonResponse, preflight } from "../shared/http";
import { latestApplication } from "../shared/member-experience";
import { parseProfileDraft, profileEntity, profileResponse } from "../shared/profile-contract";
import { getOrCreateAccount, getProfile, listApplicationsForAccount, saveProfile } from "../shared/storage";

export const memberProfileHandler = handled(async (request, _context, id) => {
  const options = preflight(request);
  if (options) return options;
  const principal = await authenticate(request);
  const account = await getOrCreateAccount(principal.subject, principal.issuer, principal.email, principal.name);
  if (account.status !== "active") throw new HttpError(403, "account_unavailable", "This member account cannot edit a profile.");
  const application = latestApplication(await listApplicationsForAccount(account.accountId));
  if (!application) throw new HttpError(409, "application_required", "Submit a professional application before creating a profile draft.");
  const existing = await getProfile(account.accountId);
  if (request.method === "GET") {
    return jsonResponse(request, 200, {
      schema_version: "1.0.0",
      profile: profileResponse(existing, application, account.displayName),
      request_id: id,
    }, id);
  }
  const input = parseProfileDraft(await jsonBody(request));
  const entity = profileEntity(account.accountId, application, input, existing);
  await saveProfile(entity);
  return jsonResponse(request, 200, {
    schema_version: "1.0.0",
    profile: profileResponse(entity, application, account.displayName),
    request_id: id,
  }, id);
});

app.http("memberProfile", {
  methods: ["GET", "PUT", "OPTIONS"],
  authLevel: "anonymous",
  route: "v1/me/profile",
  handler: memberProfileHandler,
});
