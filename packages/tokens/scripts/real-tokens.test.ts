import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validateAllTokenFiles } from './validate';

describe('real token files', () => {
  it('pass full validation (schema + alias + duplicate checks)', () => {
    const tokensDir = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '..',
      'tokens'
    );
    const { valid, report } = validateAllTokenFiles(tokensDir);
    expect(valid, report.join('\n')).toBe(true);
  });
});
