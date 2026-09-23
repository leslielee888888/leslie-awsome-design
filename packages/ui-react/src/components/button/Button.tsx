import { useMemo, type ReactNode } from 'react';
import { createButtonBehavior } from '@leslielee888888/core';
import styles from './Button.module.css';

export interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
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
  // fields that affect it change (core/README.md "Pattern"). onClick is
  // core's config, same as onValueChange is for Input — getButtonProps().onClick
  // already gates on disabled/loading, so nothing needs adding on the JSX.
  //
  // Known tradeoff, same as Input's onValueChange has pre-existing this
  // component: an inline onClick handler (`onClick={() => ...}`, the common
  // case) gets a new identity every render, recreating this behavior (and
  // its internal store) more often than [disabled, loading] alone would.
  // The proper fix is making onClick a live function argument to
  // getButtonProps() the same way Input's `value` already is, rather than
  // creation config — a real core API change, not a one-line fix here.
  const behavior = useMemo(
    () => createButtonBehavior({ disabled, loading, onClick }),
    [disabled, loading, onClick]
  );
  const behaviorProps = behavior.getButtonProps();

  return (
    <button
      type="button"
      className={`${styles.button} ${styles[`variant-${variant}`]} ${styles[`size-${size}`]}`}
      {...behaviorProps}
    >
      {children}
    </button>
  );
}
