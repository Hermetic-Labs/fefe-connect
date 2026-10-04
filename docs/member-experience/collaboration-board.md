# Collaboration Board — initial slice

The Collaboration Board is a members-only, structured request surface. It is not a public forum, clinical consultation channel, legal matter workspace, referral guarantee, or messaging system.

## Implemented

- Authenticated `GET /v1/me/collaboration-posts` returns approved, unexpired open requests plus the caller's own recent submissions.
- Authenticated `POST /v1/me/collaboration-posts` creates an owner-scoped `pending_review` request.
- Request types, professional audience, location mode, title, general summary, optional jurisdiction, and response deadline are allow-listed and bounded.
- The caller must attest that the request contains no client, patient, case, privileged, or clinical information.
- Posts expire no later than 30 days after creation and may request responses no more than 90 days out.
- Unknown fields are rejected. New requests are never made public by submission alone.

## Deliberately absent

- public comments or replies;
- direct messages or contact-detail disclosure;
- automated approval;
- attachments;
- case, client, patient, or clinical content;
- endorsements, rankings, lead sales, or referral guarantees.

## Reviewer moderation

The restricted `/review.html` surface and `/v1/reviewer/collaboration-posts` API require an explicit active reviewer entitlement stored against the opaque FEFE account ID. A member cannot grant this entitlement through the browser. Reviewers can approve a pending request into `open` status or decline it; declines require a reason. Each decision records the reviewer account, previous and resulting states, note, and timestamp in the private reviews table. Concurrent or repeated decisions fail closed.

Reviewer access is assigned only through the operator script with a known opaque account ID and operator reference. No production reviewer is inferred from email, profile type, or application ownership.

A later introduction request can notify the post owner without revealing either party's contact details until both consent.
