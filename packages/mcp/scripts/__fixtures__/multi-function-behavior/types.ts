// Fixture types for the "ambiguous behavior function" test case in
// generate-manifest.test.ts — see behaviorA.ts / behaviorB.ts.

export interface MultiFunctionBehaviorProps {
  count: number;
}

export interface MultiFunctionBehaviorState {
  active: boolean;
}

export interface MultiFunctionBehaviorPanelProps {
  role: 'region';
}
