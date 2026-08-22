# FEFE Connect launch build plan

**Plan status:** Approved direction; execution pending

**Launch target:** Invitation-only Georgia pilot

**Production operator:** Elevated Perspectives Psychotherapy, LLC

**Last updated:** 2026-08-22

## 1. Outcome

Ship a defensible first production release in which an eligible Georgia legal or mental-health professional can:

1. create a protected account and complete multifactor authentication;
2. submit a free professional application and separately accept the current policies;
3. receive a documented, human-reviewed credential decision;
4. activate an approved membership through Stripe Checkout;
5. create a professional profile and browse other active, verified members; and
6. manage billing, profile visibility, and account closure without exposing payment secrets or sensitive professional-client information.

The pilot is complete only when the entire path works with production identity, production storage, signed Stripe webhooks, auditable consent and verification records, monitored support, and an approved launch checklist.

## 2. Pilot boundary

### Included

- Invitation-only Georgia applicants.
- Individual and Organization memberships.
- Georgia attorney, law-firm/entity, and selected Georgia mental-health licence review under documented source procedures.
- NPPES corroboration when an applicant supplies an NPI; NPI results never substitute for licensure.
- Manual-first reviewer workflow with narrowly worded verification results.
- Member profiles, private profile-image storage, member directory, and professional contact details or introduction requests.
- Stripe-hosted subscription Checkout and Customer Portal.
- Organization administrators and three included seats; paid additional seats after organization activation.
- Microsoft Entra External ID as the first identity provider with MFA.

### Excluded from the pilot

- Unsupported states or countries, even when the public website is visible there.
- Automated scraping of regulator websites or any source without documented permission.
- Legal advice, healthcare delivery, emergency services, referrals based on professional fees, or guarantees of suitability.
- Patient/client identities, case facts, privileged material, PHI, therapy notes, clinical records, or document exchange.
- Internal case or clinical messaging.
- Client/patient testimonials, sponsored ranking, lead fees, and success fees.
- Google sign-in. The identity model will support adding it later without changing member records.

## 3. Current baseline

| Capability | Current state | Launch implication |
|---|---|---|
| Public site and custom domain | Live at `https://fefeconnect.com` | Retain GitHub Pages for the pilot. |
| Legal and trust pages | Published as attorney-review drafts | Counsel and operator approval still required. |
| Azure API | Deployed and healthy | Protected endpoints remain fail-closed until Entra is configured. |
| Azure storage, managed identity, Key Vault, and telemetry | Deployed | Reuse; add only the application/profile/reviewer behaviors required below. |
| Stripe | Dedicated FEFE sandbox connected to Azure | Keep in sandbox until the final launch phase. |
| Onboarding | Browser-only three-step preview | Replace preview submission with an authenticated API workflow. |
| Verification | Schemas, source matrix, and decision policy documented | Build the reviewer workflow and manual evidence records. |
| Member product | Profile presentation only | Add persistent profiles, directory access, and organization membership. |
| Tests | API build, six unit tests, and dependency audit pass | Add auth, storage, endpoint, webhook, and browser integration coverage. |

## 4. Non-negotiable design rules

1. FEFE owns an immutable internal account ID. External identity subjects, email addresses, Stripe customers, applications, profiles, and organization memberships map to it; none of them becomes the primary account key.
2. Entra establishes account access, Stripe establishes payment state, and the verification workflow establishes credential status. One system cannot silently grant the status owned by another.
3. Only signed Stripe webhooks activate or revoke paid membership. A browser success redirect is informational.
4. Only a completed verification decision can create a public verified indicator. Payment, an NPI, an entity record, or a successful login is insufficient by itself.
5. The server selects authoritative policy versions and writes append-only acceptance events. Browser hidden values are never the audit record.
6. Unsupported jurisdictions fail closed. A source outage or ambiguous match goes to human review and never becomes an automatic adverse decision.
7. Stripe secrets, raw regulator evidence, access tokens, and private images never enter the public repository or public Blob containers.
8. The pilot does not accept professional-client content. Forms, help text, validation, support procedures, and logs must reinforce that boundary.

## 5. Execution phases

### Phase 0 — Reconcile source control

**Goal:** Make the repository the authoritative description of the already connected Stripe sandbox and Azure configuration.

Deliverables:

