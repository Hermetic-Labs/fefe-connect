import { SecretClient } from "@azure/keyvault-secrets";
import { azureCredential } from "./credential";
import { loadConfig } from "./config";
import { HttpError } from "./errors";

const cache = new Map<string, { value: string; expiresAt: number }>();
let client: SecretClient | undefined;
let clientVaultUri = "";

function keyVaultClient(uri: string): SecretClient {
  if (!client || clientVaultUri !== uri) {
    clientVaultUri = uri;
    client = new SecretClient(uri, azureCredential());
  }
  return client;
}

async function keyVaultSecret(name: string): Promise<string> {
  const config = loadConfig();
  if (!config.keyVaultUri) throw new HttpError(503, "secrets_not_configured", "Billing is not available yet.");
  const cached = cache.get(name);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const secret = await keyVaultClient(config.keyVaultUri).getSecret(name);
  if (!secret.value) throw new HttpError(503, "secret_unavailable", "Billing is not available yet.");
  cache.set(name, { value: secret.value, expiresAt: Date.now() + 5 * 60_000 });
  return secret.value;
}

export async function stripeSecretKey(): Promise<string> {
  const config = loadConfig();
  return config.stripeSecretKey ?? keyVaultSecret(config.stripeSecretName);
}

export async function stripeWebhookSecret(): Promise<string> {
  const config = loadConfig();
  return config.stripeWebhookSecret ?? keyVaultSecret(config.stripeWebhookSecretName);
}
