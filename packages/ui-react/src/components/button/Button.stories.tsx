import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
};
export default meta;

type Story = StoryObj<typeof Button>;

export const PrimaryMd: Story = { args: { children: 'Button', variant: 'primary', size: 'md' } };
export const PrimarySm: Story = { args: { children: 'Button', variant: 'primary', size: 'sm' } };
export const PrimaryLg: Story = { args: { children: 'Button', variant: 'primary', size: 'lg' } };
export const SecondaryMd: Story = {
  args: { children: 'Button', variant: 'secondary', size: 'md' },
};
export const SecondarySm: Story = {
  args: { children: 'Button', variant: 'secondary', size: 'sm' },
};
export const SecondaryLg: Story = {
  args: { children: 'Button', variant: 'secondary', size: 'lg' },
};
export const Disabled: Story = {
  args: { children: 'Button', variant: 'primary', size: 'md', disabled: true },
};
export const Loading: Story = {
  args: { children: 'Button', variant: 'primary', size: 'md', loading: true },
};
