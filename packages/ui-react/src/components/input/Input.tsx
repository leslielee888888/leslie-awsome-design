import { useState, type ChangeEventHandler, type FocusEventHandler } from 'react';
import { validate, type ValidationRule } from '../../utilities/validate';
import styles from './Input.module.css';

export type { ValidationRule };

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

// Plain component: controlled/uncontrolled value handling and disabled/
// validation state are all things a native `<input>` + `useState` already
// handle -- no `core` behavior object involved. `rules` validation runs
// through a local pure-function helper (`../../utilities/validate`) instead
// of `core`'s -- see the PinInput + frameworks architecture design spec §4.
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
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');
  // React's documented "adjust state during render" pattern: useState's
  // initializer only runs on mount, so without this, changing `defaultValue`
  // after mount would silently do nothing (the old core-behavior-based
  // implementation recreated the whole behavior via useMemo keyed on
  // defaultValue, which did reset it). Bails out after one extra render.
  const [prevDefaultValue, setPrevDefaultValue] = useState(defaultValue);
  if (!isControlled && defaultValue !== prevDefaultValue) {
    setPrevDefaultValue(defaultValue);
    setInternalValue(defaultValue ?? '');
  }
  const currentValue = isControlled ? value : internalValue;
  const result = validate(currentValue, rules ?? []);

  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const next = event.target.value;
    if (!isControlled) {
      setInternalValue(next);
    }
    onValueChange?.(next);
  };

  return (
    <input
      type="text"
      className={styles.input}
      placeholder={placeholder}
      disabled={disabled}
      value={currentValue}
      aria-invalid={!result.isValid || undefined}
      onChange={handleChange}
      onFocus={onFocus}
      onBlur={onBlur}
    />
  );
}
