import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildTokenTree } from '../tokenTree';
import { walkPath } from '../tools/pathWalker';

const fixtureTokensDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
  'tokens'
);

const realTokensDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'tokens',
  'tokens'
);

describe('buildTokenTree - fixtures', () => {
  it("nests primitive color/spacing/radius under tree.primitive, unwrapping each file's own top-level key", () => {
    const tree = buildTokenTree(fixtureTokensDir);

    // primitive/color.json fixture is { "color": { "gray": { "500": {...} } } } -
    // the wrapper "color" key must be stripped, not doubled.
    expect(tree.primitive.color).toEqual({
      gray: { '500': { $type: 'color', $value: '#71717A' } },
    });
    expect(tree.primitive.spacing).toEqual({
      md: { $type: 'dimension', $value: '16px' },
    });
    expect(tree.primitive.radius).toEqual({
      sm: { $type: 'dimension', $value: '4px' },
    });
  });

  it('keeps semantic light/dark as separate nested keys, never merged, and unwraps the file\'s "color" key', () => {
    const tree = buildTokenTree(fixtureTokensDir);

    expect(tree.semantic.color.light).toEqual({
      bg: { primary: { $type: 'color', $value: '{color.white}' } },
    });
    expect(tree.semantic.color.dark).toEqual({
      bg: { primary: { $type: 'color', $value: '{color.gray.900}' } },
    });
    // light and dark must not bleed into one merged object
    expect(tree.semantic.color.light).not.toEqual(tree.semantic.color.dark);
  });

  it('includes typography and shadow as direct top-level categories, unwrapped', () => {
    const tree = buildTokenTree(fixtureTokensDir);

    expect(tree.typography).toEqual({
      body: {
        $type: 'typography',
        $value: { fontFamily: 'Inter', fontWeight: 400, fontSize: '16px', lineHeight: '24px' },
      },
    });
    expect(tree.shadow).toEqual({
      sm: {
        $type: 'shadow',
        $value: {
          color: 'rgba(0, 0, 0, 0.08)',
          offsetX: '0px',
          offsetY: '1px',
          blur: '2px',
          spread: '0px',
        },
      },
    });
  });

  it('produces all five categories from the fixture set', () => {
    const tree = buildTokenTree(fixtureTokensDir);

    expect(tree.primitive).toBeTruthy();
    expect(tree.primitive.color).toBeTruthy();
    expect(tree.primitive.spacing).toBeTruthy();
    expect(tree.primitive.radius).toBeTruthy();
    expect(tree.semantic).toBeTruthy();
    expect(tree.semantic.color).toBeTruthy();
    expect(tree.typography).toBeTruthy();
    expect(tree.shadow).toBeTruthy();
  });

  it('resolves single-wrapped dotted paths via walkPath (no doubled category key)', () => {
    const tree = buildTokenTree(fixtureTokensDir);

    expect(walkPath(tree, 'primitive.color.gray.500')).toEqual({
      $type: 'color',
      $value: '#71717A',
    });
    expect(walkPath(tree, 'semantic.color.light.bg.primary')).toEqual({
      $type: 'color',
      $value: '{color.white}',
    });
    expect(walkPath(tree, 'typography.body')).toBeTruthy();
    expect(walkPath(tree, 'shadow.sm')).toBeTruthy();
    // the doubled-key shape must NOT resolve - regression guard for the unwrap bug
    expect(() => walkPath(tree, 'primitive.color.color.gray.500')).toThrow();
  });
});

describe('buildTokenTree - real token data (smoke test)', () => {
  it('resolves the real packages/tokens/tokens data with all categories present and non-empty', () => {
    const tree = buildTokenTree(realTokensDir);

    expect(tree.primitive).toBeTruthy();
    expect(Object.keys(tree.primitive.color as object).length).toBeGreaterThan(0);
    expect(Object.keys(tree.primitive.spacing as object).length).toBeGreaterThan(0);
    expect(Object.keys(tree.primitive.radius as object).length).toBeGreaterThan(0);

    expect(tree.semantic).toBeTruthy();
    expect(Object.keys(tree.semantic.color.light as object).length).toBeGreaterThan(0);
    expect(Object.keys(tree.semantic.color.dark as object).length).toBeGreaterThan(0);

    expect(tree.typography).toBeTruthy();
    expect(Object.keys(tree.typography as object).length).toBeGreaterThan(0);

    expect(tree.shadow).toBeTruthy();
    expect(Object.keys(tree.shadow as object).length).toBeGreaterThan(0);
  });

  it('uses the default (no-arg) tokensDir to resolve the same real data', () => {
    const tree = buildTokenTree();

    expect(tree.primitive).toBeTruthy();
    expect(tree.semantic).toBeTruthy();
    expect(tree.typography).toBeTruthy();
    expect(tree.shadow).toBeTruthy();
  });

  it('resolves single-wrapped real paths via walkPath - regression guard for the doubled-category-key bug', () => {
    const tree = buildTokenTree(realTokensDir);

    // primitive/color.json's real "gray.900" swatch, reached WITHOUT a doubled "color.color".
    expect(walkPath(tree, 'primitive.color.gray.900')).toEqual({
      $type: 'color',
      $value: '#18181B',
    });
    expect(walkPath(tree, 'semantic.color.light.bg.primary')).toBeTruthy();
    expect(walkPath(tree, 'semantic.color.dark.bg.primary')).toBeTruthy();
    expect(walkPath(tree, 'typography.body')).toBeTruthy();
    expect(walkPath(tree, 'shadow.sm')).toBeTruthy();

    // the old (buggy) doubled-key shape must not resolve against the real data either
    expect(() => walkPath(tree, 'primitive.color.color.gray.900')).toThrow();
  });
});
