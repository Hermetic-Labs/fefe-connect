# Legal-professional verification contract

This contract supports individual lawyers and their claimed relationship to a law firm. It does not attempt to “verify a law firm” through a single record; professional standing, entity registration, and affiliation are separate checks.

## Applicant payload

The onboarding API should accept the following logical shape. Names are conceptual until the backend is implemented; the fictional JSON example is [legal-submission.example.json](examples/legal-submission.example.json).

### Identity

| Field | Required | Notes |
|---|---:|---|
| `applicant_id` | Yes | Internal opaque ID, not an email address. |
| `legal_name.given`, `legal_name.family` | Yes | Used for source matching; retain prefixes, middle names, and suffixes separately. |
| `former_names[]` | When applicable | Private matching evidence, never public by default. |
| `professional_email` | Yes | Verify control. A firm-domain address strengthens affiliation but does not prove it. |
| `phone` | Yes | Verify control and use for review callbacks. |
| `residence_country` | Yes | Operational/security context only; it is not a practice jurisdiction. |

Do not collect Social Security numbers, full dates of birth, passport images, or government-ID scans in the first-party form unless a reviewed identity vendor and a specific legal need are added later.

### Bar admissions

At least one item in `bar_admissions[]` is required:

| Field | Required | Notes |
|---|---:|---|
| `country_code` | Yes | ISO 3166-1 alpha-2, such as `US`. |
| `subdivision_code` | If applicable | ISO 3166-2, such as `US-GA`. |
| `authority_name` | Yes | Applicant’s stated bar/court authority. The router still selects the approved source. |
| `bar_number` | Yes where issued | Preserve leading zeros and punctuation in the submitted value; normalize only for comparison. |
| `admission_date` | Optional | Corroborating evidence, not a substitute for current status. |
| `claimed_status` | Optional | Never trust this value as the decision. |
| `is_primary` | Yes | Exactly one primary admission. |

### Firm and affiliation

| Field | Required | Notes |
|---|---:|---|
| `firm.legal_name` | Yes | Name as registered, if an entity exists. |
| `firm.display_name` | Optional | Public-facing brand. |
| `firm.entity_country_code` | Yes | Country of formation. |
| `firm.entity_subdivision_code` | If applicable | State/province of formation. |
| `firm.entity_identifier` | Where issued | Secretary-of-state or equivalent identifier. |
| `firm.website` | Yes | Must use HTTPS in production. |
| `firm.office_address` | Yes | Business contact evidence; do not assume source address equality is definitive. |
| `firm.role` | Yes | Partner, owner, associate, administrator, or other reviewed enum. |
| `firm.authorized_representative` | Yes for non-owner | Name and firm-controlled contact for confirmation. |
| `firm.domain_email_verified` | Derived | Server-generated result, never accepted from the browser. |

### Service jurisdictions

`service_jurisdictions[]` records where the applicant expects to provide or arrange professional services. This list is not inferred from an office address and cannot exceed jurisdictions for which FEFE has a supported policy. Each item needs country, optional state/province, service mode (`in_person`, `remote`, or `referral_only`), and an applicant attestation that the proposed activity is lawful.

The platform must not present membership as authorization to practise across borders. A Georgia bar record, for example, supports a Georgia standing claim only; it does not establish authority in New York or another country.

### Consent and attestations

The applicant must affirm that:

- submitted information is accurate and may be checked against primary sources;
- FEFE may contact the stated firm representative;
- they will report material changes, restrictions, discipline, or loss of affiliation promptly;
- they understand the FEFE check is not regulator approval; and
- they have authority to publish the profile content and testimonials they submit.

Store each attestation and policy acceptance as its own append-only event. Preserve the exact document or disclosure version, canonical-text hash, server timestamp, Entra subject ID, and narrowly scoped security metadata where lawful. Browser-supplied hidden values are hints only; the server selects the authoritative version.

## Verification sequence

1. Normalize the bar number without changing the retained submitted value.
2. Route the admission to the exact country/state authority adapter.
3. Match by unique bar number first; use name only as corroboration. Name-only results always require review.
4. Capture source name, status, admission/registration dates where available, public discipline indicator, source timestamp, and evidence hash.
5. Map the raw status through the adapter allowlist. Unknown status values route to review; they never default to pass.
6. Escalate every public discipline result, limitation, suspension, inactive/not-current status, or identity mismatch to an authorized reviewer.
7. Independently check the firm’s entity record in its formation jurisdiction.
8. Confirm affiliation using a firm-controlled email plus at least one additional measure: listed authority/officer evidence, authorized-representative confirmation, a reviewed firm document, or a documented callback.
9. Produce separate normalized results for the lawyer credential, firm entity, and affiliation.
10. Issue a public check only when the required results are current and the reviewer has resolved all flags.

## Georgia launch path

- Lawyer standing: individual manual review through the [State Bar of Georgia](https://www.gabar.org/) public member directory.
- Firm entity: individual manual review in the Georgia Secretary of State business search when the firm is Georgia-formed.
- Automation: prohibited until FEFE receives and documents permission or a licensed feed/API. The public website’s technical accessibility is not permission. The Bar’s published terms also restrict deep links, so FEFE documentation and product UI should link to the Bar home page unless written permission provides otherwise.
- Evidence: reviewer records the narrow facts needed for the decision, source URL, retrieval time, and an integrity hash. Do not copy or commercially republish the directory profile.

## New York representative path

- Lawyer registration: manual review in the New York Unified Court System attorney search pending an approved automated source.
- Firm entity: manual review in the New York Department of State database for New York-formed entities.
- A free public search is not automatically an API licence. Confirm terms and obtain approval before automating.

## Decision requirements

A lawyer credential may be `verified` only when all applicable checks are true:

- the source is approved for the recorded access mode;
- the unique credential identifier resolves to one person;
- the name is an exact or reviewer-approved alias match;
- the authority-specific status is on the current allowlist;
- discipline/restriction information has no unresolved flag;
- the evidence is within its validity window; and
- an authorized automated rule or human reviewer recorded the decision.

A firm may be shown as “entity record checked” only when the entity record matches. That label must not say or imply that the Secretary of State approves the firm, that every lawyer at the firm was checked, or that the applicant’s affiliation was proven by the entity record alone.
