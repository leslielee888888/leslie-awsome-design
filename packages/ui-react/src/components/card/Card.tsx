import type { ReactNode } from 'react';
import { createCardBehavior } from '@leslielee888888/core';
import styles from './Card.module.css';

export interface CardProps {
  children: ReactNode;
  titleId?: string;
}

export function Card({ children, titleId }: CardProps) {
  // Presentational, no state to notify about — called fresh every render
  // rather than memoized (core/README.md's own testing philosophy: call
  // the factory and inspect the returned props, nothing else).
  const behavior = createCardBehavior({ titleId });

  return (
    <div className={styles.card} {...behavior.getCardProps()}>
      {children}
    </div>
  );
}
