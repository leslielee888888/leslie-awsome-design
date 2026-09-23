# PinInput + Frameworks Architecture — Design

**Status:** Approved by Leslie in chat (2026-09-23) — pending spec self-review and file review before `/tasks`.

## Context

`core`'s current behavior factories (`createButtonBehavior`, `createInputBehavior`, `createCardBehavior`, `createBadgeBehavior`) wrap components that don't have real interaction logic — Button and Input's factories exist mainly to gate a native `disabled` attribute and forward `onChange`/`onClick`, and Card/Badge's factories only return `role`/`aria-*` attributes. None of this requires JavaScript to work correctly; the browser already provides it natively.

PinInput is different: moving focus between boxes on entry, moving back a box on Backspace when the current box is empty, arrow-key navigation between boxes, and splitting a pasted code across boxes are all behaviors the browser does not provide for free. This is the first component that needs `core` to own genuine, stateful interaction logic across multiple DOM nodes — which is also the first time `core`'s single-part `getXProps()` shape doesn't fit, since PinInput has a root, N inputs, and (per the Ark UI/Zag.js-style anatomy used as a structural reference) a hidden input for form submission.

This project narrows `core`'s scope to match: it owns interaction logic only, drops the components that were only wrapping native HTML behavior, and introduces a compound prop-getter shape (`getRootProps()`, `getInputProps({ index })`) for components with more than one interactive part. It also moves the React-specific plumbing (subscribing to a behavior's store, splitting its config from its live props) into a new package, `frameworks/react`, so future framework adapters (Vue, etc.) have a natural home alongside it without polluting `core` — this plumbing is genuinely new, not a consolidation of something already duplicated across `Button`/`Input`/`Card`/`Badge` today (none of them use `useSyncExternalStore`; `Input`'s pre-existing comment referencing it doesn't match its actual `useReducer`-based implementation).

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

**Added:** `pinInput` — a behavior factory, not a `createX` function (matches Zag's own naming: a lowercase behavior object, not `createPinInputBehavior`).

`PinInputConfig` holds only **structural** fields — things that don't change after the component mounts. Everything that can legitimately change while the component is alive (`disabled`, `invalid`, the callbacks) is **not** creation config; it's passed as a live argument to the prop-getters, every time they're called, so it's always fresh without ever forcing the behavior (and its store) to be recreated. This is the same principle already applied to `Input`'s `value` (`core/README.md`'s "live data is a function argument, not creation config"), generalized to every volatile field instead of just one.

```ts
interface PinInputConfig {
  length: number;
  type?: 'numeric' | 'alphanumeric'; // default: 'numeric'
}

interface PinInputState {
  values: string[]; // length === config.length, '' for an empty box
  focusedIndex: number | null;
  complete: boolean; // values.every(v => v !== ''), recomputed once per mutation — see below
}

interface PinInputLiveProps {
  disabled?: boolean;
  invalid?: boolean; // consumer-supplied validation result — core has no concept of "invalid" itself
  onValueChange?: (value: string) => void;
  onComplete?: (value: string) => void;
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

// core/src/defineBehavior.ts — every behavior factory is built with this, not called raw.
// structuralKeys is a Record, not an array: TypeScript then requires a value for every
// key of TStructural, so adding a field to a config type without updating this map is a
// compile error instead of a silent runtime gap (useBehavior's split would otherwise just
// quietly omit an unlisted field and hand the factory `undefined` for it).
// Live keys aren't declared separately — they're just whatever's left in the props object.
function defineBehavior<TStructural extends object, TBehavior>(
  structuralKeys: Record<keyof TStructural, true>,
  create: (config: TStructural) => TBehavior
): { (config: TStructural): TBehavior; structuralKeys: Record<keyof TStructural, true> } {
  return Object.assign(create, { structuralKeys });
}

export const pinInput = defineBehavior<
  PinInputConfig,
  {
    getState: () => PinInputState;
    subscribe: (listener: () => void) => () => void;
    getRootProps: (
      liveProps?: Pick<PinInputLiveProps, 'disabled' | 'invalid'>
    ) => PinInputRootProps;
    getInputProps: (part: { index: number }, liveProps?: PinInputLiveProps) => PinInputBoxProps;
  }
>({ length: true, type: true }, (config) => {
  // ...factory body: creates the store (complete is recomputed once, inside the store's
  // own setState, whenever values changes — never inside getRootProps()/getInputProps()
  // themselves, which would mean an O(length) scan running once per box, per render,
  // i.e. O(length^2) total instead of O(length)). Returns
  // getState/subscribe/getRootProps/getInputProps...
});
```

