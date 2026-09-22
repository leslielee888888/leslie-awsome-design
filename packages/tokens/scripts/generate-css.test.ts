import { describe, it, expect } from 'vitest';
import { resolveTokenValue, buildTokensCss, buildTailwindThemeCss } from './generate-css';

describe('resolveTokenValue', () => {
  it('returns a literal value unchanged', () => {
    const lookup = new Map([['color.white', { type: 'color', value: '#FFFFFF' }]]);
    expect(resolveTokenValue('color.white', lookup)).toBe('#FFFFFF');
  });

  it('resolves a single-level alias', () => {
    const lookup = new Map([
      ['color.white', { type: 'color', value: '#FFFFFF' }],
      ['color.bg.primary', { type: 'color', value: '{color.white}' }],
    ]);
    expect(resolveTokenValue('color.bg.primary', lookup)).toBe('#FFFFFF');
  });

  it('throws on an unresolved alias target', () => {
    const lookup = new Map([['color.bg.primary', { type: 'color', value: '{color.missing}' }]]);
    expect(() => resolveTokenValue('color.bg.primary', lookup)).toThrow(
      /Unresolved token reference/
    );
  });

  it('throws on a circular alias chain', () => {
    const lookup = new Map([
      ['a', { type: 'color', value: '{b}' }],
      ['b', { type: 'color', value: '{a}' }],
    ]);
    expect(() => resolveTokenValue('a', lookup)).toThrow(/Circular alias reference/);
  });
});

describe('buildTokensCss', () => {
  it('emits a :root block with primitives and resolved light semantic tokens, and a dark override block', () => {
    const primitives = new Map([
      ['color.white', { type: 'color', value: '#FFFFFF' }],
      ['color.gray.900', { type: 'color', value: '#18181B' }],
    ]);
    const light = new Map([['color.bg.primary', { type: 'color', value: '{color.white}' }]]);
    const dark = new Map([['color.bg.primary', { type: 'color', value: '{color.gray.900}' }]]);

    const css = buildTokensCss(primitives, light, dark);

    expect(css).toContain(':root {');
    expect(css).toContain('--color-white: #FFFFFF;');
    expect(css).toContain('--color-gray-900: #18181B;');
    expect(css).toContain('--color-bg-primary: #FFFFFF;');
    expect(css).toContain(':root[data-theme="dark"] {');
    expect(css).toContain('--color-bg-primary: #18181B;');
  });
});

describe('buildTailwindThemeCss', () => {
  it('maps every primitive and light-semantic variable to itself via var()', () => {
    const primitives = new Map([['spacing.xs', { type: 'dimension', value: '4px' }]]);
    const light = new Map([['color.bg.primary', { type: 'color', value: '{color.white}' }]]);

    const css = buildTailwindThemeCss(primitives, light);

    expect(css).toContain('@theme {');
    expect(css).toContain('--spacing-xs: var(--spacing-xs);');
    expect(css).toContain('--color-bg-primary: var(--color-bg-primary);');
  });
});
