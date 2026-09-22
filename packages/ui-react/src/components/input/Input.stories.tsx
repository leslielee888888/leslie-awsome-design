import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
};
export default meta;

type Story = StoryObj<typeof Input>;

export const Default: Story = { args: { placeholder: 'Enter text' } };
export const WithDefaultValue: Story = { args: { defaultValue: 'Hello' } };
export const Disabled: Story = { args: { placeholder: 'Enter text', disabled: true } };
export const Invalid: Story = {
  args: {
    placeholder: 'Required field',
    rules: [{ type: 'required', message: 'This field is required' }],
    defaultValue: '',
  },
};
