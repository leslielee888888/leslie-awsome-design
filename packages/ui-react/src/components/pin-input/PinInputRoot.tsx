import type { ReactNode } from 'react';
import { pinInput } from '@leslielee888888/core';
import { useBehavior } from '@leslielee888888/frameworks-react';
import { PinInputProvider } from './PinInputContext';
import styles from './PinInput.module.css';

export interface PinInputRootProps {
  length: number;
  type?: 'numeric' | 'alphanumeric';
  disabled?: boolean;
  invalid?: boolean;
  onValueChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  children: ReactNode;
}

// The only `ui-react` component that still depends on `@leslielee888888/core`
// directly -- `pinInput` is the behavior factory itself, and `useBehavior`
// (from `frameworks/react`) needs the real factory function, not just its
// shape, to create and wire it up. See the PinInput + frameworks
// architecture design spec §4.
export function Root({
  length,
  type,
  disabled,
  invalid,
  onValueChange,
  onComplete,
  children,
}: PinInputRootProps) {
  const behavior = useBehavior(pinInput, {
    length,
    type,
    disabled,
    invalid,
    onValueChange,
    onComplete,
  });

  return (
    <PinInputProvider value={behavior}>
      <div className={styles.root} {...behavior.getRootProps()}>
        {children}
      </div>
    </PinInputProvider>
  );
}
