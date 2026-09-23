export type ValidationRule =
  | { type: 'required'; message: string }
  | { type: 'pattern'; pattern: RegExp; message: string }
  | { type: 'custom'; validate: (value: string) => boolean; message: string };

export interface ButtonConfig {
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

export interface ButtonState {
  pressed: boolean;
  hovered: boolean;
  focused: boolean;
}

export interface ButtonProps {
  disabled: boolean;
  'aria-busy'?: boolean;
  onClick: () => void;
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
  value: string;
}

export interface InputProps {
  disabled?: boolean;
  value: string;
  'aria-invalid'?: boolean;
  onChange: (event: { target: { value: string } }) => void;
  onFocus: () => void;
  onBlur: () => void;
}

export interface CardConfig {
  titleId?: string;
}

export interface CardProps {
  role: string;
  'aria-labelledby'?: string;
}

export interface BadgeConfig {
  live?: boolean;
}

export interface BadgeProps {
  role?: string;
  'aria-live'?: 'polite';
}
