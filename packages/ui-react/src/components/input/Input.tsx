import { useEffect, useMemo, useReducer, type FocusEventHandler } from 'react';
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

  // In uncontrolled mode, `core`'s behavior stores the live text value in a
  // private closure variable rather than in `getState()`'s snapshot, so
  // `useSyncExternalStore` can't detect the change. Force a re-render on every
  // store notification instead, which causes `getInputProps` to be called
  // again below and pick up the new closure value.
  const [, forceRerender] = useReducer((c: number) => c + 1, 0);
  useEffect(() => behavior.subscribe(forceRerender), [behavior]);

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