The `data-*` attributes follow [Zag.js's own Pin Input component convention](https://zagjs.com/components/pin-input#data-attributes) exactly (`data-scope`, `data-part`, `data-disabled`, `data-invalid`, `data-complete`, `data-index`) — they're CSS-selector hooks (`[data-part="input"][data-complete]`) so `ui-react` styles state via attribute selectors in its CSS Modules instead of computing classNames from JS-tracked booleans. `data-complete` reads directly off `state.complete` (see `PinInputState` above — cached, not recomputed per call); `data-disabled`/`data-invalid` come from whatever the caller passes into `liveProps` on that call. We deliberately do **not** add a `data-value` attribute (holding the entered digit) — Zag's own pin-input doesn't expose one either, since CSS can't do anything useful with an arbitrary digit and it would just duplicate state that's already on the input's `.value`.

Interaction rules owned here:

- **Auto-advance**: entering a valid character in box `i` moves focus to box `i + 1` (no-op past the last box).
- **Backspace-to-previous**: Backspace on an empty box moves focus to box `i - 1` and clears it; Backspace on a non-empty box just clears it (standard OTP-input convention).
- **Arrow-key navigation**: `ArrowLeft`/`ArrowRight` move focus without changing values.
- **Paste-splitting**: pasting a string longer than one character starting at box `i` fills boxes `i..i+n` with successive characters and moves focus to the first empty box after (or the last box).
- **Numeric filtering**: when `type: 'numeric'`, non-digit characters are rejected before they reach state.
- **Completion**: `onComplete(value)` fires the first time every box holds a non-empty value (also the moment `data-complete` starts appearing); `onValueChange(value)` fires on every change, where `value` is the boxes joined into one string.

This ships as a **major version bump** on `@leslielee888888/core` (currently `0.2.0` → `1.0.0`), with a changeset explicitly documenting the four removed exports as a breaking change, since they're already published and a third party could depend on them.

## 3. `frameworks/react` package

`frameworks/react` has exactly one job: the generic React-specific plumbing every behavior needs, and nothing else. No per-behavior wrapper hooks live here — `useBehavior` is the only export, and it's written once, used by every current and future component. It takes the factory _and one flat props object_ (structural and live fields mixed together, exactly as a component receives its own props) and does the structural/live split itself, using the key list `defineBehavior` attached to the factory in `core` (§2):

```ts
// useBehavior.ts — the only export of this package alongside createBehaviorContext (below)
function useBehavior<
  TStructural extends object,
  TProps extends TStructural,
  TBehavior extends { subscribe: (l: () => void) => () => void; getState: () => unknown },
>(
  factory: { (config: TStructural): TBehavior; structuralKeys: Record<keyof TStructural, true> },
  allProps: TProps
): { behavior: TBehavior; liveProps: Omit<TProps, keyof TStructural> } {
  const [behavior] = useState(() => {
    const structural = {} as TStructural;
    for (const key in factory.structuralKeys) structural[key as keyof TStructural] = allProps[key];
    return factory(structural); // created once, on mount, forever
  });
  useSyncExternalStore(behavior.subscribe, behavior.getState);

  // Same technique as the structural loop above — walk keys, check membership in
  // factory.structuralKeys — just walking allProps' keys and keeping non-structural ones,
  // instead of walking structuralKeys and picking matching ones. (Not the same loop: this
  // one runs every render since live values can change; the one above runs once, on mount.)
  const liveProps = {} as Omit<TProps, keyof TStructural>;
  for (const key in allProps) {
    if (!(key in factory.structuralKeys))
      (liveProps as Record<string, unknown>)[key] = allProps[key];
  }
  return { behavior, liveProps };
}
```

`TProps` (not a second `TLive` generic) is what actually gets passed in — TypeScript infers it directly from the one real argument, and `liveProps`'s type, `Omit<TProps, keyof TStructural>`, is derived mechanically from what was stripped rather than trusted to line up with an independently-declared type. Because the split happens via `factory.structuralKeys` — a static map `core` declares, not a per-render computation — there's no `useMemo`/deps-array involved anywhere in this hook: `useState`'s initializer already runs exactly once regardless of what `allProps` looks like on later renders, so the structural half never needs memoizing, and the live half is deliberately recomputed fresh on every call (a plain object literal, no hook), matching the "live data is a function argument" principle from §2. No lint exception needed anywhere.

Since `structuralKeys` is the only per-behavior thing `useBehavior` needs, and it comes from the factory itself, there's still no per-behavior wrapper hook — one generic `useBehavior(factory, allProps)` works for `pinInput` and any future behavior, as long as it's built with `defineBehavior`. `ui-react` imports behavior factories (e.g. `pinInput`) directly from `@leslielee888888/core`, alongside `useBehavior` from `@leslielee888888/frameworks-react`. `frameworks/react`'s role is narrowly the hook, not a gateway that re-exports or proxies `core`.

**`createBehaviorContext`** is this package's other export, alongside `useBehavior`. Every compound behavior (`pinInput` today; a future Tabs or Select, per the Open follow-ups) needs the exact same "share `{ behavior, liveProps }` with descendants, guard against use outside its Root" wiring — written once here instead of every compound component in `ui-react` hand-rolling its own `createContext`/`useContext`/non-null-assertion:

```ts
// createBehaviorContext.ts
function createBehaviorContext<TBehavior, TLiveProps>() {
  const Context = createContext<{ behavior: TBehavior; liveProps: TLiveProps } | null>(null);

  function useBehaviorContext(componentName: string) {
    const value = useContext(Context);
    if (!value) throw new Error(`${componentName} must be used within its Root`);
    return value;
  }

  return { Provider: Context.Provider, useBehaviorContext };
}
```

## 4. `ui-react` changes

**Button, Input, Card, Badge** become plain components: native `<button disabled>` / `<input value/onChange>`, no `core` import, no behavior object, no store. Input's validation (`rules`) moves to a small local pure-function helper inside `ui-react` (not a `core` export, since it has no state or interaction — it's a plain value → error-message mapping).

