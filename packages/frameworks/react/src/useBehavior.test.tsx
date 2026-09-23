import { describe, it, expect, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { useBehavior } from './useBehavior';
import type { GetProp } from './types';

interface FakeProps {
  label: string;
}

function createFakeBehavior() {
  let getProp: GetProp<FakeProps> | null = null;
  let state = { count: 0 };
  const listeners = new Set<() => void>();

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getState: () => state,
    setGetProp(fn: GetProp<FakeProps>) {
      getProp = fn;
    },
    // Stand-in for a real behavior's `getRootProps()`/`getInputProps()` —
    // reads through the accessor exactly the way `pinInput` would.
    getRootProps() {
      if (!getProp) {
        throw new Error('getProp not set yet');
      }
      return { 'data-label': getProp('label') };
    },
    // Test-only: simulates the store changing (e.g. a user interaction
    // mutating internal state) and notifying subscribers.
    emitChange(next: { count: number }) {
      state = next;
      listeners.forEach((listener) => listener());
    },
  };
}

type FakeBehavior = ReturnType<typeof createFakeBehavior>;

function Harness({
  factory,
  onBehavior,
  ...props
}: FakeProps & {
  factory: () => FakeBehavior;
  onBehavior: (behavior: FakeBehavior) => void;
}) {
  const behavior = useBehavior(factory, props);
  onBehavior(behavior);
  return <div data-testid="count">{behavior.getState().count}</div>;
}

describe('useBehavior', () => {
  it('creates the behavior exactly once across re-renders of an unrelated prop', () => {
    const factory = vi.fn(createFakeBehavior);
    const captured: FakeBehavior[] = [];

    const { rerender } = render(
      <Harness factory={factory} label="a" onBehavior={(b) => captured.push(b)} />
    );
    rerender(<Harness factory={factory} label="a" onBehavior={(b) => captured.push(b)} />);
    rerender(<Harness factory={factory} label="a" onBehavior={(b) => captured.push(b)} />);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(new Set(captured).size).toBe(1);
  });

  it('wires setGetProp before the first observable prop-reading call, reflecting current props', () => {
    const factory = vi.fn(createFakeBehavior);
    let captured: FakeBehavior | undefined;

    render(
      <Harness
        factory={factory}
        label="hello"
        onBehavior={(b) => {
          captured = b;
        }}
      />
    );

    expect(captured).toBeDefined();
    expect(() => captured!.getRootProps()).not.toThrow();
    expect(captured!.getRootProps()).toEqual({ 'data-label': 'hello' });
  });

  it('keeps the accessor fresh across re-renders without recreating the behavior', () => {
    const factory = vi.fn(createFakeBehavior);
    let captured: FakeBehavior | undefined;
    const onBehavior = (b: FakeBehavior) => {
      captured = b;
    };

    const { rerender } = render(
      <Harness factory={factory} label="first" onBehavior={onBehavior} />
    );
    expect(captured!.getRootProps()).toEqual({ 'data-label': 'first' });

    rerender(<Harness factory={factory} label="second" onBehavior={onBehavior} />);

    expect(captured!.getRootProps()).toEqual({ 'data-label': 'second' });
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('re-renders the caller when the behavior notifies its subscribers', () => {
    const factory = createFakeBehavior;
    let captured: FakeBehavior | undefined;

    render(
      <Harness
        factory={factory}
        label="x"
        onBehavior={(b) => {
          captured = b;
        }}
      />
    );

    expect(screen.getByTestId('count').textContent).toBe('0');

    act(() => {
      captured!.emitChange({ count: 1 });
    });

    expect(screen.getByTestId('count').textContent).toBe('1');
  });
});
