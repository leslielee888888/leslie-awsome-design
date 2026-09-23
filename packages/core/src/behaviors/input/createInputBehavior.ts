import { validate } from '../../utilities/validate';
import { createStore } from '../../utilities/createStore';
import type { InputConfig, InputState, InputProps } from '../../types';

export function createInputBehavior(config: InputConfig = {}) {
  const rules = config.rules ?? [];
  const store = createStore<InputState>({ focused: false, value: config.defaultValue ?? '' });

  // The uncontrolled value now lives in the store itself (not a separate
  // closure variable) specifically so getState()'s snapshot is complete —
  // a consumer using useSyncExternalStore(subscribe, getState) sees the
  // real current value and re-renders correctly on every change, instead
  // of the store notifying with no observable difference in the snapshot.
  const resolveValue = (liveValue?: string): string =>
    liveValue !== undefined ? liveValue : store.getState().value;

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
            store.setState({ value: next });
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
