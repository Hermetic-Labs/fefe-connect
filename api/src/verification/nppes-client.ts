const NPPES_ENDPOINT = "https://npiregistry.cms.hhs.gov/api/";

type JsonObject = Record<string, unknown>;

export type NppesFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface NppesTaxonomySummary {
  code?: string;
  description?: string;
  primary?: boolean;
  state?: string;
  license?: string;
}

export interface NppesAddressSummary {
  purpose?: string;
  type?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  countryCode?: string;
}

export interface NppesProviderSummary {
  number: string;
  enumerationType?: string;
  status?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  credential?: string;
  organizationName?: string;
  taxonomies: NppesTaxonomySummary[];
  addresses: NppesAddressSummary[];
  createdEpoch?: number;
  lastUpdatedEpoch?: number;
}

export interface NppesLookupResult {
  outcome: "found" | "needs_review" | "source_unavailable";
  reasonCode:
    | "NPI_RECORD_FOUND"
    | "NPI_NOT_FOUND"
    | "NPI_RESULT_COUNT_AMBIGUOUS"
    | "NPI_NUMBER_MISMATCH"
    | "NPI_ENUMERATION_TYPE_MISMATCH"
    | "NPI_RECORD_INACTIVE"
    | "NPPES_HTTP_ERROR"
    | "NPPES_INVALID_RESPONSE"
    | "NPPES_REQUEST_FAILED";
  resultCount?: number;
  provider?: NppesProviderSummary;
  checkedAt: string;
  sourceUrl: string;
}

export interface NppesLookupOptions {
  expectedEnumerationType?: "NPI-1" | "NPI-2";
  fetcher?: NppesFetch;
  timeoutMs?: number;
  maxAttempts?: number;
  retryDelayMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
  now?: () => Date;
}

function objectValue(value: unknown): JsonObject | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function parseProvider(value: unknown): NppesProviderSummary | undefined {
  const provider = objectValue(value);
  const number = stringValue(provider?.number);
  if (!provider || !number) return undefined;

  const basic = objectValue(provider.basic) ?? {};
  const taxonomies = Array.isArray(provider.taxonomies)
    ? provider.taxonomies.flatMap((item): NppesTaxonomySummary[] => {
        const taxonomy = objectValue(item);
        if (!taxonomy) return [];
        return [{
          code: stringValue(taxonomy.code),
          description: stringValue(taxonomy.desc),
          primary: booleanValue(taxonomy.primary),
          state: stringValue(taxonomy.state),
          license: stringValue(taxonomy.license),
        }];
      })
    : [];
  const addresses = Array.isArray(provider.addresses)
    ? provider.addresses.flatMap((item): NppesAddressSummary[] => {
        const address = objectValue(item);
        if (!address) return [];
        return [{
          purpose: stringValue(address.address_purpose),
          type: stringValue(address.address_type),
          city: stringValue(address.city),
          state: stringValue(address.state),
          postalCode: stringValue(address.postal_code),
          countryCode: stringValue(address.country_code),
        }];
      })
    : [];

  return {
    number,
    enumerationType: stringValue(provider.enumeration_type),
    status: stringValue(basic.status),
    firstName: stringValue(basic.first_name),
    middleName: stringValue(basic.middle_name),
    lastName: stringValue(basic.last_name),
    credential: stringValue(basic.credential),
    organizationName: stringValue(basic.organization_name),
    taxonomies,
    addresses,
    createdEpoch: numberValue(provider.created_epoch),
    lastUpdatedEpoch: numberValue(provider.last_updated_epoch),
  };
}

export function isValidNpi(value: string): boolean {
  if (!/^\d{10}$/.test(value)) return false;
  const digits = `80840${value}`.split("").map(Number);
  let sum = 0;
  for (let index = digits.length - 1, offset = 0; index >= 0; index -= 1, offset += 1) {
    const digit = digits[index];
    if (digit === undefined) return false;
    const transformed = offset % 2 === 1 ? digit * 2 : digit;
    sum += transformed > 9 ? transformed - 9 : transformed;
  }
  return sum % 10 === 0;
}

