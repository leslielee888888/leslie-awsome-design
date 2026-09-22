import type { Preview } from '@storybook/react-vite';
import '@leslielee888888/tokens/dist-styles/tokens.css';

const preview: Preview = {
  tags: ['autodocs'],
  parameters: {
    a11y: {
      context: 'body',
      config: {},
      options: {},
    },
  },
};

export default preview;
