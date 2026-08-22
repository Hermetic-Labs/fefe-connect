# FEFE Connect Azure deployment plan

**Status:** Approved — member-services expansion in progress
**Prepared:** 2026-08-21
**Deployment path:** Modernize the existing GitHub Pages application with a new Azure API
**Azure target:** Hermetic Labs / Azure subscription 1 (`d1a68ed7-2983-4a86-ab0e-e56df9e2e325`) / East US

## 1. Objective

Connect the approved-member activation page to secure, server-side Stripe Checkout while preserving the existing public site at `https://fefeconnect.com`. The browser must never receive Stripe secret keys or be able to grant itself approval.

This first production shape is intentionally small and cost-conscious. It supports authenticated onboarding, approval-gated subscription activation, Stripe-hosted payment management, and reliable webhook processing. It does not store psychotherapy notes, client records, case facts, privileged communications, or other clinical/legal matter content.

## 2. Confirmed requirements

| Area | Decision |
|---|---|
| Environment | Production-ready foundation, with Stripe Test mode used until business verification and acceptance testing are complete |
| Expected initial load | Small launch, fewer than 1,000 members; scale-to-zero preferred |
| Public site | Keep the existing GitHub Pages deployment and custom domain |
| Region | East US for Azure resources; the service may be accessed globally |
| Authentication | Microsoft Entra External ID / MSAL, with MFA policy support |
| Payments | Stripe Checkout subscriptions and Stripe Customer Portal |
| Plans | Individual $29/month; Organization $79/month including 3 seats; additional seat $20/month |
| Approval rule | Checkout is available only after the server finds an approved professional/application record for the authenticated user |
| Verification claims | Use narrow status language such as “Verified” only after the defined source checks and review complete; retain source and timestamp |
| Data boundary | Store member/application, verification, billing, consent, and audit metadata only; prohibit PHI, client/case data, therapy notes, and privileged matter content |
| Legal operator | Elevated Perspectives Psychotherapy, LLC |
| Footer | Remove the FEFE Connect/Hermetic Labs copyright line and show only the legal operator |

## 3. Existing application and contracts

The repository is a static HTML/CSS/JavaScript site deployed through GitHub Pages. `activation.js` already defines the client contract for:

- `GET /v1/applications/{id}` to load server-controlled application eligibility.
- `POST /v1/billing/checkout-sessions` to create a Stripe-hosted Checkout session.
- A bearer token supplied by `window.FEFE_AUTH.getAccessToken()`.
- A per-request idempotency key and validation that redirects only to a Stripe-hosted URL.

`site-config.js` intentionally has an empty `applicationApiBase`, so no browser-to-backend billing path is active today. The current local preview state is demonstrative only and is not an approval authority.

The Stripe Test-mode catalog and Customer Portal are already configured and documented in `docs/billing/README.md`. Secret API keys and webhook signing secrets are not committed to this repository.

## 4. Proposed architecture

### Request flow

1. A visitor signs in through Entra External ID; the frontend obtains an API access token through MSAL.
2. The activation page calls the Azure API with that bearer token.
3. The API derives the user identity from validated token claims and loads the corresponding application. A caller-provided application ID is never sufficient authorization by itself.
4. If the application is approved and the selected Stripe price is allowlisted, the API creates or reuses a Stripe Customer and creates a Checkout Session.
5. Stripe hosts the payment form. Successful browser redirection is informational only.
6. Signed Stripe webhooks update subscription and membership state. Webhook event IDs are recorded so retries are idempotent.
7. Authenticated subscribers can request a short-lived Stripe Customer Portal session from the API.

### Service mapping

| Concern | Service and SKU | Resource decision |
|---|---|---|
| Public frontend | Existing GitHub Pages site | Retain; no Azure migration |
| API | Azure Functions, Flex Consumption, Node.js 24 | New Function App; no always-ready instances initially |
| Function host and application state | Azure Storage GPv2, Standard_LRS | New account; Blob/host storage plus Table Storage for the small MVP record set |
| Secrets | Azure Key Vault Standard | New vault; Stripe secret key and webhook signing secret stored as secrets |
| Workload identity | User-assigned managed identity | Function App reads Key Vault and Storage without embedded Azure credentials |
| Authentication | Microsoft Entra External ID app registrations | SPA and protected API registrations; MSAL in the browser; API scopes and token validation |
| Telemetry | Application Insights | New application component linked to the existing East US Log Analytics workspace |
| Infrastructure | Azure Developer CLI plus Bicep | Repeatable resources, settings, role assignments, and outputs |
| DNS | Initial `azurewebsites.net` API URL, then `api.fefeconnect.com` | Custom API hostname is a post-deployment DNS step; HTTPS required throughout |

