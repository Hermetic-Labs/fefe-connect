# Verification contract and source test results

**Last run:** 2026-08-22

## Automated contract tests

The fictional legal and healthcare submission examples are validated against their respective JSON Schemas during `npm test`. A negative healthcare case confirms that setting `no_patient_information_submitted` to `false` is rejected.

The NPPES adapter tests use local fictional response fixtures and cover:

- NPI format and checksum validation before network access;
- exact active record handling without converting the result into licensure verification;
- zero and multiple result routing to manual review;
- individual/organization enumeration-type mismatch;
- bounded retry after a temporary server error; and
- `source_unavailable` after rate-limit or server failures are exhausted.

Run all deterministic tests from `api/` with:

```text
npm test
```

## Live NPPES smoke test

The supported live test calls the official CMS NPPES Read API v2.1 by exact NPI and prints only a minimal result summary. Supply a public test identifier at runtime; do not commit applicant identifiers as fixtures.

```text
npm run test:nppes:live -- --npi PUBLIC_TEST_NPI --type NPI-1
```

The 2026-08-22 live check confirmed:

- the official endpoint returned HTTP success;
- an unassigned checksum-valid fictional NPI returned zero results;
- an official organization-name query returned one Georgia organization record; and
- an exact query for that public organization NPI returned one active `NPI-2` result.

This proves source availability and response-shape compatibility only. It does not verify a FEFE applicant, professional licence, organization affiliation, competence, or suitability.

## Sources intentionally not automated

Georgia attorney, Georgia entity, and Georgia professional-licence checks remain trained individual manual lookups. The Georgia licence page states that it is intended for individual verification and routes bulk users to a roster request. No undocumented browser request, crawler, or search-result extraction is part of this test suite.

On 2026-08-22, ordinary non-browser HTTP availability probes to the Georgia entity and professional-licence search pages returned `403 Forbidden`; the State Bar home page returned `200`. A `403` from an automated probe is not a professional-record result or a source outage. FEFE did not attempt a bypass. Reviewers must use the documented manual browser workflow, and source health must remain distinct from an applicant decision.

Automation can be added only after FEFE documents an official API, licensed feed, purchased roster, or written permission and completes the source-onboarding checklist.
