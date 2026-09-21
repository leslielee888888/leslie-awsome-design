# core

Zero-dependency, framework-agnostic interaction logic for the design
system's interactive components. No React, no DOM, no framework of any
kind — every `create*` factory returns plain objects a framework-specific
adapter (built in a separate, future package) spreads onto real elements.

## Structure

```
src/
  behaviors/
    button/
      createButton.ts
      createButton.test.ts
    input/
      createInput.ts
      createInput.test.ts
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
UI component; each one implements interaction *behavior* only (state,
event handlers, ARIA), the same vocabulary React Aria uses for its own
hooks. `utilities/` holds framework- and component-agnostic helpers used
by one or more behaviors: `createStore` (the state + `subscribe`/`notify`
mechanism every behavior is built on) and `validate`.

## Pattern

Every factory follows the same shape:

```ts
const instance = createX(config);       // config passed once, at creation
instance.subscribe(() => { ... });        // re-run whenever state changes
instance.getState();                      // current state snapshot
instance.getXProps(/* live args? */);     // plain attribute/handler object
```

- **Config is set once, at creation.** There is no `update()` method. A
  consumer that needs to react to changing config (e.g. a `disabled` prop)
  creates a fresh instance when it changes (e.g. via React's `useMemo`
  keyed on the changed values) — this package has no opinion on how or
  when that happens.
- **Live, fast-changing data is a function argument**, not creation
  config — see `createInput`'s `getInputProps(liveValue?)`.
- **Prop-getters own every attribute**, including ARIA — nothing needs to
  be added by hand outside the spread props, except business logic the
  core has no opinion about (e.g. Button's `onClick` side effect).

## API

- `createButton(config?: { disabled?, loading? })` — press/hover/focus
  interaction state for a plain action-trigger button (not a toggle).
- `createInput(config?: { disabled?, rules?, defaultValue?, onValueChange? })`
  — focus state plus validation. Supports both controlled (pass a value to
  `getInputProps(value)`) and uncontrolled (omit it) usage.
  - `getErrorMessage(liveValue?)` — same live-value pattern as
    `getInputProps`: pass the current value for controlled usage, omit it for
    uncontrolled. Returns the current validation error message string, or
    `undefined` if the value is valid.
- `validate(value, rules)` — pure validation function, exported standalone.

## Testing

Every factory is tested by calling it directly and inspecting the returned
state/props — no rendering, no DOM simulation, no mocking. Run:

```bash
pnpm --filter core run test
```