### Planned API endpoints

| Method and route | Authentication | Purpose |
|---|---|---|
| `GET /v1/applications/{id}` | Entra bearer token | Return the caller-owned application and server-computed checkout eligibility |
| `POST /v1/billing/checkout-sessions` | Entra bearer token | Create an approval-gated Stripe Checkout Session for an allowlisted plan |
| `POST /v1/billing/portal-sessions` | Entra bearer token | Create a Stripe Customer Portal Session for the caller's Stripe Customer |
| `POST /v1/webhooks/stripe` | Stripe signature | Verify the raw request signature and apply idempotent subscription updates |
| `GET /api/health` | Anonymous, minimal response | Deployment health probe without secrets or customer data |

No public endpoint can approve an application, set a verified badge, or directly activate membership. During the first test cycle, approved test records are seeded by an operator-only script tied to a known Entra subject. An administrative review UI is a later, separately authorized feature.

## 5. Data model and consistency

The initial Table Storage model uses partition and row keys that avoid email addresses or other personal data in storage keys:

- **Applications:** owner subject ID, professional type, status, verification outcome, source, jurisdiction, checked timestamp, reviewer/audit metadata, and consent versions.
- **Billing customers:** owner subject ID, Stripe Customer ID, chosen plan key, and organization linkage.
- **Subscriptions:** Stripe subscription/customer IDs, normalized membership state, period timestamps, cancellation state, and last processed event.
- **Webhook receipts:** Stripe event ID, event type, processing status, and timestamps for idempotency.
- **Request idempotency:** authenticated subject plus idempotency key, request hash, response reference, and expiry.

Updates that can race use ETags/optimistic concurrency. Stripe webhooks are the billing source of truth; Checkout success URLs never activate access. Data retention and deletion intervals will be documented before live customer onboarding.

## 6. Security, privacy, and defensibility controls

- Validate token issuer, audience, signature, expiry, scopes, and stable Entra subject on every protected request.
- Require MFA through the Entra tenant policy; the application does not claim MFA merely because a password was accepted.
- Authorize resources by the authenticated subject and organization membership, not by URL parameters.
- Allow only documented Stripe price IDs/lookup keys on the server; never accept arbitrary prices or amounts from the browser.
- Verify the Stripe webhook signature from the unmodified raw body and reject stale or invalid signatures.
- Use Stripe idempotency keys for creation calls and retain webhook event IDs to make retries safe.
- Store secrets only in Key Vault and reference them through managed identity; redact secrets, tokens, health details, and sensitive payload fields from logs.
- Limit CORS to `https://fefeconnect.com` plus explicitly configured local development origins outside production.
- Apply HTTPS-only, current TLS, secure headers, narrow error messages, dependency scanning, and least-privilege RBAC.
- Record versioned acceptance of Terms, Privacy Notice, Intended Use, verification disclaimer, and subscription/cancellation terms during onboarding.
- Do not market “Verified” as a guarantee, license, endorsement, ongoing monitoring, legal advice, clinical care, or suitability finding. Display source scope and last-check date where appropriate.
- Do not collect or store PHI, client identities, case documents, privileged communications, therapy records, or emergency/crisis content in this release.

## 7. Azure resource scope and naming

The deployment creates a dedicated resource group named `rg-fefeconnect-prod-eastus`. Globally unique resource names are generated deterministically from the subscription/resource-group seed rather than hand-entered. Common tags include `application=FEFE Connect`, `environment=production`, `owner=Elevated Perspectives Psychotherapy LLC`, and `managed-by=azd`.

The new Function App receives only the minimum configuration it needs. Key Vault grants its managed identity `Key Vault Secrets User`. Storage data access is limited to the application's managed identity and deployment identity. Public blob containers are not created.

## 8. Quota, provider, and policy preflight

Read-only checks were performed against the selected subscription on 2026-08-21.

