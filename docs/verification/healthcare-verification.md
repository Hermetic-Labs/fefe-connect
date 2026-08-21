# Healthcare-professional verification contract

This contract is for licensed mental-health professionals. State or national professional licensure is the primary standing evidence. An NPI can corroborate identity and taxonomy for US providers but is never a substitute for a licence check.

## Applicant payload

The fictional JSON example is [healthcare-submission.example.json](examples/healthcare-submission.example.json).

### Identity

| Field | Required | Notes |
|---|---:|---|
| `applicant_id` | Yes | Internal opaque ID. |
| `legal_name.given`, `legal_name.family` | Yes | Retain middle names, suffixes, prefixes, and former names separately for matching. |
| `professional_email` | Yes | Verify control. |
| `phone` | Yes | Verify control and support manual review. |
| `residence_country` | Yes | Not treated as a licence or service jurisdiction. |
| `npi` | US, when held | Exactly ten digits. Absence is not automatically a failure because not every practitioner is required to have one. |

### Professional licences

At least one item in `licenses[]` is required:

| Field | Required | Notes |
|---|---:|---|
| `country_code` | Yes | ISO 3166-1 alpha-2. |
| `subdivision_code` | If applicable | ISO 3166-2 state/province code. |
| `profession` | Yes | Controlled FEFE enum, such as `clinical_social_worker`, `professional_counselor`, `marriage_family_therapist`, or `psychologist`. |
| `license_type` | Yes | Applicant’s exact credential label. Do not silently treat different scopes as equivalent. |
| `license_number` | Yes | Retain the submitted form; adapter owns comparison normalization. |
| `issued_date` | Optional | Corroborating only. |
| `expiration_date` | Optional | Source result controls the decision. |
| `claimed_status` | Optional | Never trusted as the decision. |
| `is_primary` | Yes | Exactly one primary licence for profile display. |

### Practice and affiliation

The payload mirrors the legal track’s separation between professional status and organization affiliation:

- legal and display name of the practice;
- formation country and state/province;
- entity identifier, when applicable;
- website and office address;
- applicant’s role;
- practice-controlled email evidence; and
- an authorized representative when the applicant is not the owner.

A Type 2 organizational NPI may be collected as corroborating practice evidence, but it does not prove that an individual works there or that the entity is in good standing.

### Service jurisdictions

Collect every country and state/province in which the professional proposes to work, including remote service. Keep it distinct from the licence jurisdiction and office location. Cross-border telehealth rules vary; FEFE should enable a service jurisdiction only after counsel and the applicable adapter policy approve it.

### Privacy boundary

The membership application must not collect patient names, diagnoses, therapy notes, medical histories, appointment details, insurance claims, or other clinical content. Profiles and testimonials require the submitter to confirm publication rights; patient testimonials warrant separate legal and ethical review before the feature is enabled.

### Consent and attestations

The applicant must attest that submitted professional and organization information is accurate, may be checked against primary sources, and will be updated after material changes. Store each attestation and each Terms, Privacy, Intended Use, Verification Disclosure, and billing-disclosure acceptance as its own append-only server event with the exact version, canonical-text hash, server timestamp, and Entra subject ID. A browser-provided version or checkbox value is never the authoritative record.

## Verification sequence

1. Route each licence to the exact profession and jurisdiction adapter.
2. Query by unique licence number whenever supported; use name and location only as corroboration.
3. Preserve raw authority status, dates, profession/type, public-order indicator, and source metadata privately.
4. Apply an authority- and profession-specific status map. An unknown value creates `needs_review`.
5. Escalate expired, inactive, not-registered, surrendered, suspended, revoked, restricted, deceased, board-order, discipline, and identity-mismatch results.
6. For a US applicant with an NPI, query the official NPPES API by exact number and require one result. Compare name, enumeration type, relevant taxonomy, and reported licence fields as corroboration.
7. Do not convert NPPES `status`, taxonomy, address, or reported licence data into a state-licensure pass. CMS expressly says an NPI does not validate licensure or credentialing.
8. Verify the practice entity and affiliation separately when the profile claims an organization.
9. Produce one normalized result per licence, plus separate NPI, entity, and affiliation results.
10. Issue a public check only after all required current results and flags have been resolved.

## Georgia launch path

Relevant Georgia professional sources include the Secretary of State’s [individual verification search](https://verify.sos.ga.gov/verification/Search.aspx?SubmitComplaint=Y), the newer [GOALS licence search](https://goals.sos.ga.gov/GASOSOneStop/s/licensee-search), the [Board of Professional Counselors, Social Workers, and Marriage & Family Therapists](https://sos.ga.gov/board-professional-counselors-social-workers-and-marriage-family-therapists), and the [Board of Examiners of Psychologists](https://sos.ga.gov/georgia-state-board-examiners-psychologists).

Initial policy:

- use trained manual individual lookup;
- record profession, licence type/number, source status, issue/expiry/renewal dates where present, associated-licence information, and whether a public board-order result requires review;
- do not scrape or reverse-engineer the search;
- request and legally review Georgia’s roster/bulk-data option before building batch automation; and
- keep the adapter split by profession because board rules and status meanings can differ.

## New York representative path

The NYSED Office of the Professions search provides name, profession, licence number, location, original licence date, registration status/through date, and discipline summaries. NYSED states that a person generally must be both licensed and registered to practise in New York. Its published terms restrict commercial republication, non-verification aggregation, and rapid automated harvesting, so the initial path is manual review unless NYSED authorizes a feed or automated use in writing.

## NPPES adapter contract

Use `https://npiregistry.cms.hhs.gov/api/?version=2.1&number={NPI}` with URL encoding, a timeout, retry/backoff, and platform-level rate limiting. The adapter should consume only the fields it needs:

- root: `result_count`, `results`;
- provider: `number`, `enumeration_type`, `basic`, `taxonomies`, `addresses`, `practiceLocations`, `identifiers`, `endpoints`, `created_epoch`, and `last_updated_epoch`;
- identity: legal name fields, credential, NPPES status, enumeration/update dates;
- taxonomy: code, description, primary flag, reported state and licence value; and
- address: purpose/type, city, state, postal code, and country.

Expected routing:

- no result: `needs_review` unless the NPI was optional and the applicant withdraws the claim;
- multiple results: `needs_review` and adapter anomaly alert;
- Type 2 result submitted as an individual NPI: `needs_review`;
- name mismatch: `needs_review`;
- taxonomy mismatch: informational or review according to profession policy, never an automatic state-licensure failure;
- API unavailable: `source_unavailable`, never `not_verified`.

Do not store or display more of the NPPES response than the documented purpose requires.
