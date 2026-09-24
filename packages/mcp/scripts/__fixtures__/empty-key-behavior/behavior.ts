import type { EmptyKeyBehaviorProps, EmptyKeyBehaviorState } from './types';

export function emptyKeyBehavior(initialProps: EmptyKeyBehaviorProps): {
  getState: () => EmptyKeyBehaviorState;
  // Deliberately returns the config interface itself
  // (`${prefix}Props` === `EmptyKeyBehaviorProps`), which strips down to an
  // empty manifest key — exercises generate-manifest's empty-key guard.
  getSelfProps: () => EmptyKeyBehaviorProps;
} {
  const state: EmptyKeyBehaviorState = { active: false };
  return {
    getState: () => state,
    getSelfProps: () => initialProps,
  };
}
