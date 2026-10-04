# FEFE member experience contract

**Status:** Shared applicant-home and owner-only profile-draft slices implemented; reviewer-backed professional-record branches remain gated
**Date:** 2026-10-04
**Scope:** The signed-in experience after account creation, for applicants and eventually approved members

## 1. Product truth at this boundary

The deployed system can authenticate a customer, create an opaque FEFE account, accept a versioned application, store consent, return an owner-scoped My FEFE home, and save private professional profile drafts and owner-only draft photos. It does not yet make reviewer decisions, create verified profile records, publish profiles, list members, match professionals, send messages, or activate paid membership. The profile customization and photo security boundary is documented in [private-profile-customization.md](private-profile-customization.md).

The member experience must therefore begin as a private record of what FEFE actually knows. It must never imply that sign-in, payment, an NPI, an organization record, or a submitted application means that a professional has been approved or verified.

The fictional clinician application used in acceptance remains private and unpublished.

## 2. Successful endpoint for each branch

The deepest useful screen is a professional-record detail view, not a generic dashboard.

### Legal professional endpoint

The legal branch ends at **My legal record**. It lets the member understand, separately:

1. each bar or court admission FEFE reviewed;
2. the narrow standing claim supported by the named authority and check date;
3. the law-firm entity record, if one was reviewed; and
4. the member's affiliation with that firm, if separately confirmed.

The successful outcome is: “I can see exactly which legal credential and organization claims FEFE supports, when each was checked, and what I must correct or report.” It is not “FEFE recommends me,” “my entire background is clear,” or “I may practise everywhere shown on my profile.”

Proposed branch endpoint, once reviewer records exist:

`GET /v1/me/records/legal`

### Mental-health professional endpoint

The mental-health branch ends at **My professional licence record**. It lets the member understand, separately:

1. each licence FEFE reviewed, including profession, licence type, jurisdiction, and authority;
2. the narrow standing claim supported by that check;
3. optional NPPES corroboration, clearly labeled as corroboration rather than licensure;
4. the practice entity record, if one was reviewed; and
5. the member's affiliation with that practice, if separately confirmed.

The successful outcome is: “I can see exactly which professional licence and practice claims FEFE supports, when each was checked, and what I must correct or report.” It is not clinical credentialing, a background check, authorization to practise across borders, or a guarantee of care quality.

Proposed branch endpoint, once reviewer records exist:

`GET /v1/me/records/mental-health`

Both responses use the shared [professional-record-detail schema](schemas/professional-record-detail.schema.json). The `professional_type` discriminator selects the legal or mental-health branch.

## 3. Progressive-disclosure map, built backward

```text
My FEFE
├─ No application ──> Start application
├─ Applicant ───────> Application overview ──> Submitted profile/status detail
└─ Approved/active ─> Branch overview
                      ├─ Legal record ─────────> One admission/entity/affiliation claim
                      └─ Licence record ───────> One licence/NPI/entity/affiliation claim
```

| Level | View | Question answered | Data shown | Data withheld |
|---|---|---|---|---|
| 4 | Claim detail | What exactly did FEFE check? | Claim type, credential label, masked identifier, jurisdiction, authority, user-facing status, checked/valid-through dates, narrow wording, correction/report actions, limitation disclosure | Raw source response, private evidence URI, reviewer identity, internal notes, match scores, rule output, hidden reason codes |
| 3 | Professional record | Which claims make up my FEFE record? | Legal admissions or clinical licences, plus separately labeled entity, affiliation, and optional NPI summaries | Other applicants, directories, matches, messages, private evidence |
| 2 | Application or member overview | Where am I in the process? | Application state, submitted profile snapshot, review progress, available next action, professional-record summary only when supported | Reviewer queue details, unsupported predictions, approval dates not yet recorded |
| 1 | My FEFE home | What needs my attention now? | Signed-in identity, one primary status, most recent owned application, one primary action, small truthful cards | Empty feature chrome, speculative member tools, billing activation unless separately ready |

The interface should reveal a deeper level only when its backing record exists. An absent verification result is represented as absent or “not started”; the client must not synthesize a pending or verified claim from application fields.

Home card order is deterministic: primary status, application, real branch record (when present), submitted profile, next steps, then support. Omit unavailable optional cards instead of filling the page with disabled tools.

## 4. First signed-in view by lifecycle state

The first signed-in view is **My FEFE**, backed by the proposed `GET /v1/me/home` response and [member-home schema](schemas/member-home-response.schema.json).

| State | Primary message | Primary action | Cards shown |
|---|---|---|---|
| No application | “Your FEFE account is ready.” | Start an application | Account summary, application empty state |
| Submitted | “Your application was received.” | View submitted application | Application status, submitted profile snapshot, next-step explanation |
| Under review | “Your application is being reviewed.” | View review status | Application status, profile snapshot, any user-safe review update |
| Changes requested | “We need information from you.” | Supply the requested correction | Application status and an explicit, bounded request; no free-form case or clinical upload |
| Approved | “Your application is approved.” | View approval summary | Approval status and any real professional-record summaries; activation remains a separate product boundary |
| Declined | “FEFE could not approve this application.” | Request review or contact support | Decision summary, correction/review route, policy-safe explanation; no public badge or profile |
| Active member | “Your FEFE record is active.” | View professional record | Current record, profile state, recheck date, any action-required item |
| Inactive member | “Your FEFE access is inactive.” | View status or contact support | Historical status permitted by policy; no directory or profile-publication controls unless those systems exist |

