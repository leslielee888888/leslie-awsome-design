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
 * `factory` is called once, on mount, via `useState`'s lazy initializer, with
 * this render's own `props` — a plain object, not a ref read, so passing it
 * during render is safe and doesn't trip `eslint-plugin-react-hooks` v7's
 * `refs` rule. It seeds the behavior's initial `getProp` fallback so
 * `getRootProps()`/`getInputProps()` return correct values even on the very
 * first render, before the `useLayoutEffect` below has run — a consumer like
 * `PinInput.Root` calls `behavior.getRootProps()` synchronously in the same
 * render that creates the behavior, so there's no later render to "catch up"
 * on if the first one is wrong.
 *
 * What's deliberately NOT done: `useState(() => factory(getProp))`, passing
 * the *live-ref-backed accessor* (as opposed to plain `props`) into a
 * function that runs during render. That's what trips the `refs` rule —
 * reading through a ref during render, independently of when the ref itself
 * is written. `props` isn't a ref, so this restriction doesn't apply to it.
 * See the spec's "Live-ref mechanism: verified" section for the exact
 * failure modes this avoids.
 */
export function useBehavior<TProps extends object, TBehavior extends Behavior<TProps>>(
  factory: (initialProps: TProps) => TBehavior,
  props: TProps
): TBehavior {
  const propsRef = useLiveRef(props);

  // propsRef's identity never changes (useRef guarantees this for the
  // component's lifetime) so this never actually recomputes after mount —
  // but exhaustive-deps still requires it listed, since it's referenced here.
  const getProp = useCallback(
    <K extends keyof TProps>(key: K) => propsRef.current[key],
    [propsRef]
  );

  const [behavior] = useState(() => factory(props));

  // Upgrades getProp from the initial-props fallback (correct only for the
  // render that created the behavior) to the live-ref-backed accessor
  // (correct for every render after). Runs after every render whose props
  // changed identity, at commit time.
  useLayoutEffect(() => {
    behavior.setGetProp(getProp);
  }, [behavior, getProp]);

  useSyncExternalStore(behavior.subscribe, behavior.getState);

  return behavior;
}
