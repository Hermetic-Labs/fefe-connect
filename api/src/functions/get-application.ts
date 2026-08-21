import { app } from "@azure/functions";
import { authenticate } from "../shared/auth";
import { eligibleApplicationStatuses, isUuid } from "../shared/domain";
import { HttpError } from "../shared/errors";
import { handled, jsonResponse, preflight } from "../shared/http";
import { getApplication } from "../shared/storage";

export const getApplicationHandler = handled(async (request, _context, id) => {
  const options = preflight(request);
  if (options) return options;
  const principal = await authenticate(request);
  const applicationId = request.params.id;
  if (!applicationId || !isUuid(applicationId)) {
    throw new HttpError(400, "invalid_application", "A valid application ID is required.");
  }
  const application = await getApplication(applicationId);
  if (!application || application.ownerSubject !== principal.subject) {
    throw new HttpError(404, "application_not_found", "The application could not be found.");
  }
  return jsonResponse(request, 200, {
    id: application.rowKey,
    status: application.status,
    professional_type: application.professionalType,
    checkout_eligible: eligibleApplicationStatuses.has(application.status),
    verification: application.verificationCheckedAt ? {
      source: application.verificationSource,
      checked_at: application.verificationCheckedAt,
    } : null,
    request_id: id,
  }, id);
});

app.http("getApplication", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "v1/applications/{id}",
  handler: getApplicationHandler,
});
