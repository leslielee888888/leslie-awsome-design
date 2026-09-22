import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('renders children with role="region"', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByRole('region')).toHaveTextContent('Card content');
  });

  it('sets aria-labelledby when titleId is provided', () => {
    render(<Card titleId="card-title">Card content</Card>);
    expect(screen.getByRole('region')).toHaveAttribute('aria-labelledby', 'card-title');
  });

  it('omits aria-labelledby when no titleId is provided', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByRole('region')).not.toHaveAttribute('aria-labelledby');
  });
});
