---
'@leslielee888888/ui-react': major
---

**Breaking (internal dependency, not public API):** `Button`, `Input`, `Card`, and `Badge` are now plain components -- no `@leslielee888888/core` import, no behavior object, no store. Their public `Props` interfaces (prop names/types) are unchanged, so existing consumers don't need to change any call sites. `Input`'s `rules` validation now runs through a small local pure-function helper (`src/utilities/validate.ts`) instead of `core`'s `validate`, so `ValidationRule` is now defined (and re-exported) by `ui-react` itself rather than re-exported from `core`.

**Added:** `PinInput` -- a new compound component (`PinInput.Root`, `PinInput.Control`, `PinInput.Input`, `PinInput.HiddenInput`) for segmented PIN/OTP input, built on the new `pinInput` behavior from `@leslielee888888/core` (`^1.0.0`) and `useBehavior`/`createBehaviorContext` from the new `@leslielee888888/frameworks-react` (`^0.1.0`) dependency. Visual states (empty/filled/focus/disabled/invalid/complete) are styled off `data-*` attributes and native input state; see the PinInput + frameworks architecture design spec (`docs/superpowers/specs/2026-09-23-pininput-frameworks-architecture-design.md`) §4.

Major, not minor, even though Button/Input/Card/Badge's own public API didn't change: this release adds a new required dependency (`@leslielee888888/frameworks-react`) and moves off `core`'s now-removed `createButtonBehavior`/`createInputBehavior`/`createCardBehavior`/`createBadgeBehavior` (`core`'s own major bump, see that package's changeset) -- keeping `ui-react`'s version story aligned with `core`'s major seemed clearer for consumers than a minor bump that quietly pulls in a new transitive dependency and a new peer-compatible major of `core`.
