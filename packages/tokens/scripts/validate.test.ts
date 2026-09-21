import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validateTokenFile } from './validate';

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
});
