# PinInput + Frameworks Architecture — Design

**Status:** Approved by Leslie in chat (2026-09-23) — pending spec self-review and file review before `/tasks`.

## Context

`core`'s current behavior factories (`createButtonBehavior`, `createInputBehavior`, `createCardBehavior`, `createBadgeBehavior`) wrap components that don't have real interaction logic — Button and Input's factories exist mainly to gate a native `disabled` attribute and forward `onChange`/`onClick`, and Card/Badge's factories only return `role`/`aria-*` attributes. None of this requires JavaScript to work correctly; the browser already provides it natively.

PinInput is different: moving focus between boxes on entry, moving back a box on Backspace when the current box is empty, arrow-key navigation between boxes, and splitting a pasted code across boxes are all behaviors the browser does not provide for free. This is the first component that needs `core` to own genuine, stateful interaction logic across multiple DOM nodes — which is also the first time `core`'s single-part `getXProps()` shape doesn't fit, since PinInput has a root, N inputs, and (per the Ark UI/Zag.js-style anatomy used as a structural reference) a hidden input for form submission.

This project narrows `core`'s scope to match: it owns interaction logic only, drops the components that were only wrapping native HTML behavior, and introduces a compound prop-getter shape (`getRootProps()`, `getInputProps({ index })`) for components with more than one interactive part. It also moves the React-specific plumbing (subscribing to a behavior's store, keeping a stable accessor function fresh across renders) into a new package, `frameworks/react`, so future framework adapters (Vue, etc.) have a natural home alongside it without polluting `core` — this plumbing is genuinely new, not a consolidation of something already duplicated across `Button`/`Input`/`Card`/`Badge` today (none of them use `useSyncExternalStore`; `Input`'s pre-existing comment referencing it doesn't match its actual `useReducer`-based implementation).

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

Dependency chain: `core` → `frameworks/react` → `ui-react`, but `ui-react` depends on both `core` and `frameworks/react` directly (not just the latter) — it needs `core` to import behavior factories like `pinInput` themselves, and `frameworks/react` for the `useBehavior`/`createBehaviorContext` mechanics that wire them into React. `frameworks/react` depends on neither `ui-react` nor `core`.

## 2. `core` changes (breaking)

**Removed:** `createButtonBehavior`, `createInputBehavior`, `createCardBehavior`, `createBadgeBehavior`, and their associated types (`ButtonConfig`/`ButtonState`/`ButtonProps`, `InputConfig`/`InputState`/`InputProps`, `CardConfig`/`CardProps`, `BadgeConfig`/`BadgeProps`) — all four only wrapped native HTML behavior or static ARIA attributes, which don't need a behavior object, a store, or `core` at all.

**Added:** `pinInput` — a behavior factory, not a `createX` function (matches Zag's own naming: a lowercase behavior object, not `createPinInputBehavior`).

Every field a behavior needs — `length`, `type`, `disabled`, `invalid`, the callbacks — is read the same way: through a `getProp` accessor function the framework binding hands the behavior _after_ it's created. There's no config object at creation at all, and no separate "structural vs. live" classification — a behavior takes no arguments, gets wired up to an accessor once, and reads whatever it needs from that accessor whenever it actually needs it. This generalizes the same principle `Input`'s `value` already used (`core/README.md`'s "live data is a function argument, not creation config") to every field uniformly, instead of applying it one field at a time. `core` only defines the shape of the accessor (`GetProp<T>`) and expects to be handed one — it never imports React or anything else framework-specific; making the accessor stay fresh across renders is `frameworks/react`'s job (§3), and a Vue binding could satisfy the same shape far more simply, since Vue's reactivity already tracks freshness without a ref/effect dance.

