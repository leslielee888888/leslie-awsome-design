import { useEffect, useRef, useSyncExternalStore } from 'react';
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
  const behavior = usePinInputContext('PinInput.Input');
  const ref = useRef<HTMLInputElement>(null);

  // Only `PinInput.Root` calls `useBehavior` (and therefore
  // `useSyncExternalStore`) directly. `PinInput.Input` elements are created
  // by the *consumer* and handed to `Root` as `children`, so when `Root`
  // re-renders on its own (from its `useBehavior` subscription), React's
  // "same child element reference -> bail out" optimization means that
  // re-render does NOT cascade down into this component -- it would keep
  // rendering stale `getInputProps()` output forever without its own
  // subscription. Same reasoning as `PinInput.HiddenInput`.
  useSyncExternalStore(behavior.subscribe, behavior.getState);

  const boxProps = behavior.getInputProps({ index });

  // `pinInput` tracks which box should have focus (auto-advance,
  // backspace-to-previous, arrow-key nav) in `state.focusedIndex`, but
  // `core` has no DOM to call `.focus()` on -- it's framework-agnostic by
  // design (see core/README.md). Moving real DOM focus in response to that
  // state is this framework binding's job.
  useEffect(() => {
    if (behavior.getState().focusedIndex === index && document.activeElement !== ref.current) {
      ref.current?.focus();
    }
  });

  return <input ref={ref} placeholder=" " className={styles.box} {...boxProps} />;
}
