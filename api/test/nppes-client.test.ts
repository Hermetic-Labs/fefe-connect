import assert from "node:assert/strict";
import test from "node:test";
import { isValidNpi, lookupNppesByNumber, type NppesFetch } from "../src/verification/nppes-client";

const fixedNow = () => new Date("2026-08-22T12:00:00Z");

function response(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
}

function activeProvider(overrides: Record<string, unknown> = {}) {
  return {
    number: "1234567893",
    enumeration_type: "NPI-1",
    basic: { first_name: "Morgan", last_name: "Example", status: "A" },
    taxonomies: [{ code: "1041C0700X", desc: "Clinical", primary: true, state: "GA", license: "EXAMPLE" }],
    addresses: [{ address_purpose: "LOCATION", address_type: "DOM", city: "Atlanta", state: "GA", postal_code: "30303", country_code: "US" }],
    created_epoch: 1,
    last_updated_epoch: 2,
    ...overrides,
  };
}

test("validates NPI format and checksum before making a request", async () => {
  assert.equal(isValidNpi("1234567893"), true);
  assert.equal(isValidNpi("1234567890"), false);
  await assert.rejects(() => lookupNppesByNumber("1234567890", { fetcher: async () => response({}) }), TypeError);
});

test("routes a zero-result NPPES response to review", async () => {
  const result = await lookupNppesByNumber("1234567893", {
    fetcher: async () => response({ result_count: 0, results: [] }),
    now: fixedNow,
  });
  assert.deepEqual(result, {
    outcome: "needs_review",
    reasonCode: "NPI_NOT_FOUND",
    resultCount: 0,
    checkedAt: "2026-08-22T12:00:00.000Z",
    sourceUrl: "https://npiregistry.cms.hhs.gov/api/?version=2.1&number=1234567893",
  });
});

test("returns a minimal active record without treating it as licensure verification", async () => {
  const result = await lookupNppesByNumber("1234567893", {
    fetcher: async () => response({ result_count: 1, results: [activeProvider()] }),
    expectedEnumerationType: "NPI-1",
    now: fixedNow,
  });
  assert.equal(result.outcome, "found");
  assert.equal(result.reasonCode, "NPI_RECORD_FOUND");
  assert.equal(result.provider?.organizationName, undefined);
  assert.equal(result.provider?.taxonomies.length, 1);
});

test("routes enumeration-type mismatch and multiple results to review", async () => {
  const mismatch = await lookupNppesByNumber("1234567893", {
    fetcher: async () => response({ result_count: 1, results: [activeProvider({ enumeration_type: "NPI-2" })] }),
    expectedEnumerationType: "NPI-1",
  });
  assert.equal(mismatch.reasonCode, "NPI_ENUMERATION_TYPE_MISMATCH");

  const multiple = await lookupNppesByNumber("1234567893", {
    fetcher: async () => response({ result_count: 2, results: [activeProvider(), activeProvider()] }),
  });
  assert.equal(multiple.reasonCode, "NPI_RESULT_COUNT_AMBIGUOUS");
});

test("retries a temporary source error and succeeds", async () => {
  let calls = 0;
  const fetcher: NppesFetch = async () => {
    calls += 1;
    return calls === 1 ? response({ message: "temporary" }, 503) : response({ result_count: 1, results: [activeProvider()] });
  };
  const result = await lookupNppesByNumber("1234567893", {
    fetcher,
    retryDelayMs: 0,
    sleep: async () => undefined,
  });
  assert.equal(calls, 2);
  assert.equal(result.outcome, "found");
});

test("reports an unavailable source after bounded retries", async () => {
  let calls = 0;
  const result = await lookupNppesByNumber("1234567893", {
    fetcher: async () => {
      calls += 1;
      return response({ message: "busy" }, 429);
    },
    maxAttempts: 2,
    retryDelayMs: 0,
    sleep: async () => undefined,
  });
  assert.equal(calls, 2);
  assert.equal(result.outcome, "source_unavailable");
  assert.equal(result.reasonCode, "NPPES_HTTP_ERROR");
});
