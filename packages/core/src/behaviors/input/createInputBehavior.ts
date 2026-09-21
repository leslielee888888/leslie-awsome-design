import { validate } from '../../utilities/validate';
import { createStore } from '../../utilities/createStore';
import type { InputConfig, InputState, InputProps } from '../../types';

export function createInputBehavior(config: InputConfig = {}) {
  let internalValue = config.defaultValue ?? '';
  const rules = config.rules ?? [];
  const store = createStore<InputState>({ focused: false });

  const resolveValue = (liveValue?: string): string =>
    liveValue !== undefined ? liveValue : internalValue;

  return {
    getState: store.getState,
    subscribe: store.subscribe,
    getInputProps: (liveValue?: string): InputProps => {
      const isControlled = liveValue !== undefined;
      const currentValue = resolveValue(liveValue);
      const result = validate(currentValue, rules);
      return {
        disabled: config.disabled,
        value: currentValue,
        'aria-invalid': !result.isValid || undefined,
        onChange: (event: { target: { value: string } }) => {
          const next = event.target.value;
          if (!isControlled) {
            internalValue = next;
            store.notify();
          }
          config.onValueChange?.(next);
        },
        onFocus: () => store.setState({ focused: true }),
        onBlur: () => store.setState({ focused: false }),
      };
    },
    getErrorMessage: (liveValue?: string): string | undefined => {
      const currentValue = resolveValue(liveValue);
      return validate(currentValue, rules).errorMessage;
    },
  };
}