| Capacity item | Current observation | Planned result | Published or reported limit | Status |
|---|---:|---:|---:|---|
| Resource groups, subscription-wide | 9 | 10 | 980 | Within limit |
| Storage accounts, East US | 2 | 3 | 250 (Azure quota API) | Within limit |
| Function Apps, subscription-wide | 1 observed in East US; one new app planned | One additional app | 5,000 per subscription (Azure Functions limits) | Within limit |
| App Service/Flex plans in target resource group | 0 | 1 | 100 App Service plans per resource group | Within limit |
| Flex Consumption regional availability | East US returned by Azure CLI as supported | One Node.js 24 Flex app | Up to 1,000 scale-out instances per app; no always-ready instances planned | Available |
| Key Vaults, East US | 0 | 1 | No count quota exposed through `Microsoft.Quota`; service request-rate limits apply | Acceptable for one vault |
| Application Insights, East US | 1 | 2 | No resource-count quota exposed through `Microsoft.Quota`; ingestion limits apply | Acceptable at launch volume |
| Log Analytics workspaces, East US | 1 | 1 | Existing workspace reused | No new capacity required |

Subscription policy assignment query returned no assigned Azure Policy definitions at subscription scope. Required providers are registered for Web, Storage, Insights, Operational Insights, Managed Identity, Key Vault, and related deployment services.

## 9. Cost posture

- Flex Consumption is selected so the API can scale to zero instead of paying for an always-on container or App Service instance.
- No always-ready Function instances are configured at launch.
- Standard_LRS storage and one Standard Key Vault minimize fixed infrastructure cost.
- The existing Log Analytics workspace is reused; Application Insights sampling and retention controls will prevent uncontrolled telemetry ingestion.
- GitHub Pages remains the frontend host at no new Azure hosting cost.
- Stripe processing and billing fees are separate from Azure costs.

Exact monthly spend depends on requests, execution duration, storage transactions, logs, and outbound bandwidth. Cost alerts/budgets should be enabled after the first deployment when a realistic monthly threshold is chosen.

## 10. Implementation sequence after approval

1. Register/recheck required Azure providers and create the dedicated resource group.
2. Use the Azure Functions composition templates to generate the Node.js Flex Consumption application, `azure.yaml`, Bicep modules, deployment outputs, and local settings template.
3. Implement the four billing/application endpoints, raw-body webhook verification, Stripe allowlists, Table Storage repositories, ETag concurrency, and idempotency behavior.
4. Create/configure the Entra External ID SPA and API registrations, scopes, redirect URIs, consent settings, MSAL client integration, and server token validation.
5. Provision Key Vault, Storage, managed identity role assignments, Application Insights, and the Function App without committing secrets.
6. Update the frontend: remove the Hermetic Labs copyright line, keep the legal operator, add `window.FEFE_AUTH`, and set the production API base from deployment output.
7. Deploy to a testable Azure endpoint, then configure Stripe Test-mode secrets and the signed webhook endpoint in Key Vault/Stripe Dashboard.
8. Seed one operator-controlled approved test application and run end-to-end Test-mode Checkout, webhook, membership, cancellation, and Customer Portal tests.
9. Complete security/contract tests, update the deployment plan to `Ready for Validation`, and run the Azure validation workflow.
10. After validation succeeds, use the Azure deployment workflow for the production resource deployment and verify health, CORS, logs, and rollback behavior.
11. Add `api.fefeconnect.com` and DNS/managed certificate after the Azure hostname is known; update the frontend only after HTTPS validation.
12. Keep Stripe in Test mode until Stripe business verification, legal-page review, acceptance testing, and an explicit live-mode decision are complete.

## 11. Files expected to change or be generated

- `.azure/deployment-plan.md`
- `azure.yaml`
- `infra/` Bicep modules and environment parameters
- `api/` Function endpoints, services, repositories, authentication, and tests
- `assets/auth.bundle.js` for the self-hosted MSAL browser adapter
- `site-config.js`, `activation.js`, and `index.html`
- `.env.example` / `local.settings.example.json` containing names only, never secrets
- `docs/billing/README.md` and operating/runbook documentation

## 12. Validation and acceptance criteria

The implementation is ready for deployment only when:

### Azure validation checklist

- [x] AZD installation confirmed
- [x] `azure.yaml` schema validated
- [x] AZD environment configured
- [x] Azure authentication confirmed
- [x] Subscription and East US location confirmed
- [x] Provision preview succeeds
- [x] TypeScript build and tests succeed
- [x] Deployment package succeeds
- [x] Azure Policy constraints checked
- [x] Static managed-identity and RBAC review succeeds