```ts
type GetProp<T> = <K extends keyof T>(key: K) => T[K];

interface PinInputProps {
  length: number;
  type?: 'numeric' | 'alphanumeric'; // default: 'numeric'
  disabled?: boolean;
  invalid?: boolean; // consumer-supplied validation result — core has no concept of "invalid" itself
  onValueChange?: (value: string) => void;
  onComplete?: (value: string) => void;
}

interface PinInputState {
  values: string[]; // length === length prop, '' for an empty box
  focusedIndex: number | null;
  complete: boolean; // values.every(v => v !== ''), recomputed once per mutation — see below
}

interface PinInputRootProps {
  role: 'group';
  'data-scope': 'pin-input';
  'data-part': 'root';
  'data-disabled'?: true;
  'data-invalid'?: true;
  'data-complete'?: true; // true when every box is filled — computed from core's own state
}

interface PinInputBoxProps {
  type: 'text';
  inputMode: 'numeric' | 'text';
  value: string;
  'data-scope': 'pin-input';
  'data-part': 'input';
  'data-index': number;
  'data-disabled'?: true;
  'data-invalid'?: true;
  'data-complete'?: true;
  onChange: (event: { target: { value: string } }) => void;
  onKeyDown: (event: { key: string; target: unknown }) => void;
  onPaste: (event: { clipboardData: { getData: (format: string) => string } }) => void;
  onFocus: () => void;
  onBlur: () => void;
}

export function pinInput(): {
  getState: () => PinInputState;
  subscribe: (listener: () => void) => () => void;
  setGetProp: (getProp: GetProp<PinInputProps>) => void;
  getRootProps: () => PinInputRootProps;
  getInputProps: (part: { index: number }) => PinInputBoxProps;
} {
  // ...factory body: takes no arguments — nothing to configure at creation. Holds
  // `getProp` in a closure variable, set exactly once via setGetProp (§3 wires this up
  // right after the behavior is created, before anything else can call getRootProps()
  // or getInputProps()). Creates the store (complete is recomputed once, inside the
  // store's own setState, whenever values changes — never inside
  // getRootProps()/getInputProps() themselves, which would mean an O(length) scan
  // running once per box, per render, i.e. O(length^2) total instead of O(length)).
  // Reads length/type/disabled/invalid/onValueChange/onComplete all the same way, via
  // getProp(key), called fresh at the exact moment a current value is actually needed
  // (inside an onChange handler, inside getRootProps() itself, etc.) rather than at
  // creation time.
}
```

The `data-*` attributes follow [Zag.js's own Pin Input component convention](https://zagjs.com/components/pin-input#data-attributes) exactly (`data-scope`, `data-part`, `data-disabled`, `data-invalid`, `data-complete`, `data-index`) — they're CSS-selector hooks (`[data-part="input"][data-complete]`) so `ui-react` styles state via attribute selectors in its CSS Modules instead of computing classNames from JS-tracked booleans. `data-complete` reads directly off `state.complete` (see `PinInputState` above — cached, not recomputed per call); `data-disabled`/`data-invalid` come from calling `getProp('disabled')`/`getProp('invalid')` at the moment `getRootProps()`/`getInputProps()` actually run. We deliberately do **not** add a `data-value` attribute (holding the entered digit) — Zag's own pin-input doesn't expose one either, since CSS can't do anything useful with an arbitrary digit and it would just duplicate state that's already on the input's `.value`.

Interaction rules owned here:

- **Auto-advance**: entering a valid character in box `i` moves focus to box `i + 1` (no-op past the last box).
- **Backspace-to-previous**: Backspace on an empty box moves focus to box `i - 1` and clears it; Backspace on a non-empty box just clears it (standard OTP-input convention).
- **Arrow-key navigation**: `ArrowLeft`/`ArrowRight` move focus without changing values.
- **Paste-splitting**: pasting a string longer than one character starting at box `i` fills boxes `i..i+n` with successive characters and moves focus to the first empty box after (or the last box).
- **Numeric filtering**: when `type: 'numeric'`, non-digit characters are rejected before they reach state.
- **Completion**: `onComplete(value)` fires the first time every box holds a non-empty value (also the moment `data-complete` starts appearing); `onValueChange(value)` fires on every change, where `value` is the boxes joined into one string.

This ships as a **major version bump** on `@leslielee888888/core` (currently `0.2.0` → `1.0.0`), with a changeset explicitly documenting the four removed exports as a breaking change, since they're already published and a third party could depend on them.

## 3. `frameworks/react` package

`frameworks/react` has exactly one job: the React-specific mechanics of keeping a `getProp` accessor fresh across renders and wiring it into a behavior exactly once, without ever recreating the behavior. Two exports, both fully generic — no per-behavior wrapper hook, no per-behavior key list, nothing that has to be kept in sync with what a given behavior's props actually look like:

```ts
// useLiveRef.ts — private helper, not exported on its own
function useLiveRef<T>(value: T) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value; // written after render (commit time), never during render itself
  });
  return ref;
}

// useBehavior.ts
function useBehavior<
  TProps extends object,
  TBehavior extends {
    subscribe: (l: () => void) => () => void;
    getState: () => unknown;
    setGetProp: (getProp: GetProp<TProps>) => void;
  },
>(factory: () => TBehavior, props: TProps): TBehavior {
  const propsRef = useLiveRef(props);
  const getProp = useCallback(
    <K extends keyof TProps>(key: K) => propsRef.current[key],
    [propsRef]
  );

  // Created during render, but nothing ref-reading is passed into the factory call
  // itself — that's the piece that makes this pass eslint-plugin-react-hooks' refs
  // rule (see "Live-ref mechanism: verified" below). The accessor is wired up
  // separately, after render.
  const [behavior] = useState(factory);

  useLayoutEffect(() => {
    behavior.setGetProp(getProp);
  }, [behavior, getProp]);

  useSyncExternalStore(behavior.subscribe, behavior.getState);
  return behavior;
}
```

Because nothing is classified as structural or live anymore, `useBehavior(factory, props)` really is just two arguments — the factory and one flat props object — with no wrapper hook, no per-behavior key list to maintain, and no derived type that has to be trusted to line up with what got stripped. `ui-react` imports behavior factories (e.g. `pinInput`) directly from `@leslielee888888/core`, alongside `useBehavior` from `@leslielee888888/frameworks-react`.

**`createBehaviorContext`** is this package's other export. Every compound behavior (`pinInput` today; a future Tabs or Select, per the Open follow-ups) needs the exact same "share the behavior with descendants, guard against use outside its Root" wiring — written once here instead of every compound component in `ui-react` hand-rolling its own `createContext`/`useContext`/non-null-assertion. It's simpler now than it would have been under the structural/live design, since there's only one thing to share:

```ts
// createBehaviorContext.ts
function createBehaviorContext<TBehavior>() {
  const Context = createContext<TBehavior | null>(null);

  function useBehaviorContext(componentName: string): TBehavior {
    const value = useContext(Context);
    if (!value) throw new Error(`${componentName} must be used within its Root`);
    return value;
  }

  return { Provider: Context.Provider, useBehaviorContext };
}
```

## 4. `ui-react` changes

**Button, Input, Card, Badge** become plain components: native `<button disabled>` / `<input value/onChange>`, no `core` import, no behavior object, no store. Input's validation (`rules`) moves to a small local pure-function helper inside `ui-react` (not a `core` export, since it has no state or interaction — it's a plain value → error-message mapping).

