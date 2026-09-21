import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import {
  validateTokenFile,
  flattenTokens,
  resolveAliases,
  findDuplicateKeys,
} from './validate';

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__'
);

describe('validateTokenFile - schema', () => {
  it('passes for a well-formed color token file', () => {
    const result = validateTokenFile(path.join(fixturesDir, 'valid-color.json'));
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('fails for a token with an invalid $type', () => {
    const result = validateTokenFile(path.join(fixturesDir, 'invalid-type.json'));
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns a ValidationResult instead of throwing for malformed JSON', () => {
    const result = validateTokenFile(path.join(fixturesDir, 'malformed.json'));
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.data).toBeNull();
  });
});

describe('flattenTokens', () => {
  it('flattens nested groups into dot-path keys', () => {
    const tree = { color: { blue: { '600': { $type: 'color', $value: '#2563EB' } } } };
    const flat = flattenTokens(tree);
    expect(flat.get('color.blue.600')).toEqual({ type: 'color', value: '#2563EB' });
  });
});

describe('resolveAliases', () => {
  it('passes when every alias resolves to a real token', () => {
    const a = JSON.parse(readFileSync(path.join(fixturesDir, 'alias-valid/a.json'), 'utf-8'));
    const b = JSON.parse(readFileSync(path.join(fixturesDir, 'alias-valid/b.json'), 'utf-8'));
    const all = new Map([...flattenTokens(a), ...flattenTokens(b)]);
    expect(resolveAliases(all)).toEqual([]);
  });

  it('fails when an alias points to a nonexistent token', () => {
    const a = JSON.parse(readFileSync(path.join(fixturesDir, 'alias-broken/a.json'), 'utf-8'));
    const b = JSON.parse(readFileSync(path.join(fixturesDir, 'alias-broken/b.json'), 'utf-8'));
    const all = new Map([...flattenTokens(a), ...flattenTokens(b)]);
    const errors = resolveAliases(all);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('color.blue.999');
  });
});

describe('findDuplicateKeys', () => {
  it('flags a token path defined in more than one file', () => {
    const a = JSON.parse(readFileSync(path.join(fixturesDir, 'duplicate-keys/a.json'), 'utf-8'));
    const b = JSON.parse(readFileSync(path.join(fixturesDir, 'duplicate-keys/b.json'), 'utf-8'));
    const errors = findDuplicateKeys([
      { file: 'a.json', tokens: flattenTokens(a) },
      { file: 'b.json', tokens: flattenTokens(b) },
    ]);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('spacing.md');
  });
});
