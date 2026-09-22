import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validate, validateAllTokenFiles } from './index';

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../scripts/__fixtures__'
);

describe('tokens package entrypoint', () => {
  it('exports validate as a callable function', () => {
    expect(typeof validate).toBe('function');
  });

  it('validate passes for a known-good fixture and returns the parsed data', () => {
    const result = validate(path.join(fixturesDir, 'valid-color.json'));
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.data).toEqual({
      color: {
        gray: {
          '50': { $type: 'color', $value: '#FAFAFA' },
        },
      },
    });
  });

  it('validate fails for a malformed fixture with a specific error', () => {
    const result = validate(path.join(fixturesDir, 'malformed.json'));
    expect(result.valid).toBe(false);
    expect(result.data).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('exports validateAllTokenFiles as a callable function', () => {
    expect(typeof validateAllTokenFiles).toBe('function');
  });

  it('validateAllTokenFiles passes for a known-good token tree', () => {
    const result = validateAllTokenFiles(path.join(fixturesDir, 'mini-tree-valid'));
    expect(result.valid).toBe(true);
    expect(result.report).toHaveLength(2);
    expect(result.report.every((line) => line.startsWith('[ok]'))).toBe(true);
  });

  it('validateAllTokenFiles fails for a known-bad token tree', () => {
    const result = validateAllTokenFiles(path.join(fixturesDir, 'mini-tree-invalid'));
    expect(result.valid).toBe(false);
    expect(result.report.length).toBeGreaterThan(0);
  });
});