**New `components/pin-input/`**, a compound component. `PinInput.Root` takes one flat props object from its consumer, hands it straight to `useBehavior`, and shares the resulting `behavior` — and only the behavior — through `createBehaviorContext`'s `Provider`:

```tsx
const { Provider: PinInputProvider, useBehaviorContext: usePinInputContext } =
  createBehaviorContext<ReturnType<typeof pinInput>>();

function Root({
  length,
  type,
  disabled,
  invalid,
  onValueChange,
  onComplete,
  children,
}: PinInputRootComponentProps) {
  const behavior = useBehavior(pinInput, {
    length,
    type,
    disabled,
    invalid,
    onValueChange,
    onComplete,
  });

  return (
    <PinInputProvider value={behavior}>
      <div {...behavior.getRootProps()}>{children}</div>
    </PinInputProvider>
  );
}

function Input({ index }: { index: number }) {
  const behavior = usePinInputContext('PinInput.Input');
  return <input {...behavior.getInputProps({ index })} />;
}
```

`behavior` is created exactly once (§3) and never replaced, so it's a genuinely stable Context value — `Input` reads the same object reference on every render regardless of what `disabled`/`invalid`/the callbacks are doing, because `getRootProps()`/`getInputProps()` no longer take a live argument at all; they read `disabled`/`invalid`/the callbacks internally, via the same `getProp` closure `pinInput` was wired up with in §3. This also resolves, rather than just accepts, the render-fan-out cost the `/simplify` pass found in the earlier structural/live design: there's no more `liveProps` object being rebuilt fresh on every render for the Provider to hand out, so no `PinInput.Input` box re-renders unless the store itself changes something that box actually reads.

