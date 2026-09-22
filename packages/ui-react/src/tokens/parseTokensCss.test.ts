import { describe, it, expect } from 'vitest';
import { parseTokensCss, groupByPrefix } from './parseTokensCss';

const SAMPLE_CSS = `:root {
  --color-gray-50: #FAFAFA;
  --spacing-xs: 4px;
  --color-bg-primary: #FFFFFF;
}

:root[data-theme="dark"] {
  --color-bg-primary: #18181B;
}
`;

describe('parseTokensCss', () => {
  it('extracts every declaration from the :root block as the light set', () => {
    const { light } = parseTokensCss(SAMPLE_CSS);
    expect(light).toEqual([
      { name: '--color-gray-50', value: '#FAFAFA' },
      { name: '--spacing-xs', value: '4px' },
      { name: '--color-bg-primary', value: '#FFFFFF' },
    ]);
  });

  it('extracts only the overridden declarations from the dark block', () => {
    const { dark } = parseTokensCss(SAMPLE_CSS);
    expect(dark).toEqual([{ name: '--color-bg-primary', value: '#18181B' }]);
  });

  it('returns an empty dark set when no dark block is present', () => {
    const { dark } = parseTokensCss(':root { --spacing-xs: 4px; }');
    expect(dark).toEqual([]);
  });
});

describe('groupByPrefix', () => {
  it('groups entries by the first dash-separated segment of the token name', () => {
    const groups = groupByPrefix([
      { name: '--color-gray-50', value: '#FAFAFA' },
      { name: '--color-bg-primary', value: '#FFFFFF' },
      { name: '--spacing-xs', value: '4px' },
    ]);
    expect([...groups.keys()]).toEqual(['color', 'spacing']);
    expect(groups.get('color')).toHaveLength(2);
    expect(groups.get('spacing')).toHaveLength(1);
  });
});
