import type { MultiFunctionBehaviorState, MultiFunctionBehaviorPanelProps } from './types';

// See behaviorA.ts — a second qualifying function in the same directory,
// simulating a behavior split across multiple files.
export function behaviorB(): {
  getState: () => MultiFunctionBehaviorState;
  getPanelProps: () => MultiFunctionBehaviorPanelProps;
} {
  const state: MultiFunctionBehaviorState = { active: true };
  return {
    getState: () => state,
    getPanelProps: () => ({ role: 'region' }),
  };
}
