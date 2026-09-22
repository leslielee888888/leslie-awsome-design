import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from './Card';

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
};
export default meta;

type Story = StoryObj<typeof Card>;

export const Default: Story = { args: { children: 'Card content' } };
export const WithTitleId: Story = { args: { children: 'Card content', titleId: 'card-title' } };
