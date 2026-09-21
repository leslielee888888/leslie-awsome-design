import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true, strict: false });
const schemaPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'schema',
  'dtcg.schema.json'
);
const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
const validateAgainstSchema = ajv.compile(schema);

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  data: unknown;
}

export function validateTokenFile(filePath: string): ValidationResult {
  const raw = readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);
  const valid = validateAgainstSchema(data);
  if (valid) {
    return { valid: true, errors: [], data };
  }
  const errors = (validateAgainstSchema.errors ?? []).map(
    (err) => `${err.instancePath || '/'} ${err.message}`
  );
  return { valid: false, errors, data };
}
