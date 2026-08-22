# FEFE Connect member-services foundation

**Status:** Prepared in source; identity values remain intentionally blank and no production member submission is enabled.

## Purpose

This slice connects the public membership application to an authenticated, private Azure data path without changing FEFE's review or billing boundaries. A person must sign in through the configured Microsoft Entra customer flow before an application can leave the browser. Applying remains free. Submission never activates a membership and never starts Stripe Checkout.

## Request path

1. The browser initializes MSAL from public values in `site-config.js`.
2. At submission, MSAL obtains an access token for the FEFE API's `access_as_user` scope.
3. `POST /v1/account/bootstrap` validates the token and creates or returns an opaque FEFE account.
4. The browser generates a UUID and sends the allowlisted application to `PUT /v1/applications/{id}`.
5. The API validates the issuer, audience, signature, expiry, and scope; validates every field and current policy version; records an append-only consent event; and stores the application as `submitted`.
6. A submitted application is immutable through the applicant endpoint. An identical retry is idempotent; a changed retry is rejected and must use a correction process.
7. The application is not eligible for Checkout until a separate authorized review changes it to `approved` or `activation_pending`.

## Public frontend configuration

The application remains fail-closed until all of these values are populated:

- `auth.clientId`: public SPA application/client ID
- `auth.authority`: customer sign-up/sign-in authority
- `auth.knownAuthorities`: the permitted External ID authority host
- `auth.apiScope`: exposed API scope, normally `api://<api-client-id>/access_as_user`
- `applicationApiBase`: deployed Function API base URL

No client secret belongs in the SPA or this repository.

## Server identity configuration

The Function requires:

- `ENTRA_ISSUER`
- `ENTRA_JWKS_URI`
- `ENTRA_API_AUDIENCE`
- `ENTRA_REQUIRED_SCOPE=access_as_user`

If any required identity value is blank, protected endpoints return `503 authentication_not_configured`. Tokens with the wrong issuer, audience, signature, lifetime, or scope are rejected.

## Storage layout

All Blob containers have public access disabled. The Function uses its user-assigned managed identity; shared-key access remains disabled.

| Resource | Purpose | Initial publication rule |
|---|---|---|
| `profile-images` | Processed member profile images | Private; future API-mediated reads only |
| `upload-quarantine` | Original uploads awaiting signature checks, metadata removal, and review | Never public |
| `verification-evidence` | Source responses and reviewer evidence permitted by policy | Never public |
| `accounts` | FEFE-owned account IDs linked to external token subjects | Private |
| `identitylinks` | Provider-neutral links from external identity subjects to FEFE account IDs | Private |
| `applications` | Versioned applicant-provided professional details and review state | Private |
| `consentevents` | Append-only application policy acceptances | Private and immutable through public API |
| `profiles` | Approved member profile records | Member visibility only after authorization is implemented |
| `organizations` | Firm or practice records | Member visibility only after authorization is implemented |
| `memberships` | Organization roles and seats | Private |
| `reviews` | Human-review decisions | Reviewer-only |
| `verificationresults` | Dated, source-specific results | Reviewer-only until a limited public/member representation is approved |
| `pilotentitlements` | Founding Member Pilot eligibility and expiry | Private |
| `auditevents` | Security and administrative actions | Operator-only |

Existing billing tables remain unchanged.

## Application contract

Only the following fields are accepted: professional type, plan key, applicant name and professional email, organization, jurisdiction, credential number, HTTPS website, profile headline, biography, specialties, optional endorsement, current policy versions, and five required attestations.

Unknown fields are rejected. This prevents patient, client, case, clinical, or privileged fields from being silently added to the stored contract. Applicants are still instructed not to place sensitive information in free-text fields; reviewer controls and moderation remain necessary.

## Not implemented in this slice

- Customer Entra tenant and app-registration values
- Reviewer authentication and decisions
- Direct uploads or image processing
- Profile publication and member directory authorization
- Organization seat management
- Pilot entitlement administration
- Email notifications
- Live Stripe charges

Those functions must remain unavailable until their authorization and lifecycle tests exist.
