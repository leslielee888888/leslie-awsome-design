import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Ajv from 'ajv';
import schema from '../schema/dtcg.schema.json' with { type: 'json' };

const ajv = new Ajv({ allErrors: true, strict: false });
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
  const errors = mapSchemaErrors(validateAgainstSchema.errors ?? [], data);
  return { valid: false, errors, data };
}

// Resolves a JSON Pointer (e.g. "/color/gray/50/$type") against parsed token data.
function getAtPointer(data: unknown, pointer: string): unknown {
  const parts = pointer
    .split('/')
    .filter(Boolean)
    .map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'));
  let current: unknown = data;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

// ajv's `oneOf` across the color/dimension/typography/shadow/group branches produces a
// flood of largely-irrelevant errors (missing-property/pattern-mismatch from branches
// that were never the intended one) for a single bad `$type`. Prioritize the errors that
// actually name the problem, instead of dumping every branch's noise.
function mapSchemaErrors(errors: Array<import('ajv').ErrorObject>, data: unknown): string[] {
  if (errors.length === 0) return [];

  // Primary case: a wrong $type value. ajv reports one `const` error per oneOf branch
  // (color/dimension/typography/shadow) at the same instancePath - group those into a
  // single, readable line per offending $type that actually names the bad value.
  const constTypeErrors = errors.filter(
    (err) =>
      err.keyword === 'const' &&
      typeof err.instancePath === 'string' &&
      err.instancePath.endsWith('/$type') &&
      err.params &&
      Object.prototype.hasOwnProperty.call(err.params, 'allowedValue')
  );
  if (constTypeErrors.length > 0) {
    const allowedByPath = new Map<string, Set<string>>();
    for (const err of constTypeErrors) {
      const allowed = allowedByPath.get(err.instancePath) ?? new Set<string>();
      allowed.add(String((err.params as { allowedValue: unknown }).allowedValue));
      allowedByPath.set(err.instancePath, allowed);
    }
    const lines: string[] = [];
    for (const [instancePath, allowed] of allowedByPath) {
      const actualValue = getAtPointer(data, instancePath);
      const expected = [...allowed].sort().join(', ');
      lines.push(
        `${instancePath} has $type "${String(actualValue)}", expected one of: ${expected}`
      );
    }
    return lines;
  }

  // Fallback: dedupe by instancePath and keep only the error(s) at the deepest
  // instancePath (longest path string), rather than every branch's errors.
  const maxDepth = Math.max(...errors.map((err) => (err.instancePath ?? '').length));
  const deepest = errors.filter((err) => (err.instancePath ?? '').length === maxDepth);
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const err of deepest) {
    const line = `${err.instancePath || '/'} ${err.message}`;
    if (seen.has(line)) continue;
    seen.add(line);
    lines.push(line);
  }
  return lines;
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
// Matches a filename ending in ".light.<ext>" or ".dark.<ext>" (e.g. "color.light.json"),
// not merely a path that contains the substring ".light"/".dark" anywhere.
const LIGHT_VARIANT_PATTERN = /\.light\.[^/.]+$/;
const DARK_VARIANT_PATTERN = /\.dark\.[^/.]+$/;

export function resolveAliases(
  tokens: Map<string, { type: string; value: unknown }>,
  lookup: Map<string, { type: string; value: unknown }> = tokens
): string[] {
  const errors: string[] = [];
  for (const [tokenPath, token] of tokens) {
    if (typeof token.value === 'string') {
      const match = token.value.match(ALIAS_PATTERN);
      if (match) {
        const target = match[1];
        if (!lookup.has(target)) {
          errors.push(`${tokenPath} references unresolved alias {${target}}`);
        }
      }
    }
  }
  return errors;
}

// Strips a trailing ".light"/".dark" variant segment down to just the extension,
// e.g. "semantic/color.light.json" -> "semantic/color.json". Returns null when the
// file doesn't match a light/dark variant pattern at all.
const VARIANT_SUFFIX_PATTERN = /\.(?:light|dark)(\.[^/.]+)$/;

function variantBase(file: string): string | null {
  const match = file.match(VARIANT_SUFFIX_PATTERN);
  if (!match) return null;
  return file.slice(0, match.index) + match[1];
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
      // Allow duplicates only if every colliding file is a light/dark variant of the
      // SAME base file (e.g. "semantic/color.light.json" + "semantic/color.dark.json"),
      // not merely any file that happens to be a ".light" or ".dark" file.
      const bases = files.map(variantBase);
      const isThemeVariant =
        files.some((f) => LIGHT_VARIANT_PATTERN.test(f)) &&
        files.some((f) => DARK_VARIANT_PATTERN.test(f)) &&
        bases.every((b) => b !== null && b === bases[0]);
      if (!isThemeVariant) {
        errors.push(`${key} is defined in multiple files: ${files.join(', ')}`);
      }
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
  const report: string[] = [];
  let valid = true;

  let files: string[];
  try {
    files = findJsonFiles(tokensDir);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') {
      return { valid: false, report: [`[error] token directory not found: ${tokensDir}`] };
    }
    throw err;
  }

  if (files.length === 0) {
    return { valid: false, report: [`[error] no token files found under ${tokensDir}`] };
  }

  const perFileTokens: Array<{
    file: string;
    tokens: Map<string, { type: string; value: unknown }>;
  }> = [];
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

  for (const { file, tokens } of perFileTokens) {
    const aliasErrors = resolveAliases(tokens, allTokens);
    if (aliasErrors.length > 0) {
      valid = false;
      for (const err of aliasErrors) report.push(`[alias] ${file}: ${err}`);
    }
  }

  return { valid, report };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
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
