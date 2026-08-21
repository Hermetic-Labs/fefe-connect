import { app } from "@azure/functions";
import { authenticate } from "../shared/auth";
import { loadConfig } from "../shared/config";
import { HttpError } from "../shared/errors";
import { handled, jsonResponse, preflight } from "../shared/http";
import { stripeClient } from "../shared/stripe-client";
import { getBillingCustomer } from "../shared/storage";

export const createPortalSessionHandler = handled(async (request, _context, id) => {
  const options = preflight(request);
  if (options) return options;
  const principal = await authenticate(request);
  const billingCustomer = await getBillingCustomer(principal.subject);
  if (!billingCustomer) throw new HttpError(404, "billing_account_not_found", "No billing account is linked to this member.");
  const config = loadConfig();
  const stripe = await stripeClient();
  const portal = await stripe.billingPortal.sessions.create({
    customer: billingCustomer.stripeCustomerId,
    configuration: config.stripePortalConfigurationId,
    return_url: `${config.siteOrigin}/`,
  });
  return jsonResponse(request, 201, { portal_url: portal.url, request_id: id }, id);
});

app.http("createPortalSession", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "v1/billing/portal-sessions",
  handler: createPortalSessionHandler,
});
