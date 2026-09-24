import type { ReactNode } from 'react';
import styles from './Card.module.css';

export interface CardProps {
  children: ReactNode;
  titleId?: string;
}

// Plain component: `role="region"` and `aria-labelledby` are static
// attributes, not interaction logic -- no `core` behavior object involved.
export function Card({ children, titleId }: CardProps) {
  return (
    <div className={styles.card} role="region" aria-labelledby={titleId}>
      {children}
    </div>
  );
}