- Review the five current local Stripe/Azure documentation and Bicep changes.
- Commit them on a `codex/` branch, open a pull request, merge after checks, and verify GitHub Pages/API health.
- Confirm no key, signing secret, tax identifier, personal test record, or session URL is tracked.
- Record the deployed Azure settings and Stripe sandbox identifiers in the operating documentation using non-secret values only.

Exit gate:

- `main` matches the safe deployed configuration, the worktree is clean, and rollback references a known commit.

### Phase 1 — Customer identity and MFA

**Goal:** Establish a production-quality customer sign-in boundary before collecting applicant data.

Deliverables:

- Create or select the FEFE customer-facing Microsoft Entra External ID tenant.
- Register the browser SPA and protected Azure API separately.
- Configure production redirect/logout URLs for `https://fefeconnect.com` and approved local development URLs.
- Define the API scope, issuer, audience, known authority, and required token claims.
- Configure the customer sign-up/sign-in flow and require MFA under the selected External ID policy.
- Add the Privacy Notice URL and monitored privacy contact to the tenant configuration.
- Configure the Function App token-validation settings and populate only public identifiers in `site-config.js`.
- Implement account bootstrap that creates the immutable FEFE account ID and an external-identity link.
- Retain a provider-neutral identity-link table so Google can be added later without re-keying accounts.

Required tests:

- Sign-up, sign-in, sign-out, token renewal, MFA enrollment/challenge, password reset, and duplicate-email behavior.
- Missing, expired, wrong-issuer, wrong-audience, wrong-scope, and altered token rejection.
- A valid user cannot retrieve or modify another user's record by changing a URL identifier.

Exit gate:

- A real External ID user can obtain a scoped access token; every protected endpoint fails closed for all invalid token cases.

### Phase 2 — Persistent applications and consent

**Goal:** Replace the onboarding preview with a real, minimal-data application workflow.

Deliverables:

- Add authenticated endpoints to create, save, submit, and retrieve the caller's application.
- Validate requests against the versioned legal and healthcare submission schemas.
- Generate server-owned application IDs and bind every application to the immutable FEFE account ID.
- Store append-only acceptance events for Terms, Privacy, Intended Use, Verification Disclosure, and billing disclosures.
- Record canonical policy hashes, versions, locale, server timestamp, account, and request/correlation ID.
- Add rate limiting, request-size limits, duplicate-submission handling, safe errors, and structured audit events.
- Remove the `status=approved&application=preview` path from production behavior.
- Add notice-at-collection copy at every personal-data entry point and explicit warnings against client/case/clinical information.

Application states:

`draft → submitted → under_review → changes_requested | approved | declined → activation_pending → active → inactive`

Required tests:

- Valid legal and mental-health submissions.
- Missing consent, stale policy version, extra fields, overlong values, duplicate requests, and prohibited-content warnings.
- Resume draft, submit once, request corrections, resubmit, and retrieve only the caller-owned application.

Exit gate:

- A signed-in applicant can submit a durable application, and the server can reproduce exactly what policies were accepted without trusting browser-only state.

### Phase 3 — Reviewer and verification operations

**Goal:** Give an authorized operator a defensible way to reach and maintain a verification decision.

Deliverables:

- Create an operator-only reviewer interface or tightly controlled reviewer command workflow.
- Define least-privilege roles for applicant, member, organization administrator, reviewer, compliance administrator, and platform operator.
- Create a review queue with assignment, notes, source checks, match confidence, escalation, correction, approval, and decline actions.
- Implement the normalized verification result and evidence-reference records defined in `docs/verification`.
- Store source authority, jurisdiction, raw status, normalized result, checked time, reviewer, adapter/procedure version, expiry/recheck date, and public wording.
- Implement manual Georgia attorney, entity/firm, and mental-health licence procedures without scraping.
- Add the supported NPPES API adapter for exact NPI corroboration, with rate limits and response minimization.
- Require separate organization-affiliation evidence; entity existence alone does not prove affiliation.
- Add correction/appeal, recheck, expiry, suspension, and source-outage workflows.
- Make evidence private, access-logged, retention-controlled, and unavailable to public profiles.

Required tests:

- Positive, negative, ambiguous, unavailable-source, expired, mismatch, correction, appeal, and recheck cases.
- Reviewer authorization boundaries and audit completeness.
- No `verified` result from payment, identity, entity-only, NPI-only, unknown, or timed-out states.

Exit gate:

