import { useLayoutEffect, useRef } from 'react';

/**
 * Keeps a ref's `.current` in sync with the latest `value` across renders.
 *
 * Internal helper — not part of this package's public API. The write happens
 * inside `useLayoutEffect`, i.e. at commit time, after React has committed
 * the render, never synchronously in the component body during render
 * itself. That timing is load-bearing, not just a lint technicality:
 *
 * - Writing `ref.current = value` directly during render trips
 *   `eslint-plugin-react-hooks` v7's `refs` rule ("Cannot update ref during
 *   render").
 * - Under Strict Mode, React can render a component twice and discard one of
 *   the renders. A write during render would run for a render that never
 *   commits, leaving the ref out of sync with what actually reached the DOM.
 *   `useLayoutEffect` only fires for renders that actually commit.
 *
 * See the "Live-ref mechanism: verified" section of
 * docs/superpowers/specs/2026-09-23-pininput-frameworks-architecture-design.md
 * for the two failures this shape was built to avoid, confirmed by running
 * this repo's real `eslint-plugin-react-hooks` v7 config against it.
 */
export function useLiveRef<T>(value: T) {
  const ref = useRef(value);

  useLayoutEffect(() => {
    ref.current = value;
  });

  return ref;
}