**New `components/pin-input/`**, a compound component. `PinInput.Root` receives one flat props object from its consumer — `useBehavior` (§3) does the structural/live split now, not `Root` itself — and passes the **entire** result, `{ behavior, liveProps }`, down through `createBehaviorContext`'s `Provider`, so no other part of the tree needs to know the split happened:

```tsx
const { Provider: PinInputProvider, useBehaviorContext: usePinInputContext } =
  createBehaviorContext<
    ReturnType<typeof pinInput>,
    Omit<PinInputRootComponentProps, keyof PinInputConfig>
  >();

function Root({
  length,
  type,
  disabled,
  invalid,
  onValueChange,
  onComplete,
  children,
}: PinInputRootComponentProps) {
  // `liveProps` comes back from useBehavior rather than being built here from the props
  // above, so Root never needs to know which fields count as "live" for PinInput —
  // that classification lives once in core's structuralKeys (§2/§3), not duplicated here.
  const { behavior, liveProps } = useBehavior(pinInput, {
    length,
    type,
    disabled,
    invalid,
    onValueChange,
    onComplete,
  });

  return (
    <PinInputProvider value={{ behavior, liveProps }}>
      {/* disabled/invalid live outside PinInputConfig on purpose (§2), so getRootProps has
          no other way to know their current value for its data-disabled/data-invalid attrs */}
      <div {...behavior.getRootProps(liveProps)}>{children}</div>
    </PinInputProvider>
  );
}

function Input({ index }: { index: number }) {
  const { behavior, liveProps } = usePinInputContext('PinInput.Input');
  return <input {...behavior.getInputProps({ index }, liveProps)} />;
}
```

Both `behavior` and `liveProps` go into the Provider's value — not redundant, even though `Root` also uses `liveProps` locally for its own `getRootProps()` call: `Input` is a _different_ component further down the tree, and only receives `{ index }` as its own prop. `disabled`/`invalid`/the callbacks are set once at the `Root` level for the whole group, so `Input` has no way to reach the current live values except through context.

