import { describe, it, expect } from 'vitest';
import { createButton, createInput, validate } from './index';

describe('index barrel export', () => {
  it('exports createButton, createInput, and validate as callable functions', () => {
    expect(typeof createButton).toBe('function');
    expect(typeof createInput).toBe('function');
    expect(typeof validate).toBe('function');
  });

  it('createButton imported from the barrel behaves the same as the direct import', () => {
    const button = createButton();
    expect(button.getState()).toEqual({ pressed: false, hovered: false, focused: false });
  });

  it('createInput imported from the barrel behaves the same as the direct import', () => {
    const input = createInput();
    expect(input.getState()).toEqual({ focused: false });
    expect(input.getInputProps().value).toBe('');
  });

  it('validate imported from the barrel behaves the same as the direct import', () => {
    expect(validate('x', [])).toEqual({ isValid: true });
  });
});
