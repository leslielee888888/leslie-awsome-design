import { createBehaviorContext } from '@leslielee888888/frameworks-react';
import type { pinInput } from '@leslielee888888/core';

/**
 * Shares the single `pinInput` behavior instance created by `PinInput.Root`
 * with its descendants (`PinInput.Input`, `PinInput.HiddenInput`) -- built
 * on `createBehaviorContext` from `frameworks/react` instead of hand-rolling
 * `createContext`/`useContext`/a non-null assertion here. `pinInput` itself
 * is imported type-only: this file never calls it, only names its return
 * type as the context's value type.
 */
export const { Provider: PinInputProvider, useBehaviorContext: usePinInputContext } =
  createBehaviorContext<ReturnType<typeof pinInput>>();

/**
 * Names passed to `usePinInputContext(name)` by each part, centralized here
 * instead of re-typed as a string literal in each leaf component — a typo in
 * one file can't silently drift from what the others use, and there's one
 * place to update if a part is ever renamed.
 */
export const PIN_INPUT_PART_NAMES = {
  Input: 'PinInput.Input',
  HiddenInput: 'PinInput.HiddenInput',
} as const;
