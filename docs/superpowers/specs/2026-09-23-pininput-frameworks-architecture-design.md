# PinInput + Frameworks Architecture — Design

**Status:** Approved by Leslie in chat (2026-09-23) — pending spec self-review and file review before `/tasks`.

## Context

`core`'s current behavior factories (`createButtonBehavior`, `createInputBehavior`, `createCardBehavior`, `createBadgeBehavior`) wrap components that don't have real interaction logic — Button and Input's factories exist mainly to gate a native `disabled` attribute and forward `onChange`/`onClick`, and Card/Badge's factories only return `role`/`aria-*` attributes. None of this requires JavaScript to work correctly; the browser already provides it natively.

PinInput is different: moving focus between boxes on entry, moving back a box on Backspace when the current box is empty, arrow-key navigation between boxes, and splitting a pasted code across boxes are all behaviors the browser does not provide for free. This is the first component that needs `core` to own genuine, stateful interaction logic across multiple DOM nodes — which is also the first time `core`'s single-part `getXProps()` shape doesn't fit, since PinInput has a root, N inputs, and (per the Ark UI/Zag.js-style anatomy used as a structural reference) a hidden input for form submission.

This project narrows `core`'s scope to match: it owns interaction logic only, drops the components that were only wrapping native HTML behavior, and introduces a compound prop-getter shape (`getRootProps()`, `getInputProps({ index })`) for components with more than one interactive part. It also extracts the React-specific plumbing (`useSyncExternalStore` + `useMemo` boilerplate every component was hand-rolling) into a new package, `frameworks/react`, so future framework adapters (Vue, etc.) have a natural home alongside it without polluting `core`.

## Non-goals

- Vue (or any other framework) adapter — `frameworks/react` is built now; `frameworks/vue` is out of scope until there's a second consumer.
- Retrofitting Button/Input with new interaction behavior they don't have. They become plain components; this is a removal, not a redesign.
- Changing PinInput's visual design — the Figma `PinInputField` component set (states: Empty/Filled/Focus/Error/Disabled) built earlier this session is the source of truth for styling.

## 1. Package structure

New package: `packages/frameworks/react`, published as `@leslielee888888/frameworks-react`. The nested path is a workspace/repo layout choice only — npm package names are flat regardless of directory nesting, so this doesn't create any naming awkwardness. A future Vue adapter would live at `packages/frameworks/vue` (`@leslielee888888/frameworks-vue`) beside it.

`pnpm-workspace.yaml`'s `packages` glob grows from:

```yaml
packages:
  - 'packages/*'
```

to:

```yaml
packages:
  - 'packages/*'
  - 'packages/frameworks/*'
```

Dependency chain: `core` → `frameworks/react` → `ui-react`. `ui-react` no longer depends on `core` directly — only `frameworks/react` does.

## 2. `core` changes (breaking)

**Removed:** `createButtonBehavior`, `createInputBehavior`, `createCardBehavior`, `createBadgeBehavior`, and their associated types (`ButtonConfig`/`ButtonState`/`ButtonProps`, `InputConfig`/`InputState`/`InputProps`, `CardConfig`/`CardProps`, `BadgeConfig`/`BadgeProps`) — all four only wrapped native HTML behavior or static ARIA attributes, which don't need a behavior object, a store, or `core` at all.

**Added:** `createPinInputBehavior(config)`.

```ts
interface PinInputConfig {
  length: number;
  disabled?: boolean;
  type?: 'numeric' | 'alphanumeric'; // default: 'numeric'
  onValueChange?: (value: string) => void;
  onComplete?: (value: string) => void;
}

interface PinInputState {
  values: string[]; // length === config.length, '' for an empty box
  focusedIndex: number | null;
}

interface PinInputRootProps {
  role: 'group';
  'aria-label'?: string;
}

interface PinInputBoxProps {
  type: 'text';
  inputMode: 'numeric' | 'text';
  disabled?: boolean;
  value: string;
  'aria-label': string; // "Digit N of length"
  onChange: (event: { target: { value: string } }) => void;
  onKeyDown: (event: { key: string; target: unknown }) => void;
  onPaste: (event: { clipboardData: { getData: (format: string) => string } }) => void;
  onFocus: () => void;
  onBlur: () => void;
}

function createPinInputBehavior(config: PinInputConfig): {
  getState: () => PinInputState;
  subscribe: (listener: () => void) => () => void;
  getRootProps: () => PinInputRootProps;
  getInputProps: (part: { index: number }) => PinInputBoxProps;
};
```

Interaction rules owned here:

