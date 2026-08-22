import type { HttpRequest } from "@azure/functions";
import { loadConfig } from "./config";
import { HttpError } from "./errors";

export interface AuthenticatedPrincipal {
  subject: string;
  issuer: string;
  email?: string;
  name?: string;
  claims: Record<string, unknown>;
}

let jwksUri = "";
let jwks: unknown;

async function remoteKeys(uri: string): Promise<unknown> {
  if (!jwks || jwksUri !== uri) {
    const { createRemoteJWKSet } = await import("jose");
    jwksUri = uri;
    jwks = createRemoteJWKSet(new URL(uri), { cooldownDuration: 30_000, timeoutDuration: 5_000 });
  }
  return jwks;
}

function firstString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) return value.find((item): item is string => typeof item === "string" && Boolean(item.trim()));
  return undefined;
}

export async function authenticate(request: HttpRequest): Promise<AuthenticatedPrincipal> {
  const config = loadConfig();
  if (!config.entraIssuer || !config.entraJwksUri || !config.entraAudience) {
    throw new HttpError(503, "authentication_not_configured", "Member sign-in is not available yet.");
  }
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
  if (!match?.[1]) throw new HttpError(401, "authentication_required", "Sign in to continue.");

  try {
    const { jwtVerify } = await import("jose");
    const keys = await remoteKeys(config.entraJwksUri) as Parameters<typeof jwtVerify>[1];
    const result = await jwtVerify(match[1], keys, {
      issuer: config.entraIssuer,
      audience: config.entraAudience,
      algorithms: ["RS256"],
      clockTolerance: 5,
    });
    const scopes = firstString(result.payload.scp)?.split(/\s+/) ?? [];
    if (!scopes.includes(config.entraRequiredScope)) {
      throw new HttpError(403, "insufficient_scope", "This sign-in cannot access FEFE member services.");
    }
    const subject = firstString(result.payload.sub);
    const issuer = firstString(result.payload.iss);
    if (!subject) throw new HttpError(401, "invalid_token", "The sign-in token has no stable subject.");
    if (!issuer) throw new HttpError(401, "invalid_token", "The sign-in token has no issuer.");
    return {
      subject,
      issuer,
      email: firstString(result.payload.emails) ?? firstString(result.payload.email) ?? firstString(result.payload.preferred_username),
      name: firstString(result.payload.name),
      claims: result.payload as Record<string, unknown>,
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(401, "invalid_token", "Your sign-in has expired or could not be verified.");
  }
}
