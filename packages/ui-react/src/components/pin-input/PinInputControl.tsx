import type { ReactNode } from 'react';
import styles from './PinInput.module.css';

export interface PinInputControlProps {
  children: ReactNode;
}

// Plain styled flex-row wrapper for the visible boxes -- purely layout, no
// context read needed (it renders `PinInput.Input`s as children, it doesn't
// need the behavior itself).
export function Control({ children }: PinInputControlProps) {
  return <div className={styles.control}>{children}</div>;
}