- An authorized reviewer can approve a representative Georgia legal and mental-health application using documented evidence, and an independent reviewer can reconstruct the decision.

### Phase 4 — Profiles, directory, and organizations

**Goal:** Deliver the minimum member value promised by the public site.

Deliverables:

- Add profile create/edit/publish/unpublish endpoints and member-facing UI.
- Store profile images in private Azure Blob Storage with file-type, size, metadata, and malware-safety controls; serve only transformed or short-lived authorized content.
- Limit public/profile claims to the approved verification result, authority, jurisdiction, and last-check date.
- Add an authenticated directory with profession, specialty, jurisdiction, organization, and availability filters.
- Enforce active membership plus current verification for directory visibility and verified indicators.
- Support organization creation, administrator ownership, invitations, three included seats, removal, and role changes.
- Provide a constrained professional contact method. Do not add case/clinical messaging or file transfer during the pilot.
- Add self-service profile visibility, export/request intake, and account-closure controls.
- Keep client/patient testimonials disabled for the pilot.

Required tests:

- Profile ownership, safe image upload, directory authorization, search/filter accuracy, hidden/suspended profiles, expired verification, and membership cancellation.
- Organization invitation, duplicate seat, removed member, administrator transfer, and cross-organization access.

Exit gate:

- Two active pilot members can find one another through accurate, access-controlled profiles, while inactive or unverified records remain hidden.

### Phase 5 — Billing completion

**Goal:** Finish every sandbox billing behavior before introducing live credentials.

#### Founding Member Pilot offer

Use a limited founding cohort to create enough trustworthy profiles for the directory to be useful. Do not market this as an unconditional “free month,” because participation requires a non-monetary contribution. The public description should be materially similar to:

> Approved founding participants receive 30 days of FEFE Connect pilot access at no monetary charge in exchange for completing a verified professional profile and structured product-feedback sessions. No card is required, access does not renew automatically, and paid membership is optional when the pilot period ends.

Pilot rules:

- Start with a balanced, named cohort—planning default: 12 legal and 12 mental-health professionals—then adjust only after measuring directory usefulness and reviewer capacity.
- Require the normal identity, credential, affiliation, and verification process. The pilot offer never creates or accelerates a verified result.
- Start the 30-day period only after approval, required verification, profile completion, and acceptance of a versioned Founding Pilot Participation Addendum.
- Give Individual participants one seat. Give approved Organization participants the three included seats; every professional occupying a seat still completes the applicable individual vetting. Paid additional seats begin only after conversion.
- Require a complete accurate profile, one short onboarding session, two structured feedback check-ins, and prompt correction of reported profile inaccuracies.
- Do not require referrals, public endorsements, testimonials, social posts, client/patient information, or favorable feedback. Do not pay for introductions or professional engagements.
- Permit one founding pilot period per person or organization account, enforced by internal account and organization IDs rather than email alone.
- Store `pilot_started_at`, `pilot_expires_at`, offer/addendum version, participation status, feedback checkpoints, and the approving operator as separate auditable records.
- Send clear reminders before expiration. At expiration, unpublish directory access unless the member explicitly chooses paid Checkout; never auto-charge, back-charge, or silently create a Stripe subscription.
- Retain or delete the inactive profile and application only under the approved retention/privacy procedure.

Success measures:

- application-to-approved rate and median review time;
- verified-profile completion rate;
- directory searches and meaningful professional contact requests;
- feedback-session completion and reported trust/usability problems;
- pilot-to-paid opt-in rate; and
- early cancellation, support, correction, and safety incidents.

Deliverables:

- Connect the authenticated frontend to the deployed Azure API only after Phases 1–3 pass.
- Seed approved test applications using real Entra subjects and replace the preview activation link.
- Add a server-owned `pilot_access` entitlement that is separate from Stripe subscription state and expires automatically at the recorded time.
- Build invite issuance, cohort limits, one-offer enforcement, feedback-checkpoint tracking, expiry reminders, and explicit conversion-to-paid behavior.
- Confirm Individual at $29/month and Organization at $79/month with three included seats.
- Implement additional seats at $20/month as a recurring item on the organization's existing subscription, controlled only by an organization administrator.
- Display and record the exact additional-seat quantity, price, renewal impact, and any proration before confirmation.
- Expand the restricted Stripe permission only if required for subscription-item updates, and document why the added permission is necessary.
- Add webhook receipt durability, retry/dead-letter operations, and a scheduled Stripe reconciliation job.
- Send durable membership confirmation and cancellation instructions through the selected transactional-email provider.
- Finish Customer Portal entry from the authenticated account area.