- `PinInput.Root` — as above. Props: `length`, `type?`, `disabled?`, `invalid?`, `onValueChange?`, `onComplete?`, `children`.
- `PinInput.Control` — plain styled flex-row wrapper for the visible boxes (the "Control" part from the Ark UI/Zag.js-style reference anatomy). No context read needed — purely layout.
- `PinInput.Input` — one visible box, as above. Props: `index`. All visual states (empty/filled/focus/disabled/invalid/complete) are driven by the `data-*` attributes and native DOM state (`:focus`, `value !== ''`) from §2 — no JS-tracked booleans or separate `error` prop needed in `ui-react` itself.
- `PinInput.HiddenInput` — a visually-hidden native `<input>` mirroring the full joined value from context, for native form submission and browser autofill (per the reference anatomy's `HiddenInput` part).

Export shape: `Button`, `Input`, `Card`, `Badge` (unchanged public API, now plain components internally), plus a `PinInput` namespace object: `{ Root, Control, Input, HiddenInput }`.

## Live-ref mechanism: verified against this repo's lint config

Zag.js's real React adapter (`packages/frameworks/react/src/machine.ts` in `chakra-ui/zag`) solves "keep a long-lived instance in sync with fresh props" via a `useLiveRef` primitive and a stable `prop(key)` accessor. An earlier draft of this design rejected that approach, reasoning by analogy to a different failure: writing `onClickRef.current = onClick` directly in a render body (Button's `onClick`, earlier this session) was rejected by `eslint-plugin-react-hooks` v7's `refs` rule ("Cannot update ref during render"), so the whole family of pattern was assumed blocked.

That assumption turned out to be too broad, confirmed by actually building it and running the real `eslint-plugin-react-hooks` v7 config in this repo (`npx eslint`) against it, not just reasoning about it. Two things had to change from the naive port of Zag's version, and both were necessary — fixing only one still failed:

1. **Write at commit time, not render time.** `ref.current = value` moved into `useLayoutEffect(() => { ref.current = value })`. This alone still failed: `Error: Cannot access refs during render` on the line that passed the accessor into `useState`'s initializer.
2. **Never hand the accessor to anything invoked during render.** `useState`'s initializer runs during render (on mount), so calling `factory(getProp)` there — passing a ref-reading closure into a function that executes during render — trips the rule independently of when the ref itself is written. The fix: create the behavior with **no accessor at all** (`useState(factory)`, zero arguments), then wire the accessor in separately, inside its own `useLayoutEffect`, after the behavior already exists.

With both changes, `npx eslint` on the resulting file exits 0 — no errors, no warnings, `exhaustive-deps` included. §2–§4 above reflect this mechanism directly rather than the earlier structural/live split, which it replaces entirely: every field is read through `getProp`, uniformly, so there's no longer anything to classify as "structural" vs. "live," which also resolves the placement question the structural/live split raised (whether that classification belonged in `core` or `frameworks/react`) by removing the classification rather than relocating it.

## Testing

- `core`: unit tests for `pinInput` covering each interaction rule above (auto-advance, backspace-to-previous on empty vs. non-empty, arrow-key nav, paste-split at various start indices and lengths, numeric filtering, `onComplete`/`onValueChange` firing) and the `data-*` attributes (disabled/invalid/complete/index) on both `getRootProps()` and `getInputProps()`. Tests construct a plain `getProp` closure over a mutable test object and call `setGetProp` before exercising the behavior — no React involved, since `pinInput` itself has no framework dependency.
- `frameworks/react`: unit test for `useBehavior` confirming it creates the behavior exactly once across re-renders (changing an unrelated prop doesn't call the factory again), that `setGetProp` is called before the first `getRootProps()`/`getInputProps()` a test can observe, and that it still re-renders the caller on store changes via `useSyncExternalStore`; unit test for `createBehaviorContext` confirming `useBehaviorContext` throws when called outside its `Provider`.
- `ui-react`: component tests for `PinInput` compound usage (typing advances focus, backspace navigates back, paste fills multiple boxes, disabled/invalid/complete states render correctly, and — the specific regression this design is built to avoid — typed values survive a parent re-render that only changes an unrelated prop) and updated/simplified tests for the now-plain Button/Input/Card/Badge.

## Open follow-ups (not blocking this design)

- Vue adapter (`frameworks/vue`) — deferred until there's a real second consumer.
- Masked display (e.g. showing `•` instead of the entered digit) — needs a display-value/real-value split that isn't designed here; add if a consumer actually needs it.
- Whether other future components (e.g. Tabs, a Select) belong in `core` at all, or are better classified the same way Button/Input were (native-behavior-sufficient) — decide per-component when they're actually proposed, using the same test: does it need JS to coordinate multiple DOM nodes, or does HTML already do the job?
