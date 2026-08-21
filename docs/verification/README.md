# FEFE Connect verification design

Status: design baseline, not production authorization

Last reviewed: 2026-08-20

This directory defines how FEFE Connect should check legal professionals, mental-health professionals, and the organizations with which they say they are affiliated. It is deliberately narrower than the word “certified.” The platform checks selected facts against identified sources at a recorded point in time; it does not guarantee competence, suitability, outcomes, future standing, or that every relevant fact has been disclosed.

## Operating context

- Operating entity: **Elevated Perspectives Psychotherapy, LLC**
- Domicile supplied by the owner: **Georgia, United States**
- Intended market: global
- Product name and pronunciation: **FEFE Connect**, spoken “Fee-Fee Connect”

The entity name and domicile above are project inputs, not a completed verification result. Before launch, the LLC record should itself be checked against the [Georgia Secretary of State business search](https://ecorp.sos.ga.gov/BusinessSearch), and the resulting control number and status should be retained privately.

“Global” describes product availability, not a universal professional credential. Every place in which a member claims authority to practise is a separate jurisdictional claim. FEFE Connect must not issue a professional badge in a jurisdiction until that jurisdiction has an approved verification adapter or a completed manual primary-source review.

## The four facts kept separate

1. **Account identity** — Microsoft Entra External ID authenticates the person and can require multifactor authentication. This does not establish a professional credential.
2. **Subscription state** — Stripe establishes whether a subscription is active. Payment does not establish identity, licensure, good standing, or membership eligibility.
3. **Professional standing** — a regulator, licensing board, court, or bar record supports a specific credential claim in a specific jurisdiction as of a specific date.
4. **Organization affiliation** — an entity record, domain evidence, and an authorized-person review support the claim that the applicant is connected to a firm or practice. An entity’s existence alone does not prove the applicant works there.

No one fact may be used as a substitute for another.

## Product-level flow

1. Applicant chooses the legal or healthcare track.
2. Applicant creates an Entra-protected account and completes MFA.
3. Applicant starts a Stripe subscription through hosted Checkout.
4. A verified Stripe webhook records billing state. The browser redirect is never trusted as proof of payment.
5. Applicant submits the minimum identity, credential, organization, and service-jurisdiction data required for verification.
6. The verification orchestrator selects an approved adapter for each credential jurisdiction.
7. Permitted APIs run automatically. Sources without approved automation create a manual-review task.
8. The decision engine produces one normalized result per credential or entity claim.
9. An authorized reviewer resolves ambiguous names, discipline or board-order flags, affiliation evidence, and source discrepancies.
10. Only a current `verified` result can produce a public check. Billing and account access can be paused without rewriting the historical verification result.
11. Results expire and are rechecked according to the adapter policy or after a relevant event.

## Public badge language

Preferred short label:

> Verified professional record

Required detail available beside or beneath the check:

> FEFE Connect checked selected identity and professional-standing information against [authority/source] on [date]. This check is limited to the stated credential and jurisdiction. It is not a guarantee of suitability, outcomes, or future standing.

Do not use “FEFE certified,” “fully vetted,” “guaranteed,” “approved by the regulator,” or “background checked” unless the platform has separately performed and can substantiate that exact process.

## Jurisdiction support levels

| Level | Meaning | May issue a check? |
|---|---|---:|
| `automated` | A documented official API or licensed feed permits this use and the adapter passed review. | Yes, subject to decision rules. |
| `approved_bulk_feed` | The authority provides data under an approved roster, bulk, or contract arrangement. | Yes, subject to decision rules. |
| `manual_primary_source` | A trained reviewer performs an individual lookup on the official source and records evidence without prohibited republication. | Yes, after review. |
| `unsupported` | No approved source path exists, the source is inaccessible, or its terms have not been reviewed. | No. |

Default is `unsupported`. A source does not become automatable merely because it is technically accessible.

## Documentation map

- [Source matrix](source-matrix.md) — authoritative sources, observable fields, and access constraints.
- [Legal verification](legal-verification.md) — lawyer, law-firm, and affiliation submission contract.
- [Healthcare verification](healthcare-verification.md) — clinician, NPI, practice, and licensure submission contract.
- [Decision policy](decision-policy.md) — normalized states, evidence, review, badge, and recheck rules.
- [Service architecture](service-architecture.md) — Azure boundaries, API surface, data model, and build sequence.
- [Legal submission schema](schemas/legal-submission.schema.json) and [healthcare submission schema](schemas/healthcare-submission.schema.json) — machine-readable inbound API contracts.
- [Normalized result schema](schemas/verification-result.schema.json) — machine-readable output contract for every adapter.
- [Legal example](examples/legal-submission.example.json) and [healthcare example](examples/healthcare-submission.example.json) — fictional onboarding payloads.

## Before production

These documents are an engineering and product-control baseline, not legal advice. Georgia counsel should review the member agreement, privacy notice, badge wording, professional-referral model, payment structure, cross-border service claims, and regulator-source permissions. Healthcare counsel should determine whether later product features create HIPAA business-associate obligations; the initial directory should collect no patient information or clinical records.
