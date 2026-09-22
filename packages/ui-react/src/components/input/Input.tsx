import { useMemo, type ChangeEventHandler, type FocusEventHandler } from 'react';
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
  const behaviorProps = behavior.getInputProps(value);

  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    behaviorProps.onChange({ target: { value: event.target.value } });
  };

  return (
    <input
      type="text"
      className={styles.input}
      placeholder={placeholder}
      disabled={behaviorProps.disabled}
      value={behaviorProps.value}
      aria-invalid={behaviorProps['aria-invalid']}
      onChange={handleChange}
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
