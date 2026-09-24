import { createBehaviorContext } from '@leslielee888888/frameworks-react';
import type { pinInput } from '@leslielee888888/core';
import type { PinInputProps } from './PinInputRoot';

/**
 * Fields PinInput.Input/.HiddenInput need for their own synchronous,
 * during-render prop-getter calls -- passed as `live`, not read through
 * `behavior`'s `getProp` (that accessor is only fresh in effects/event
 * handlers, one render behind if read synchronously during render, which is
 * exactly what {...behavior.getInputProps(...)} in JSX does on every render,
 * not just the first). See pinInput.ts's doc comment on this parameter.
 */
export type PinInputLive = Pick<PinInputProps, 'disabled' | 'invalid' | 'type'>;

export interface PinInputContextValue {
  behavior: ReturnType<typeof pinInput>;
  live: PinInputLive;
}

/**
 * Shares the single `pinInput` behavior instance created by `PinInput.Root`
 * with its descendants (`PinInput.Input`, `PinInput.HiddenInput`) -- built
 * on `createBehaviorContext` from `frameworks/react` instead of hand-rolling
 * `createContext`/`useContext`/a non-null assertion here. `pinInput` itself
 * is imported type-only: this file never calls it, only names its return
 * type as part of the context's value type.
 */
export const { Provider: PinInputProvider, useBehaviorContext: usePinInputContext } =
  createBehaviorContext<PinInputContextValue>('PinInput');
