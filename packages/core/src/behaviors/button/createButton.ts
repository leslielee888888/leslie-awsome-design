import type { ButtonConfig, ButtonState, ButtonProps } from '../../types';

export function createButton(config: ButtonConfig = {}) {
  let state: ButtonState = { pressed: false, hovered: false, focused: false };
  const listeners = new Set<() => void>();

  const notify = () => listeners.forEach((fn) => fn());
  const setState = (patch: Partial<ButtonState>) => {
    state = { ...state, ...patch };
    notify();
  };

  const isInteractive = () => !config.disabled && !config.loading;

  return {
    getState: (): Readonly<ButtonState> => state,
    subscribe: (fn: () => void): (() => void) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    getButtonProps: (): ButtonProps => ({
      disabled: !isInteractive(),
      'aria-busy': config.loading || undefined,
      onPointerDown: () => {
        if (isInteractive()) setState({ pressed: true });
      },
      onPointerUp: () => setState({ pressed: false }),
      onPointerEnter: () => setState({ hovered: true }),
      onPointerLeave: () => setState({ hovered: false, pressed: false }),
      onFocus: () => setState({ focused: true }),
      onBlur: () => setState({ focused: false }),
    }),
  };
}
