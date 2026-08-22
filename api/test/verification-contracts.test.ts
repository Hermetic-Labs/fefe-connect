import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import type { AnySchema } from "ajv";

const projectRoot = resolve(process.cwd(), "..");

function json(relativePath: string): unknown {
  return JSON.parse(readFileSync(resolve(projectRoot, relativePath), "utf8"));
}

function validator(schemaPath: string) {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  return ajv.compile(json(schemaPath) as AnySchema);
}

test("documented legal submission satisfies its JSON Schema", () => {
  const validate = validator("docs/verification/schemas/legal-submission.schema.json");
  assert.equal(validate(json("docs/verification/examples/legal-submission.example.json")), true, JSON.stringify(validate.errors));
});

test("documented healthcare submission satisfies its JSON Schema", () => {
  const validate = validator("docs/verification/schemas/healthcare-submission.schema.json");
  assert.equal(validate(json("docs/verification/examples/healthcare-submission.example.json")), true, JSON.stringify(validate.errors));
});

test("healthcare submission rejects a missing no-patient-information attestation", () => {
  const validate = validator("docs/verification/schemas/healthcare-submission.schema.json");
  const payload = structuredClone(json("docs/verification/examples/healthcare-submission.example.json")) as Record<string, Record<string, unknown>>;
  assert.ok(payload.attestations);
  payload.attestations.no_patient_information_submitted = false;
  assert.equal(validate(payload), false);
});
