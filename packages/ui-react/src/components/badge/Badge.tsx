import type { ReactNode } from 'react';
import styles from './Badge.module.css';

export interface BadgeProps {
  children: ReactNode;
  live?: boolean;
  variant?: 'default' | 'success' | 'error';
}

// Plain component: `role`/`aria-live` are static attributes derived from
// `live`, not interaction logic -- no `core` behavior object involved.
export function Badge({ children, live, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={`${styles.badge} ${styles[`variant-${variant}`]}`}
      role={live ? 'status' : undefined}
      aria-live={live ? 'polite' : undefined}
    >
      {children}
    </span>
  );
}