- `PinInput.Root` — as above. Props: `length`, `type?`, `disabled?`, `invalid?`, `onValueChange?`, `onComplete?`, `children`.
- `PinInput.Control` — plain styled flex-row wrapper for the visible boxes (the "Control" part from the Ark UI/Zag.js-style reference anatomy). No context read needed — purely layout.
- `PinInput.Input` — one visible box, as above. Props: `index`. All visual states (empty/filled/focus/disabled/invalid/complete) are driven by the `data-*` attributes and native DOM state (`:focus`, `value !== ''`) from §2 — no JS-tracked booleans or separate `error` prop needed in `ui-react` itself.
- `PinInput.HiddenInput` — a visually-hidden native `<input>` mirroring the full joined value from context, for native form submission and browser autofill (per the reference anatomy's `HiddenInput` part).

Worth calling out honestly, and more bluntly than "if it ever matters": `liveProps` is rebuilt fresh on every render of `Root`, with no comparison against the previous render, and the `{ behavior, liveProps }` object handed to the Provider is _also_ a fresh object literal regardless. So this isn't a rare-case cost triggered by an unrelated prop identity change — it fires on every `Root` render, including every render `useSyncExternalStore` itself triggers (i.e. every keystroke, since typing changes `values`/`focusedIndex` in the store). Every `PinInput.Input` box re-renders on every keystroke, not just the one being typed into.

There isn't a clean fix within this design's constraints, and we're not forcing one in: splitting into two contexts doesn't help, since `Input` needs both `behavior` and `liveProps` together to call `getInputProps`, so it would still subscribe to (and re-render on) the `liveProps` context. Memoizing `liveProps` would need a dependency list keyed on its live fields — but `useBehavior` is generic and doesn't know those field names, so it can't write a literal deps array (the same "deps array must be a literal, not computed" constraint from the rejected live-ref approach below), and having `Root` write its own literal-deps memo on top would mean `Root` needs to know its own live field list after all — undoing the exact genericity §3 exists to provide. Given a realistic PinInput box count (4–8), re-rendering that many plain `<input>` elements per keystroke is cheap; this is accepted as a real but low-impact cost of the design, not something worth an escape hatch for.

Export shape: `Button`, `Input`, `Card`, `Badge` (unchanged public API, now plain components internally), plus a `PinInput` namespace object: `{ Root, Control, Input, HiddenInput }`.

## Rejected alternative: live-ref-based `useBehavior`

Zag.js's real React adapter (`packages/frameworks/react/src/machine.ts` in `chakra-ui/zag`) solves "keep a long-lived instance in sync with fresh props" via a `useLiveRef` primitive that writes `ref.current = value` unconditionally in the render body, then exposes a stable `prop(key)` accessor function that always reads the latest value. It's the real, production-proven mechanism this design is modeled on. We're not using it: that ref-write-during-render pattern is exactly what `eslint-plugin-react-hooks` v7's `refs` rule rejected when we tried something similar for `Button`'s `onClick` earlier this session ("Cannot update ref during render"). Adopting it here would mean a standing `eslint-disable`, even if scoped to one shared utility. The config/live-props split in §2–§4 gets the same outcome — a persistent instance that never goes stale — without needing any lint exception, at the cost of `core` having to classify each field as structural-vs-volatile by hand instead of getting that for free from a single generic accessor.

**Open question, not yet resolved:** the Button attempt this session wrote its ref during the render body itself. The idiomatic form of this pattern (including Zag's actual polyfills for it) more commonly writes inside `useLayoutEffect`/`useInsertionEffect` — at commit time, not render time — which the `refs` rule targets specifically because it's a render-time mutation; an effect-time write is the textbook-sanctioned "write in an effect, read in a handler" idiom and wouldn't trip it. If that holds up, a live-ref accessor might be available with zero lint exceptions after all, which would remove the reason for the structural/live split entirely (and the capability gap it currently has: `liveProps` only exists for the duration of a `getRootProps`/`getInputProps` call, so nothing internal to a behavior — a timer, an effect reacting to `disabled` flipping — can see a live value outside that call). Worth an actual spike against this repo's lint config before the next behavior that needs more than a prop-getter read runs into this gap; not resolving it here since it would mean redesigning §2–§4.

## Testing

- `core`: unit tests for `pinInput` covering each interaction rule above (auto-advance, backspace-to-previous on empty vs. non-empty, arrow-key nav, paste-split at various start indices and lengths, numeric filtering, `onComplete`/`onValueChange` firing) and the `data-*` attributes (disabled/invalid/complete/index) on both `getRootProps()` and `getInputProps()`.
- `frameworks/react`: unit test for `useBehavior` confirming it creates the behavior exactly once across re-renders and still re-renders the caller on store changes via `useSyncExternalStore`; unit test for `createBehaviorContext` confirming `useBehaviorContext` throws when called outside its `Provider`.
- `ui-react`: component tests for `PinInput` compound usage (typing advances focus, backspace navigates back, paste fills multiple boxes, disabled/invalid/complete states render correctly, and — the specific regression this design is built to avoid — typed values survive a parent re-render that only changes an unrelated prop) and updated/simplified tests for the now-plain Button/Input/Card/Badge.

## Open follow-ups (not blocking this design)

- Vue adapter (`frameworks/vue`) — deferred until there's a real second consumer.
- Masked display (e.g. showing `•` instead of the entered digit) — needs a display-value/real-value split that isn't designed here; add if a consumer actually needs it.
- Whether other future components (e.g. Tabs, a Select) belong in `core` at all, or are better classified the same way Button/Input were (native-behavior-sufficient) — decide per-component when they're actually proposed, using the same test: does it need JS to coordinate multiple DOM nodes, or does HTML already do the job?
