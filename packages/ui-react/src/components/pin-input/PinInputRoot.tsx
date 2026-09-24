import { useEffect, useMemo, type ReactNode } from 'react';
import { pinInput, type PinInputProps as CorePinInputProps } from '@leslielee888888/core';
import { useBehavior } from '@leslielee888888/frameworks-react';
import { PinInputProvider } from './PinInputContext';
import styles from './PinInput.module.css';

// Extends core's PinInputProps directly instead of hand-redeclaring its six
// fields -- the only ui-react-specific addition is `children`. A future
// change to pinInput's prop shape doesn't need a matching hand-edit here.
export interface PinInputProps extends CorePinInputProps {
  children: ReactNode;
}
export type PinInputRootProps = PinInputProps;

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

  // `length` is otherwise baked in at creation only (see pinInput.ts's
  // setLength doc comment) -- this effect is what reacts to it actually
  // changing after mount, resizing the internal values array to match.
  useEffect(() => {
    behavior.setLength(length);
  }, [behavior, length]);

  // Memoized so this object's identity is stable across the re-renders
  // useBehavior's own useSyncExternalStore triggers on every keystroke --
  // only changes when disabled/invalid/type themselves actually change.
  // Without this, PinInput.Input would re-render on every keystroke, the
  // exact cost moving to the live-ref design was meant to avoid.
  const live = useMemo(() => ({ disabled, invalid, type }), [disabled, invalid, type]);
  const contextValue = useMemo(() => ({ behavior, live }), [behavior, live]);

  return (
    <PinInputProvider value={contextValue}>
      <div className={styles.root} {...behavior.getRootProps(live)}>
        {children}
      </div>
    </PinInputProvider>
  );
}
