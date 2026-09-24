# core

Zero-dependency, framework-agnostic interaction logic for the design
system's interactive components — but only for components that need
genuine, stateful interaction across multiple DOM nodes (auto-advance,
keyboard navigation, that kind of thing). Components whose entire
interaction is something the browser already provides natively (a button's
`disabled`, an input's `value`/`onChange`) don't belong here — they're
plain components in `ui-react`, no `core` involved. No React, no DOM, no
framework of any kind — every behavior factory returns plain objects a
framework-specific adapter (`@leslielee888888/frameworks-react`, for React)
wires into real elements.

## Structure

```
src/
  behaviors/
    pin-input/
      pinInput.ts
      pinInput.test.ts
  utilities/
    createStore.ts   # shared state/subscribe mechanism used by every behavior
    createStore.test.ts
    validate.ts
    validate.test.ts
  types.ts       # shared types, used across behaviors/ and utilities/
  index.ts       # public API (barrel export)
```

`behaviors/` holds one folder per interactive component's factory — named
"behaviors" rather than "components" since nothing here is a renderable
UI component; each one implements interaction _behavior_ only (state,
event handlers, ARIA/data attributes), the same vocabulary React Aria
uses for its own hooks. `utilities/` holds framework- and
component-agnostic helpers used by one or more behaviors: `createStore`
(the state + `subscribe`/`notify` mechanism every behavior is built on)
and `validate` (a plain value → error-message function; not tied to any
behavior). `ui-react`'s `Input` deliberately does **not** call this —
it has its own local copy (`ui-react/src/utilities/validate.ts`) instead,
since validation isn't stateful interaction and doesn't need `core` at all
(same principle that removed `core` from Button/Card/Badge entirely).

## Pattern

A behavior takes no creation config. Every field it needs — structural or
volatile alike — is read through a `getProp` accessor the framework
binding wires in after creation:

```ts
const instance = pinInput(initialProps); // seeds getProp, correct from the first call
instance.setGetProp(getProp);            // upgrades to a live, always-fresh accessor
instance.subscribe(() => { ... });       // re-run whenever internal state changes
instance.getState();                     // current state snapshot
instance.getRootProps();                 // plain attribute/handler object
instance.getInputProps({ index });       // one per interactive part, for compound behaviors
```

- **There is no separate "structural vs. live" config split.** Every field
  (`length`, `disabled`, callbacks — everything) is read via
  `getProp(key)`, uniformly. `initialProps` exists only so the behavior is
  already correct on the very first call, before a framework binding has
  had any chance to call `setGetProp` — see
  `docs/superpowers/specs/2026-09-23-pininput-frameworks-architecture-design.md`'s
  "Live-ref mechanism: verified" section for exactly why this two-step
  handoff exists.
- **Prop-getters own every attribute**, including ARIA and the `data-*`
  attributes CSS keys off (`data-scope`, `data-part`, `data-disabled`,
  `data-invalid`, `data-complete`, `data-index` for `pinInput`, matching
  [Zag.js's own convention](https://zagjs.com/components/pin-input#data-attributes)).
- **Compound behaviors** (more than one interactive part) expose
  `getRootProps()` plus a per-part getter (`getInputProps({ index })` for
  `pinInput`) instead of a single `getXProps()`.

## API

- `pinInput(initialProps: PinInputProps)` — auto-advance, backspace-to-
  previous-box, arrow-key navigation, paste-splitting, and numeric
  filtering for a segmented PIN/OTP input. `PinInputProps`: `length`,
  `type?` (`'numeric' | 'alphanumeric'`, default `'numeric'`), `disabled?`,
  `invalid?`, `onValueChange?`, `onComplete?`.
- `validate(value, rules)` — pure validation function, exported standalone.

## Testing

Every factory is tested by calling it directly and inspecting the returned
state/props — no rendering, no DOM simulation, no mocking. Tests construct
a plain `getProp` closure over a mutable test object (see
`pinInput.test.ts`'s `createGetProp` helper) rather than involving any
framework. Run:

```bash
pnpm --filter @leslielee888888/core test
```
