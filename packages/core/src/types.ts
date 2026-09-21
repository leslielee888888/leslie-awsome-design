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
