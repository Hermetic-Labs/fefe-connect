import { lookupNppesByNumber } from "../src/verification/nppes-client";

function argument(name: string): string | undefined {
  const direct = process.argv.find((value) => value.startsWith(`--${name}=`));
  if (direct) return direct.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  const npi = argument("npi") ?? process.env.NPPES_SMOKE_NPI;
  if (!npi) throw new Error("Supply a public test identifier with --npi or NPPES_SMOKE_NPI.");
  const requestedType = argument("type");
  const expectedEnumerationType = requestedType === "NPI-1" || requestedType === "NPI-2" ? requestedType : undefined;
  const result = await lookupNppesByNumber(npi, { expectedEnumerationType });

  console.log(JSON.stringify({
    outcome: result.outcome,
    reasonCode: result.reasonCode,
    resultCount: result.resultCount,
    checkedAt: result.checkedAt,
    provider: result.provider ? {
      number: result.provider.number,
      enumerationType: result.provider.enumerationType,
      status: result.provider.status,
      taxonomyCount: result.provider.taxonomies.length,
      addressCount: result.provider.addresses.length,
    } : undefined,
  }, null, 2));

  if (result.outcome === "source_unavailable") process.exitCode = 2;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "NPPES smoke test failed.");
  process.exitCode = 1;
});