`changes_requested` is part of the planned lifecycle but is not implemented in the current `ApplicationStatus` type. It must not appear in production until the reviewer action, applicant correction contract, and audit event exist.

## 5. Branch view maps

### Legal

`My FEFE` → `Legal application` or `Legal member overview` → `My legal record` → one claim detail

Legal record cards:

- **Professional standing:** one card per reviewed bar or court admission.
- **Firm entity:** “Entity record checked” only when that separate claim exists.
- **Firm affiliation:** “Organization affiliation confirmed” only when that separate claim exists.
- **Submitted profile:** applicant-supplied headline, biography, specialties, website, and organization, labeled “submitted” until approved for member use.

Meaningful actions:

- view the submitted application;
- view a supported claim detail;
- report a material change;
- request correction of a displayed fact;
- supply a specifically requested correction when that workflow exists; and
- contact support.

There is no “find a clinician,” “send introduction,” “message,” or “browse members” action until an authorized directory/contact product exists.

### Mental health

`My FEFE` → `Mental-health application` or `Professional member overview` → `My professional licence record` → one claim detail

Mental-health record cards:

- **Professional licence:** one card per reviewed licence, preserving profession, licence type, authority, and jurisdiction.
- **NPI corroboration:** optional and visually subordinate. Its wording must state that an NPI does not establish licensure or credentialing.
- **Practice entity:** “Entity record checked” only when that separate claim exists.
- **Practice affiliation:** “Organization affiliation confirmed” only when that separate claim exists.
- **Submitted profile:** the same applicant-supplied fields as the legal branch, labeled “submitted” until approved for member use.

The actions are the same as the legal branch. There is no patient intake, care delivery, diagnosis, referral routing, case discussion, clinical messaging, or file exchange.

## 6. Shared and branch-specific schemas

### Shared home/card envelope

Every card has:

- a stable `card_id` and typed `kind`;
- a short title and summary;
- a user-facing `state`;
- a disclosure level;
- zero or more allowlisted semantic actions; and
- a typed payload selected by `kind`.

Shared card kinds:

- `application_status`
- `submitted_profile`
- `next_steps`
- `support`

Branch-specific card kinds:

- `legal_record_summary`
- `mental_health_record_summary`

The API, not the browser, chooses card kind, state, wording, and actions. This prevents a client from converting a successful sign-in, application submission, or payment redirect into an approval or verified indicator.

### Shared claim shape

Legal standing, clinical licence, entity, affiliation, and NPI summaries share:

- opaque `claim_id`;
- `claim_type`;
- user-facing `status`;
- label, authority, and jurisdiction;
- optional masked identifier;
- checked and valid-through dates when supported;
- narrow public wording only after a valid decision;
- limitation disclosure; and
- allowlisted actions.

The detail schema deliberately excludes raw evidence, evidence hashes, private object URIs, reviewer IDs, internal notes, match classifications, and internal reason codes. Those remain reviewer-only under `verification-result.schema.json`.

### Branch discriminators

The legal detail payload requires `bar_admissions` and may include `firm_entity` and `firm_affiliation`.

The mental-health detail payload requires `licenses` and may include `npi_corroboration`, `practice_entity`, and `practice_affiliation`.

NPI remains a separate `npi_record` claim and can never satisfy the required licence collection.

## 7. User-facing status rules

Application lifecycle and verification status are different dimensions.

### Application status

Use the stored lifecycle values: `submitted`, `under_review`, `approved`, `activation_pending`, `active`, `declined`, and `inactive`. `draft` is reserved for a real server-side draft feature. `changes_requested` is planned and must be added explicitly before use.

### Claim status

The reviewer model may store `verified`, `needs_review`, `not_verified`, `source_unavailable`, or `expired`. The applicant/member presentation maps them conservatively:

| Internal result | User-facing state | Presentation rule |
|---|---|---|
| No result | `not_started` | Say no check result is available; do not say “pending” unless work was actually queued. |
| `needs_review` | `in_review` | Neutral wording; this is not an adverse finding. |
| `source_unavailable` | `temporarily_unavailable` | Explain that the source could not be completed and that this is not an adverse finding. |
| `verified` and current | `verified` | Show the narrow wording, authority, date, and validity window. |
| `expired` | `expired` | Remove verified presentation and show recheck/report options. |
| `not_verified` | `not_verified` | Show only an authorized, user-safe explanation and correction/review path. Never expose internal evidence or imply misconduct without a separate decision. |

### Empty, pending, and declined states

