import { useMemo, useSyncExternalStore, type FocusEventHandler } from 'react';
import { createInputBehavior, type ValidationRule } from '@leslielee888888/core';
import styles from './Input.module.css';

export interface InputProps {
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  rules?: ValidationRule[];
  onValueChange?: (value: string) => void;
  placeholder?: string;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
}

export function Input({
  value,
  defaultValue,
  disabled,
  rules,
  onValueChange,
  placeholder,
  onFocus,
  onBlur,
}: InputProps) {
  // Config is set once, at creation; `value` is live, per-render data passed
  // as a function argument to getInputProps below (core/README.md "Pattern").
  const behavior = useMemo(
    () => createInputBehavior({ disabled, rules, defaultValue, onValueChange }),
    [disabled, rules, defaultValue, onValueChange]
  );

  // Value now lives in core's own store — see createInputBehavior.ts for
  // why. The snapshot itself isn't used directly below (getInputProps(value)
  // resolves the current value itself); this call exists purely to
  // subscribe this component to the store's changes.
  useSyncExternalStore(behavior.subscribe, behavior.getState);

  const behaviorProps = behavior.getInputProps(value);

  return (
    <input
      type="text"
      className={styles.input}
      placeholder={placeholder}
      {...behaviorProps}
      onFocus={(event) => {
        behaviorProps.onFocus();
        onFocus?.(event);
      }}
      onBlur={(event) => {
        behaviorProps.onBlur();
        onBlur?.(event);
      }}
    />
  );
}
