import { describe, it, expect } from 'vitest';
import { createInputBehavior } from './createInputBehavior';
import type { ValidationRule } from '../../types';

describe('createInputBehavior', () => {
  describe('uncontrolled mode (no live value passed)', () => {
    it('starts with defaultValue, or empty string if none given', () => {
      expect(createInputBehavior().getInputProps().value).toBe('');
      expect(createInputBehavior({ defaultValue: 'hi' }).getInputProps().value).toBe('hi');
    });

    it('updates its internal value via onChange', () => {
      const input = createInputBehavior({ defaultValue: '' });
      input.getInputProps().onChange({ target: { value: 'typed' } });
      expect(input.getInputProps().value).toBe('typed');
    });

    it('calls onValueChange with the new value', () => {
      let received: string | undefined;
      const input = createInputBehavior({ onValueChange: (v) => { received = v; } });
      input.getInputProps().onChange({ target: { value: 'typed' } });
      expect(received).toBe('typed');
    });

    it('notifies subscribers when the internal value changes', () => {
      const input = createInputBehavior({ defaultValue: '' });
      let calls = 0;
      input.subscribe(() => { calls += 1; });
      expect(calls).toBe(0);
      input.getInputProps().onChange({ target: { value: 'typed' } });
      expect(calls).toBe(1);
    });
  });

  describe('controlled mode (live value passed to getInputProps)', () => {
    it('uses the passed value directly, ignoring internal value', () => {
      const input = createInputBehavior({ defaultValue: 'internal' });
      expect(input.getInputProps('external').value).toBe('external');
    });

    it('does not retain the value internally — a later uncontrolled call reverts to defaultValue', () => {
      const input = createInputBehavior({ defaultValue: 'internal' });
      input.getInputProps('external');
      expect(input.getInputProps().value).toBe('internal');
    });

    it('still calls onValueChange on change, without mutating internal value', () => {
      let received: string | undefined;
      const input = createInputBehavior({ defaultValue: 'internal', onValueChange: (v) => { received = v; } });
      input.getInputProps('external').onChange({ target: { value: 'newer' } });
      expect(received).toBe('newer');
      expect(input.getInputProps().value).toBe('internal'); // internal value untouched
    });
  });

  describe('validation', () => {
    const rules: ValidationRule[] = [{ type: 'required', message: 'Required' }];

    it('aria-invalid is unset when the current value is valid', () => {
      const input = createInputBehavior({ rules, defaultValue: 'ok' });
      expect(input.getInputProps()['aria-invalid']).toBeUndefined();
    });

    it('aria-invalid is true when the current value is invalid', () => {
      const input = createInputBehavior({ rules, defaultValue: '' });
      expect(input.getInputProps()['aria-invalid']).toBe(true);
    });

    it('re-validates against a live (controlled) value, not just internal value', () => {
      const input = createInputBehavior({ rules, defaultValue: 'ok' });
      expect(input.getInputProps('')['aria-invalid']).toBe(true);
    });

    it('getErrorMessage reflects validate() for the current value', () => {
      const input = createInputBehavior({ rules, defaultValue: '' });
      expect(input.getErrorMessage()).toBe('Required');
      expect(input.getErrorMessage('present')).toBeUndefined();
    });
  });

  describe('focus state', () => {
    it('tracks focus and blur via subscribe', () => {
      const input = createInputBehavior();
      let calls = 0;
      input.subscribe(() => { calls += 1; });
      const props = input.getInputProps();
      props.onFocus();
      expect(input.getState().focused).toBe(true);
      expect(calls).toBe(1);
      props.onBlur();
      expect(input.getState().focused).toBe(false);
      expect(calls).toBe(2);
    });
  });

  it('passes disabled through unchanged', () => {
    expect(createInputBehavior({ disabled: true }).getInputProps().disabled).toBe(true);
    expect(createInputBehavior().getInputProps().disabled).toBeUndefined();
  });
});