- Infrastructure templates pass Bicep validation and the Azure preflight workflow.
- No secrets or personal test data appear in Git history, static assets, build artifacts, or logs.
- Unauthenticated, wrong-user, unapproved, unsupported-price, replayed, and malformed requests are rejected.
- Duplicate checkout requests and duplicate/out-of-order webhooks do not create duplicate entitlements.
- Only signed Stripe webhooks activate, update, or revoke membership.
- The frontend obtains a real Entra access token and has no preview path that can unlock payment in production.
- Terms/privacy/intended-use acceptance is versioned and auditable.
- CORS accepts the production domain and rejects unapproved origins.
- End-to-end Stripe Test-mode Checkout and Customer Portal flows complete successfully.
- The public footer contains only `Elevated Perspectives Psychotherapy, LLC` as the parent/legal operator reference.

## 13. Rollback

Frontend changes are deployed independently through GitHub Pages and can be reverted to the last known-good commit. Azure resource changes are source-controlled in Bicep and redeployable. If the billing API fails validation, `applicationApiBase` remains empty or is restored to the last known-good endpoint, leaving checkout unavailable rather than bypassing approval. Stripe webhook endpoints can be disabled in Test mode without altering customer records. New Azure resources are isolated in `rg-fefeconnect-prod-eastus`; material deletion is a separate, explicit action and is not part of ordinary rollback.

## 14. Approval gate

Approval of this document authorizes the implementation and generation work described above. It does not authorize Stripe Live-mode activation, production customer charges, DNS changes, deletion of resources, or collection of clinical/legal matter content; those require separate explicit decisions.

## 15. Validation proof

Validation completed on 2026-08-21 against Azure subscription 1 (`d1a68ed7-2983-4a86-ab0e-e56df9e2e325`) in East US.

| Check | Command/evidence | Result |
|---|---|---|
| Azure Developer CLI | `azd version` | Passed — 1.31.2 stable |
| Azure authentication | `azd auth login --check-status` | Passed — authenticated as `DwayneTillman@7HermeticLabs.Dev` |
| Environment | `azd env get-values` | Passed — subscription, East US, deployer object ID, and existing Log Analytics workspace pinned |
| Azure YAML and Bicep graph | `azd provision --preview --no-prompt` | Passed — preview generated in 27 seconds; six resources proposed and no changes applied |
| Bicep compilation | `az bicep build --file infra/main.bicep --stdout` | Passed — no errors or warnings |
| Application build | `npm ci` and `npm run check` in `api/` | Passed — TypeScript and the bundled MSAL browser adapter compiled |
| Automated tests | `npm test` in `api/` | Passed — 6 tests, 0 failures |
| Dependency audit | `npm audit --omit=dev` in `api/` | Passed — 0 vulnerabilities |
| Deployment package | `azd package --no-prompt` | Passed — Function App artifact created successfully |
| Azure Policy | `az policy assignment list` at subscription scope | Passed — no assignments returned |
| Provider readiness | `Microsoft.KeyVault` registration plus existing Web/Storage/Insights providers | Passed |
| Static RBAC review | Reviewed every `Microsoft.Authorization/roleAssignments` resource against code operations | Passed — workload identity has Storage Blob Data Owner for Functions deployment/host storage, Storage Table Data Contributor, Key Vault Secrets User, and Monitoring Metrics Publisher; deployer data-plane roles are resource-scoped |
| Docker/Aspire checks | Repository scan | Not applicable — no Dockerfile and no Aspire project |

The first provisioning attempt exposed a Flex Consumption platform rule: `FUNCTIONS_WORKER_RUNTIME` must not be supplied as a legacy app setting when `functionAppConfig.runtime` already declares Node.js. The duplicate setting was removed; `az bicep build`, `azd provision --preview --no-prompt`, and `azd package --no-prompt` were rerun successfully. The second preview proposed only completion/normalization of the partially provisioned resources and no deletion or replacement.

The first code publish then showed that setting `NODE_ENV=production` at the Function App level caused Azure's remote builder to omit the TypeScript compiler before running the package build. The redundant flag was removed while `AZURE_FUNCTIONS_ENVIRONMENT=Production` was retained. Bicep build, provisioning preview, and packaging were rerun successfully before resuming deployment.

Azure's Function remote builder continued to install deployment dependencies only. TypeScript and the Node type definitions were therefore moved from development-only dependencies to deployment dependencies so the remote build is deterministic. `npm ci`, client/API compilation, all six tests, the production dependency audit, and `azd package --no-prompt` passed again before republishing.

