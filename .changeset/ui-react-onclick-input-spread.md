---
'@leslielee888888/ui-react': minor
---

Button's `onClick` prop is now `() => void` (was a `MouseEventHandler`) — it routes through `core`'s `createButtonBehavior` config instead of being wired separately on the JSX, matching how Input's `onValueChange` already works. Input's internals also simplified: `getInputProps()`'s props are now spread directly onto the `<input>` element instead of being picked off one by one.
