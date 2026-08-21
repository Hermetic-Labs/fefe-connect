import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { jsonResponse } from "../shared/http";

export async function health(request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  return jsonResponse(request, 200, { status: "ok", service: "fefe-connect-api" });
}

app.http("health", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "health",
  handler: health,
});