Required sandbox scenarios:

- Founding invite accepted, invalid/used invite, unverified applicant, pilot start, repeated offer attempt, reminder delivery, explicit paid conversion, expiration without conversion, and organization-seat handling.
- Individual and Organization purchase, duplicate Checkout request, abandoned Checkout, successful payment, declined card, delayed webhook, replayed webhook, renewal, payment failure/recovery, added/removed seats, cancellation, reactivation, refund, dispute, and expired card.
- Checkout success without a webhook never activates access.
- A paid but unverified or suspended account never receives a public verified profile.

Exit gate:

- The full billing lifecycle passes in the dedicated FEFE sandbox with no manual database repair and no secret or price authority in the browser.

### Phase 6 — Security, legal, privacy, and operations

**Goal:** Turn a functioning application into an operable pilot.

Deliverables:

- Obtain operator and counsel approval of the public documents in the context of the implemented product.
- Confirm the LLC legal name, mailing address, Georgia status, FEFE Connect trade-name decision, and responsible Stripe account parties.
- Activate and monitor `hello@fefeconnect.com` with privacy, billing, verification, safety, and legal escalation procedures.
- Approve the data inventory, processor/subprocessor register, retention/deletion schedule, backup expiry, legal-hold process, and privacy-request procedure.
- Complete Georgia professional-responsibility, mental-health boundary, HIPAA/business-associate, recurring-billing, and insurance reviews appropriate to the actual pilot.
- Adopt incident response, access review, member conduct, verification correction/appeal, law-enforcement request, and breach-notification procedures.
- Add production security controls for CSP, referrer policy, permissions policy, HTTPS/HSTS strategy, dependency scanning, rate limiting, log redaction, and secret rotation.
- Configure Application Insights availability checks, error and webhook-failure alerts, an Azure cost budget, support runbooks, backup/restore checks, and an operator status dashboard.
- Complete keyboard, focus, error, mobile, zoom, reduced-motion, and screen-reader accessibility review.
- Publish the vendor/subprocessor disclosure and make historical policy versions retrievable internally.

Exit gate:

- Every item in `docs/legal/README.md` applicable to the Georgia pilot has an owner, evidence, and written disposition; monitoring and incident procedures have been exercised at least once.

### Phase 7 — Production payment cutover and pilot launch

**Goal:** Introduce real payments only after every prior gate passes.

Deliverables:

- Complete Stripe live-account verification under the correct LLC, representative/owner, tax, bank, support, Terms, and Privacy information.
- Create live Products, Prices, Customer Portal configuration, restricted key, and webhook endpoint separately from sandbox resources.
- Store live secrets in Key Vault, preserve sandbox secrets for testing, and establish an explicit environment-selection control.
- Decide and configure sales-tax handling with appropriate tax/accounting advice.
- Run a production smoke test with a controlled low-risk real transaction, verify the receipt/webhook/membership/Portal/cancellation path, and document its disposition.
- Configure `api.fefeconnect.com` and managed HTTPS if adopted; update CORS, redirect URIs, monitoring, and frontend configuration only after certificate validation.
- Freeze the launch commit, record rollback steps, on-call contacts, and the Stripe/Azure kill switches.
- Invite a small named cohort, monitor daily, and expand only after the pilot review.

Exit gate:

- The launch owner signs the production checklist; one controlled end-to-end transaction passes; rollback and payment-disable procedures are tested; no unresolved severity-1 or severity-2 issue remains.

## 6. Work order and dependencies

| Order | Work package | Depends on | Relative effort |
|---:|---|---|---|
| 1 | BL-001 Source-control reconciliation | None | Small |
| 2 | BL-100 Entra External ID and account bootstrap | BL-001 | Medium |
| 3 | BL-200 Persistent applications and consent ledger | BL-100 | Large |
| 4 | BL-300 Reviewer roles, queue, and Georgia manual verification | BL-200 | Large |
| 5 | BL-310 NPPES corroboration adapter | BL-300 policy model | Medium |
| 6 | BL-400 Profiles and private image storage | BL-100, BL-300 | Large |
| 7 | BL-410 Directory and professional contact path | BL-400 | Medium |
| 8 | BL-420 Organization membership and seats | BL-100, BL-400 | Large |
| 9 | BL-430 Founding cohort offer and pilot entitlement | BL-200, BL-300, BL-400, BL-420 | Medium |
| 10 | BL-500 Frontend/API/Stripe sandbox completion | BL-200, BL-300, BL-420, BL-430 | Large |
| 11 | BL-600 Security, privacy, legal, accessibility, and operations | Runs throughout; closes after BL-500 | Large |
| 12 | BL-700 Stripe live cutover and controlled pilot | All prior gates | Medium |

