import { DefaultAzureCredential, ManagedIdentityCredential, type TokenCredential } from "@azure/identity";
import { isAzureRuntime, loadConfig } from "./config";

let cachedCredential: TokenCredential | undefined;

export function azureCredential(): TokenCredential {
  if (cachedCredential) return cachedCredential;
  const config = loadConfig();
  cachedCredential = isAzureRuntime()
    ? config.managedIdentityClientId
      ? new ManagedIdentityCredential({ clientId: config.managedIdentityClientId })
      : new ManagedIdentityCredential()
    : new DefaultAzureCredential();
  return cachedCredential;
}
