export type ValidationRule =
  | { type: 'required'; message: string }
  | { type: 'pattern'; pattern: RegExp; message: string }
  | { type: 'custom'; validate: (value: string) => boolean; message: string };

/**
 * Accessor a framework binding hands a behavior after creation (via `setGetProp`),
 * so the behavior always reads the current value of a field instead of a snapshot
 * captured at creation time. See `core/README.md`'s live-data principle.
 */
export type GetProp<T> = <K extends keyof T>(key: K) => T[K];

export interface PinInputProps {
  length: number;
  /** @default 'numeric' */
  type?: 'numeric' | 'alphanumeric';
  disabled?: boolean;
  /** Consumer-supplied validation result — core has no concept of "invalid" itself. */
  invalid?: boolean;
  onValueChange?: (value: string) => void;
  onComplete?: (value: string) => void;
}

export interface PinInputState {
  /** length === PinInputProps['length']; '' for an empty box. */
  values: string[];
  focusedIndex: number | null;
  /** values.every(v => v !== ''), recomputed once per mutation, not per prop-getter call. */
  complete: boolean;
}

export interface PinInputRootProps {
  role: 'group';
  'data-scope': 'pin-input';
  'data-part': 'root';
  'data-disabled'?: true;
  'data-invalid'?: true;
  'data-complete'?: true;
}

export interface PinInputBoxProps {
  type: 'text';
  inputMode: 'numeric' | 'text';
  value: string;
  'data-scope': 'pin-input';
  'data-part': 'input';
  'data-index': number;
  'data-disabled'?: true;
  'data-invalid'?: true;
  'data-complete'?: true;
  onChange: (event: { target: { value: string } }) => void;
  onKeyDown: (event: { key: string; target: unknown }) => void;
  onPaste: (event: { clipboardData: { getData: (format: string) => string } }) => void;
  onFocus: () => void;
  onBlur: () => void;
}
