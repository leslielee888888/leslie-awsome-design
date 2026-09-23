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

export function pinInput(): {
  getState: () => PinInputState;
  subscribe: (listener: () => void) => () => void;
  setGetProp: (getProp: GetProp<PinInputProps>) => void;
  getRootProps: () => PinInputRootProps;
  getInputProps: (part: { index: number }) => PinInputBoxProps;
} {
  // Nothing to configure at creation — set exactly once via setGetProp, before
  // getRootProps()/getInputProps() are ever called. See spec's "Live-ref
  // mechanism: verified" section for why the factory itself takes no arguments.
  let getProp: GetProp<PinInputProps> = () => {
    throw new Error('pinInput: setGetProp must be called before use');
  };

  const store = createStore<PinInputState>({ values: [], focusedIndex: null, complete: false });

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

  const handleChange = (index: number, rawValue: string): void => {
    if (getProp('disabled')) return;
    // A native single-char box reports its whole new value; take the last
    // character so retyping over an already-filled box still works.
    const char = rawValue.slice(-1);
    const values = store.getState().values;
    if (char === '') {
      if (values[index] === '') return;
      const next = [...values];
      next[index] = '';
      commitValues(next);
      return;
    }
    if (!isValidChar(char, currentType())) return;
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
      const next = [...values];
      next[index - 1] = '';
      commitValues(next);
      moveFocus(index - 1);
    }
  };

  const handleArrow = (index: number, key: 'ArrowLeft' | 'ArrowRight'): void => {
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

    const values = [...store.getState().values];
    const length = values.length;
    let lastFilledIndex = index - 1;
    for (let offset = 0; offset < chars.length && index + offset < length; offset += 1) {
      values[index + offset] = chars[offset];
      lastFilledIndex = index + offset;
    }
    commitValues(values);

    const nextEmptyIndex = values.findIndex((value, i) => i > lastFilledIndex && value === '');
    moveFocus(nextEmptyIndex !== -1 ? nextEmptyIndex : Math.min(lastFilledIndex, length - 1));
  };

  return {
    getState: store.getState,
    subscribe: store.subscribe,
    setGetProp: (nextGetProp) => {
      getProp = nextGetProp;
      const length = nextGetProp('length');
      const current = store.getState().values;
      if (current.length !== length) {
        const next = Array.from({ length }, (_, i) => current[i] ?? '');
        store.setState({ values: next, complete: isComplete(next) });
      }
    },
    getRootProps: (): PinInputRootProps => ({
      role: 'group',
      'data-scope': 'pin-input',
      'data-part': 'root',
      'data-disabled': getProp('disabled') ? true : undefined,
      'data-invalid': getProp('invalid') ? true : undefined,
      'data-complete': store.getState().complete ? true : undefined,
    }),
    getInputProps: ({ index }): PinInputBoxProps => {
      const state = store.getState();
      const type = currentType();
      return {
        type: 'text',
        inputMode: type === 'numeric' ? 'numeric' : 'text',
        value: state.values[index] ?? '',
        'data-scope': 'pin-input',
        'data-part': 'input',
        'data-index': index,
        'data-disabled': getProp('disabled') ? true : undefined,
        'data-invalid': getProp('invalid') ? true : undefined,
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
