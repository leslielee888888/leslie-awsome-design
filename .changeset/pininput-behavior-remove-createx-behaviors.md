---
'@leslielee888888/core': major
---

**Breaking:** removed `createButtonBehavior`, `createInputBehavior`, `createCardBehavior`, and `createBadgeBehavior`, along with their config/state/props types (`ButtonConfig`/`ButtonState`/`ButtonProps`, `InputConfig`/`InputState`/`InputProps`, `CardConfig`/`CardProps`, `BadgeConfig`/`BadgeProps`). All four only wrapped native HTML behavior or static ARIA attributes and didn't need a behavior object, a store, or `core` at all — Button/Input/Card/Badge become plain components in `ui-react` instead.

Added `pinInput` — a zero-argument behavior factory for the new PinInput component, the first `core` behavior that coordinates multiple DOM nodes (auto-advance, backspace-to-previous, arrow-key navigation, paste-splitting, numeric filtering). Every field (`length`, `type`, `disabled`, `invalid`, `onValueChange`, `onComplete`) is read through a `GetProp<T>` accessor supplied after creation via `setGetProp`, rather than a config object at creation time — see `docs/superpowers/specs/2026-09-23-pininput-frameworks-architecture-design.md` §2.
