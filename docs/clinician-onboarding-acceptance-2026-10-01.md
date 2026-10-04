# FEFE clinician onboarding acceptance — 2026-10-01

> Historical record. The sign-in repair and subsequent durable fictional submission are recorded in [October 4 acceptance](acceptance-2026-10-04.md).

## Scope and controls

- Environment: `https://fefeconnect.com/onboarding.html`
- Role: mental-health professional
- Plan: individual
- Data: clearly fictional test identity, organization, license, profile, and specialties
- Sensitive-data control: no patient, client, clinical, case, emergency, or privileged information entered
- Billing control: no Stripe Checkout opened; no payment or charge attempted
- Identity control: FEFE External ID tenant and Security Defaults left unchanged

## Test record

| Check | Result | Evidence |
| --- | --- | --- |
| Public onboarding page | Pass | Live site loaded over HTTPS and displayed the secure-application notice. |
| Clinician path | Pass | Mental-health professional and individual membership path selected. |
| Three-step form | Pass | Required identity, standing, profile, and policy fields accepted clearly fictional values. |
| Policy acknowledgments | Pass | Accuracy, Terms, Privacy, Intended Use, and Verification Disclosure controls were all required and selected. |
| Submission handoff | Pass | `Submit for review` changed to `Signing in and submitting…` and launched the Entra popup. |
| Entra tenant routing | Pass | Popup used the dedicated `fefeconnect.ciamlogin.com` authority. |
| OAuth request | Pass | Authorization request used FEFE SPA client `5983c194-0f7d-4906-b31c-e6ae14a524fb`, redirect URI `https://fefeconnect.com/onboarding.html`, PKCE, and delegated API scope `api://43c011d2-3e6f-4055-8d66-e6793d9b41d0/access_as_user`. |
| Customer account discovery | Expected boundary | A prefilled administrator address was not present in the customer directory. The popup correctly offered `No account? Create one`. |
| Customer account creation | Pending user action | Password, email verification, OTP, MFA, and final account creation must be completed by the user and were not automated. |
| Access token | Pending | Requires completed customer authentication. |
| Account bootstrap | Pending | Requires a valid customer access token. |
| Protected application API | Pending | Requires account bootstrap and token. |
| Submitted application | Pending | The form remains staged in the opener until authentication returns successfully. |

## Current stopping point

The Entra popup is open at **Sign in**, reports that the prefilled address is not a customer account, and presents **No account? Create one**. This is the correct customer sign-up boundary. The user must complete account creation and all credential, email-verification, OTP, and MFA screens directly.

## Smallest next action

In the already-open Entra popup, the intended tester should select **No account? Create one**, register a controlled test mailbox they can verify, and complete any required MFA. After the popup returns to FEFE, resume this acceptance to record token issuance, account bootstrap, protected API behavior, the application ID/status, and confirmation that Stripe remained untouched.

## Repair assessment

No code or Entra repair is indicated by the evidence collected so far. The prefilled administrator address is browser/login state rather than a FEFE customer account. If this creates confusion for new applicants, the smallest optional UX adjustment is to request an explicit new-account flow from MSAL for first-time applicants or add one sentence beside submission explaining that existing Azure administrator accounts are separate from FEFE customer accounts.
