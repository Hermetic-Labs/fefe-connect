import { randomUUID } from "node:crypto";
import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { loadConfig } from "./config";
import { HttpError } from "./errors";

const commonHeaders: Record<string, string> = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

export function requestId(request: HttpRequest): string {
  const supplied = request.headers.get("x-ms-client-request-id")?.trim();
  return supplied && /^[A-Za-z0-9._:-]{8,128}$/.test(supplied) ? supplied : randomUUID();
}

function corsHeaders(request: HttpRequest): Record<string, string> {
  const origin = request.headers.get("origin");
  if (!origin || origin !== loadConfig().siteOrigin) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Authorization, Content-Type, Idempotency-Key, X-MS-Client-Request-ID",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

export function jsonResponse(request: HttpRequest, status: number, body: unknown, id = requestId(request)): HttpResponseInit {
  return {
    status,
    headers: { ...commonHeaders, ...corsHeaders(request), "X-Request-ID": id },
    jsonBody: body,
  };
}

export function emptyResponse(request: HttpRequest, status: number): HttpResponseInit {
  return { status, headers: { ...commonHeaders, ...corsHeaders(request) } };
}

export function preflight(request: HttpRequest): HttpResponseInit | undefined {
  if (request.method !== "OPTIONS") return undefined;
  const origin = request.headers.get("origin");
  return origin === loadConfig().siteOrigin ? emptyResponse(request, 204) : emptyResponse(request, 403);
}

export async function jsonBody(request: HttpRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "invalid_json", "The request body must be valid JSON.");
  }
}

export function handled(
  handler: (request: HttpRequest, context: InvocationContext, id: string) => Promise<HttpResponseInit>,
): (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit> {
  return async (request, context) => {
    const id = requestId(request);
    try {
      return await handler(request, context, id);
    } catch (error) {
      const known = error instanceof HttpError;
      const status = known ? error.status : 500;
      const code = known ? error.code : "internal_error";
      context.error({ event: "request_failed", requestId: id, status, code });
      const message = known ? error.message : "The request could not be completed.";
      return jsonResponse(request, status, { error: code, message, request_id: id }, id);
    }
  };
}
