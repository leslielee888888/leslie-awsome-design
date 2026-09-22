import { describe, it, expect } from 'vitest';
import { createCardBehavior } from './createCardBehavior';

describe('createCardBehavior', () => {
  it('returns role="region" with no aria-labelledby by default', () => {
    const behavior = createCardBehavior();
    expect(behavior.getCardProps()).toEqual({ role: 'region', 'aria-labelledby': undefined });
  });

  it('sets aria-labelledby when titleId is provided', () => {
    const behavior = createCardBehavior({ titleId: 'card-title' });
    expect(behavior.getCardProps()).toEqual({ role: 'region', 'aria-labelledby': 'card-title' });
  });
});
