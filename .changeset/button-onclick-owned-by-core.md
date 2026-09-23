---
'@leslielee888888/core': minor
---

createButtonBehavior now owns `onClick`: pass it in config and `getButtonProps().onClick` calls it, gated the same way `onPointerDown` already is (suppressed when `disabled` or `loading`). Matches how `createInputBehavior` already owns `onValueChange` — nothing about the button's primary interaction needs adding by hand outside the spread props anymore.
