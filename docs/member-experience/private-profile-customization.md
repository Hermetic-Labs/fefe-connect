# Private profile customization

Status: implemented as an owner-only draft surface on `My FEFE`.

## Purpose

The profile editor lets an applicant prepare a professional introduction without turning application submission, sign-in, or profile editing into a public membership or verification claim. The saved record remains private and cannot be published by these endpoints.

## Owner-scoped API

| Endpoint | Behavior |
| --- | --- |
| `GET /v1/me/profile` | Returns the signed-in account's private draft, with safe defaults from its latest owned application. |
| `PUT /v1/me/profile` | Saves bounded, allow-listed professional profile fields. The account ID and professional type come from the validated token and owned application, not from the browser payload. |
| `GET /v1/me/profile/photo` | Streams the signed-in owner's private draft photo through the authenticated API. |
| `PUT /v1/me/profile/photo` | Accepts a JPEG, PNG, or WebP up to 3 MB after content-signature and declared-type checks. |

The profile contract supports:

- display name and factual professional headline;
- an About introduction;
- availability for professional collaboration;
- controlled collaboration modes;
- free-text collaboration interests; and
- a general note to other professionals.

Unknown fields are rejected. The UI and contract do not accept client, patient, case, privileged, or clinical data.

## Photo boundary

Original images are placed in the private `upload-quarantine` container. The API never returns a storage URL or SAS token; the signed-in owner retrieves the bytes through the authenticated endpoint. The photo is marked `private_draft` and `publication_eligible: false`.

Before a photo can become public, a later publication pipeline must decode and re-encode the image, remove metadata, perform the selected security scan, create bounded derivatives, and record human approval. This implementation deliberately does not move originals into `profile-images` or expose them to unauthenticated visitors.

## Publication boundary

There is no publish switch in this slice. A future publish action must separately require:

1. an approved and active member state;
2. supported professional-record review results;
3. moderation of public profile text;
4. a processed, approved image derivative; and
5. an auditable publication event.

Until those controls exist, all customizations remain private draft material.
