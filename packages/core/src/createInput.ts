import { validate } from './validate';
import type { InputConfig, InputState, InputProps } from './types';

export function createInput(config: InputConfig = {}) {
  let internalValue = config.defaultValue ?? '';
  let state: InputState = { focused: false };
  const listeners = new Set<() => void>();

  const notify = () => listeners.forEach((fn) => fn());
  const setState = (patch: Partial<InputState>) => {
    state = { ...state, ...patch };
    notify();
  };

  const resolveValue = (liveValue?: string): string =>
    liveValue !== undefined ? liveValue : internalValue;

  return {
    getState: (): InputState => state,
    subscribe: (fn: () => void): (() => void) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    getInputProps: (liveValue?: string): InputProps => {
      const isControlled = liveValue !== undefined;
      const currentValue = resolveValue(liveValue);
      const result = validate(currentValue, config.rules ?? []);
      return {
        disabled: config.disabled,
        value: currentValue,
        'aria-invalid': !result.isValid || undefined,
        onChange: (event: { target: { value: string } }) => {
          const next = event.target.value;
          if (!isControlled) internalValue = next;
          config.onValueChange?.(next);
        },
        onFocus: () => setState({ focused: true }),
        onBlur: () => setState({ focused: false }),
      };
    },
    getErrorMessage: (liveValue?: string): string | undefined => {
      const currentValue = resolveValue(liveValue);
      return validate(currentValue, config.rules ?? []).errorMessage;
    },
  };
}
