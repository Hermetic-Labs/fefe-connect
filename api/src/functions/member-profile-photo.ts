import { app } from "@azure/functions";
import { authenticate } from "../shared/auth";
import { HttpError } from "../shared/errors";
import { binaryResponse, handled, jsonResponse, preflight } from "../shared/http";
import { latestApplication } from "../shared/member-experience";
import { downloadPrivatePhoto, uploadPrivatePhoto } from "../shared/profile-images";
import { maxPrivatePhotoBytes, verifiedPhotoContentType } from "../shared/profile-contract";
import { getOrCreateAccount, getProfile, listApplicationsForAccount, saveProfilePhoto } from "../shared/storage";

export const memberProfilePhotoHandler = handled(async (request, _context, id) => {
  const options = preflight(request);
  if (options) return options;
  const principal = await authenticate(request);
  const account = await getOrCreateAccount(principal.subject, principal.issuer, principal.email, principal.name);
  if (account.status !== "active") throw new HttpError(403, "account_unavailable", "This member account cannot use a profile photo.");
  const application = latestApplication(await listApplicationsForAccount(account.accountId));
  if (!application) throw new HttpError(409, "application_required", "Submit a professional application before adding a profile photo.");
  if (request.method === "GET") {
    const profile = await getProfile(account.accountId);
    if (!profile?.photoBlobName || !profile.photoContentType || profile.photoStatus !== "private_draft") {
      throw new HttpError(404, "photo_not_found", "No private profile photo is stored.");
    }
    return binaryResponse(request, 200, await downloadPrivatePhoto(profile.photoBlobName), profile.photoContentType, id);
  }
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > maxPrivatePhotoBytes) throw new HttpError(413, "photo_too_large", "Choose an image no larger than 3 MB.");
  const bytes = new Uint8Array(await request.arrayBuffer());
  const contentType = verifiedPhotoContentType(bytes, request.headers.get("content-type"));
  const blobName = await uploadPrivatePhoto(account.accountId, bytes, contentType);
  const now = new Date().toISOString();
  await saveProfilePhoto(account.accountId, application.professionalType, {
    photoBlobName: blobName,
    photoContentType: contentType,
    photoUpdatedAt: now,
  });
  return jsonResponse(request, 200, {
    status: "private_draft",
    publication_eligible: false,
    updated_at: now,
    request_id: id,
  }, id);
});

app.http("memberProfilePhoto", {
  methods: ["GET", "PUT", "OPTIONS"],
  authLevel: "anonymous",
  route: "v1/me/profile/photo",
  handler: memberProfilePhotoHandler,
});
