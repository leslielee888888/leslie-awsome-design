# @leslielee888888/ui-react

## 1.0.0

### Major Changes

- [#24](https://github.com/leslielee888888/leslie-awsome-design/pull/24) [`4d92beb`](https://github.com/leslielee888888/leslie-awsome-design/commit/4d92beb5c620fcad0825643a88aea9de9eec848a) Thanks [@leslielee888888](https://github.com/leslielee888888)! - **Breaking (internal dependency, not public API):** `Button`, `Input`, `Card`, and `Badge` are now plain components -- no `@leslielee888888/core` import, no behavior object, no store. Their public `Props` interfaces (prop names/types) are unchanged, so existing consumers don't need to change any call sites. `Input`'s `rules` validation now runs through a small local pure-function helper (`src/utilities/validate.ts`) instead of `core`'s `validate`, so `ValidationRule` is now defined (and re-exported) by `ui-react` itself rather than re-exported from `core`.
  
  **Added:** `PinInput` -- a new compound component (`PinInput.Root`, `PinInput.Control`, `PinInput.Input`, `PinInput.HiddenInput`) for segmented PIN/OTP input, built on the new `pinInput` behavior from `@leslielee888888/core` (`^1.0.0`) and `useBehavior`/`createBehaviorContext` from the new `@leslielee888888/frameworks-react` (`^0.1.0`) dependency. Visual states (empty/filled/focus/disabled/invalid/complete) are styled off `data-*` attributes and native input state; see the PinInput + frameworks architecture design spec (`docs/superpowers/specs/2026-09-23-pininput-frameworks-architecture-design.md`) §4.
  
  Major, not minor, even though Button/Input/Card/Badge's own public API didn't change: this release adds a new required dependency (`@leslielee888888/frameworks-react`) and moves off `core`'s now-removed `createButtonBehavior`/`createInputBehavior`/`createCardBehavior`/`createBadgeBehavior` (`core`'s own major bump, see that package's changeset) -- keeping `ui-react`'s version story aligned with `core`'s major seemed clearer for consumers than a minor bump that quietly pulls in a new transitive dependency and a new peer-compatible major of `core`.

### Patch Changes

- Updated dependencies [[`8bfd995`](https://github.com/leslielee888888/leslie-awsome-design/commit/8bfd9957990b70712f7122eb9509b5c38f2397cf), [`712d034`](https://github.com/leslielee888888/leslie-awsome-design/commit/712d03436fd6a1531758e1efe8adba1d9ae6a17d)]:
  - @leslielee888888/frameworks-react@0.2.0
  - @leslielee888888/core@1.0.0

## 0.2.0

### Minor Changes

- [`e226a7c`](https://github.com/leslielee888888/leslie-awsome-design/commit/e226a7c34bbcb28291790330ad209981c6f3e66d) Thanks [@leslieleesoftwareengineer](https://github.com/leslieleesoftwareengineer)! - Initial release: Button, Input, Card, and Badge components built on `core`'s
  behavior factories and `tokens`' design tokens, with Storybook, component
  tests, and a self-contained published build (CSS Modules resolved at build
  time via `lightningcss`, bundled into `dist/styles.css` alongside `tokens`'
  generated CSS custom properties).

### Patch Changes

- Updated dependencies [[`0c9056b`](https://github.com/leslielee888888/leslie-awsome-design/commit/0c9056be4ac02b751b945e87edc77a0a8b3494e5), [`0c9056b`](https://github.com/leslielee888888/leslie-awsome-design/commit/0c9056be4ac02b751b945e87edc77a0a8b3494e5)]:
  - @leslielee888888/core@0.2.0
  - @leslielee888888/tokens@0.2.0
