import type { Meta, StoryObj } from '@storybook/react-vite';
import tokensCssRaw from '@leslielee888888/tokens/dist-styles/tokens.css?raw';
import { parseTokensCss, groupByPrefix, type TokenEntry } from './parseTokensCss';

// Documentation-only: renders the generated tokens.css directly, so this
// page can never drift out of sync with what generate-css.ts produced.
const { light, dark } = parseTokensCss(tokensCssRaw);
const lightByPrefix = groupByPrefix(light);
const darkByName = new Map(dark.map((entry) => [entry.name, entry.value]));

function ColorSwatch({ entry, theme }: { entry: TokenEntry; theme: 'light' | 'dark' }) {
  const value = theme === 'dark' ? (darkByName.get(entry.name) ?? entry.value) : entry.value;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          border: '1px solid rgba(0,0,0,0.15)',
          background: value,
          flexShrink: 0,
        }}
      />
      <code style={{ fontSize: 12 }}>
        {entry.name}: {value}
      </code>
    </div>
  );
}

function ColorSection() {
  const colorEntries = lightByPrefix.get('color') ?? [];
  return (
    <div style={{ display: 'flex', gap: 32 }}>
      <div>
        <h3>Light</h3>
        {colorEntries.map((entry) => (
          <ColorSwatch key={entry.name} entry={entry} theme="light" />
        ))}
      </div>
      <div style={{ background: '#18181B', padding: 16, borderRadius: 8 }}>
        <h3 style={{ color: '#fff' }}>Dark</h3>
        {colorEntries.map((entry) => (
          <ColorSwatch key={entry.name} entry={entry} theme="dark" />
        ))}
      </div>
    </div>
  );
}

function SpacingSection() {
  const spacingEntries = lightByPrefix.get('spacing') ?? [];
  return (
    <div>
      {spacingEntries.map((entry) => (
        <div
          key={entry.name}
          style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}
        >
          <code style={{ fontSize: 12, width: 160 }}>
            {entry.name}: {entry.value}
          </code>
          <div
            style={{ width: entry.value, height: 16, background: 'var(--color-accent-default)' }}
          />
        </div>
      ))}
    </div>
  );
}

function RadiusSection() {
  const radiusEntries = lightByPrefix.get('radius') ?? [];
  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {radiusEntries.map((entry) => (
        <div key={entry.name} style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: entry.value,
              background: 'var(--color-accent-subtle)',
              border: '1px solid var(--color-accent-default)',
              marginBottom: 4,
            }}
          />
          <code style={{ fontSize: 12 }}>{entry.name}</code>
        </div>
      ))}
    </div>
  );
}

const meta: Meta = {
  title: 'Design Tokens',
};
export default meta;

type Story = StoryObj;

export const Colors: Story = { render: () => <ColorSection /> };
export const Spacing: Story = { render: () => <SpacingSection /> };
export const Radius: Story = { render: () => <RadiusSection /> };
