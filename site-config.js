// Public configuration only. Never place Stripe secret keys or API credentials here.
window.FEFE_CONFIG = {
  auth: {
    clientId: "",
    authority: "",
    knownAuthorities: [],
    apiScope: "",
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
  applicationApiBase: "",
  policyVersions: {
    terms: "2026-08-20",
    privacy: "2026-08-20",
    intendedUse: "2026-08-20",
    verification: "2026-08-20",
    billingDisclosure: "2026-08-20",
  },
};
