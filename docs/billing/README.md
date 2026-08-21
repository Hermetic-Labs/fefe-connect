# FEFE Connect billing integration

Status: implementation contract; Stripe test catalog and Customer Portal created; credentials and webhooks not yet connected

Contract version: `1.0.0`

Last reviewed: 2026-08-21

FEFE applications are free. Verification and the membership decision occur before billing. Only an authenticated applicant whose server-side application state is `approved` or `activation_pending` may create a Checkout Session.

## Public plans

| Public plan key | Display price | Included |
|---|---:|---|
| `individual_monthly` | $29 USD/month | One reviewed professional profile |
| `organization_monthly` | $79 USD/month | Organization page plus three reviewed professional seats |
| `additional_seat_monthly` | $20 USD/month | One additional reviewed professional seat; added after activation |

## Stripe test catalog

The three recurring monthly products are active in Stripe Test mode. These identifiers are non-secret and test-only; production must use separately created live-mode Products and Prices.

| Public plan key | Product ID | Price ID | Lookup key |
|---|---|---|---|
| `individual_monthly` | `prod_V6xt9tAyMvT6MY` | `price_1U6jxsRzK8KdcdCbvtQTPHOo` | `fefe_individual_monthly_v1` |
| `organization_monthly` | `prod_V6xuW6tSzk7I1R` | `price_1U6jyQRzK8KdcdCbAeHfPCTH` | `fefe_organization_monthly_v1` |
| `additional_seat_monthly` | `prod_V6xuUJJhepSkLW` | `price_1U6jz1RzK8KdcdCbpB8xCsBj` | `fefe_additional_seat_monthly_v1` |

For local Azure-service testing, start with `service.env.test.example`. Supply the secret key and webhook signing secret through local secret storage or Azure Key Vault; never commit them.

The Test-mode Customer Portal configuration is `bpc_1U6k1bRzK8KdcdCbkG0JtMUW`. It allows invoice history, billing-information and payment-method updates, and cancellation at the end of the billing period with a cancellation reason. Its return URL is `https://fefeconnect.com/`. Stripe public business information still needs the final Terms and Privacy URLs before live launch.

The browser may display these values, but it is not the billing authority. The API maps each stable public plan key to a private Stripe Price ID and rejects unknown, inactive, mismatched, or client-supplied amounts. Legal and mental-health applicants use the same catalog.

## Server-only configuration

Copy `service.env.example` into the future Azure service's secret/configuration system. Store the secret values in Azure Key Vault and expose them to the service through managed identity or secret references. Never add them to `site-config.js`, GitHub Pages, logs, client telemetry, or API responses.

The Stripe account needs three recurring Prices matching the public catalog. Product names, statement descriptor, business identity, support contact, Terms URL, Privacy URL, and Customer Portal configuration must be reviewed in both Stripe test and live modes.

## Checkout contract

`POST /v1/billing/checkout-sessions` requires an Entra-authenticated applicant, an `Idempotency-Key` header, and an explicit `recurring_billing_accepted: true` action following an unchecked disclosure control. The request follows `checkout-session-request.schema.json`.

Before calling Stripe, the API must:

1. resolve the Entra subject to the applicant account;
2. load the application by ID with a row lock or equivalent concurrency control;
3. require ownership and an `approved` or `activation_pending` application state;
4. reject an existing active or conflicting subscription;
5. map `plan_key` through server configuration to the correct active Stripe Price ID;
6. load the canonical billing disclosure identified by `billing_disclosure_version` and reject a stale version;
7. append the acceptance record with its canonical-text hash, applicant, price snapshot, server time, and request ID; and
8. create or reuse the Stripe Customer and create a Checkout Session in subscription mode.

The server supplies fixed, allowlisted success and cancel URLs. It attaches internal opaque IDs—not names, licence numbers, or professional details—to Stripe metadata. The response is:

```json
{
  "checkout_session_id": "cs_test_...",
  "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_...",
  "request_id": "01J..."
}
```

The browser accepts only an HTTPS Stripe-hosted Checkout URL. It never receives a Stripe secret, webhook secret, or Price ID.

## Membership activation

The success redirect is informational. It must not activate access. Membership changes only after the API verifies and processes signed Stripe events against the unmodified raw request body.

Minimum event handling:

| Event | Server action |
|---|---|
| `checkout.session.completed` | Link the completed Session to the approved application; do not assume every future invoice is paid. |
| `invoice.paid` | Idempotently mark the relevant subscription period paid and activate or continue permitted access. |
| `invoice.payment_failed` | Record the failure and apply the documented grace/retry policy without deleting history. |
| `customer.subscription.updated` | Reconcile plan, quantity, period, scheduled cancellation, and subscription state. |
| `customer.subscription.deleted` | End access according to the effective cancellation date and unpublish the profile as policy requires. |

Store every Stripe event ID before applying it, ignore already-processed IDs, and keep a dead-letter/replay path. Pin and deliberately upgrade the Stripe API version. Return a quick success response after durable receipt and perform slow work asynchronously.

Stripe owns the recurring cadence. Azure consumes webhooks and runs a reconciliation job for missed or delayed events; an Azure timer must not independently decide when to charge a card.

## Customer Portal

`POST /v1/billing/portal-sessions` requires the authenticated member. The API resolves the Stripe Customer ID from its own subscription record, creates a short-lived portal session with a fixed return URL, and returns only the Stripe-hosted URL. Configure the portal to support payment-method changes, invoice access, and cancellation at the end of the paid period.

## Test gate

Before live credentials are admitted, verify in a Stripe sandbox:

- individual and organization Checkout;
- duplicate clicks and network retries;
- direct calls for unapproved or another user's application;
- stale disclosure and unknown plan keys;
- successful, failed, delayed, and 3DS-required payments;
- webhook duplication, reordering, replay, bad signatures, and endpoint downtime;
- cancel-at-period-end, immediate administrative cancellation, reactivation, and plan/seat changes;
- price changes without silently altering existing subscriptions;
- Checkout success redirects arriving before their webhook; and
- redaction of Stripe payloads and personal information from normal logs.

Official implementation references: [Checkout subscriptions](https://docs.stripe.com/payments/checkout/build-subscriptions), [webhook signature verification](https://docs.stripe.com/webhooks/signature), [idempotent requests](https://docs.stripe.com/api/idempotent_requests), and [Customer Portal](https://docs.stripe.com/customer-management).
