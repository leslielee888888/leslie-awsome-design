import { describe, it, expect, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { useBehavior } from './useBehavior';
import type { GetProp } from './types';

interface FakeProps {
  label: string;
}

function createFakeBehavior(initialProps: FakeProps) {
  // Seeded from the render that created it — correct from the very first
  // call, before setGetProp ever runs. Real behaviors (pinInput) must do the
  // same: getRootProps()/getInputProps() are called synchronously in the same
  // render that creates the behavior (see PinInput.Root in the design spec),
  // before useBehavior's useLayoutEffect has had any chance to fire.
  let getProp: GetProp<FakeProps> = (key) => initialProps[key];
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
  onRootProps,
  ...props
}: FakeProps & {
  factory: (initialProps: FakeProps) => FakeBehavior;
  onBehavior: (behavior: FakeBehavior) => void;
  // Called synchronously in the render body — mirrors how a real consumer
  // (PinInput.Root) spreads `behavior.getRootProps()` directly into JSX,
  // not how a test would call it after render() has already flushed effects.
  onRootProps?: (rootProps: ReturnType<FakeBehavior['getRootProps']>) => void;
}) {
  const behavior = useBehavior(factory, props);
  onBehavior(behavior);
  onRootProps?.(behavior.getRootProps());
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

  it('returns correct prop-getter output on the very first render, called synchronously in the render body — before any effect has run', () => {
    // Regression test: an earlier version of useBehavior only wired the
    // accessor inside useLayoutEffect, with nothing seeding it beforehand.
    // A consumer calling getRootProps() synchronously during the same render
    // that creates the behavior (exactly what PinInput.Root's JSX does) would
    // read through an unset accessor and get wrong/throwing output on mount,
    // with nothing to force a corrective second render afterward.
    const factory = vi.fn(createFakeBehavior);
    const rootPropsDuringRender: Array<ReturnType<FakeBehavior['getRootProps']>> = [];

    render(
      <Harness
        factory={factory}
        label="hello"
        onBehavior={() => {}}
        onRootProps={(rootProps) => rootPropsDuringRender.push(rootProps)}
      />
    );

    expect(rootPropsDuringRender[0]).toEqual({ 'data-label': 'hello' });
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
