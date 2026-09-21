import { readFileSync, readdirSync } from 'node:fs';
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
  let data: unknown;
  try {
    const raw = readFileSync(filePath, 'utf-8');
    data = JSON.parse(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      valid: false,
      errors: [`Failed to read or parse ${filePath}: ${message}`],
      data: null,
    };
  }
  const valid = validateAgainstSchema(data);
  if (valid) {
    return { valid: true, errors: [], data };
  }
  const errors = (validateAgainstSchema.errors ?? []).map(
    (err) => `${err.instancePath || '/'} ${err.message}`
  );
  return { valid: false, errors, data };
}

export function flattenTokens(
  tree: Record<string, unknown>,
  prefix: string[] = []
): Map<string, { type: string; value: unknown }> {
  const result = new Map<string, { type: string; value: unknown }>();
  for (const [key, node] of Object.entries(tree)) {
    if (node && typeof node === 'object' && '$type' in node && '$value' in node) {
      const nodeObj = node as { $type: string; $value: unknown };
      result.set([...prefix, key].join('.'), { type: nodeObj.$type, value: nodeObj.$value });
    } else if (node && typeof node === 'object') {
      const nested = flattenTokens(node as Record<string, unknown>, [...prefix, key]);
      for (const [k, v] of nested) result.set(k, v);
    }
  }
  return result;
}

const ALIAS_PATTERN = /^\{([a-zA-Z0-9_.-]+)\}$/;

export function resolveAliases(
  allTokens: Map<string, { type: string; value: unknown }>
): string[] {
  const errors: string[] = [];
  for (const [tokenPath, token] of allTokens) {
    if (typeof token.value === 'string') {
      const match = token.value.match(ALIAS_PATTERN);
      if (match) {
        const target = match[1];
        if (!allTokens.has(target)) {
          errors.push(`${tokenPath} references unresolved alias {${target}}`);
        }
      }
    }
  }
  return errors;
}

export function findDuplicateKeys(
  perFileTokens: Array<{ file: string; tokens: Map<string, unknown> }>
): string[] {
  const seenIn = new Map<string, string[]>();
  for (const { file, tokens } of perFileTokens) {
    for (const key of tokens.keys()) {
      const files = seenIn.get(key) ?? [];
      files.push(file);
      seenIn.set(key, files);
    }
  }
  const errors: string[] = [];
  for (const [key, files] of seenIn) {
    if (files.length > 1) {
      errors.push(`${key} is defined in multiple files: ${files.join(', ')}`);
    }
  }
  return errors;
}

function findJsonFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }
  return files;
}

export function validateAllTokenFiles(tokensDir: string): { valid: boolean; report: string[] } {
  const files = findJsonFiles(tokensDir);
  const report: string[] = [];
  let valid = true;

  const perFileTokens: Array<{ file: string; tokens: Map<string, { type: string; value: unknown }> }> = [];
  const allTokens = new Map<string, { type: string; value: unknown }>();

  for (const file of files) {
    const result = validateTokenFile(file);
    if (!result.valid) {
      valid = false;
      for (const err of result.errors) {
        report.push(`[schema] ${path.relative(tokensDir, file)}: ${err}`);
      }
      continue;
    }
    const tokens = flattenTokens(result.data as Record<string, unknown>);
    const relFile = path.relative(tokensDir, file);
    perFileTokens.push({ file: relFile, tokens });
    for (const [k, v] of tokens) allTokens.set(k, v);
    report.push(`[ok] ${relFile}: ${tokens.size} tokens`);
  }

  const duplicateErrors = findDuplicateKeys(perFileTokens);
  if (duplicateErrors.length > 0) {
    valid = false;
    for (const err of duplicateErrors) report.push(`[duplicate] ${err}`);
  }

  const aliasErrors = resolveAliases(allTokens);
  if (aliasErrors.length > 0) {
    valid = false;
    for (const err of aliasErrors) report.push(`[alias] ${err}`);
  }

  return { valid, report };
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const tokensDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'tokens');
  const { valid, report } = validateAllTokenFiles(tokensDir);
  for (const line of report) console.log(line);
  if (!valid) {
    console.error('Token validation FAILED');
    process.exit(1);
  }
  console.log('Token validation passed.');
}
