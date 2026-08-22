import { authenticate } from "../shared/auth";
import { parseApplicationSubmission } from "../shared/application-contract";
import { loadConfig } from "../shared/config";
import { HttpError } from "../shared/errors";
import { handled, jsonBody, jsonResponse, preflight } from "../shared/http";
import { getApplication, getOrCreateAccount, saveApplication, saveConsentEvent } from "../shared/storage";
import { stableHash } from "../shared/domain";

export const submitApplicationHandler = handled(async (request, _context, id) => {
  const options = preflight(request);
  if (options) return options;
  const principal = await authenticate(request);
  const applicationId = request.params.id ?? "";
  const submission = parseApplicationSubmission(applicationId, await jsonBody(request), loadConfig().policyVersions);
  const account = await getOrCreateAccount(principal.subject, principal.issuer, principal.email, principal.name);
  if (account.status !== "active") throw new HttpError(403, "account_unavailable", "This member account cannot submit an application.");

  const existing = await getApplication(applicationId);
  if (existing && existing.ownerSubject !== principal.subject) {
    throw new HttpError(404, "application_not_found", "The application could not be found.");
  }
  const submissionHash = stableHash(JSON.stringify(submission));
  if (existing?.status === "submitted") {
    if (existing.submissionHash !== submissionHash) {
      throw new HttpError(409, "application_locked", "A submitted application cannot be replaced. Contact FEFE to request a correction.");
    }
    return jsonResponse(request, 200, {
      id: applicationId,
      status: "submitted",
      submitted_at: existing.updatedAt,
      checkout_eligible: false,
      message: "Application received for review. No payment has been collected.",
      request_id: id,
    }, id);
  }
  if (existing && existing.status !== "draft") {
    throw new HttpError(409, "application_locked", "This application is already in review and can no longer be replaced.");
  }

  const now = new Date().toISOString();
  const consentKey = `${applicationId}-${submissionHash.slice(0, 24)}`;
  await saveConsentEvent({
    partitionKey: account.accountId,
    rowKey: consentKey,
    applicationId,
    accountId: account.accountId,
    ownerSubject: principal.subject,
    eventType: "application_submitted",
    contractVersion: submission.contract_version,
    termsVersion: submission.policy_versions.terms,
    privacyVersion: submission.policy_versions.privacy,
    intendedUseVersion: submission.policy_versions.intended_use,
    verificationVersion: submission.policy_versions.verification,
    accuracyAccepted: true,
    termsAccepted: true,
    privacyAccepted: true,
    intendedUseAccepted: true,
    verificationAccepted: true,
    acceptedAt: now,
  });
  await saveApplication({
    partitionKey: "applications",
    rowKey: applicationId,
    ownerSubject: principal.subject,
    ownerAccountId: account.accountId,
    professionalType: submission.professional_type,
    status: "submitted",
    planKey: submission.plan_key,
    termsVersion: submission.policy_versions.terms,
    privacyVersion: submission.policy_versions.privacy,
    intendedUseVersion: submission.policy_versions.intended_use,
    verificationVersion: submission.policy_versions.verification,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    firstName: submission.first_name,
    lastName: submission.last_name,
    professionalEmail: submission.email,
    organization: submission.organization,
    jurisdiction: submission.jurisdiction,
    credentialNumber: submission.credential_number,
    website: submission.website,
    headline: submission.headline,
    bio: submission.bio,
    specialtiesJson: JSON.stringify(submission.specialties),
    endorsement: submission.endorsement,
    submissionHash,
  });

  return jsonResponse(request, existing ? 200 : 201, {
    id: applicationId,
    status: "submitted",
    submitted_at: now,
    checkout_eligible: false,
    message: "Application received for review. No payment has been collected.",
    request_id: id,
  }, id);
});
