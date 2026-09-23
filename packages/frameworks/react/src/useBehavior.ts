import { useCallback, useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { useLiveRef } from './useLiveRef';
import type { GetProp } from './types';

/**
 * The minimum shape `useBehavior` needs from a behavior factory's return
 * value. Fully generic over `TProps` — nothing here is specific to any one
 * behavior (PinInput or otherwise).
 */
export interface Behavior<TProps extends object> {
  subscribe: (listener: () => void) => () => void;
  getState: () => unknown;
  setGetProp: (getProp: GetProp<TProps>) => void;
}

/**
 * Wires a framework-agnostic behavior (as produced by a `core` behavior
 * factory, e.g. `pinInput`) into React: creates it exactly once, keeps its
 * `getProp` accessor fresh across renders without ever recreating it, and
 * re-renders the caller when the behavior's store changes.
 *
 * `factory` takes zero arguments and is called once, on mount, via
 * `useState`'s lazy initializer. Deliberately not `useState(() =>
 * factory(getProp))` — passing a ref-reading accessor into a function that
 * runs during render trips `eslint-plugin-react-hooks` v7's `refs` rule
 * independently of when the ref itself is written. Instead, the accessor is
 * wired up separately, inside its own `useLayoutEffect`, after the behavior
 * already exists. See the spec's "Live-ref mechanism: verified" section for
 * the exact failure modes this avoids.
 */
export function useBehavior<TProps extends object, TBehavior extends Behavior<TProps>>(
  factory: () => TBehavior,
  props: TProps
): TBehavior {
  const propsRef = useLiveRef(props);

  const getProp = useCallback(
    <K extends keyof TProps>(key: K) => propsRef.current[key],
    [propsRef]
  );

  // Created during render, but nothing ref-reading is passed into the
  // factory call itself.
  const [behavior] = useState(factory);

  useLayoutEffect(() => {
    behavior.setGetProp(getProp);
  }, [behavior, getProp]);

  useSyncExternalStore(behavior.subscribe, behavior.getState);

  return behavior;
}
