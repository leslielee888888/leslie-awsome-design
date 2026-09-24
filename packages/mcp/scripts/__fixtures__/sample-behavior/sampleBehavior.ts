import type { SampleBehaviorProps, SampleBehaviorState, SampleBehaviorPanelProps } from './types';

// Fixture behavior mirroring the real pin-input shape (see
// packages/core/src/behaviors/pin-input/pinInput.ts): an exported function
// returning an object literal type whose `get*Props` members are the
// prop-getters.
//
// The getter here is deliberately named `getWidgetProps` even though it
// returns `SampleBehaviorPanelProps` — this mirrors pinInput's own
// `getInputProps` returning `PinInputBoxProps` — to exercise
// generate-manifest's rule that the manifest key comes from the *returned
// interface's* name, not the getter function's own name.
export function sampleBehavior(initialProps: SampleBehaviorProps): {
  getState: () => SampleBehaviorState;
  getWidgetProps: () => SampleBehaviorPanelProps;
} {
  const state: SampleBehaviorState = { activeIndex: null };
  return {
    getState: () => state,
    getWidgetProps: () => ({
      id: 'sample-panel',
      role: 'region',
      'data-state': initialProps.disabled ? 'closed' : 'open',
    }),
  };
}
