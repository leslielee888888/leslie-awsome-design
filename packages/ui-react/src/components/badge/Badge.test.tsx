import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('has no live-region role by default', () => {
    render(<Badge>New</Badge>);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('sets role="status" and aria-live="polite" when live', () => {
    render(<Badge live>Updated</Badge>);
    const badge = screen.getByRole('status');
    expect(badge).toHaveAttribute('aria-live', 'polite');
  });
});