The preview proposed only these new resources in the dedicated resource group: Application Insights, Key Vault, Storage account, Flex Consumption plan, Function App, managed identity, Table Storage resources, role assignments, and the resource group itself. Those resources have now been deployed. Entra customer-tenant identifiers remain intentionally unset; protected endpoints fail closed until the customer identity registration is supplied. Stripe Live mode remains outside this approval.

### Stripe sandbox configuration revalidation — 2026-08-22

The dedicated FEFE Stripe sandbox identifiers were substituted in Bicep and the server configuration examples before revalidation. `azd auth login --check-status`, `azd env get-values`, `az bicep build --file infra/main.bicep --stdout`, and `azd provision --preview --no-prompt` passed against Azure subscription 1 in East US. The preview was read-only and no infrastructure changes were applied. `npm ci`, `npm run check`, `npm test`, and `npm audit --omit=dev` passed with six tests, zero failures, and zero production dependency vulnerabilities. A sequential `azd package --no-prompt` then succeeded. Static review reconfirmed resource-scoped Storage Blob Data Owner, Storage Table Data Contributor, Monitoring Metrics Publisher, and Key Vault Secrets User roles for the Function managed identity. Subscription-scope Azure Policy assignment discovery returned no assignments.

## 16. Deployment and Stripe Test verification

Deployment completed on 2026-08-21 in `rg-fefeconnect-prod-eastus`.

| Item | Deployed value or evidence | Result |
|---|---|---|
| Function App | `func-fefe-xmndxtdw` | Running on Node.js 24 Flex Consumption |
| API base | `https://func-fefe-xmndxtdw.azurewebsites.net/api` | Reachable over HTTPS |
| Health probe | `GET /api/health` | `200 OK` with the minimal service health response |
| Storage account | `stfefexmndxtdwuzbd` | Application and webhook tables created |
| Key Vault | `kv-fefe-xmndxtdwuzbd` | Restricted Stripe Test key and Test webhook signing secret enabled |
| Managed identity | `id-fefe-xmndxtdw` | Key Vault, Table, Blob, and monitoring roles verified at resource scope |
| CORS | `https://fefeconnect.com` | Production origin configured |
| Stripe API version | `2026-07-29.dahlia` | Pinned to the Test webhook destination version |
| Restricted-key boundary | Customers, Checkout Sessions, Customer Portal, and read-only Subscriptions | Required operations returned `200`; unrelated Balance access returned `403` |
| Stripe account boundary | Dedicated FEFE sandbox `acct_1U7A81PZ0YIlyfF9` | Separate from Hermetic Labs and live mode |
| Stripe destination | `FEFE Azure Billing Webhook` (`we_1U7AGiPZ0YIlyfF9siNazyDv`) | Active and listening to five lifecycle events |
| Signed webhook | Unique signed Test payload | Azure returned `200` and recorded the receipt |
| Replay handling | Same signed event delivered twice | Second response returned `duplicate: true` |
| Hosted Checkout | Metadata-only sandbox customer and Individual test Price | Stripe created a `checkout.stripe.com` Session; no payment was submitted |
| Customer Portal | Same sandbox customer and configured portal | Stripe created a `billing.stripe.com` Session |

