import { Root } from './PinInputRoot';
import { Control } from './PinInputControl';
import { Input } from './PinInputInput';
import { HiddenInput } from './PinInputHiddenInput';

// Each part's own function is named plainly (Root, Control, ...) since that's
// all it knows about itself -- this is the one place that knows they're
// assembled into PinInput, so the fully-qualified name is set here.
// React DevTools, error messages, and Storybook's dynamically-reconstructed
// source view all read this instead of falling back to the bare function
// name (which would show `<Root>` -- not valid code, since a consumer only
// ever has `PinInput` in scope, not `Root` on its own). Plain function
// declarations aren't typed with `displayName` (that's a React.FC-specific
// property), hence the cast -- it's still a real, respected property at
// runtime for any function component.
function setDisplayName(component: (...args: never[]) => unknown, name: string): void {
  (component as { displayName?: string }).displayName = name;
}
setDisplayName(Root, 'PinInput.Root');
setDisplayName(Control, 'PinInput.Control');
setDisplayName(Input, 'PinInput.Input');
setDisplayName(HiddenInput, 'PinInput.HiddenInput');

export const PinInput = { Root, Control, Input, HiddenInput };

export type { PinInputRootProps } from './PinInputRoot';
export type { PinInputControlProps } from './PinInputControl';
export type { PinInputInputProps } from './PinInputInput';
export type { PinInputHiddenInputProps } from './PinInputHiddenInput';
