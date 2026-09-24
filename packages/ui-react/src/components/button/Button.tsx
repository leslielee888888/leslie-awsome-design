import type { MouseEventHandler, ReactNode } from 'react';
import styles from './Button.module.css';

export interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

// Plain component: everything here is native HTML behavior (a `disabled`
// button doesn't fire click events, `aria-busy` is a static attribute), so
// there's no `core` behavior object involved -- see the PinInput +
// frameworks architecture design spec §4.
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  onClick,
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.button} ${styles[`variant-${variant}`]} ${styles[`size-${size}`]}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
