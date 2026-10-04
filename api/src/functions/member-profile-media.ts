import { randomUUID } from "node:crypto";
import { app } from "@azure/functions";
import { authenticate } from "../shared/auth";
import { HttpError } from "../shared/errors";
import { binaryResponse, handled, jsonResponse, preflight } from "../shared/http";
import { latestApplication } from "../shared/member-experience";
import { downloadPrivateProfileMedia, uploadPrivateProfileMedia } from "../shared/profile-images";
import { assertProfileMediaCapacity, maxProfileVideoBytes, parseMediaPlacement, profileMediaResponse, verifiedProfileMedia } from "../shared/profile-media-contract";
import { getOrCreateAccount, getProfileMedia, listApplicationsForAccount, listProfileMedia, removeProfileMedia, saveProfileMedia, type ProfileMediaEntity } from "../shared/storage";

async function memberContext(request: Parameters<typeof authenticate>[0]) {
  const principal = await authenticate(request);
  const account = await getOrCreateAccount(principal.subject, principal.issuer, principal.email, principal.name);
  if (account.status !== "active") throw new HttpError(403, "account_unavailable", "This member account cannot use profile media.");
  const application = latestApplication(await listApplicationsForAccount(account.accountId));
  if (!application) throw new HttpError(409, "application_required", "Submit a professional application before adding profile media.");
  return { account, application };
}

export const memberProfileMediaHandler = handled(async (request, _context, id) => {
  const options = preflight(request);
  if (options) return options;
  const { account, application } = await memberContext(request);
  if (request.method === "GET") {
    const media = await listProfileMedia(account.accountId);
    return jsonResponse(request, 200, { schema_version: "1.0.0", maximum_items: 5, media: media.map(profileMediaResponse), request_id: id }, id);
  }
  const placement = parseMediaPlacement(request.query.get("placement"));
  const current = await listProfileMedia(account.accountId);
  assertProfileMediaCapacity(current.length);
  const usedSlots = new Set(current.map((item) => item.rowKey));
  const slot = ["slot-1", "slot-2", "slot-3", "slot-4", "slot-5"].find((candidate) => !usedSlots.has(candidate));
  if (!slot) throw new HttpError(409, "profile_media_limit", "A profile can contain up to five image or video items.");
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > maxProfileVideoBytes) throw new HttpError(413, "profile_media_too_large", "Profile media must be no larger than 20 MB.");
  const bytes = new Uint8Array(await request.arrayBuffer());
  const media = verifiedProfileMedia(bytes, request.headers.get("content-type"));
  const mediaId = randomUUID();
  const blobName = await uploadPrivateProfileMedia(account.accountId, mediaId, bytes, media.contentType);
  const now = new Date().toISOString();
  const entity: ProfileMediaEntity = {
    partitionKey: account.accountId,
    rowKey: slot,
    mediaId,
    ownerAccountId: account.accountId,
    professionalType: application.professionalType,
    placement,
    mediaKind: media.mediaKind,
    contentType: media.contentType,
    blobName,
    status: "private_draft",
    publicationEligible: false,
    createdAt: now,
    updatedAt: now,
  };
  await saveProfileMedia(entity);
  return jsonResponse(request, 201, { media: profileMediaResponse(entity), maximum_items: 5, request_id: id }, id);
});

export const memberProfileMediaContentHandler = handled(async (request, _context, id) => {
  const options = preflight(request);
  if (options) return options;
  const { account } = await memberContext(request);
  const mediaId = request.params.mediaId ?? "";
  if (!/^[0-9a-f-]{36}$/.test(mediaId)) throw new HttpError(404, "profile_media_not_found", "No private profile media item is stored.");
  const media = await getProfileMedia(account.accountId, mediaId);
  if (!media || media.ownerAccountId !== account.accountId || media.status !== "private_draft") {
    throw new HttpError(404, "profile_media_not_found", "No private profile media item is stored.");
  }
  if (request.method === "DELETE") {
    await removeProfileMedia(media, new Date().toISOString());
    return jsonResponse(request, 200, { status: "removed", publication_eligible: false, request_id: id }, id);
  }
  return binaryResponse(request, 200, await downloadPrivateProfileMedia(media.blobName), media.contentType, id);
});

app.http("memberProfileMedia", {
  methods: ["GET", "POST", "OPTIONS"], authLevel: "anonymous", route: "v1/me/profile/media", handler: memberProfileMediaHandler,
});
app.http("memberProfileMediaContent", {
  methods: ["GET", "DELETE", "OPTIONS"], authLevel: "anonymous", route: "v1/me/profile/media/{mediaId}/content", handler: memberProfileMediaContentHandler,
});
