import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import {
  validateTokenFile,
  flattenTokens,
  resolveAliases,
  findDuplicateKeys,
  validateAllTokenFiles,
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

  it('names the actual bad $type value instead of dumping every oneOf branch error', () => {
    const result = validateTokenFile(path.join(fixturesDir, 'invalid-type.json'));
    expect(result.valid).toBe(false);
    // Previously this produced ~39 noisy ajv errors with no mention of "colour" at all.
    expect(result.errors.length).toBeLessThan(10);
    expect(result.errors.some((err) => err.includes('colour'))).toBe(true);
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

  it('does not flag a key shared only between a .light and a .dark variant file', () => {
    const light = { color: { bg: { primary: { $type: 'color', $value: '{color.white}' } } } };
    const dark = { color: { bg: { primary: { $type: 'color', $value: '{color.black}' } } } };
    const errors = findDuplicateKeys([
      { file: 'semantic/color.light.json', tokens: flattenTokens(light) },
      { file: 'semantic/color.dark.json', tokens: flattenTokens(dark) },
    ]);
    expect(errors).toEqual([]);
  });

  it('still flags a key shared with a third, non-variant file', () => {
    const light = { color: { bg: { primary: { $type: 'color', $value: '{color.white}' } } } };
    const dark = { color: { bg: { primary: { $type: 'color', $value: '{color.black}' } } } };
    const other = { color: { bg: { primary: { $type: 'color', $value: '{color.gray.100}' } } } };
    const errors = findDuplicateKeys([
      { file: 'semantic/color.light.json', tokens: flattenTokens(light) },
      { file: 'semantic/color.dark.json', tokens: flattenTokens(dark) },
      { file: 'semantic/other.json', tokens: flattenTokens(other) },
    ]);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('color.bg.primary');
  });

  it('still flags a key shared between two files that are not light/dark variants at all', () => {
    const a = { color: { bg: { primary: { $type: 'color', $value: '{color.white}' } } } };
    const b = { color: { bg: { primary: { $type: 'color', $value: '{color.black}' } } } };
    const errors = findDuplicateKeys([
      { file: 'semantic/a.json', tokens: flattenTokens(a) },
      { file: 'semantic/b.json', tokens: flattenTokens(b) },
    ]);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('color.bg.primary');
  });

  it('does not exempt a collision between two different-but-both-".light" files as if they were a matched light/dark pair', () => {
    const color = { color: { bg: { primary: { $type: 'color', $value: '{color.white}' } } } };
    const button = { color: { bg: { primary: { $type: 'color', $value: '{color.gray.900}' } } } };
    const colorDark = { color: { bg: { primary: { $type: 'color', $value: '{color.black}' } } } };
    const errors = findDuplicateKeys([
      { file: 'semantic/color.light.json', tokens: flattenTokens(color) },
      { file: 'semantic/button.light.json', tokens: flattenTokens(button) },
      { file: 'semantic/color.dark.json', tokens: flattenTokens(colorDark) },
    ]);
    // color.light.json + button.light.json are NOT a matched pair (different base names),
    // so the collision must still be flagged even though color.dark.json is a legitimate
    // variant of color.light.json.
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('color.bg.primary');
  });

  it('does not exempt a path that merely contains ".light"/".dark" as a substring rather than as a file extension suffix', () => {
    const a = { color: { bg: { primary: { $type: 'color', $value: '{color.white}' } } } };
    const b = { color: { bg: { primary: { $type: 'color', $value: '{color.black}' } } } };
    const errors = findDuplicateKeys([
      { file: 'semantic/lightness.json', tokens: flattenTokens(a) },
      { file: 'semantic/darkroom.json', tokens: flattenTokens(b) },
    ]);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('color.bg.primary');
  });
});

describe('validateAllTokenFiles', () => {
  it('passes for a well-formed multi-file token tree', () => {
    const dir = path.join(fixturesDir, 'mini-tree-valid');
    const { valid, report } = validateAllTokenFiles(dir);
    expect(valid).toBe(true);
    expect(report.some((line: string) => line.startsWith('[schema]') || line.startsWith('[alias]') || line.startsWith('[duplicate]'))).toBe(false);
  });

  it('fails for a token tree with a broken alias', () => {
    const dir = path.join(fixturesDir, 'mini-tree-invalid');
    const { valid, report } = validateAllTokenFiles(dir);
    expect(valid).toBe(false);
    expect(report.some((line: string) => line.startsWith('[alias]'))).toBe(true);
  });

  it('catches a broken alias that exists only in a .dark file shadowed in the merged token map by a valid .light file', () => {
    // Regression for the critical finding: validateAllTokenFiles used to merge every
    // file's tokens into one flat Map before resolving aliases, so when color.light.json
    // and color.dark.json legitimately define the same token path, whichever file was
    // read second silently overwrote the first in that Map - and resolveAliases only ever
    // checked the survivor. A broken alias planted only in color.dark.json passed with no
    // [alias] error. It must now be reported.
    const dir = path.join(fixturesDir, 'mini-tree-shadowed-alias');
    const { valid, report } = validateAllTokenFiles(dir);
    expect(valid).toBe(false);
    const aliasLines = report.filter((line: string) => line.startsWith('[alias]'));
    expect(aliasLines.length).toBe(1);
    expect(aliasLines[0]).toContain('color.dark.json');
    expect(aliasLines[0]).toContain('color.blue.999');
  });

  it('reports a clean error instead of throwing for a missing token directory', () => {
    const dir = path.join(fixturesDir, 'does-not-exist');
    expect(() => validateAllTokenFiles(dir)).not.toThrow();
    const { valid, report } = validateAllTokenFiles(dir);
    expect(valid).toBe(false);
    expect(report.some((line: string) => line.startsWith('[error]'))).toBe(true);
  });

  it('reports valid: false for an existing but empty token directory instead of a false green', () => {
    const dir = path.join(fixturesDir, 'empty-tree');
    const { valid, report } = validateAllTokenFiles(dir);
    expect(valid).toBe(false);
    expect(report.some((line: string) => line.startsWith('[error]') && line.includes('no token files found'))).toBe(true);
  });
});
