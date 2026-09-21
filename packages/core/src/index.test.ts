import { describe, it, expect } from 'vitest';
import { createButtonBehavior as createButtonBehaviorDirect } from './behaviors/button/createButtonBehavior';
import { createInputBehavior as createInputBehaviorDirect } from './behaviors/input/createInputBehavior';
import { validate as validateDirect } from './utilities/validate';
import { createButtonBehavior, createInputBehavior, validate } from './index';

describe('index barrel export', () => {
  it('re-exports the same function references as direct imports', () => {
    expect(createButtonBehavior).toBe(createButtonBehaviorDirect);
    expect(createInputBehavior).toBe(createInputBehaviorDirect);
    expect(validate).toBe(validateDirect);
  });
});
