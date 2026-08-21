import {
  InteractionRequiredAuthError,
  PublicClientApplication,
  type AccountInfo,
  type AuthenticationResult,
} from "@azure/msal-browser";

type PublicAuthConfig = {
  clientId?: string;
  authority?: string;
  knownAuthorities?: string[];
  apiScope?: string;
};

declare global {
  interface Window {
    FEFE_CONFIG?: { auth?: PublicAuthConfig };
    FEFE_AUTH?: {
      initialize: () => Promise<void>;
      isConfigured: () => boolean;
      getAccount: () => AccountInfo | null;
      signIn: () => Promise<AccountInfo>;
      signOut: () => Promise<void>;
      getAccessToken: (options?: { interactive?: boolean }) => Promise<string | null>;
    };
  }
}

const publicConfig = window.FEFE_CONFIG?.auth ?? {};
const configured = Boolean(publicConfig.clientId && publicConfig.authority && publicConfig.apiScope);
const client = configured
  ? new PublicClientApplication({
      auth: {
        clientId: publicConfig.clientId!,
        authority: publicConfig.authority!,
        knownAuthorities: publicConfig.knownAuthorities ?? [],
        redirectUri: `${window.location.origin}${window.location.pathname}`,
        postLogoutRedirectUri: `${window.location.origin}/`,
        navigateToLoginRequestUrl: true,
      },
      cache: { cacheLocation: "sessionStorage" },
      system: {
        loggerOptions: {
          piiLoggingEnabled: false,
          loggerCallback: (_level, message, containsPii) => {
            if (!containsPii && /error/i.test(message)) console.warn("Member sign-in encountered an error.");
          },
        },
      },
    })
  : null;

let initialization: Promise<void> | undefined;

async function initialize(): Promise<void> {
  if (!client) return;
  if (!initialization) {
    initialization = (async () => {
      await client.initialize();
      const result = await client.handleRedirectPromise();
      if (result?.account) client.setActiveAccount(result.account);
      if (!client.getActiveAccount()) client.setActiveAccount(client.getAllAccounts()[0] ?? null);
    })();
  }
  await initialization;
}

function account(): AccountInfo | null {
  return client?.getActiveAccount() ?? client?.getAllAccounts()[0] ?? null;
}

async function signIn(): Promise<AccountInfo> {
  if (!client || !publicConfig.apiScope) throw new Error("Member sign-in is not configured yet.");
  await initialize();
  const result: AuthenticationResult = await client.loginPopup({
    scopes: ["openid", "profile", "email", publicConfig.apiScope],
    prompt: "select_account",
  });
  if (!result.account) throw new Error("Sign-in completed without a member account.");
  client.setActiveAccount(result.account);
  return result.account;
}

async function getAccessToken(options: { interactive?: boolean } = {}): Promise<string | null> {
  if (!client || !publicConfig.apiScope) return null;
  await initialize();
  let current = account();
  if (!current && options.interactive) current = await signIn();
  if (!current) return null;
  try {
    const result = await client.acquireTokenSilent({ account: current, scopes: [publicConfig.apiScope] });
    return result.accessToken;
  } catch (error) {
    if (!options.interactive || !(error instanceof InteractionRequiredAuthError)) throw error;
    const result = await client.acquireTokenPopup({ account: current, scopes: [publicConfig.apiScope] });
    return result.accessToken;
  }
}

async function signOut(): Promise<void> {
  if (!client) return;
  await initialize();
  await client.logoutRedirect({ account: account() ?? undefined });
}

window.FEFE_AUTH = {
  initialize,
  isConfigured: () => configured,
  getAccount: account,
  signIn,
  signOut,
  getAccessToken,
};

initialize().finally(() => window.dispatchEvent(new CustomEvent("fefe-auth-ready")));
