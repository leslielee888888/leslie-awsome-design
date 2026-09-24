import { useEffect, useRef } from 'react';
import { useBehaviorState } from '@leslielee888888/frameworks-react';
import { usePinInputContext } from './PinInputContext';
import styles from './PinInput.module.css';

export interface PinInputInputProps {
  index: number;
}

// One visible box. Most visual states (disabled/invalid/complete) are driven
// by `data-*` attributes from `behavior.getInputProps` -- no JS-tracked
// booleans here. `placeholder=" "` (a single space, invisible) is the one
// addition on top of what `getInputProps` returns: it makes
// `:not(:placeholder-shown)` a reliable CSS-only "this box has a value"
// selector, since `core` doesn't expose a per-box "filled" data attribute
// (only the whole-group `data-complete`) -- see PinInput.module.css.
export function Input({ index }: PinInputInputProps) {
  const { behavior, live } = usePinInputContext();
  const ref = useRef<HTMLInputElement>(null);

  // Only `PinInput.Root` calls `useBehavior` directly. `PinInput.Input`
  // elements are created by the *consumer* and handed to `Root` as
  // `children`, so when `Root` re-renders on its own, React's "same child
  // element reference -> bail out" optimization means that re-render does
  // NOT cascade down into this component -- it would keep rendering stale
  // `getInputProps()` output forever without its own subscription.
  // `useBehaviorState` (from frameworks/react) is that subscription, written
  // once so no leaf component has to wire up `useSyncExternalStore` by hand.
  const state = useBehaviorState(behavior);
  const isFocused = state.focusedIndex === index;

  // `live` (disabled/invalid/type) comes from context, sourced from Root's
  // own current props -- not read through `behavior`'s getProp, which is
  // only fresh in effects/handlers, one render behind if read synchronously
  // during render the way this call is. See PinInputContext.ts.
  const boxProps = behavior.getInputProps({ index }, live);

  // `pinInput` tracks which box should have focus (auto-advance,
  // backspace-to-previous, arrow-key nav) in `state.focusedIndex`, but
  // `core` has no DOM to call `.focus()` on -- it's framework-agnostic by
  // design (see core/README.md). Moving real DOM focus in response to that
  // state is this framework binding's job. Keyed on `isFocused` (not run
  // unconditionally) so a keystroke in one box doesn't re-run this effect in
  // every other box too.
  useEffect(() => {
    if (isFocused && document.activeElement !== ref.current) {
      ref.current?.focus();
    }
  }, [isFocused]);

  return <input ref={ref} placeholder=" " className={styles.box} {...boxProps} />;
}
