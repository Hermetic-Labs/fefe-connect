import { HttpError } from "./errors";
import type { ProfileMediaEntity, ProfileMediaPlacement } from "./storage";

export const maxProfileMediaItems = 5;
export const maxProfileImageBytes = 5 * 1024 * 1024;
export const maxProfileVideoBytes = 20 * 1024 * 1024;

const placements = new Set<ProfileMediaPlacement>(["carousel", "highlights"]);

export function parseMediaPlacement(value: string | null): ProfileMediaPlacement {
  if (!value || !placements.has(value as ProfileMediaPlacement)) {
    throw new HttpError(400, "invalid_media_placement", "Choose either the top carousel or profile highlights.");
  }
  return value as ProfileMediaPlacement;
}

export function assertProfileMediaCapacity(currentCount: number): void {
  if (currentCount >= maxProfileMediaItems) {
    throw new HttpError(409, "profile_media_limit", "A profile can contain up to five image or video items.");
  }
}

export function verifiedProfileMedia(bytes: Uint8Array, claimedType: string | null): {
  contentType: ProfileMediaEntity["contentType"];
  mediaKind: ProfileMediaEntity["mediaKind"];
} {
  const type = claimedType?.toLowerCase();
  const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  const webp = bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  const mp4 = bytes.length >= 12 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70;
  const webm = bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  const detected = jpeg ? "image/jpeg" : png ? "image/png" : webp ? "image/webp" : mp4 ? "video/mp4" : webm ? "video/webm" : undefined;
  if (!detected || type !== detected) {
    throw new HttpError(400, "invalid_profile_media", "Choose a JPEG, PNG, WebP, MP4, or WebM file whose contents match its type.");
  }
  const mediaKind = detected.startsWith("image/") ? "image" : "video";
  const maximum = mediaKind === "image" ? maxProfileImageBytes : maxProfileVideoBytes;
  if (bytes.length > maximum) {
    throw new HttpError(413, "profile_media_too_large", mediaKind === "image" ? "Images must be no larger than 5 MB." : "Videos must be no larger than 20 MB.");
  }
  return { contentType: detected, mediaKind };
}

export function profileMediaResponse(entity: ProfileMediaEntity) {
  return {
    media_id: entity.mediaId,
    placement: entity.placement,
    media_kind: entity.mediaKind,
    content_type: entity.contentType,
    status: entity.status,
    publication_eligible: false,
    created_at: entity.createdAt,
    content_url: `/v1/me/profile/media/${entity.mediaId}/content`,
  };
}
