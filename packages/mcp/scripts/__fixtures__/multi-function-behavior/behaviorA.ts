import type { MultiFunctionBehaviorState, MultiFunctionBehaviorPanelProps } from './types';

// Deliberately ambiguous with behaviorB.ts below: two exported functions in
// this directory both have a `get*Props`-bearing return type, so
// generate-manifest's findBehaviorFunction should throw rather than silently
// picking one and ignoring the other.
export function behaviorA(): {
  getState: () => MultiFunctionBehaviorState;
  getPanelProps: () => MultiFunctionBehaviorPanelProps;
} {
  const state: MultiFunctionBehaviorState = { active: false };
  return {
    getState: () => state,
    getPanelProps: () => ({ role: 'region' }),
  };
}
