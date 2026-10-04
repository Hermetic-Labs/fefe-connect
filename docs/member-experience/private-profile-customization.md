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
| `GET /v1/me/profile/media` | Lists up to five owner-scoped private carousel/highlight items. |
| `POST /v1/me/profile/media?placement=carousel\|highlights` | Accepts a signature-checked image up to 5 MB or MP4/WebM video up to 20 MB into a fixed five-slot private draft. |
| `GET /v1/me/profile/media/{mediaId}/content` | Streams one owned private media item through authenticated API access. |
| `DELETE /v1/me/profile/media/{mediaId}/content` | Soft-removes an owned item so its slot can be reused; quarantined bytes remain non-public. |

The profile contract supports:

- display name and factual professional headline;
- an About introduction;
- professional history and education/training sections;
- availability for professional collaboration;
- controlled collaboration modes;
- free-text collaboration interests; and
- a general note to other professionals.

Unknown fields are rejected. The UI and contract do not accept client, patient, case, privileged, or clinical data.

## Photo boundary

Original images are placed in the private `upload-quarantine` container. The API never returns a storage URL or SAS token; the signed-in owner retrieves the bytes through the authenticated endpoint. The photo is marked `private_draft` and `publication_eligible: false`.

Before a photo can become public, a later publication pipeline must decode and re-encode the image, remove metadata, perform the selected security scan, create bounded derivatives, and record human approval. This implementation deliberately does not move originals into `profile-images` or expose them to unauthenticated visitors.

## Standardized profile and media boundary

Both legal and mental-health professionals use one predictable owner preview in this order: Overview; Credentials & standing; Professional history; Focus areas; Collaboration; and Highlights. Submitted credential data is labeled as submitted and does not create a verification claim.

Each member receives five fixed media slots shared by the top carousel and Highlights. The API derives ownership and professional type from the access token and owned application, checks the declared MIME type against file bytes, stores randomized blob names in `upload-quarantine`, and returns no storage URL or SAS token. Videos never autoplay. Removing an item is a soft removal; publication processing and retention/deletion automation remain future controls.

## Publication boundary

There is no publish switch in this slice. A future publish action must separately require:

1. an approved and active member state;
2. supported professional-record review results;
3. moderation of public profile text;
4. a processed, approved image derivative; and
5. an auditable publication event.

Until those controls exist, all customizations remain private draft material.
