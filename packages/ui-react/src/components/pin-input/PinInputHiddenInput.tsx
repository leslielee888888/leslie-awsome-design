import { useSyncExternalStore } from 'react';
import { usePinInputContext } from './PinInputContext';
import styles from './PinInput.module.css';

export interface PinInputHiddenInputProps {
  /** Field name for native form submission (`FormData`), e.g. `"otp"`. */
  name?: string;
}

// Visually-hidden native `<input>` mirroring the joined value from all
// boxes, for native form submission and browser autofill (the "HiddenInput"
// part from the Ark UI/Zag.js-style reference anatomy). Only `PinInput.Root`
// calls `useBehavior` (and therefore `useSyncExternalStore`) directly, so
// this component needs its own subscription to re-render when the store
// changes -- reading `usePinInputContext` alone and calling `.getState()`
// during render would return a stale snapshot on every render after the
// first, since nothing here would trigger a re-render on its own.
export function HiddenInput({ name }: PinInputHiddenInputProps = {}) {
  const behavior = usePinInputContext('PinInput.HiddenInput');
  const state = useSyncExternalStore(behavior.subscribe, behavior.getState);

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
