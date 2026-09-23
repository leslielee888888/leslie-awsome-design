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
