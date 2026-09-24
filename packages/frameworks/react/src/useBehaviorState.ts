import { useSyncExternalStore } from 'react';

/**
 * Subscribes the caller to a behavior's store and returns the current state
 * snapshot. `useBehavior` already does this once for whoever calls it
 * directly (its Root), but a compound component's other parts (an `Input`,
 * a `HiddenInput`) are consumer-authored elements handed down as `children`
 * — React's "same element reference, bail out" optimization means a Root's
 * own re-render does not cascade into them, so each one needs this same
 * subscription itself or it renders stale state forever. Written once here
 * so no leaf component has to remember to wire up `useSyncExternalStore`
 * by hand.
 */
export function useBehaviorState<TState>(behavior: {
  subscribe: (listener: () => void) => () => void;
  getState: () => TState;
}): TState {
  return useSyncExternalStore(behavior.subscribe, behavior.getState);
}
