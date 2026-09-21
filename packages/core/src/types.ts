export type ValidationRule =
  | { type: 'required'; message: string }
  | { type: 'pattern'; pattern: RegExp; message: string }
  | { type: 'custom'; validate: (value: string) => boolean; message: string };

export interface ButtonConfig {
  disabled?: boolean;
  loading?: boolean;
}

export interface ButtonState {
  pressed: boolean;
  hovered: boolean;
  focused: boolean;
}

export interface ButtonProps {
  disabled: boolean;
  'aria-busy'?: boolean;
  onPointerDown: () => void;
  onPointerUp: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onFocus: () => void;
  onBlur: () => void;
}

export interface InputConfig {
  disabled?: boolean;
  rules?: ValidationRule[];
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

export interface InputState {
  focused: boolean;
}

export interface InputProps {
  disabled?: boolean;
  value: string;
  'aria-invalid'?: boolean;
  onChange: (event: { target: { value: string } }) => void;
  onFocus: () => void;
  onBlur: () => void;
}
