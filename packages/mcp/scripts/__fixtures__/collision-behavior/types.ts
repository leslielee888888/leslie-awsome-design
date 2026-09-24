// Fixture types for the "duplicate prop-getter key" test case in
// generate-manifest.test.ts — see behavior.ts, whose two differently-named
// getters both return CollisionBehaviorBoxProps.

export interface CollisionBehaviorProps {
  count: number;
}

export interface CollisionBehaviorState {
  active: boolean;
}

export interface CollisionBehaviorBoxProps {
  role: 'region';
}
