import { describe, it, expect } from 'vitest';
import { createButtonBehavior } from './createButtonBehavior';

describe('createButtonBehavior', () => {
  it('starts with all state flags false', () => {
    const button = createButtonBehavior();
    expect(button.getState()).toEqual({ pressed: false, hovered: false, focused: false });
  });

  it('sets pressed on pointer down when interactive', () => {
    const button = createButtonBehavior();
    button.getButtonProps().onPointerDown();
    expect(button.getState().pressed).toBe(true);
  });

  it('does not set pressed on pointer down when disabled', () => {
    const button = createButtonBehavior({ disabled: true });
    button.getButtonProps().onPointerDown();
    expect(button.getState().pressed).toBe(false);
  });

  it('does not set pressed on pointer down when loading', () => {
    const button = createButtonBehavior({ loading: true });
    button.getButtonProps().onPointerDown();
    expect(button.getState().pressed).toBe(false);
  });

  it('clears pressed on pointer up', () => {
    const button = createButtonBehavior();
    const props = button.getButtonProps();
    props.onPointerDown();
    props.onPointerUp();
    expect(button.getState().pressed).toBe(false);
  });

  it('sets hovered on pointer enter', () => {
    const button = createButtonBehavior();
    button.getButtonProps().onPointerEnter();
    expect(button.getState().hovered).toBe(true);
  });

  it('clears both hovered and pressed on pointer leave', () => {
    const button = createButtonBehavior();
    const props = button.getButtonProps();
    props.onPointerDown();
    props.onPointerEnter();
    props.onPointerLeave();
    expect(button.getState()).toEqual({ pressed: false, hovered: false, focused: false });
  });

  it('tracks focus and blur', () => {
    const button = createButtonBehavior();
    const props = button.getButtonProps();
    props.onFocus();
    expect(button.getState().focused).toBe(true);
    props.onBlur();
    expect(button.getState().focused).toBe(false);
  });

  it('getButtonProps().disabled is true when disabled or loading, false otherwise', () => {
    expect(createButtonBehavior().getButtonProps().disabled).toBe(false);
    expect(createButtonBehavior({ disabled: true }).getButtonProps().disabled).toBe(true);
    expect(createButtonBehavior({ loading: true }).getButtonProps().disabled).toBe(true);
  });

  it('sets aria-busy only when loading', () => {
    expect(createButtonBehavior().getButtonProps()['aria-busy']).toBeUndefined();
    expect(createButtonBehavior({ loading: true }).getButtonProps()['aria-busy']).toBe(true);
    expect(createButtonBehavior({ disabled: true }).getButtonProps()['aria-busy']).toBeUndefined();
  });

  it('notifies subscribers on state change, and unsubscribe stops notifications', () => {
    const button = createButtonBehavior();
    let calls = 0;
    const unsubscribe = button.subscribe(() => { calls += 1; });
    button.getButtonProps().onPointerDown();
    expect(calls).toBe(1);
    unsubscribe();
    button.getButtonProps().onPointerUp();
    expect(calls).toBe(1);
  });
});
