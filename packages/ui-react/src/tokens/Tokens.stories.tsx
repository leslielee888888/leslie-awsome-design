import type { Meta, StoryObj } from '@storybook/react-vite';
import tokensCssRaw from '@leslielee888888/tokens/dist-styles/tokens.css?raw';
import { parseTokensCss, groupByPrefix, splitBySemantic } from './parseTokensCss';

// Documentation-only: renders the generated tokens.css directly, so this
// page can never drift out of sync with what generate-css.ts produced.
const { light, dark } = parseTokensCss(tokensCssRaw);
const lightByPrefix = groupByPrefix(light);
const darkByName = new Map(dark.map((entry) => [entry.name, entry.value]));

// A visible border regardless of how pale the swatch color is (e.g.
// --color-white or --color-gray-50 are otherwise indistinguishable from
// the docs page's own white background).
const SWATCH_BORDER = '1px solid rgba(0,0,0,0.35)';

function ColorSwatch({ name, value }: { name: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          border: SWATCH_BORDER,
          background: value,
          flexShrink: 0,
        }}
      />
      <code style={{ fontSize: 12 }}>
        {name}: {value}
      </code>
    </div>
  );
}

function ColorSection() {
  const colorEntries = lightByPrefix.get('color') ?? [];
  const { invariant, semantic } = splitBySemantic(colorEntries, dark);

  return (
    <div>
      <h3>Primitives</h3>
      <p style={{ fontSize: 13, color: '#666' }}>Same value in every theme.</p>
      {invariant.map((entry) => (
        <ColorSwatch key={entry.name} name={entry.name} value={entry.value} />
      ))}

      <h3 style={{ marginTop: 32 }}>Semantic — Light vs. Dark</h3>
      <p style={{ fontSize: 13, color: '#666' }}>
        These are the only color tokens that actually change with{' '}
        <code>[data-theme=&quot;dark&quot;]</code>.
      </p>
      <div style={{ display: 'flex', gap: 32 }}>
        <div>
          <h4>Light</h4>
          {semantic.map((entry) => (
            <ColorSwatch key={entry.name} name={entry.name} value={entry.value} />
          ))}
        </div>
        <div style={{ background: '#18181B', padding: 16, borderRadius: 8, color: '#fff' }}>
          <h4 style={{ color: '#fff' }}>Dark</h4>
          {semantic.map((entry) => (
            <ColorSwatch
              key={entry.name}
              name={entry.name}
              value={darkByName.get(entry.name) ?? entry.value}
            />
          ))}
        </div>
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
