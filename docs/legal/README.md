# FEFE Connect legal launch checklist

Status: attorney-review draft

Public policy version: `2026-08-20`

Last researched: 2026-08-20

The public pages are a serious product baseline, but they do not replace advice from Georgia counsel, privacy counsel in every opened international market, or the professional-responsibility review appropriate to the platform’s actual workflows. Do not turn on collection, payment, member messaging, or public profiles until the applicable items below have named owners and written approval.

## Public documents

| Document | Public file | Version |
|---|---|---|
| Legal & Trust Center | `legal.html` | 2026-08-20 |
| Privacy Notice and notice at collection | `privacy.html` | 2026-08-20 |
| Terms & Conditions | `terms.html` | 2026-08-20 |
| Intended Use & Professional Boundaries | `intended-use.html` | 2026-08-20 |
| Verification Disclosure | `verification.html` | 2026-08-20 |
| Cookie Notice | `cookies.html` | 2026-08-20 |

## Decisions made in this draft

- Membership is for adults and eligible professionals.
- FEFE is a membership, profile, record-checking, and professional-introduction platform—not a law firm, healthcare provider, emergency service, regulator, staffing agency, or guarantor.
- No patient, client, clinical, case, PHI, privileged, work-product, sealed, or emergency information may be submitted.
- The membership fee is fixed and not contingent on an introduction, engagement, client/patient, case, or professional fee. FEFE takes no percentage of professional fees.
- Applications are free. Only approved applicants are invited to Stripe Checkout, and approval alone never creates a subscription or charge.
- Activated membership auto-renews monthly at the amount shown in Stripe Checkout and remains cancelable through the member billing portal or email.
- After activation, partial-period fees are nonrefundable except where law or a written offer requires otherwise.
- No final adverse membership decision is made solely from an automated mismatch, timeout, unknown status, or source outage.
- Initial retention periods are stated in the Privacy Notice rather than using “as long as necessary” alone.
- The agreement uses Georgia law and Georgia courts, with no mandatory arbitration or class-action waiver in this draft.

The owner and counsel must affirm each decision, especially the post-approval billing order, liability cap, indemnity, venue, and retention periods.

## Before any personal-information collection

