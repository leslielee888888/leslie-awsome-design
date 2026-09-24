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
    // Without this, the "Show code"/"Copy code" panel reconstructs JSX from
    // the rendered React tree, labeling elements by their component's own
    // function name -- for a compound export like `PinInput.Root` (whose
    // function is literally named `Root`), that prints `<Root>`, which
    // doesn't compile if pasted into real code (nothing named `Root` is in
    // scope, only `PinInput`). `type: 'code'` shows the actual literal
    // source of each story's `render` function instead, which is always
    // copy-paste-correct since it's exactly what's written in the file.
    docs: { source: { type: 'code' } },
  },
};

export default preview;
