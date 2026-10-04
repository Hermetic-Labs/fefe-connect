import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import type { AnySchema } from "ajv";
import type { AccountEntity, ApplicationEntity } from "../src/shared/storage";
import { buildMemberHome, latestApplication } from "../src/shared/member-experience";

const account: AccountEntity = {
  partitionKey: "accounts",
  rowKey: "a".repeat(40),
  accountId: "a".repeat(40),
  ownerSubject: "private-subject",
  email: "fictional@example.test",
  displayName: "Fictional Applicant",
  status: "active",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

function homeValidator() {
  const schema = JSON.parse(readFileSync(resolve(process.cwd(), "../docs/member-experience/schemas/member-home-response.schema.json"), "utf8")) as AnySchema;
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  return ajv.compile(schema);
}

function application(overrides: Partial<ApplicationEntity> = {}): ApplicationEntity {
  return {
    partitionKey: "applications",
    rowKey: "fbabb098-510a-4fe9-9054-4900dff42347",
    ownerSubject: "private-subject",
    ownerAccountId: account.accountId,
    professionalType: "mental-health",
    status: "submitted",
    planKey: "individual_monthly",
    termsVersion: "2026-08-20",
    privacyVersion: "2026-08-20",
    intendedUseVersion: "2026-08-20",
    verificationVersion: "2026-08-20",
    createdAt: "2026-10-04T05:31:11.077Z",
    updatedAt: "2026-10-04T05:31:11.077Z",
    firstName: "Fictional",
    lastName: "Clinician",
    professionalEmail: "fictional@example.test",
    organization: "Example Practice",
    jurisdiction: "Georgia",
    credentialNumber: "TEST-123456",
    website: "https://example.test",
    headline: "Fictional profile for acceptance testing",
    bio: "This is clearly fictional application content used to test the FEFE member experience safely.",
    specialtiesJson: JSON.stringify(["Fictional specialty"]),
    ...overrides,
  };
}

test("builds a truthful empty state when the account has no application", () => {
  const response = buildMemberHome(account, [], "request-123", "2026-10-04T12:00:00.000Z");
  assert.equal(response.experience.kind, "no_application");
  assert.equal(response.experience.primary_status.code, "no_application");
  assert.equal(response.experience.cards[0]?.kind, "application_status");
});

test("surfaces the real submitted clinician application without implying verification", () => {
  const response = buildMemberHome(account, [application()], "request-123", "2026-10-04T12:00:00.000Z");
  const validate = homeValidator();
  const serialized = JSON.stringify(response);
  assert.equal(validate(response), true, JSON.stringify(validate.errors));
  assert.equal(response.experience.kind, "applicant");
  assert.equal(response.experience.professional_type, "mental-health");
  assert.equal(response.experience.primary_status.code, "submitted");
  assert.match(serialized, /Professional licence record detail/);
  assert.doesNotMatch(serialized, /"verified"/);
  assert.doesNotMatch(serialized, /TEST-123456/);
  assert.doesNotMatch(serialized, /private-subject/);
});

test("keeps declined legal applications private and routes to support", () => {
  const response = buildMemberHome(account, [application({ professionalType: "legal", status: "declined" })], "request-123");
  assert.equal(response.experience.primary_status.label, "Not approved");
  assert.equal(response.experience.primary_action.action, "contact_support");
  assert.equal(response.experience.cards[0]?.state, "declined");
});

test("does not manufacture a professional record for an active application", () => {
  const response = buildMemberHome(account, [application({ status: "active", verificationSource: "legacy-source", verificationCheckedAt: "2026-10-04T00:00:00.000Z" })], "request-123");
  const kinds = response.experience.cards.map((card) => card.kind);
  assert.equal(response.experience.kind, "member");
  assert.equal(kinds.includes("mental_health_record_summary"), false);
  assert.equal(kinds.includes("legal_record_summary"), false);
});

test("returns only the support boundary for a suspended account", () => {
  const response = buildMemberHome({ ...account, status: "suspended" }, [application()], "request-123");
  assert.equal(response.experience.primary_status.code, "account_unavailable");
  assert.deepEqual(response.experience.cards.map((card) => card.kind), ["support"]);
});

test("selects the most recently updated owned application", () => {
  const older = application({ rowKey: "11111111-1111-4111-8111-111111111111", updatedAt: "2026-10-03T00:00:00.000Z" });
  const newer = application({ rowKey: "22222222-2222-4222-8222-222222222222", updatedAt: "2026-10-04T00:00:00.000Z" });
  assert.equal(latestApplication([older, newer])?.rowKey, newer.rowKey);
});
