import { describe, it, expect } from 'vitest';
import { validate } from './validate';
import type { ValidationRule } from '../types';

describe('validate', () => {
  it('passes when there are no rules', () => {
    expect(validate('anything', [])).toEqual({ isValid: true });
  });

  it('fails a required rule on an empty (or whitespace-only) value', () => {
    const rules: ValidationRule[] = [{ type: 'required', message: 'This field is required' }];
    expect(validate('', rules)).toEqual({ isValid: false, errorMessage: 'This field is required' });
    expect(validate('   ', rules)).toEqual({
      isValid: false,
      errorMessage: 'This field is required',
    });
  });

  it('passes a required rule on a non-empty value', () => {
    const rules: ValidationRule[] = [{ type: 'required', message: 'This field is required' }];
    expect(validate('hello', rules)).toEqual({ isValid: true });
  });

  it('fails a pattern rule when the value does not match', () => {
    const rules: ValidationRule[] = [{ type: 'pattern', pattern: /^\d+$/, message: 'Digits only' }];
    expect(validate('abc', rules)).toEqual({ isValid: false, errorMessage: 'Digits only' });
  });

  it('does not apply a pattern rule to an empty value (required handles emptiness separately)', () => {
    const rules: ValidationRule[] = [{ type: 'pattern', pattern: /^\d+$/, message: 'Digits only' }];
    expect(validate('', rules)).toEqual({ isValid: true });
  });

  it('fails a custom rule when the validator returns false', () => {
    const rules: ValidationRule[] = [
      { type: 'custom', validate: (v) => v.length <= 5, message: 'Too long' },
    ];
    expect(validate('toolong', rules)).toEqual({ isValid: false, errorMessage: 'Too long' });
  });

  it('returns the first failing rule when multiple rules are present', () => {
    const rules: ValidationRule[] = [
      { type: 'required', message: 'Required' },
      { type: 'pattern', pattern: /^\d+$/, message: 'Digits only' },
    ];
    expect(validate('', rules)).toEqual({ isValid: false, errorMessage: 'Required' });
    expect(validate('abc', rules)).toEqual({ isValid: false, errorMessage: 'Digits only' });
  });

  it('passes when all rules pass', () => {
    const rules: ValidationRule[] = [
      { type: 'required', message: 'Required' },
      { type: 'pattern', pattern: /^\d+$/, message: 'Digits only' },
    ];
    expect(validate('123', rules)).toEqual({ isValid: true });
  });

  it('is deterministic for a pattern rule using a stateful (global-flagged) regex', () => {
    const rules: ValidationRule[] = [{ type: 'pattern', pattern: /\d+/g, message: 'Digits' }];
    const first = validate('abc123', rules);
    const second = validate('abc123', rules);
    expect(first).toEqual({ isValid: true });
    expect(second).toEqual(first);
  });
});