- Empty states name the missing record and provide one possible action. They do not render empty grids of unavailable tools.
- Pending states include what happened, what FEFE will do next, whether the applicant must act, and the last meaningful update time.
- Declined states use “not approved” for the application decision. They do not describe the person as “unverified,” publish the result, or expose source details beyond the approved explanation.
- A source outage, timeout, unsupported jurisdiction, or ambiguous match is never displayed as a decline.

## 8. Disclosure and authorization rules

1. `GET /v1/me/*` resources are owner-scoped through the opaque FEFE account ID derived from the validated token. Email is not an authorization key.
2. The browser never supplies experience mode, card state, verified wording, or permitted actions.
3. An application is private to its owner and authorized reviewers. It is not a profile.
4. A professional-record card exists only from a stored normalized verification result or reviewer decision, never directly from the application claim.
5. Overview cards mask credential identifiers. An owner detail may show the submitted identifier only when justified; public/member views use the approved masked or omitted representation.
6. Public/member verified wording requires a current `verified` decision. Entity and affiliation claims remain separate.
7. Internal evidence, reviewer notes, integrity hashes, match values, and reason codes never enter the member-home response.
8. Legal and healthcare free text must continue to reject or warn against client, patient, case, privileged, and clinical content.
9. Suspended or closed accounts receive no member record beyond the minimum status/support response allowed by policy.
10. A future directory or connection tool must use its own authorization and data contract; it is not implied by these schemas.

## 9. Proposed API surface

These are contracts for the next implementation, not claims about currently deployed routes.

| Method and route | Purpose | Build status |
|---|---|---|
| `GET /v1/me/home` | Return the first signed-in view using the home schema | Smallest next slice |
| `GET /v1/applications/{id}` | Return an owner-scoped application/status resource | Exists, but currently returns only status, branch, checkout eligibility, and limited verification metadata |
| `GET /v1/me/records/legal` | Return the legal professional record detail | Blocked on reviewer decisions and normalized records |
| `GET /v1/me/records/mental-health` | Return the mental-health professional record detail | Blocked on reviewer decisions and normalized records |
| `GET /v1/me/claims/{claim_id}` | Return one member-safe claim detail | Later; must project from normalized results and strip reviewer-only fields |

The branch routes may share one handler and storage projection, but separate paths keep contracts and tests explicit. A request to the wrong branch returns `404`, not a converted or empty record.

### Current data gaps that prevent the deep views

- The application row contains one jurisdiction and one credential number, while both branches need one or more separately typed professional-standing claims.
- The application row's single `verificationSource` and `verificationCheckedAt` fields cannot represent professional standing, entity, affiliation, and NPI as independent decisions.
- The `verificationresults`, `profiles`, `organizations`, `memberships`, and `reviews` tables are provisioned by name but do not yet have public member projections or lifecycle handlers.
- There is no account-to-application lookup endpoint, so a returning user cannot recover an application after losing its URL.
- There is no reviewer action that can safely produce `under_review`, `changes_requested`, `approved`, or `declined` with an audit trail.

The deep schemas are therefore target contracts for reviewer-backed data. They must not be populated by copying or inferring the current application claim.

## 10. Smallest coherent implementation slice

Build **My FEFE application status**, locally and behind authenticated APIs, without publishing it yet.

1. Add an account-to-application index or an equivalent owner-scoped query so a returning user can recover the most recent owned application without retaining a URL.
2. Implement `GET /v1/me/home` for only `no_application`, `submitted`, `under_review`, `approved`, `declined`, and `inactive` application states. Do not emit verification cards unless a real normalized result exists.
3. Extend the owner application response with the already stored submitted profile fields, using a member-safe projection and no consent/evidence internals.
4. Create a private local `my-fefe.html` renderer for the shared home cards and branch labels. Use one primary action and progressive links rather than a dashboard grid.
5. Make the site account strip lead signed-in users to My FEFE only after the endpoint and UI state tests pass.
6. Keep approved applications informational. Do not add Checkout, member publication, directory, matching, or messaging in this slice.
7. Add contract tests for every supported state, branch discrimination, absent verification results, suspended accounts, cross-account access, unknown fields, and evidence leakage.
8. Run browser acceptance with fictional legal and clinician accounts. Do not publish the page until the states and copy are operator-approved.

This slice gives a returning applicant a truthful destination and solves the current “signed in, but nowhere to go” problem. It does not depend on billing or pretend the member network exists.

## 11. Exit criteria before broader member UI

- A returning applicant can sign in and recover their application without a saved application ID.
- The first view always has one truthful primary status and at most one primary action.
- Legal and mental-health applications use the correct branch language.
- No current application can display a verified record without a stored decision.
- Empty, pending, approved, declined, inactive, and account-unavailable states have tested copy and behavior.
- Cross-account IDs return `404` and reveal no existence information.
- Member-safe responses contain no raw evidence, reviewer data, internal reason codes, payment secrets, or professional-client content.
- The new page remains unpublished until its local acceptance record is approved.
