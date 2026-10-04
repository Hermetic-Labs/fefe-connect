import assert from "node:assert/strict";
import test from "node:test";
import { HttpError } from "../src/shared/errors";
import { assertProfileMediaCapacity, parseMediaPlacement, verifiedProfileMedia } from "../src/shared/profile-media-contract";

test("accepts the two standardized media placements", () => {
  assert.equal(parseMediaPlacement("carousel"), "carousel");
  assert.equal(parseMediaPlacement("highlights"), "highlights");
  assert.throws(() => parseMediaPlacement("gallery"), HttpError);
});

test("enforces five private profile media items", () => {
  assert.doesNotThrow(() => assertProfileMediaCapacity(4));
  assert.throws(() => assertProfileMediaCapacity(5), (error: unknown) => error instanceof HttpError && error.code === "profile_media_limit");
});

test("validates image and video signatures against claimed types", () => {
  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const mp4 = Uint8Array.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
  const webm = Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3]);
  assert.deepEqual(verifiedProfileMedia(png, "image/png"), { contentType: "image/png", mediaKind: "image" });
  assert.deepEqual(verifiedProfileMedia(mp4, "video/mp4"), { contentType: "video/mp4", mediaKind: "video" });
  assert.deepEqual(verifiedProfileMedia(webm, "video/webm"), { contentType: "video/webm", mediaKind: "video" });
  assert.throws(() => verifiedProfileMedia(png, "video/mp4"), HttpError);
});