The active webhook event set is `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, and `customer.subscription.deleted`. Stripe secrets were transferred directly from the authenticated dashboards into Key Vault and were not added to source files, shell history, documentation, or frontend assets. The 2026-08-22 recheck confirmed both secret versions are enabled, the Function identity retains its resource-scoped Key Vault, Storage, and monitoring roles, required Stripe operations succeed, and unrelated Balance access remains denied with `403`.

The public frontend remains fail-closed because `applicationApiBase` and the Entra customer registration values are deliberately blank. This prevents a preview or unauthenticated browser from reaching billing. The remaining activation step is to create or select the customer-facing Entra External ID tenant and configure the SPA/API registrations, redirect URI, API scope, issuer, audience, and MFA policy before enabling the production API base in `site-config.js`.

## 17. Approved member-services expansion — 2026-08-22

**Approval evidence:** The owner approved the phased `docs/build-plan.md` and then directed, “let’s do it.”

**Execution objective:** Complete the existing member-service foundation without replacing the public visual system. Preserve the working Stripe sandbox and deployed Azure Function while adding customer identity, persistent member/application data, private profile media, reviewer operations, profiles, directory access, organization membership, and the Founding Member Pilot entitlement.

### Confirmed baseline

- Azure Function, managed identity, Key Vault, Application Insights, Storage account, and five application/billing tables are deployed.
- Existing Blob containers are Function system/deployment containers only; no profile or verification-evidence container exists.
- The frontend MSAL adapter and server token validator exist, but the public client ID/authority/scope/API base and server issuer/JWKS/audience remain unset.
- No FEFE app registration is visible in the current Hermetic Labs tenant. A second accessible tenant ID must be identified before customer app registrations are created.
- The existing onboarding form is a browser-only preview and must remain fail-closed until authenticated submission and server-owned consent records are available.

### Expansion work packages

1. **Identity:** Identify/select the customer Entra External ID tenant; create separate SPA and protected API registrations; expose `access_as_user`; configure production/local redirect URIs, customer sign-up/sign-in, MFA, issuer/JWKS/audience, and least-privilege token validation. Create no client secret for the public SPA.
2. **Storage:** Add private `profile-images`, `verification-evidence`, and `upload-quarantine` Blob containers; add accounts, identity links, consent events, profiles, organizations, memberships, reviews, verification results, pilot entitlements, and audit-event tables. Preserve the existing five tables.
3. **API:** Implement authenticated account bootstrap, application create/save/submit/status, versioned consent events, profile create/edit/publish, organization membership, member directory, pilot entitlement, reviewer queue/decision, private upload authorization/finalization, and existing billing/portal integration. Unsupported jurisdictions and unauthorized roles fail closed.
4. **Frontend:** Retain the current landing/legal pages and visual system; replace preview-only onboarding with authenticated save/resume/submit; add member dashboard, application status, profile editor, directory, organization seats, pilot/activation state, billing portal, and role-protected reviewer surface.
5. **Safety:** Continue prohibiting patient/client/case/PHI/privileged content; keep evidence and original uploads private; validate file signatures and strip image metadata before publication; record append-only policy acceptances; never infer verification from identity, NPI, entity existence, or payment.
6. **Verification and deployment:** Add deterministic auth/storage/API/browser tests, validate Bicep and RBAC, run Azure preview, update this plan to `Ready for Validation`, invoke `azure-validate`, then use `azure-deploy`. Keep Stripe in sandbox and do not enable live charges.

### Architecture and deployment decisions

- Continue with the existing Azure Functions Flex Consumption, Azure Table Storage, private Blob Storage, managed identity, Key Vault, Application Insights, Bicep, and `azd` composition.
- Keep `fefeconnect.com` as the public GitHub Pages origin for this phase. The authenticated member frontend will initially use the same origin and API; `app.fefeconnect.com` and `api.fefeconnect.com` remain post-validation hostname steps.
- Use FEFE-owned immutable account IDs with provider-neutral external identity links so Google can be added later without re-keying records.
- Use the existing East US resource group and subscription. No new always-on compute, database service, public container, or live-payment environment is authorized.
- Treat the second tenant as unconfirmed until its organization identity and External ID suitability are verified through an authenticated Microsoft session.

### Exit criteria

- Entra SPA/API registrations and MFA-enabled customer flow issue valid scoped tokens that the Function accepts and invalid tokens cannot cross account boundaries.
- Private containers and new tables are provisioned with managed-identity access and no public access.
- A signed-in test applicant can save and submit a fictional application, an authorized reviewer can record a reconstructable manual Georgia decision, and an approved applicant can receive one auditable pilot entitlement or enter Stripe sandbox Checkout.
- An active verified test member can maintain a safe profile and discover another eligible member; cancellation, expiry, suspension, and account closure remove access correctly.
- Builds, tests, security checks, Bicep validation, Azure preview, sandbox billing lifecycle, and browser acceptance tests pass before deployment status changes to validated.

### Execution checkpoint — member data path prepared

- Added private `profile-images`, `verification-evidence`, and `upload-quarantine` containers to Bicep with public access disabled.
- Added accounts, identity links, consent events, profiles, organizations, memberships, reviews, verification results, pilot entitlements, and audit-event tables without changing existing billing tables.
- Added scoped-token account bootstrap and versioned application submission endpoints. Submitted applications are immutable; identical retries are idempotent and changed retries fail closed.
- Added strict allowlist validation for application fields, HTTPS-only professional websites, current policy versions, and all required attestations.
- Connected onboarding to MSAL and the API when public identity settings are complete. Blank identity/API values preserve the current local preview and make no claim of secure submission.
- Added member-services architecture and boundary documentation in `docs/member-services-foundation.md`.
- Local TypeScript build, 19 contract tests, browser-client build, and Bicep compilation pass. Azure validation and deployment have not begun.
