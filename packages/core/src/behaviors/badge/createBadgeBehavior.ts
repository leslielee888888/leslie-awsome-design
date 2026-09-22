import type { BadgeConfig, BadgeProps } from '../../types';

export function createBadgeBehavior(config: BadgeConfig = {}) {
  return {
    getBadgeProps: (): BadgeProps => ({
      role: config.live ? 'status' : undefined,
      'aria-live': config.live ? 'polite' : undefined,
    }),
  };
}
