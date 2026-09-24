import { describe, it, expect } from 'vitest';
import { pinInput as pinInputDirect } from './behaviors/pin-input/pinInput';
import { validate as validateDirect } from './utilities/validate';
import { pinInput, validate } from './index';

describe('index barrel export', () => {
  it('re-exports the same function references as direct imports', () => {
    expect(pinInput).toBe(pinInputDirect);
    expect(validate).toBe(validateDirect);
  });
});