- [ ] Confirm the LLC’s exact registered legal name, good-standing record, principal/mailing address, and any FEFE Connect trade-name filing. Add a complete mailing address to the public notices.
- [ ] Activate and monitor `hello@fefeconnect.com`; define identity-verification and escalation procedures for privacy, billing, verification, safety, and legal requests.
- [ ] Have counsel determine coverage and obligations under the Georgia Consumer Privacy Protection Act listed on the [Governor of Georgia’s 2026 signed-legislation index](https://gov.georgia.gov/executive-action/legislation/signed-legislation/2026). Use the current codified law and final official text—not a summary—to confirm thresholds, exemptions, appeal timing, assessments, sensitive-data rules, and universal opt-out signals.
- [ ] Complete a data inventory and record of processing covering the browser, Entra, API, database, Blob Storage, Service Bus, telemetry, Stripe, support, email, backups, and every regulator source.
- [ ] Approve the retention schedule and implement automatic deletion, legal hold, backup expiry, and evidence minimization.
- [ ] Approve a privacy-request procedure: intake, verification, access, correction, deletion, portability, opt-out, appeal, authorized agents, denial reasons, and metrics.
- [ ] Add the public Privacy Notice URL and monitored privacy contact to Microsoft Entra. Microsoft documents both fields in its [Entra organization privacy-information guidance](https://learn.microsoft.com/en-us/entra/fundamentals/properties-area).
- [ ] Execute and retain required data-protection terms with Azure/Microsoft, Stripe, email/support vendors, and any other processor. Maintain a current vendor/subprocessor register.
- [ ] Reconcile actual Stripe data flows and controller/processor roles with the [Stripe Privacy Center](https://stripe.com/legal/privacy-center) before naming enabled products.
- [ ] Implement reasonable security, incident response, and vendor controls. The FTC recommends collecting only needed data, limiting access, securing retained data, and disposing of it when the need ends in its [privacy and security guidance](https://www.ftc.gov/business-guidance/privacy-security).

## US and state privacy readiness

- [ ] Show notice at collection at or before each collection point, listing categories and purposes. The California Attorney General describes this requirement and consumer rights in its [CCPA guidance](https://oag.ca.gov/privacy/ccpa).
- [ ] Determine which comprehensive state privacy laws apply by revenue, volume, activity, and resident location; do not assume Georgia domicile is the only relevant law.
- [ ] Implement Global Privacy Control or other legally recognized universal opt-out signals before enabling a practice that requires an opt-out.
- [ ] Do not claim “we do not sell/share” if a future analytics, ad-tech, directory-licensing, lead-generation, or vendor contract changes that conclusion.
- [ ] Create and test a multistate incident-notification matrix and insurer/counsel contact tree.

## EEA, UK, and other international markets

- [ ] Do not open an international market merely because the landing page is visible there. Use the jurisdiction-approval gate in the verification design.
- [ ] For each market, document controller identity, purposes, legal bases, legitimate interests, recipients, source categories, retention, rights, complaint authority, and automated-decision information. GDPR Articles 13 and 14 list these transparency elements in the [official regulation](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679).
- [ ] Determine whether an EU representative, UK representative, or data-protection officer is required, and add the required contact details before launch there.
- [ ] Complete data-transfer mapping and appropriate safeguards. The UK regulator’s [right-to-be-informed checklist](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/checklists/) and [international-transfer guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/international-transfers/) provide official operational checklists.
- [ ] Localize policies and consent UI where required; preserve the exact language/version accepted.
- [ ] Review consumer-contract, automatic-renewal, tax/VAT, accessibility, sanctions, and professional-platform rules in each opened market.

## Professional-responsibility and healthcare boundary

- [ ] Ask Georgia professional-responsibility counsel whether any actual FEFE matching, ranking, payment, or introduction flow is a lawyer referral service or lawyer advertising service and what disclosures/registration are required. Navigate from the [State Bar of Georgia home page](https://www.gabar.org/) to the current Rules of Professional Conduct and Lawyer Referral Services guidance; respect the Bar’s restrictions on deep linking and automated extraction.
- [ ] Keep subscriptions fixed and unrelated to legal fees. Review every future success fee, lead fee, reciprocal-referral program, preferred ranking, and sponsored placement before launch.
- [ ] Review mental-health-member workflows against current Georgia ethics, confidentiality, advertising, and telehealth rules. Georgia’s official rules include [counselor/social-worker/MFT confidentiality and conduct](https://rules.sos.ga.gov/gac/135-7), [telemental health](https://rules.sos.ga.gov/gac/135-11), [psychology ethics](https://rules.sos.ga.gov/gac/510-4), and [telepsychology](https://rules.sos.ga.gov/gac/510-5).
- [ ] Do not accept client/patient testimonials in the initial product. Review professional advertising, consent, undue influence, and confidentiality rules before changing that policy.
- [ ] Complete a documented HIPAA/business-associate analysis before adding any workflow that creates, receives, maintains, or transmits PHI for a covered entity. HHS explains the covered-entity and business-associate test in its [official guidance](https://www.hhs.gov/hipaa/for-professionals/covered-entities/index.html).
- [ ] Confirm that messaging, forms, logs, support, and uploads technically block or strongly deter client/patient/case content rather than relying only on contract language.

## Subscription and checkout readiness

- [ ] Stripe Checkout must display the exact price, currency, billing interval, first charge date, trial/promotion terms, taxes, automatic renewal, and cancellation method before consent.
- [ ] Require an unchecked recurring-billing acceptance immediately before Checkout and record the exact disclosure version, amount, currency, interval, offer, Entra subject, server timestamp, and Stripe Checkout Session ID.
- [ ] Provide cancellation in the member portal and by monitored email. Test cancellation, payment failure, renewal, price change, refund, declined application, dispute, and expired-card scenarios.
- [ ] Confirm that no application or membership charge can be created until the server records an approved decision and the applicant separately completes Checkout.
- [ ] Send a durable receipt/confirmation containing material subscription terms and cancellation instructions.
- [ ] Make renewal and cancellation disclosures conspicuous. FTC guidance emphasizes clear recurring terms and workable cancellation in its [negative-option materials](https://www.ftc.gov/legal-library/browse/rules/negative-option-rule).

## Consent and audit record

The server—not browser hidden fields—creates the authoritative record. Store one append-only acceptance event per document or disclosure with:

- internal acceptance ID and application/account ID;
- Entra subject and tenant;
- policy/disclosure type, semantic version, public URL, locale, and SHA-256 of the rendered canonical text;
- action (`accepted`, `acknowledged`, or `withdrawn`) and affirmative UI method;
- server UTC timestamp, request/correlation ID, and proportionate security metadata;
- for billing, amount, currency, interval, trial/discount, Checkout Session ID, and disclosure text hash; and
- superseded version and renewed-acceptance event when a material policy changes.

Do not precheck boxes. Do not combine optional marketing consent with required service terms. Privacy acknowledgment does not convert every processing purpose into consent.

## Operational and publication readiness

- [ ] Counsel reviews the public wording in context, not only as detached files.
- [ ] Accessibility review covers keyboard use, focus, link purpose, form errors, tables, mobile layout, zoom, and plain-language comprehension.
- [ ] Public policy routes are included in backups, availability monitoring, change control, and deployment smoke tests.
- [ ] Material changes trigger customer notice and renewed acceptance where required; historical versions remain retrievable internally.
- [ ] Publish a vendor/subprocessor page before global member launch.
- [ ] Obtain cyber/privacy and appropriate professional/platform insurance advice.
- [ ] Adopt an incident response plan, member-conduct process, verification correction/appeal process, law-enforcement request policy, and transparency-reporting decision.

## Current preview limitation

The HTML onboarding form currently prevents network submission and displays a preview banner. Its hidden version values demonstrate the UI contract only. They are not evidence of acceptance until the authenticated API records them server-side with the safeguards above.
