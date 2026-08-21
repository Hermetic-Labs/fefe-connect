# Verification decision and evidence policy

This policy is the common layer beneath legal, healthcare, entity, NPI, and affiliation checks. Every source adapter emits the same result shape, defined by [verification-result.schema.json](schemas/verification-result.schema.json).

## Result states

| Status | Meaning | Public check |
|---|---|---:|
| `verified` | The approved source and decision rules support the narrow claim, with no unresolved flags, until the recorded expiry. | Yes |
| `needs_review` | Evidence is ambiguous, incomplete, unusual, or requires a human decision. This is not an adverse finding. | No |
| `not_verified` | An authorized decision confirms a material mismatch or an authority-specific ineligible status. | No |
| `source_unavailable` | The approved source could not be reached or completed. This is not an adverse finding. | No |
| `expired` | A formerly verified result passed its validity window without a successful recheck. | No |

Never translate a timeout, changed HTML, rate limit, CAPTCHA, source outage, or unsupported jurisdiction into `not_verified`.

## Claim types

- `professional_standing` — a specific lawyer or healthcare licence in one jurisdiction;
- `entity_record` — a specific registered organization record;
- `organization_affiliation` — the applicant’s relationship to that organization;
- `npi_record` — a US NPPES corroboration result; and
- `account_identity` — the authenticated-account event, kept separate from professional results.

One result covers one claim. An applicant with three state licences has at least three professional-standing results.

## Automated-pass gate

An adapter may return `verified` without a reviewer only when every condition is true:

1. The jurisdiction, profession, authority, access mode, terms review, and adapter version are approved.
2. Automated use is expressly permitted by an official API, licence, written authorization, or contract.
3. The query uses a unique identifier and returns exactly one record.
4. The normalized name match is exact under tested rules; any alias judgment is manual.
5. The raw source status is on an explicit allowlist for that authority and credential type.
6. No discipline, board order, restriction, duplicate, or conflict flag is unresolved.
7. Required dates are current and parse without ambiguity.
8. Evidence metadata and integrity hash are complete.
9. The rules engine version is recorded and the kill switch is off.

If any condition is false, route to `needs_review` or `source_unavailable`; do not guess.

## Manual review

Manual review is a controlled workflow, not an unrecorded staff judgment. The reviewer must see the applicant claim, approved primary-source link, match comparison, raw source values allowed for internal use, and every triggered reason code. The reviewer records:

- decision and reason codes;
- a short factual note without unnecessary sensitive data;
- reviewer ID and timestamp;
- evidence hash/source reference;
- next-check date; and
- whether a second reviewer or compliance escalation is required.

High-risk events—suspension, revocation, surrender, practice restriction, public discipline/order, identity conflict, altered evidence, or a source-terms concern—require a second authorized reviewer before a final adverse decision or badge removal notice, except where immediate temporary hiding is needed to avoid a stale claim.

Applicants need a documented correction and appeal channel. A disputed result remains non-public while reviewed, and FEFE must distinguish a source discrepancy from applicant misconduct.

## Name and identifier normalization

Retain the submitted and source values unchanged in protected evidence. Create comparison-only normalized values using an adapter-versioned process:

- Unicode normalize;
- trim and collapse whitespace;
- case-fold;
- retain meaningful punctuation in raw data;
- compare given, middle, family, prefix, and suffix components rather than one flattened string;
- preserve leading zeros in professional identifiers; and
- remove punctuation from an identifier only when the authority documents that equivalence.

Typos, former names, transliteration, compound surnames, suffix changes, and swapped given/family names are not automatic passes or failures. They require reviewed alias evidence.

## Reason-code baseline

Adapters may add source-specific codes but should reuse these:

- `EXACT_IDENTIFIER_MATCH`
- `EXACT_NAME_MATCH`
- `ALIAS_REVIEW_REQUIRED`
- `NAME_MISMATCH`
- `IDENTIFIER_NOT_FOUND`
- `MULTIPLE_RECORDS`
- `STATUS_ALLOWED`
- `STATUS_UNKNOWN`
- `STATUS_INELIGIBLE`
- `EXPIRATION_PASSED`
- `DISCIPLINE_REVIEW_REQUIRED`
- `AFFILIATION_CONFIRMED`
- `AFFILIATION_UNCONFIRMED`
- `SOURCE_TIMEOUT`
- `SOURCE_RATE_LIMITED`
- `SOURCE_TERMS_BLOCK`
- `JURISDICTION_UNSUPPORTED`
- `NPI_CORROBORATED`
- `NPI_NOT_LICENSURE_EVIDENCE`

## Evidence handling

For each attempt, retain the minimum permitted internal evidence:

- verification and subject IDs;
- authority/source name and canonical URL;
- source record identifier, masked where appropriate;
- exact retrieval time in UTC;
- access mode, adapter version, rules version, and terms-review reference;
- raw values required to explain the decision;
- private evidence-object URI when permitted; and
- SHA-256 integrity hash of the captured evidence.

Source evidence is private and access-logged. Public profiles receive only the normalized claim, date, authority label, expiry, and disclaimer. Do not place evidence objects in a public blob container. Use private Azure Blob Storage, Entra/managed-identity access, short-lived user-delegation SAS only when required, malware scanning for uploads, encryption, retention rules, and deletion/legal-hold procedures.

The exact retention period requires counsel approval. Until then, configure a conservative documented schedule rather than indefinite retention, and never collect records “just in case.”

## Rechecks and events

Recommended initial policy, subject to counsel and authority review:

- professional standing: recheck every 90 days;
- entity record: recheck every 180 days;
- affiliation: reconfirm annually;
- NPPES corroboration: refresh with the professional-standing recheck when applicable; and
- immediate review after member disclosure, complaint, returned regulator notice, source change, or credible status-change report.

An adapter can require a shorter interval. When recheck fails because the source is unavailable, hide or mark the public check as pending once its previous result expires; do not label the member adversely.

## Billing and access lifecycle

Stripe state and verification state remain in different records:

- a verified Stripe webhook may activate a paid workflow or member access;
- failed/unpaid/canceled billing may suspend access under the membership agreement;
- payment success cannot issue a verification result;
- a refund or cancellation does not rewrite historical evidence; and
- no sensitive decision is based on the user’s success-return URL.

Entra authentication and MFA protect access. Use least-privilege roles such as applicant, member, reviewer, compliance administrator, and platform operator. Reviewers should not be able to alter billing events; support staff should not see full verification evidence by default.

## Public presentation

Show the narrowest accurate wording:

> Verified professional record<br>
> [Credential] · [Jurisdiction]<br>
> Checked against [authority] on [date] · valid through [date]

Place this disclosure within one click or expansion:

> FEFE Connect checked selected identity and professional-standing information against the named source as of the date shown. The check is limited to the stated credential and jurisdiction. It is not regulator endorsement, a background check, or a guarantee of competence, suitability, outcomes, or future standing.

If FEFE separately checks an organization, label it “Entity record checked.” If affiliation is separately confirmed, label it “Organization affiliation confirmed.” Do not collapse either into the professional-standing badge.

## Global expansion rule

FEFE may market the platform globally while limiting verified membership to supported jurisdictions. The safe public statement is:

> FEFE Connect is designed for an international professional community. Verification availability depends on profession, jurisdiction, and access to an approved primary source.

Adding a country or state requires the completed source-onboarding checklist in the [source matrix](source-matrix.md), legal/privacy review, test evidence, an owner, and an operational rollback path. Until then, the application can be waitlisted but cannot receive a professional check.
