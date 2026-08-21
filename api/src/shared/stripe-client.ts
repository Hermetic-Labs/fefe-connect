import Stripe from "stripe";
import { loadConfig } from "./config";
import { stripeSecretKey } from "./secrets";

let cached: { key: string; client: Stripe } | undefined;

export async function stripeClient(): Promise<Stripe> {
  const key = await stripeSecretKey();
  if (cached?.key === key) return cached.client;
  const version = loadConfig().stripeApiVersion;
  const options: Stripe.StripeConfig = {
    appInfo: { name: "FEFE Connect", version: "1.0.0" },
    maxNetworkRetries: 2,
    timeout: 10_000,
  };
  if (version) options.apiVersion = version as Stripe.LatestApiVersion;
  cached = { key, client: new Stripe(key, options) };
  return cached.client;
}

export function stripeObjectId(value: string | { id: string } | null | undefined): string | undefined {
  if (typeof value === "string") return value;
  return value?.id;
}
