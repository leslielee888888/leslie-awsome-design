import { fireEvent } from '@testing-library/react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { PinInput } from '.';

function Boxes({ length }: { length: number }) {
  return (
    <PinInput.Control>
      {Array.from({ length }, (_, index) => (
        <PinInput.Input key={index} index={index} />
      ))}
    </PinInput.Control>
  );
}

const meta: Meta<typeof PinInput.Root> = {
  title: 'Components/PinInput',
  component: PinInput.Root,
  args: { length: 4 },
};
export default meta;

type Story = StoryObj<typeof PinInput.Root>;

// Empty (Figma "Empty" variant): no boxes filled yet.
export const Empty: Story = {
  render: (args) => (
    <PinInput.Root {...args}>
      <Boxes length={args.length} />
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
      <Boxes length={args.length} />
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
      <Boxes length={args.length} />
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
      <Boxes length={args.length} />
    </PinInput.Root>
  ),
};

// Disabled (Figma "Disabled" variant).
export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => (
    <PinInput.Root {...args}>
      <Boxes length={args.length} />
    </PinInput.Root>
  ),
};

// Complete: every box filled, `data-complete` styling on. Not one of the 5
// Figma states but useful to see the completion affordance the interaction
// design mentions.
export const Complete: Story = {
  render: (args) => (
    <PinInput.Root {...args}>
      <Boxes length={args.length} />
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
      <Boxes length={args.length} />
      <PinInput.HiddenInput name="otp" />
    </PinInput.Root>
  ),
};
