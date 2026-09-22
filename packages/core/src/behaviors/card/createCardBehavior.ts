import type { CardConfig, CardProps } from '../../types';

export function createCardBehavior(config: CardConfig = {}) {
  return {
    getCardProps: (): CardProps => ({
      role: 'region',
      'aria-labelledby': config.titleId,
    }),
  };
}
