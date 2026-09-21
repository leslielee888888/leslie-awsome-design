import { describe, it, expect } from 'vitest';
import { createButton as createButtonDirect } from './behaviors/button/createButton';
import { createInput as createInputDirect } from './behaviors/input/createInput';
import { validate as validateDirect } from './utilities/validate';
import { createButton, createInput, validate } from './index';

describe('index barrel export', () => {
  it('re-exports the same function references as direct imports', () => {
    expect(createButton).toBe(createButtonDirect);
    expect(createInput).toBe(createInputDirect);
    expect(validate).toBe(validateDirect);
  });
});
