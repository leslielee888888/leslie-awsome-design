import type { ReactNode } from 'react';
import { createBadgeBehavior } from '@leslielee888888/core';
import styles from './Badge.module.css';

export interface BadgeProps {
  children: ReactNode;
  live?: boolean;
  variant?: 'default' | 'success' | 'error';
}

export function Badge({ children, live, variant = 'default' }: BadgeProps) {
  // Presentational, no state to notify about — same rationale as Card.
  const behavior = createBadgeBehavior({ live });

  return (
    <span
      className={`${styles.badge} ${styles[`variant-${variant}`]}`}
      {...behavior.getBadgeProps()}
    >
      {children}
    </span>
  );
}
