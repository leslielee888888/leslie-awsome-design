// Fixture types for generate-manifest.test.ts. Deliberately self-contained
// (does not import from packages/core) so the extractor's behavior can be
// exercised without depending on real pin-input types, which may change.

export interface SampleBehaviorProps {
  /** Number of visible items. */
  count: number;
  /**
   * Selection mode.
   * @default 'single'
   */
  mode?: 'single' | 'multiple';
  disabled?: boolean;
}

export interface SampleBehaviorState {
  /** Currently active index, or null when nothing is active. */
  activeIndex: number | null;
}

// Not itself a `${prefix}*Props` interface, so it's never picked up as a
// prop-getter shape on its own — it only matters through `extends` below,
// exercising generate-manifest's inherited-member flattening.
interface SampleBehaviorBaseProps {
  /** Shared identifier applied to every part of the behavior. */
  id: string;
}

export interface SampleBehaviorPanelProps extends SampleBehaviorBaseProps {
  /** ARIA role for the panel element. */
  role: 'region';
  'data-state': 'open' | 'closed';
}