- **Auto-advance**: entering a valid character in box `i` moves focus to box `i + 1` (no-op past the last box).
- **Backspace-to-previous**: Backspace on an empty box moves focus to box `i - 1` and clears it; Backspace on a non-empty box just clears it (standard OTP-input convention).
- **Arrow-key navigation**: `ArrowLeft`/`ArrowRight` move focus without changing values.
- **Paste-splitting**: pasting a string longer than one character starting at box `i` fills boxes `i..i+n` with successive characters and moves focus to the first empty box after (or the last box).
- **Numeric filtering**: when `type: 'numeric'`, non-digit characters are rejected before they reach state.
- **Completion**: `onComplete(value)` fires the first time every box holds a non-empty value; `onValueChange(value)` fires on every change, where `value` is the boxes joined into one string.

This ships as a **major version bump** on `@leslielee888888/core` (currently `0.2.0` → `1.0.0`), with a changeset explicitly documenting the four removed exports as a breaking change, since they're already published and a third party could depend on them.

## 3. `frameworks/react` package

```ts
// useBehavior.ts
function useBehavior<
  TBehavior extends { subscribe: (l: () => void) => () => void; getState: () => unknown },
>(factory: () => TBehavior, deps: unknown[]): TBehavior;
```

Generalizes the `useMemo(factory, deps)` + `useSyncExternalStore(behavior.subscribe, behavior.getState)` pattern every component in `ui-react` was hand-rolling (see `Input.tsx`'s pre-existing version of this). Internally calls `useSyncExternalStore` so the calling component re-renders on every store change, and returns the memoized behavior object itself — callers read live state via `behavior.getState()` inside render, same as today.

```ts
// usePinInput.ts
function usePinInput(config: PinInputConfig) {
  return useBehavior(
    () => createPinInputBehavior(config),
    [
      config.length,
      config.disabled,
      config.type,
      config.mask,
      config.onValueChange,
      config.onComplete,
    ]
  );
}
```

This is the only file in the new package that imports `@leslielee888888/core`. `ui-react` imports only from `@leslielee888888/frameworks-react`, never from `core` directly — keeping the dependency direction one-way.

## 4. `ui-react` changes

**Button, Input, Card, Badge** become plain components: native `<button disabled>` / `<input value/onChange>`, no `core` import, no behavior object, no store. Input's validation (`rules`) moves to a small local pure-function helper inside `ui-react` (not a `core` export, since it has no state or interaction — it's a plain value → error-message mapping).

**New `components/pin-input/`**, a compound component built on `usePinInput`:

- `PinInput.Root` — calls `usePinInput(config)`, provides the behavior instance via React Context, renders `<div {...behavior.getRootProps()}>`. Props: `length`, `disabled?`, `type?`, `mask?`, `onValueChange?`, `onComplete?`, `children`.
- `PinInput.Control` — plain styled flex-row wrapper for the visible boxes (the "Control" part from the Ark UI/Zag.js-style reference anatomy). No context read needed — purely layout.
- `PinInput.Input` — one visible box. Props: `index`, `error?: boolean`. Reads the behavior from context, spreads `behavior.getInputProps({ index })` onto a native `<input>`. Visual state (empty/filled/focus/disabled) is driven directly by real DOM state (`:focus`, `:disabled`, `value !== ''`); the Error variant is driven by the `error` prop, which the consumer supplies (e.g. from their own validation of the completed code) — `core` has no concept of a validation error here, same as validation was moved out of `core` for Input.
- `PinInput.HiddenInput` — a visually-hidden native `<input>` mirroring the full joined value from context, for native form submission and browser autofill (per the reference anatomy's `HiddenInput` part).

Export shape: `Button`, `Input`, `Card`, `Badge` (unchanged public API, now plain components internally), plus a `PinInput` namespace object: `{ Root, Control, Input, HiddenInput }`.

## Testing

- `core`: unit tests for `createPinInputBehavior` covering each interaction rule above (auto-advance, backspace-to-previous on empty vs. non-empty, arrow-key nav, paste-split at various start indices and lengths, numeric filtering, `onComplete`/`onValueChange` firing).
- `frameworks/react`: unit test for `useBehavior` confirming it re-renders on store changes and memoizes correctly across the given deps array.
- `ui-react`: component tests for `PinInput` compound usage (typing advances focus, backspace navigates back, paste fills multiple boxes, disabled/error variants render correctly) and updated/simplified tests for the now-plain Button/Input/Card/Badge.

## Open follow-ups (not blocking this design)

- Vue adapter (`frameworks/vue`) — deferred until there's a real second consumer.
- Masked display (e.g. showing `•` instead of the entered digit) — needs a display-value/real-value split that isn't designed here; add if a consumer actually needs it.
- Whether other future components (e.g. Tabs, a Select) belong in `core` at all, or are better classified the same way Button/Input were (native-behavior-sufficient) — decide per-component when they're actually proposed, using the same test: does it need JS to coordinate multiple DOM nodes, or does HTML already do the job?
