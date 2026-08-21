# Primary-source matrix

Status: reviewed against the linked official pages on 2026-08-20. Source terms and interfaces can change; re-review them before implementation and at least annually.

## Current launch candidates

| Claim | Authority and source | Useful source fields | Approved initial access | Important limitation |
|---|---|---|---|---|
| Georgia LLC/entity status | [Georgia Secretary of State business search](https://ecorp.sos.ga.gov/BusinessSearch) | Business name, control number, registered agent, officer/designated agent, and other entity information of record | Manual primary-source lookup; seek a supported data service before automation | The public search documents entity records, not applicant affiliation, law-firm eligibility, or professional standing. No public API is documented on the search page. |
| Georgia attorney standing | [State Bar of Georgia](https://www.gabar.org/) — navigate to the public member directory and membership-status guidance | Name and daily-updated membership/standing information; public directory details may include contact and disciplinary information | Manual lookup only unless the State Bar grants written commercial/API/feed permission | The State Bar’s Terms of Use, available from its footer, prohibit commercial use and data-mining, robot, spider, crawler, and similar extraction without consent and restrict deep links. Do not scrape; publish only the Bar home-page link unless written permission says otherwise. |
| Georgia mental-health license | [Georgia Secretary of State professional verification](https://verify.sos.ga.gov/verification/Search.aspx?SubmitComplaint=Y) and [GOALS license search](https://goals.sos.ga.gov/GASOSOneStop/s/licensee-search) | Profession, license type/number, name, status, issue/expiration/renewal dates, address, associated licenses, and public board orders where available | Manual lookup for individual checks; apply for the official roster/bulk-data path before batch processing | The legacy verification page expressly says it is for individual verification and directs bulk users to a roster request. Do not reverse-engineer browser calls. |
| US healthcare identifier | [CMS NPPES API 2.1](https://npiregistry.cms.hhs.gov/api-page) | NPI number, enumeration type, names, credential, addresses, taxonomy entries, licence fields reported to NPPES, endpoints, creation/update timestamps, and status | Automated read-only API with rate limiting, exact NPI queries, and response minimization | CMS states that issuance of an NPI does **not** ensure or validate licensure or credentialing. NPPES is corroborating identity/taxonomy evidence only. See [CMS NPI files notice](https://download.cms.gov/nppes/NPI_Files.html). |
| New York professional license | [NYSED Office of the Professions verification](https://www.op.nysed.gov/services/verifications/online-verification-searches) | Name, profession, six-digit licence number, location, original licence date, registration status/through date, and discipline summaries | Manual lookup unless NYSED grants a permitted feed or written authorization | [NYSED terms](https://www.op.nysed.gov/services/verifications/terms-and-conditions-of-use) restrict commercial modification/republishing, non-verification aggregation, and rapid automated harvesting. Do not scrape. |
| New York attorney registration | [New York Unified Court System attorney search](https://iapps.courts.state.ny.us/attorneyservices/) linked from the [court’s legal-professional page](https://www.nycourts.gov/legal-professional) | Name-based attorney registration information and public registration/discipline fields made available by the court | Manual lookup pending documented API/feed permission and terms review | The court calls the search a free public service but does not document a public automation API on the cited page. Treat technical access as unapproved until confirmed. |
| New York entity status | [New York Department of State entity database](https://dos.ny.gov/corporation-and-business-entity-search-database) | Entity name/ID/type/status and filed entity information | Manual lookup pending a documented permitted feed | The Department warns that completeness and accuracy cannot be guaranteed. Entity status does not prove professional authority or applicant affiliation. |

## Status mapping is authority-specific

Each adapter owns a reviewed allowlist. Never assume that strings such as `active`, `registered`, `eligible`, `good standing`, or `current` mean the same thing across sources.

For example, NYSED explains that a New York professional generally must be both licensed and `REGISTERED` to practise in New York; `INACTIVE`, `NOT REGISTERED`, `DECEASED`, `LICENSE SUSPENDED`, `LICENSE REVOKED`, and `LICENSE SURRENDERED` have different meanings. A mapping must cite the authority’s glossary and preserve the raw value privately.

## Fields the platform may display

Display only the minimum claim needed by members:

- professional name;
- profession or attorney designation;
- credential jurisdiction;
- credential number, preferably partially masked unless full display is necessary and permitted;
- FEFE result and date checked;
- source authority name; and
- next-check or expiry date.

Do not mirror a regulator’s complete profile, address, documents, board orders, phone number, email address, or raw response into the public directory. Record a narrow decision and source reference; keep authorized evidence private under a defined retention schedule.

## Source-onboarding checklist

Before adding any state or country, record all of the following in an adapter approval:

1. Credential type and exact jurisdiction.
2. Official authority and source URL.
3. Terms, privacy notice, licence, and legal-review date.
4. Access mode: API, approved bulk feed, or individual manual lookup.
5. Search keys and response field dictionary.
6. Raw-to-normalized status map, including unknown values.
7. Discipline/order handling and escalation rules.
8. Identity-match rules and representative positive, negative, ambiguous, and unavailable test cases.
9. Rate limits, service availability expectations, and permitted evidence retention.
10. Recheck interval, owner, adapter version, and kill switch.

Any missing item keeps the jurisdiction at `unsupported`.
