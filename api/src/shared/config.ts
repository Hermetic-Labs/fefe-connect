export interface AppConfig {
  siteOrigin: string;
  storageTableEndpoint?: string;
  storageConnectionString?: string;
  managedIdentityClientId?: string;
  keyVaultUri?: string;
  entraIssuer?: string;
  entraJwksUri?: string;
  entraAudience?: string;
  entraRequiredScope: string;
  stripeSecretName: string;
  stripeWebhookSecretName: string;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  stripeApiVersion?: string;
  stripePortalConfigurationId?: string;
  billingDisclosureVersion: string;
  stripePrices: Record<PublicPlanKey, string>;
}

export type PublicPlanKey = "individual_monthly" | "organization_monthly";

function value(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const candidate = env[name]?.trim();
  return candidate || undefined;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    siteOrigin: value(env, "FEFE_SITE_ORIGIN") ?? "https://fefeconnect.com",
    storageTableEndpoint: value(env, "APPLICATION_STORAGE__tableServiceUri"),
    storageConnectionString: value(env, "APPLICATION_STORAGE_CONNECTION_STRING"),
    managedIdentityClientId: value(env, "AZURE_CLIENT_ID"),
    keyVaultUri: value(env, "KEY_VAULT_URI"),
    entraIssuer: value(env, "ENTRA_ISSUER"),
    entraJwksUri: value(env, "ENTRA_JWKS_URI"),
    entraAudience: value(env, "ENTRA_API_AUDIENCE"),
    entraRequiredScope: value(env, "ENTRA_REQUIRED_SCOPE") ?? "access_as_user",
    stripeSecretName: value(env, "STRIPE_SECRET_NAME") ?? "stripe-test-secret-key",
    stripeWebhookSecretName: value(env, "STRIPE_WEBHOOK_SECRET_NAME") ?? "stripe-test-webhook-secret",
    stripeSecretKey: value(env, "STRIPE_SECRET_KEY"),
    stripeWebhookSecret: value(env, "STRIPE_WEBHOOK_SECRET"),
    stripeApiVersion: value(env, "STRIPE_API_VERSION"),
    stripePortalConfigurationId: value(env, "STRIPE_PORTAL_CONFIGURATION_ID"),
    billingDisclosureVersion: value(env, "BILLING_DISCLOSURE_VERSION") ?? "2026-08-20",
    stripePrices: {
      individual_monthly: value(env, "STRIPE_PRICE_INDIVIDUAL_MONTHLY") ?? "",
      organization_monthly: value(env, "STRIPE_PRICE_ORGANIZATION_MONTHLY") ?? "",
    },
  };
}

export function isAzureRuntime(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(value(env, "WEBSITE_SITE_NAME")) || value(env, "AZURE_FUNCTIONS_ENVIRONMENT") === "Production";
}