function unavailable(
  reasonCode: Extract<NppesLookupResult["reasonCode"], "NPPES_HTTP_ERROR" | "NPPES_INVALID_RESPONSE" | "NPPES_REQUEST_FAILED">,
  checkedAt: string,
  sourceUrl: string,
): NppesLookupResult {
  return { outcome: "source_unavailable", reasonCode, checkedAt, sourceUrl };
}

function normalizeResponse(
  payload: unknown,
  npi: string,
  expectedEnumerationType: NppesLookupOptions["expectedEnumerationType"],
  checkedAt: string,
  sourceUrl: string,
): NppesLookupResult {
  const root = objectValue(payload);
  const results = Array.isArray(root?.results) ? root.results : undefined;
  const resultCount = numberValue(root?.result_count);
  if (!root || !results || resultCount === undefined || !Number.isInteger(resultCount) || resultCount < 0) {
    return unavailable("NPPES_INVALID_RESPONSE", checkedAt, sourceUrl);
  }
  if (resultCount === 0) {
    return { outcome: "needs_review", reasonCode: "NPI_NOT_FOUND", resultCount, checkedAt, sourceUrl };
  }
  if (resultCount !== 1 || results.length !== 1) {
    return { outcome: "needs_review", reasonCode: "NPI_RESULT_COUNT_AMBIGUOUS", resultCount, checkedAt, sourceUrl };
  }

  const provider = parseProvider(results[0]);
  if (!provider) return unavailable("NPPES_INVALID_RESPONSE", checkedAt, sourceUrl);
  if (provider.number !== npi) {
    return { outcome: "needs_review", reasonCode: "NPI_NUMBER_MISMATCH", resultCount, provider, checkedAt, sourceUrl };
  }
  if (expectedEnumerationType && provider.enumerationType !== expectedEnumerationType) {
    return { outcome: "needs_review", reasonCode: "NPI_ENUMERATION_TYPE_MISMATCH", resultCount, provider, checkedAt, sourceUrl };
  }
  if (provider.status !== "A") {
    return { outcome: "needs_review", reasonCode: "NPI_RECORD_INACTIVE", resultCount, provider, checkedAt, sourceUrl };
  }
  return { outcome: "found", reasonCode: "NPI_RECORD_FOUND", resultCount, provider, checkedAt, sourceUrl };
}

export async function lookupNppesByNumber(npi: string, options: NppesLookupOptions = {}): Promise<NppesLookupResult> {
  const normalizedNpi = npi.trim();
  if (!isValidNpi(normalizedNpi)) throw new TypeError("NPI must be a valid 10-digit identifier.");

  const sourceUrl = `${NPPES_ENDPOINT}?${new URLSearchParams({ version: "2.1", number: normalizedNpi })}`;
  const fetcher = options.fetcher ?? fetch;
  const timeoutMs = options.timeoutMs ?? 5_000;
  const maxAttempts = Math.max(1, Math.min(options.maxAttempts ?? 3, 5));
  const retryDelayMs = Math.max(0, options.retryDelayMs ?? 250);
  const sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const checkedAt = (options.now ?? (() => new Date()))().toISOString();
  let lastReason: "NPPES_HTTP_ERROR" | "NPPES_INVALID_RESPONSE" | "NPPES_REQUEST_FAILED" = "NPPES_REQUEST_FAILED";

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetcher(sourceUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) {
        lastReason = "NPPES_HTTP_ERROR";
        if (response.status !== 429 && response.status < 500) break;
      } else {
        const payload = await response.json();
        const normalized = normalizeResponse(payload, normalizedNpi, options.expectedEnumerationType, checkedAt, sourceUrl);
        if (normalized.reasonCode !== "NPPES_INVALID_RESPONSE") return normalized;
        lastReason = "NPPES_INVALID_RESPONSE";
      }
    } catch {
      lastReason = "NPPES_REQUEST_FAILED";
    } finally {
      clearTimeout(timeout);
    }

    if (attempt < maxAttempts) await sleep(retryDelayMs * 2 ** (attempt - 1));
  }

  return unavailable(lastReason, checkedAt, sourceUrl);
}
