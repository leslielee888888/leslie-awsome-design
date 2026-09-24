---
'@leslielee888888/frameworks-react': minor
---

Initial release: `useBehavior` and `createBehaviorContext`, the React-specific
plumbing for wiring a `core`-style behavior (subscribe/getState/setGetProp)
into React — a stable accessor kept fresh across renders via an internal
live-ref, wired into the behavior exactly once, with `useSyncExternalStore`
driving re-renders. Fully generic over any behavior shape; depends on nothing
but `react` as a peer dependency.

Also includes `useBehaviorState(behavior)`, the same `useSyncExternalStore`
subscription a compound component's non-Root parts each need (only the part
that calls `useBehavior` gets React's own re-render on store changes for
free — every other part, being consumer-authored `children`, needs this
subscription itself or renders stale state), written once so it isn't
re-derived by hand in every leaf component.
