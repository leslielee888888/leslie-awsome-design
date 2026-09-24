import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { createBehaviorContext } from './createBehaviorContext';

interface FakeBehavior {
  foo: string;
}

describe('createBehaviorContext', () => {
  it('throws when useBehaviorContext is called outside its Provider', () => {
    const { useBehaviorContext } = createBehaviorContext<FakeBehavior>('TestComponent');

    function Consumer() {
      useBehaviorContext();
      return null;
    }

    // React logs an additional error to the console for a component that
    // throws during render; suppress that expected noise for this test.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => render(<Consumer />)).toThrow(
        'TestComponent components must be used within a <TestComponent.Root>'
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it('returns the provided value when rendered within its Provider', () => {
    const { Provider, useBehaviorContext } = createBehaviorContext<FakeBehavior>('TestComponent');
    let received: FakeBehavior | undefined;

    function Consumer() {
      received = useBehaviorContext();
      return null;
    }

    render(
      <Provider value={{ foo: 'bar' }}>
        <Consumer />
      </Provider>
    );

    expect(received).toEqual({ foo: 'bar' });
  });
});
