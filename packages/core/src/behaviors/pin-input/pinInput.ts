import { createStore } from '../../utilities/createStore';
import type {
  GetProp,
  PinInputProps,
  PinInputState,
  PinInputRootProps,
  PinInputBoxProps,
} from '../../types';

const isValidChar = (char: string, type: NonNullable<PinInputProps['type']>): boolean => {
  if (char.length !== 1) return false;
  return type === 'numeric' ? /^[0-9]$/.test(char) : /^[a-zA-Z0-9]$/.test(char);
};

const isComplete = (values: string[]): boolean =>
  values.length > 0 && values.every((value) => value !== '');

type PinInputLive = Pick<PinInputProps, 'disabled' | 'invalid' | 'type'>;

export function pinInput(initialProps: PinInputProps): {
  getState: () => PinInputState;
  subscribe: (listener: () => void) => () => void;
  setGetProp: (getProp: GetProp<PinInputProps>) => void;
  /**
   * Resizes the internal `values` array to match a new `length`. Separate
   * from `setGetProp` (which only ever needs to run once, on mount, since
   * the accessor it installs stays live on its own) — this needs to run
   * every time `length` actually changes, which `PinInput.Root` does via its
   * own effect. Not called automatically from `setGetProp`: the constructor
   * already sizes `values` correctly from `initialProps.length`.
   */
  setLength: (length: number) => void;
  // `live` is optional: real React usage (PinInput.Root/.Input) always
  // passes it, reading these fields directly from the current render's own
  // props rather than through `getProp` — getProp's ref-backed accessor is
  // only updated in a post-commit effect, so a value read through it
  // *synchronously during render* (exactly what calling getRootProps() in
  // JSX does) is one render behind whenever a caller's own re-render is what
  // changed these fields. core's own tests, which call these directly with
  // no React/render timing involved at all, can omit `live` and fall back to
  // getProp safely, since there's no staleness to have in a plain JS call.
  getRootProps: (live?: Pick<PinInputLive, 'disabled' | 'invalid'>) => PinInputRootProps;
  getInputProps: (part: { index: number }, live?: PinInputLive) => PinInputBoxProps;
} {
  // Seeded from the render that creates this behavior — a real consumer
  // (PinInput.Root) calls getRootProps() synchronously in that same render,
  // before setGetProp's effect has run, so this must already be correct
  // rather than a throwing stub. setGetProp later upgrades it to the
  // live-ref-backed accessor for every render after. See the design spec's
  // "Live-ref mechanism: verified" section.
  let getProp: GetProp<PinInputProps> = (key) => initialProps[key];

  const store = createStore<PinInputState>({
    values: Array.from({ length: initialProps.length }, () => ''),
    focusedIndex: null,
    complete: false,
  });

  const currentType = (): NonNullable<PinInputProps['type']> => getProp('type') ?? 'numeric';

  // Applies a new `values` array, recomputing `complete` once here (inside the
  // store mutation) rather than inside getRootProps()/getInputProps() — see
  // PinInputState's doc comment. Fires onValueChange on every change, and
  // onComplete only on the transition into a fully-filled state.
  const commitValues = (nextValues: string[]): void => {
    const wasComplete = store.getState().complete;
    const nextComplete = isComplete(nextValues);
    store.setState({ values: nextValues, complete: nextComplete });
    getProp('onValueChange')?.(nextValues.join(''));
    if (!wasComplete && nextComplete) {
      getProp('onComplete')?.(nextValues.join(''));
    }
  };

  const moveFocus = (index: number): void => {
    store.setState({ focusedIndex: index });
  };

  // Shared by handleChange's multi-char branch and handlePaste: fills boxes
  // from `startIndex` with `chars`, truncating at the last box, and moves
  // focus to the first empty box after the filled range (or the last box).
  const distributeChars = (startIndex: number, chars: string[]): void => {
    const values = [...store.getState().values];
    const length = values.length;
    let lastFilledIndex = startIndex - 1;
    for (let offset = 0; offset < chars.length && startIndex + offset < length; offset += 1) {
      values[startIndex + offset] = chars[offset];
      lastFilledIndex = startIndex + offset;
    }
    commitValues(values);
    const nextEmptyIndex = values.findIndex((value, i) => i > lastFilledIndex && value === '');
    moveFocus(nextEmptyIndex !== -1 ? nextEmptyIndex : Math.min(lastFilledIndex, length - 1));
  };

  const handleChange = (index: number, rawValue: string): void => {
    if (getProp('disabled')) return;
    const values = store.getState().values;
    if (rawValue === '') {
      if (values[index] === '') return;
      const next = [...values];
      next[index] = '';
      commitValues(next);
      return;
    }
    const type = currentType();
    // A browser/OS autofill (e.g. an SMS one-time code) can deliver the
    // whole code in a single change event, not one character at a time the
    // way typing does — distribute it across boxes like a paste, instead of
    // silently keeping only the last character. Distinguished from "typed a
    // second character over an already-filled box without clearing it
    // first" (a native single-char box then reports old+new as a 2-char
    // value) by checking whether the first character matches what was
    // already there: if so, it's a manual overwrite, not an autofill.
    const isManualOverwrite = rawValue.length === 2 && rawValue[0] === values[index];
    if (rawValue.length > 1 && !isManualOverwrite) {
      const chars = rawValue.split('').filter((char) => isValidChar(char, type));
      if (chars.length === 0) return;
      distributeChars(index, chars);
      return;
    }
    const char = rawValue.slice(-1);
    if (!isValidChar(char, type)) return;
    const next = [...values];
    next[index] = char;
    commitValues(next);
    const length = getProp('length');
    if (index + 1 < length) {
      moveFocus(index + 1);
    }
  };

  const handleBackspace = (index: number): void => {
    if (getProp('disabled')) return;
    const values = store.getState().values;
    if (values[index] !== '') {
      const next = [...values];
      next[index] = '';
      commitValues(next);
      return;
    }
    if (index > 0) {
      if (values[index - 1] !== '') {
        const next = [...values];
        next[index - 1] = '';
        commitValues(next);
      }
      moveFocus(index - 1);
    }
  };

  const handleArrow = (index: number, key: 'ArrowLeft' | 'ArrowRight'): void => {
    if (getProp('disabled')) return;
    const length = getProp('length');
    const next = index + (key === 'ArrowLeft' ? -1 : 1);
    if (next >= 0 && next < length) {
      moveFocus(next);
    }
  };

  const handleKeyDown = (index: number, event: { key: string; target: unknown }): void => {
    switch (event.key) {
      case 'Backspace':
        handleBackspace(index);
        break;
      case 'ArrowLeft':
      case 'ArrowRight':
        handleArrow(index, event.key);
        break;
      default:
        break;
    }
  };

  const handlePaste = (
    index: number,
    event: { clipboardData: { getData: (format: string) => string } }
  ): void => {
    if (getProp('disabled')) return;
    const raw = event.clipboardData.getData('text');
    const type = currentType();
    const chars = raw.split('').filter((char) => isValidChar(char, type));
    if (chars.length === 0) return;
    distributeChars(index, chars);
  };

  const resizeTo = (length: number): void => {
    const current = store.getState().values;
    if (current.length !== length) {
      const next = Array.from({ length }, (_, i) => current[i] ?? '');
      store.setState({ values: next, complete: isComplete(next) });
    }
  };

  return {
    getState: store.getState,
    subscribe: store.subscribe,
    setGetProp: (nextGetProp) => {
      getProp = nextGetProp;
    },
    setLength: resizeTo,
    getRootProps: (live): PinInputRootProps => {
      const disabled = live?.disabled ?? getProp('disabled');
      const invalid = live?.invalid ?? getProp('invalid');
      return {
        role: 'group',
        'data-scope': 'pin-input',
        'data-part': 'root',
        'data-disabled': disabled ? true : undefined,
        'data-invalid': invalid ? true : undefined,
        'data-complete': store.getState().complete ? true : undefined,
      };
    },
    getInputProps: ({ index }, live): PinInputBoxProps => {
      const state = store.getState();
      const disabled = live?.disabled ?? getProp('disabled');
      const invalid = live?.invalid ?? getProp('invalid');
      const type = live?.type ?? getProp('type') ?? 'numeric';
      return {
        type: 'text',
        inputMode: type === 'numeric' ? 'numeric' : 'text',
        value: state.values[index] ?? '',
        disabled: disabled ? true : undefined,
        'data-scope': 'pin-input',
        'data-part': 'input',
        'data-index': index,
        'data-disabled': disabled ? true : undefined,
        'data-invalid': invalid ? true : undefined,
        'data-complete': state.complete ? true : undefined,
        onChange: (event) => handleChange(index, event.target.value),
        onKeyDown: (event) => handleKeyDown(index, event),
        onPaste: (event) => handlePaste(index, event),
        onFocus: () => moveFocus(index),
        onBlur: () => {
          if (store.getState().focusedIndex === index) {
            store.setState({ focusedIndex: null });
          }
        },
      };
    },
  };
}
