// Public configuration only. Never place Stripe secret keys or API credentials here.
window.FEFE_CONFIG = {
  auth: {
    clientId: "5983c194-0f7d-4906-b31c-e6ae14a524fb",
    authority: "https://fefeconnect.ciamlogin.com/0fc4c7bc-5996-4bd7-b9b1-efc085356de0",
    knownAuthorities: ["fefeconnect.ciamlogin.com"],
    apiScope: "api://43c011d2-3e6f-4055-8d66-e6793d9b41d0/access_as_user",
  },
  billing: {
    checkoutSessionPath: "/v1/billing/checkout-sessions",
    portalSessionPath: "/v1/billing/portal-sessions",
    plans: {
      individual_monthly: { name: "Individual", amount: 29, currency: "USD", interval: "month", includedSeats: 1 },
      organization_monthly: { name: "Organization", amount: 79, currency: "USD", interval: "month", includedSeats: 3 },
      additional_seat_monthly: { name: "Additional seat", amount: 20, currency: "USD", interval: "month", includedSeats: 1 },
    },
  },
  applicationApiBase: "https://func-fefe-xmndxtdw.azurewebsites.net/api",
  policyVersions: {
    terms: "2026-08-20",
    privacy: "2026-08-20",
    intendedUse: "2026-08-20",
    verification: "2026-08-20",
    billingDisclosure: "2026-08-20",
  },
};
