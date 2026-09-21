import { describe, it, expect } from 'vitest';
import { createButton } from './createButton';

describe('createButton', () => {
  it('starts with all state flags false', () => {
    const button = createButton();
    expect(button.getState()).toEqual({ pressed: false, hovered: false, focused: false });
  });

  it('sets pressed on pointer down when interactive', () => {
    const button = createButton();
    button.getButtonProps().onPointerDown();
    expect(button.getState().pressed).toBe(true);
  });

  it('does not set pressed on pointer down when disabled', () => {
    const button = createButton({ disabled: true });
    button.getButtonProps().onPointerDown();
    expect(button.getState().pressed).toBe(false);
  });

  it('does not set pressed on pointer down when loading', () => {
    const button = createButton({ loading: true });
    button.getButtonProps().onPointerDown();
    expect(button.getState().pressed).toBe(false);
  });

  it('clears pressed on pointer up', () => {
    const button = createButton();
    const props = button.getButtonProps();
    props.onPointerDown();
    props.onPointerUp();
    expect(button.getState().pressed).toBe(false);
  });

  it('sets hovered on pointer enter', () => {
    const button = createButton();
    button.getButtonProps().onPointerEnter();
    expect(button.getState().hovered).toBe(true);
  });

  it('clears both hovered and pressed on pointer leave', () => {
    const button = createButton();
    const props = button.getButtonProps();
    props.onPointerDown();
    props.onPointerEnter();
    props.onPointerLeave();
    expect(button.getState()).toEqual({ pressed: false, hovered: false, focused: false });
  });

  it('tracks focus and blur', () => {
    const button = createButton();
    const props = button.getButtonProps();
    props.onFocus();
    expect(button.getState().focused).toBe(true);
    props.onBlur();
    expect(button.getState().focused).toBe(false);
  });

  it('getButtonProps().disabled is true when disabled or loading, false otherwise', () => {
    expect(createButton().getButtonProps().disabled).toBe(false);
    expect(createButton({ disabled: true }).getButtonProps().disabled).toBe(true);
    expect(createButton({ loading: true }).getButtonProps().disabled).toBe(true);
  });

  it('sets aria-busy only when loading', () => {
    expect(createButton().getButtonProps()['aria-busy']).toBeUndefined();
    expect(createButton({ loading: true }).getButtonProps()['aria-busy']).toBe(true);
    expect(createButton({ disabled: true }).getButtonProps()['aria-busy']).toBeUndefined();
  });

  it('notifies subscribers on state change, and unsubscribe stops notifications', () => {
    const button = createButton();
    let calls = 0;
    const unsubscribe = button.subscribe(() => { calls += 1; });
    button.getButtonProps().onPointerDown();
    expect(calls).toBe(1);
    unsubscribe();
    button.getButtonProps().onPointerUp();
    expect(calls).toBe(1);
  });
});
