# FEFE sign-in and application acceptance

## Verified observations

On 2026-10-04, the operator completed MFA registration and opened the FEFE Connect External ID tenant as a Global Administrator. The production SPA callback `https://fefeconnect.com/auth-redirect.html` was added to FEFE Connect Web, retaining the prior callback entries.

The redirect repair was pushed on canonical `main` as `0c2a011`. GitHub Pages run `37179942391` succeeded. The public redirect HTML, redirect bundle, and main auth bundle returned HTTP 200 and matched the built files byte for byte.

After the operator completed the customer flow, a read-only Azure Tables query found the clearly marked fictional clinician application with `status: submitted`, created at `2026-10-04T05:31:11.077Z`. This confirms durable application submission. It does not establish reviewer approval, paid activation, or directory access. No billing flow was opened by the orchestrator.

The 19 existing API/contract tests and the TypeScript/client build passed. These checks do not replace the live submission evidence.

## Account visibility

The shared account strip loads on the homepage, founder page, application, activation, and legal pages. It reads the existing FEFE MSAL session, displays the account name and email using text nodes, and provides Sign in or Sign out. The homepage previously loaded no auth component and could not show a signed-in account. Authentication remains in session storage; no storage or identity privileges were expanded.

## Resume point

The administrator and fictional application-submission blockers are cleared. The next acceptance boundary is the reviewer decision and approved-member journey. A signed-in account is not membership approval. Keep the fictional profile unpublished and use no real clinical or case data.

The dated October 1 acceptance report is retained as historical evidence; its pending customer-sign-in statement is superseded by this record.
