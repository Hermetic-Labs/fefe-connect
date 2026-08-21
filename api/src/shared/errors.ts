export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function isNotFound(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { statusCode?: number; status?: number; code?: string };
  return candidate.statusCode === 404 || candidate.status === 404 || candidate.code === "ResourceNotFound";
}

export function isConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { statusCode?: number; status?: number; code?: string };
  return candidate.statusCode === 409 || candidate.status === 409 || candidate.code === "EntityAlreadyExists";
}
