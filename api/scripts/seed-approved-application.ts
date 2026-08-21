import { randomUUID } from "node:crypto";
import { isUuid } from "../src/shared/domain";
import { ensureTables, saveApplication } from "../src/shared/storage";

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  const ownerSubject = argument("subject")?.trim();
  const professionalType = argument("professional-type");
  const applicationId = argument("application-id")?.trim() || randomUUID();
  if (!ownerSubject) throw new Error("--subject is required and must be the authenticated Entra subject claim.");
  if (professionalType !== "legal" && professionalType !== "mental-health") {
    throw new Error("--professional-type must be legal or mental-health.");
  }
  if (!isUuid(applicationId)) throw new Error("--application-id must be a UUID when supplied.");
  await ensureTables();
  const now = new Date().toISOString();
  await saveApplication({
    partitionKey: "applications",
    rowKey: applicationId,
    ownerSubject,
    professionalType,
    status: "approved",
    verificationSource: "operator-test-seed",
    verificationCheckedAt: now,
    termsVersion: "2026-08-20",
    privacyVersion: "2026-08-20",
    intendedUseVersion: "2026-08-20",
    verificationVersion: "2026-08-20",
    createdAt: now,
    updatedAt: now,
  });
  process.stdout.write(`${applicationId}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Seed failed."}\n`);
  process.exitCode = 1;
});
