import { useBehaviorState } from '@leslielee888888/frameworks-react';
import { usePinInputContext, PIN_INPUT_PART_NAMES } from './PinInputContext';
import styles from './PinInput.module.css';

export interface PinInputHiddenInputProps {
  /** Field name for native form submission (`FormData`), e.g. `"otp"`. */
  name?: string;
}

// Visually-hidden native `<input>` mirroring the joined value from all
// boxes, for native form submission and browser autofill (the "HiddenInput"
// part from the Ark UI/Zag.js-style reference anatomy). Only `PinInput.Root`
// calls `useBehavior` directly, so this component needs its own subscription
// (via `useBehaviorState`) to re-render when the store changes -- reading
// `usePinInputContext` alone and calling `.getState()` during render would
// return a stale snapshot on every render after the first, since nothing
// here would trigger a re-render on its own.
export function HiddenInput({ name }: PinInputHiddenInputProps = {}) {
  const behavior = usePinInputContext(PIN_INPUT_PART_NAMES.HiddenInput);
  const state = useBehaviorState(behavior);

  return (
    <input
      type="text"
      name={name}
      className={styles.hiddenInput}
      aria-hidden="true"
      tabIndex={-1}
      readOnly
      value={state.values.join('')}
    />
  );
}
