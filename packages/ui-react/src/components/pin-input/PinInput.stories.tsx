import { useState } from 'react';
import { fireEvent } from '@testing-library/react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { PinInput } from '.';
import { Button } from '../button/Button';

const meta: Meta<typeof PinInput.Root> = {
  title: 'Components/PinInput',
  component: PinInput.Root,
  args: { length: 4 },
  argTypes: {
    // Changing this control wouldn't resize the demos below (each one writes
    // out a fixed number of literal <PinInput.Input> elements, matching how
    // a real consumer uses it — see "Why no loop?" in the design spec's
    // usage guidance), so it's not exposed as an interactive control.
    length: { control: false },
  },
};
export default meta;

type Story = StoryObj<typeof PinInput.Root>;

// Empty (Figma "Empty" variant): no boxes filled yet.
export const Empty: Story = {
  render: (args) => (
    <PinInput.Root {...args}>
      <PinInput.Control>
        <PinInput.Input index={0} />
        <PinInput.Input index={1} />
        <PinInput.Input index={2} />
        <PinInput.Input index={3} />
      </PinInput.Control>
    </PinInput.Root>
  ),
};

// Filled (Figma "Filled" variant): PinInput has no `defaultValue` -- it's
// uncontrolled, driven entirely by user interaction -- so this story types
// into the first box via `fireEvent` (the same event `PinInput.Input`'s
// `onChange` listens for) to show a partially filled state on load.
export const PartiallyFilled: Story = {
  render: (args) => (
    <PinInput.Root {...args}>
      <PinInput.Control>
        <PinInput.Input index={0} />
        <PinInput.Input index={1} />
        <PinInput.Input index={2} />
        <PinInput.Input index={3} />
      </PinInput.Control>
    </PinInput.Root>
  ),
  play: ({ canvasElement }) => {
    const [firstBox] = canvasElement.querySelectorAll<HTMLInputElement>('input[data-part="input"]');
    if (firstBox) fireEvent.change(firstBox, { target: { value: '4' } });
  },
};

// Focus (Figma "Focus" variant): first box focused on mount.
export const Focused: Story = {
  render: (args) => (
    <PinInput.Root {...args}>
      <PinInput.Control>
        <PinInput.Input index={0} />
        <PinInput.Input index={1} />
        <PinInput.Input index={2} />
        <PinInput.Input index={3} />
      </PinInput.Control>
    </PinInput.Root>
  ),
  play: ({ canvasElement }) => {
    canvasElement.querySelector<HTMLInputElement>('input[data-part="input"]')?.focus();
  },
};

// Error (Figma "Error" variant): `invalid` is consumer-supplied -- core has
// no concept of "invalid" itself (e.g. the parent verified the code and it
// didn't match).
export const ErrorState: Story = {
  args: { invalid: true },
  render: (args) => (
    <PinInput.Root {...args}>
      <PinInput.Control>
        <PinInput.Input index={0} />
        <PinInput.Input index={1} />
        <PinInput.Input index={2} />
        <PinInput.Input index={3} />
      </PinInput.Control>
    </PinInput.Root>
  ),
};

// Disabled (Figma "Disabled" variant).
export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => (
    <PinInput.Root {...args}>
      <PinInput.Control>
        <PinInput.Input index={0} />
        <PinInput.Input index={1} />
        <PinInput.Input index={2} />
        <PinInput.Input index={3} />
      </PinInput.Control>
    </PinInput.Root>
  ),
};

// Complete: every box filled, `data-complete` styling on. Not one of the 5
// Figma states but useful to see the completion affordance the interaction
// design mentions.
export const Complete: Story = {
  render: (args) => (
    <PinInput.Root {...args}>
      <PinInput.Control>
        <PinInput.Input index={0} />
        <PinInput.Input index={1} />
        <PinInput.Input index={2} />
        <PinInput.Input index={3} />
      </PinInput.Control>
    </PinInput.Root>
  ),
  play: ({ canvasElement }) => {
    const boxes = canvasElement.querySelectorAll<HTMLInputElement>('input[data-part="input"]');
    boxes.forEach((box, index) => {
      fireEvent.change(box, { target: { value: String((index + 1) % 10) } });
    });
  },
};

// Alphanumeric variant + the hidden input used for native form submission.
export const AlphanumericWithHiddenInput: Story = {
  args: { type: 'alphanumeric' },
  render: (args) => (
    <PinInput.Root {...args}>
      <PinInput.Control>
        <PinInput.Input index={0} />
        <PinInput.Input index={1} />
        <PinInput.Input index={2} />
        <PinInput.Input index={3} />
      </PinInput.Control>
      <PinInput.HiddenInput name="otp" />
    </PinInput.Root>
  ),
};

// A complete, realistic usage example: a 6-digit code verification form.
// Not one of the Figma states -- this is the "how would I actually use this"
// story, showing the full composition (state, onComplete, a submit button)
// a real consumer would write, with no story-only helpers involved. The
// "correct" code is hardcoded to 123456 purely so this demo is self-contained
// and runnable -- a real app would call its own verification endpoint here.
function VerificationFormExample() {
  const [invalid, setInvalid] = useState(false);
  const [code, setCode] = useState('');

  const handleComplete = (value: string) => {
    setInvalid(value !== '123456');
  };

  return (
    <form onSubmit={(event) => event.preventDefault()}>
      <PinInput.Root
        length={6}
        invalid={invalid}
        onValueChange={(value) => {
          setCode(value);
          setInvalid(false); // clear the error as soon as they start correcting it
        }}
        onComplete={handleComplete}
      >
        <PinInput.Control>
          <PinInput.Input index={0} />
          <PinInput.Input index={1} />
          <PinInput.Input index={2} />
          <PinInput.Input index={3} />
          <PinInput.Input index={4} />
          <PinInput.Input index={5} />
        </PinInput.Control>
        <PinInput.HiddenInput name="otp" />
      </PinInput.Root>

      {invalid && <p role="alert">That code didn't match. Try again.</p>}
      <Button disabled={code.length < 6} onClick={() => handleComplete(code)}>
        Verify
      </Button>
    </form>
  );
}

export const UsageExample: Story = {
  render: () => <VerificationFormExample />,
  parameters: {
    // Storybook's autodocs code panel would otherwise print the args-driven
    // <PinInput.Root {...args}> form used above; this story ignores args
    // entirely (it's self-contained), so show its actual source instead.
    docs: { source: { type: 'code' } },
  },
};
