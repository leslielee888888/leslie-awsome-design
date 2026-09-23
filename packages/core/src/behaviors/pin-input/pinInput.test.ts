import { describe, it, expect, vi } from 'vitest';
import { pinInput } from './pinInput';
import type { GetProp, PinInputProps } from '../../types';

/**
 * Builds a plain getProp closure over a mutable test object, the way a
 * framework binding (e.g. frameworks/react's useBehavior) would — but without
 * any framework involved. Call `setGetProp(getProp)` before exercising the
 * behavior, per the spec's Testing section.
 */
function createGetProp(props: PinInputProps): {
  getProp: GetProp<PinInputProps>;
  props: PinInputProps;
} {
  const state = { ...props };
  const getProp: GetProp<PinInputProps> = (key) => state[key];
  return { getProp, props: state };
}

function setup(props: PinInputProps) {
  const behavior = pinInput();
  const { getProp } = createGetProp(props);
  behavior.setGetProp(getProp);
  return behavior;
}

const keydown = (key: string): { key: string; target: unknown } => ({ key, target: null });
const paste = (text: string) => ({ clipboardData: { getData: () => text } });

describe('pinInput', () => {
  describe('initialization', () => {
    it('starts with an empty value per box, no focus, and not complete', () => {
      const behavior = setup({ length: 4 });
      expect(behavior.getState()).toEqual({
        values: ['', '', '', ''],
        focusedIndex: null,
        complete: false,
      });
    });

    it('throws if a prop-getter is called before setGetProp', () => {
      const behavior = pinInput();
      expect(() => behavior.getRootProps()).toThrow();
    });
  });

  describe('auto-advance', () => {
    it('moves focus to the next box after a valid entry', () => {
      const behavior = setup({ length: 4 });
      behavior.getInputProps({ index: 0 }).onChange({ target: { value: '1' } });
      expect(behavior.getState().values[0]).toBe('1');
      expect(behavior.getState().focusedIndex).toBe(1);
    });

    it('is a no-op past the last box', () => {
      const behavior = setup({ length: 2 });
      behavior.getInputProps({ index: 1 }).onChange({ target: { value: '9' } });
      expect(behavior.getState().values[1]).toBe('9');
      expect(behavior.getState().focusedIndex).toBeNull();
    });
  });

  describe('backspace-to-previous', () => {
    it('just clears the current box when it is non-empty', () => {
      const behavior = setup({ length: 3 });
      // Last box, so entering a value doesn't auto-advance focus away from it.
      behavior.getInputProps({ index: 2 }).onChange({ target: { value: '5' } });
      behavior.getInputProps({ index: 2 }).onKeyDown(keydown('Backspace'));
      expect(behavior.getState().values[2]).toBe('');
      expect(behavior.getState().focusedIndex).toBeNull(); // no navigation happened
    });

    it('moves focus to the previous box and clears it, when the current box is already empty', () => {
      const behavior = setup({ length: 3 });
      behavior.getInputProps({ index: 0 }).onChange({ target: { value: '1' } });
      behavior.getInputProps({ index: 1 }).onKeyDown(keydown('Backspace'));
      expect(behavior.getState().values[0]).toBe('');
      expect(behavior.getState().focusedIndex).toBe(0);
    });

    it('is a no-op on an empty first box', () => {
      const behavior = setup({ length: 3 });
      behavior.getInputProps({ index: 0 }).onKeyDown(keydown('Backspace'));
      expect(behavior.getState().values).toEqual(['', '', '']);
      expect(behavior.getState().focusedIndex).toBeNull();
    });
  });

  describe('arrow-key navigation', () => {
    it('ArrowRight moves focus without changing values', () => {
      const behavior = setup({ length: 3 });
      behavior.getInputProps({ index: 0 }).onChange({ target: { value: '1' } });
      behavior.getInputProps({ index: 1 }).onKeyDown(keydown('ArrowRight'));
      expect(behavior.getState().focusedIndex).toBe(2);
      expect(behavior.getState().values).toEqual(['1', '', '']);
    });

    it('ArrowLeft moves focus without changing values', () => {
      const behavior = setup({ length: 3 });
      behavior.getInputProps({ index: 1 }).onKeyDown(keydown('ArrowLeft'));
      expect(behavior.getState().focusedIndex).toBe(0);
    });

    it('does not move past either edge', () => {
      const behavior = setup({ length: 3 });
      behavior.getInputProps({ index: 0 }).onKeyDown(keydown('ArrowLeft'));
      expect(behavior.getState().focusedIndex).toBeNull();
      behavior.getInputProps({ index: 2 }).onKeyDown(keydown('ArrowRight'));
      expect(behavior.getState().focusedIndex).toBeNull();
    });
  });

  describe('paste-splitting', () => {
    it('splits a multi-character paste across boxes starting at the focused index', () => {
      const behavior = setup({ length: 5 });
      behavior.getInputProps({ index: 0 }).onPaste(paste('123'));
      expect(behavior.getState().values).toEqual(['1', '2', '3', '', '']);
    });

    it('starts the split at a non-zero focused index', () => {
      const behavior = setup({ length: 5 });
      behavior.getInputProps({ index: 2 }).onPaste(paste('12'));
      expect(behavior.getState().values).toEqual(['', '', '1', '2', '']);
    });

    it('moves focus to the first empty box after the pasted range', () => {
      const behavior = setup({ length: 5 });
      behavior.getInputProps({ index: 0 }).onPaste(paste('12'));
      expect(behavior.getState().focusedIndex).toBe(2);
    });

    it('moves focus to the last box when the paste fills to the end', () => {
      const behavior = setup({ length: 3 });
      behavior.getInputProps({ index: 0 }).onPaste(paste('123'));
      expect(behavior.getState().focusedIndex).toBe(2);
    });

    it('truncates a paste longer than the remaining boxes', () => {
      const behavior = setup({ length: 3 });
      behavior.getInputProps({ index: 1 }).onPaste(paste('789'));
      expect(behavior.getState().values).toEqual(['', '7', '8']);
      expect(behavior.getState().focusedIndex).toBe(2);
    });

    it('filters non-digit characters out of a numeric paste', () => {
      const behavior = setup({ length: 5, type: 'numeric' });
      behavior.getInputProps({ index: 0 }).onPaste(paste('1a2b3'));
      expect(behavior.getState().values).toEqual(['1', '2', '3', '', '']);
    });

    it('is a no-op when the paste contains no valid characters', () => {
      const behavior = setup({ length: 3, type: 'numeric' });
      behavior.getInputProps({ index: 0 }).onPaste(paste('abc'));
      expect(behavior.getState().values).toEqual(['', '', '']);
      expect(behavior.getState().focusedIndex).toBeNull();
    });
  });

  describe('numeric filtering', () => {
    it('rejects non-digit characters before they reach state', () => {
      const behavior = setup({ length: 3, type: 'numeric' });
      behavior.getInputProps({ index: 0 }).onChange({ target: { value: 'a' } });
      expect(behavior.getState().values[0]).toBe('');
      expect(behavior.getState().focusedIndex).toBeNull();
    });

    it('accepts digits', () => {
      const behavior = setup({ length: 3, type: 'numeric' });
      behavior.getInputProps({ index: 0 }).onChange({ target: { value: '7' } });
      expect(behavior.getState().values[0]).toBe('7');
    });

    it('defaults to numeric when type is not given', () => {
      const behavior = setup({ length: 3 });
      behavior.getInputProps({ index: 0 }).onChange({ target: { value: 'x' } });
      expect(behavior.getState().values[0]).toBe('');
    });

    it('accepts letters when type is alphanumeric', () => {
      const behavior = setup({ length: 3, type: 'alphanumeric' });
      behavior.getInputProps({ index: 0 }).onChange({ target: { value: 'x' } });
      expect(behavior.getState().values[0]).toBe('x');
    });
  });

  describe('onValueChange / onComplete', () => {
    it('calls onValueChange with the boxes joined into one string, on every change', () => {
      const onValueChange = vi.fn();
      const behavior = setup({ length: 3, onValueChange });
      behavior.getInputProps({ index: 0 }).onChange({ target: { value: '1' } });
      expect(onValueChange).toHaveBeenCalledWith('1');
      behavior.getInputProps({ index: 1 }).onChange({ target: { value: '2' } });
      expect(onValueChange).toHaveBeenCalledWith('12');
    });

    it('calls onComplete the first time every box is filled, and not again while it stays complete', () => {
      const onComplete = vi.fn();
      const behavior = setup({ length: 2, onComplete });
      behavior.getInputProps({ index: 0 }).onChange({ target: { value: '1' } });
      expect(onComplete).not.toHaveBeenCalled();
      behavior.getInputProps({ index: 1 }).onChange({ target: { value: '2' } });
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith('12');

      // Re-typing over an already-filled box keeps it complete — should not refire.
      behavior.getInputProps({ index: 1 }).onChange({ target: { value: '3' } });
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('calls onComplete again after completeness is lost and regained', () => {
      const onComplete = vi.fn();
      const behavior = setup({ length: 2, onComplete });
      behavior.getInputProps({ index: 0 }).onChange({ target: { value: '1' } });
      behavior.getInputProps({ index: 1 }).onChange({ target: { value: '2' } });
      expect(onComplete).toHaveBeenCalledTimes(1);

      behavior.getInputProps({ index: 1 }).onKeyDown(keydown('Backspace'));
      behavior.getInputProps({ index: 1 }).onChange({ target: { value: '2' } });
      expect(onComplete).toHaveBeenCalledTimes(2);
    });
  });

  describe('complete state', () => {
    it('is cached on state and reflected via data-complete on root and box props', () => {
      const behavior = setup({ length: 2 });
      behavior.getInputProps({ index: 0 }).onChange({ target: { value: '1' } });
      expect(behavior.getState().complete).toBe(false);
      expect(behavior.getRootProps()['data-complete']).toBeUndefined();

      behavior.getInputProps({ index: 1 }).onChange({ target: { value: '2' } });
      expect(behavior.getState().complete).toBe(true);
      expect(behavior.getRootProps()['data-complete']).toBe(true);
      expect(behavior.getInputProps({ index: 0 })['data-complete']).toBe(true);
    });
  });

  describe('disabled', () => {
    it('ignores onChange, onKeyDown, and onPaste while disabled', () => {
      const behavior = setup({ length: 3, disabled: true });
      const props = behavior.getInputProps({ index: 0 });
      props.onChange({ target: { value: '1' } });
      props.onKeyDown(keydown('Backspace'));
      props.onPaste(paste('12'));
      expect(behavior.getState().values).toEqual(['', '', '']);
    });
  });

  describe('data-* attributes', () => {
    it('getRootProps has the pin-input root scope/part and no state flags by default', () => {
      const behavior = setup({ length: 3 });
      expect(behavior.getRootProps()).toEqual({
        role: 'group',
        'data-scope': 'pin-input',
        'data-part': 'root',
        'data-disabled': undefined,
        'data-invalid': undefined,
        'data-complete': undefined,
      });
    });

    it('getRootProps reflects disabled and invalid', () => {
      const behavior = setup({ length: 3, disabled: true, invalid: true });
      const rootProps = behavior.getRootProps();
      expect(rootProps['data-disabled']).toBe(true);
      expect(rootProps['data-invalid']).toBe(true);
    });

    it('getInputProps has the pin-input input scope/part and its index', () => {
      const behavior = setup({ length: 3 });
      const boxProps = behavior.getInputProps({ index: 2 });
      expect(boxProps['data-scope']).toBe('pin-input');
      expect(boxProps['data-part']).toBe('input');
      expect(boxProps['data-index']).toBe(2);
    });

    it('getInputProps reflects disabled and invalid', () => {
      const behavior = setup({ length: 3, disabled: true, invalid: true });
      const boxProps = behavior.getInputProps({ index: 0 });
      expect(boxProps['data-disabled']).toBe(true);
      expect(boxProps['data-invalid']).toBe(true);
    });

    it('never includes a data-value attribute', () => {
      const behavior = setup({ length: 3 });
      behavior.getInputProps({ index: 0 }).onChange({ target: { value: '1' } });
      expect(behavior.getInputProps({ index: 0 })).not.toHaveProperty('data-value');
    });
  });

  describe('subscribe', () => {
    it('notifies subscribers on state change, and unsubscribe stops notifications', () => {
      // Single box: entering a value never triggers the extra notify from auto-advance.
      const behavior = setup({ length: 1 });
      let calls = 0;
      const unsubscribe = behavior.subscribe(() => {
        calls += 1;
      });
      behavior.getInputProps({ index: 0 }).onChange({ target: { value: '1' } });
      expect(calls).toBe(1);
      unsubscribe();
      behavior.getInputProps({ index: 0 }).onKeyDown(keydown('Backspace'));
      expect(calls).toBe(1);
    });
  });
});
