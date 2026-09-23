---
'@leslielee888888/frameworks-react': minor
---

Initial release: `useBehavior` and `createBehaviorContext`, the React-specific
plumbing for wiring a `core`-style behavior (subscribe/getState/setGetProp)
into React — a stable accessor kept fresh across renders via an internal
live-ref, wired into the behavior exactly once, with `useSyncExternalStore`
driving re-renders. Fully generic over any behavior shape; depends on nothing
but `react` as a peer dependency.
