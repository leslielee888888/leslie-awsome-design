---
'@leslielee888888/core': minor
'@leslielee888888/ui-react': patch
---

`InputState` now includes the current `value` (previously just `focused`) — the uncontrolled value lives in the behavior's own store instead of a private closure variable, so `getState()`'s snapshot is complete. This lets a consumer use `useSyncExternalStore(subscribe, getState)` directly and get correct re-renders; `ui-react`'s `Input` now does exactly that instead of a manual force-rerender workaround.
