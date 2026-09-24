# frameworks/react

React-specific plumbing for wiring a `core`-style behavior (a factory
returning `{ subscribe, getState, setGetProp, ...getXProps() }`) into React,
without depending on `core` itself — this package works with any behavior of
that shape, not just `core`'s. A future Vue adapter would live alongside this
one at `packages/frameworks/vue` (`@leslielee888888/frameworks-vue`).

## Exports

- **`useBehavior(factory, props)`** — creates a behavior exactly once (via
  `useState(() => factory(props))`, seeded with the props from the render
  that creates it — a plain object, not a ref read, so this is safe during
  render and gives correct output on the very first render, before any effect
  has run), keeps a `getProp` accessor over `props` fresh across renders via
  an internal live-ref, upgrades the behavior to that live accessor with
  `setGetProp` inside its own `useLayoutEffect`, and subscribes the caller to
  the behavior's store with `useSyncExternalStore` so it re-renders on store
  changes.
- **`createBehaviorContext<TBehavior>(rootName)`** — returns `{ Provider,
useBehaviorContext }` for sharing a behavior with descendant components.
  `rootName` is passed once, here, not by every descendant part at every call
  site — `useBehaviorContext()` (no arguments) throws
  `` `${rootName} components must be used within a <${rootName}.Root>` ``
  when called with no `Provider` above it in the tree. Scales to any number
  of parts without needing a name defined for each one.
- **`useBehaviorState(behavior)`** — subscribes to a behavior's store and
  returns the current state snapshot (a thin `useSyncExternalStore` wrapper).
  Only whichever part calls `useBehavior` gets a subscription for free; every
  other part of a compound component (consumer-authored `children`, not
  re-rendered when the behavior's own caller re-renders) needs this to avoid
  rendering stale state.

`useLiveRef` (a ref kept fresh via `useLayoutEffect`, written at commit time
rather than during render) is an internal helper used by `useBehavior` and is
not exported on its own.

See
[`docs/superpowers/specs/2026-09-23-pininput-frameworks-architecture-design.md`](../../../docs/superpowers/specs/2026-09-23-pininput-frameworks-architecture-design.md)
§3 for the full design, and its "Live-ref mechanism: verified" section for
exactly why `useBehavior` is built this specific way — two things had to be
true for it to pass this repo's `eslint-plugin-react-hooks` v7 config, both
with their failure modes explained there.

## Usage

```tsx
import { useBehavior, createBehaviorContext } from '@leslielee888888/frameworks-react';
import { pinInput } from '@leslielee888888/core';

const { Provider, useBehaviorContext } =
  createBehaviorContext<ReturnType<typeof pinInput>>('PinInput');

function Root(props: PinInputRootProps) {
  const behavior = useBehavior(pinInput, props);
  return (
    <Provider value={behavior}>
      <div {...behavior.getRootProps()}>{props.children}</div>
    </Provider>
  );
}

function Input({ index }: { index: number }) {
  const behavior = useBehaviorContext(); // no name needed here
  return <input {...behavior.getInputProps({ index })} />;
}
```
