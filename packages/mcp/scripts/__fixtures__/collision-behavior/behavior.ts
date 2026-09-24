import type { CollisionBehaviorState, CollisionBehaviorBoxProps } from './types';

export function collisionBehavior(): {
  getState: () => CollisionBehaviorState;
  // Two differently-named getters that both return the same interface, so
  // both derive the manifest key "box" — exercises generate-manifest's
  // collision guard, since a naming-convention-only approach couldn't catch
  // this (the getter names themselves differ).
  getRootProps: () => CollisionBehaviorBoxProps;
  getWrapperProps: () => CollisionBehaviorBoxProps;
} {
  const state: CollisionBehaviorState = { active: false };
  const boxProps: CollisionBehaviorBoxProps = { role: 'region' };
  return {
    getState: () => state,
    getRootProps: () => boxProps,
    getWrapperProps: () => boxProps,
  };
}
