import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
};
export default meta;

type Story = StoryObj<typeof Badge>;

export const DefaultVariant: Story = { args: { children: 'Badge', variant: 'default' } };
export const Success: Story = { args: { children: 'Success', variant: 'success' } };
export const ErrorVariant: Story = { args: { children: 'Error', variant: 'error' } };
export const Live: Story = { args: { children: 'Live updates', variant: 'default', live: true } };
