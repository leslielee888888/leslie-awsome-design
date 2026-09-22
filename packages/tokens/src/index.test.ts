import { describe, it, expect } from 'vitest';
import { validate, validateAllTokenFiles } from './index';

describe('tokens package entrypoint', () => {
  it('exports validate as a callable function', () => {
    expect(typeof validate).toBe('function');
  });

  it('validate returns a ValidationResult with expected shape', () => {
    const result = validate('packages/tokens/scripts/__fixtures__/valid-color.json');
    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('errors');
    expect(result).toHaveProperty('data');
    expect(typeof result.valid).toBe('boolean');
    expect(Array.isArray(result.errors)).toBe(true);
  });

  it('validateAllTokenFiles returns object with valid and report properties', () => {
    const result = validateAllTokenFiles('packages/tokens/scripts/__fixtures__/mini-tree-valid');
    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('report');
    expect(typeof result.valid).toBe('boolean');
    expect(Array.isArray(result.report)).toBe(true);
  });

  it('exports validateAllTokenFiles as a callable function', () => {
    expect(typeof validateAllTokenFiles).toBe('function');
  });
});
