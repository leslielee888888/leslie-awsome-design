import type { ButtonConfig, ButtonState, ButtonProps } from '../../types';
import { createStore } from '../../utilities/createStore';

export function createButton(config: ButtonConfig = {}) {
  const store = createStore<ButtonState>({ pressed: false, hovered: false, focused: false });

  const isInteractive = () => !config.disabled && !config.loading;

  return {
    getState: store.getState,
    subscribe: store.subscribe,
    getButtonProps: (): ButtonProps => ({
      disabled: !isInteractive(),
      'aria-busy': config.loading || undefined,
      onPointerDown: () => {
        if (isInteractive()) store.setState({ pressed: true });
      },
      onPointerUp: () => store.setState({ pressed: false }),
      onPointerEnter: () => store.setState({ hovered: true }),
      onPointerLeave: () => store.setState({ hovered: false, pressed: false }),
      onFocus: () => store.setState({ focused: true }),
      onBlur: () => store.setState({ focused: false }),
    }),
  };
}
