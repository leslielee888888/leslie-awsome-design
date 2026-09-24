// Fixture types for the "empty manifest key" test case in
// generate-manifest.test.ts — see behavior.ts, whose getter returns the
// config interface itself.

export interface EmptyKeyBehaviorProps {
  count: number;
}

export interface EmptyKeyBehaviorState {
  active: boolean;
}