“Small,” “Medium,” and “Large” are sequencing aids, not delivery promises. Unknowns with regulators, counsel, Stripe verification, and identity policy are external dependencies and should not be hidden inside engineering estimates.

## 7. Decisions and inputs required during execution

| Decision | Default for planning | Needed by |
|---|---|---|
| Pilot geography | Georgia only | Phase 2 |
| Enrollment | Invitation-only | Phase 1 |
| Applicant classes | Georgia attorneys and documented Georgia mental-health licence classes supported by the approved reviewer procedure | Phase 3 |
| Verification access | Manual primary-source review; NPPES API only for NPI corroboration | Phase 3 |
| Member communication | Directory plus constrained professional contact; no internal case/clinical messaging | Phase 4 |
| Testimonials | Disabled | Phase 4 |
| Authentication | Entra External ID with MFA; Google later | Phase 1 |
| Billing order | Free application and approval; 30-day founding pilot at no monetary charge; optional Checkout at expiry | Phase 2 and Phase 5 |
| Founding value exchange | Complete verified profile, onboarding session, and two structured feedback check-ins; no referral, testimonial, or favorable-review requirement | Phase 5 |
| Founding conversion | No card and no automatic renewal; paid membership requires a new affirmative Checkout action | Phase 5 |
| Additional seats | One recurring subscription item per organization with explicit quantity/disclosure | Phase 5 |
| Support address | `hello@fefeconnect.com`, once activated and monitored | Phase 6 |
| Retention periods | Current legal draft pending operator/counsel approval and implementation | Phase 6 |

## 8. Release gates

### Gate A — Safe data collection

- Entra/MFA and account ownership tests pass.
- Policies, notice at collection, consent ledger, storage, rate limits, and support intake are active.
- The application no longer uses preview submission in production.

### Gate B — Safe verification

- Georgia procedures and reviewer permissions are approved.
- Evidence, decisions, rechecks, corrections, and audit records work.
- Public wording cannot overstate the checked claim.

### Gate C — Useful paid product

- Profiles, directory, organization access, and billing lifecycle work end to end.
- Founding access starts only after vetting, expires automatically, and cannot charge or renew without a new affirmative Checkout action.
- Suspension, cancellation, expired verification, and privacy requests produce the expected access changes.

### Gate D — Live money

- Counsel/operator checklist, Stripe live account, monitoring, incident response, and controlled production transaction pass.
- Launch owner explicitly approves enabling live credentials.

## 9. Definition of done for the Georgia pilot

The pilot is done when all of the following are true:

- The repository, Azure deployment, public configuration, and runbooks agree.
- A new user can complete MFA, submit an application, and receive status updates.
- A reviewer can produce a reconstructable Georgia verification decision without unauthorized scraping.
- An approved founding participant can receive one auditable 30-day pilot entitlement, complete the required feedback exchange, and expire without a card or automatic subscription.
- An approved applicant can subscribe, and only a signed webhook activates membership.
- An active verified member can maintain a profile and discover other eligible members.
- Organization administrators can manage included and paid seats without crossing organization boundaries.
- Cancellation, nonpayment, suspension, expired verification, and account closure remove access correctly.
- Exact policy and billing acceptances are queryable as append-only audit events.
- No secret, PHI, privileged material, regulator evidence, or client/case content appears in public storage or ordinary logs.
- Accessibility, security, privacy, legal, billing, monitoring, backup, incident, and rollback gates have named owners and recorded evidence.
- The launch owner has explicitly approved live Stripe credentials and the invitation-only pilot cohort.

## 10. After the pilot

Google sign-in, additional US states, international markets, new credential types, automated or bulk regulator sources, richer communications, mobile applications, testimonials, ranking, and referral-like features each require their own product, source-permission, privacy, professional-responsibility, and security review. None should inherit Georgia pilot approval automatically.
