import { describe, it, expect } from 'vitest';
import { createBadgeBehavior } from './createBadgeBehavior';

describe('createBadgeBehavior', () => {
  it('returns no role/aria-live by default', () => {
    const behavior = createBadgeBehavior();
    expect(behavior.getBadgeProps()).toEqual({ role: undefined, 'aria-live': undefined });
  });

  it('sets role="status" and aria-live="polite" when live', () => {
    const behavior = createBadgeBehavior({ live: true });
    expect(behavior.getBadgeProps()).toEqual({ role: 'status', 'aria-live': 'polite' });
  });
});
