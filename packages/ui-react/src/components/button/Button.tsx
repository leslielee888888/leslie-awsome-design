import { useMemo, type MouseEventHandler, type ReactNode } from 'react';
import { createButtonBehavior } from '@leslielee888888/core';
import styles from './Button.module.css';

export interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  onClick,
}: ButtonProps) {
  // Config is set once, at creation; a new instance is created whenever the
  // fields that affect it change (core/README.md "Pattern").
  const behavior = useMemo(() => createButtonBehavior({ disabled, loading }), [disabled, loading]);
  const behaviorProps = behavior.getButtonProps();

  return (
    <button
      type="button"
      className={`${styles.button} ${styles[`variant-${variant}`]} ${styles[`size-${size}`]}`}
      onClick={onClick}
      {...behaviorProps}
    >
      {children}
    </button>
  );
}
