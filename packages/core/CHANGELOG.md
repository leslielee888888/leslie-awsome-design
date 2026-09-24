# @leslielee888888/core

## 1.0.0

### Major Changes

- [#22](https://github.com/leslielee888888/leslie-awsome-design/pull/22) [`712d034`](https://github.com/leslielee888888/leslie-awsome-design/commit/712d03436fd6a1531758e1efe8adba1d9ae6a17d) Thanks [@leslielee888888](https://github.com/leslielee888888)! - **Breaking:** removed `createButtonBehavior`, `createInputBehavior`, `createCardBehavior`, and `createBadgeBehavior`, along with their config/state/props types (`ButtonConfig`/`ButtonState`/`ButtonProps`, `InputConfig`/`InputState`/`InputProps`, `CardConfig`/`CardProps`, `BadgeConfig`/`BadgeProps`). All four only wrapped native HTML behavior or static ARIA attributes and didn't need a behavior object, a store, or `core` at all — Button/Input/Card/Badge become plain components in `ui-react` instead.
  
  Added `pinInput` — a zero-argument behavior factory for the new PinInput component, the first `core` behavior that coordinates multiple DOM nodes (auto-advance, backspace-to-previous, arrow-key navigation, paste-splitting, numeric filtering). Every field (`length`, `type`, `disabled`, `invalid`, `onValueChange`, `onComplete`) is read through a `GetProp<T>` accessor supplied after creation via `setGetProp`, rather than a config object at creation time — see `docs/superpowers/specs/2026-09-23-pininput-frameworks-architecture-design.md` §2.

## 0.2.0

### Minor Changes

- [`0c9056b`](https://github.com/leslielee888888/leslie-awsome-design/commit/0c9056be4ac02b751b945e87edc77a0a8b3494e5) Thanks [@leslieleesoftwareengineer](https://github.com/leslieleesoftwareengineer)! - Add createCardBehavior and createBadgeBehavior — presentational factories for the new Card and Badge components in ui-react.

## 0.1.1

### Patch Changes

- [#10](https://github.com/leslielee888888/leslie-awsome-design/pull/10) [`07df88b`](https://github.com/leslielee888888/leslie-awsome-design/commit/07df88bffa3e45aee5be9379086f7caf09323255) Thanks [@leslielee888888](https://github.com/leslielee888888)! - Initial publish: buildable, versioned, published packages.
