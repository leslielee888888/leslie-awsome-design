import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildTokenTree } from '../tokenTree';

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
  it('nests primitive color/spacing/radius under tree.primitive', () => {
    const tree = buildTokenTree(fixtureTokensDir);

    expect(tree.primitive.color).toEqual({
      color: { gray: { '500': { $type: 'color', $value: '#71717A' } } },
    });
    expect(tree.primitive.spacing).toEqual({
      spacing: { md: { $type: 'dimension', $value: '16px' } },
    });
    expect(tree.primitive.radius).toEqual({
      radius: { sm: { $type: 'dimension', $value: '4px' } },
    });
  });

  it('keeps semantic light/dark as separate nested keys, never merged', () => {
    const tree = buildTokenTree(fixtureTokensDir);

    expect(tree.semantic.color.light).toEqual({
      color: { bg: { primary: { $type: 'color', $value: '{color.white}' } } },
    });
    expect(tree.semantic.color.dark).toEqual({
      color: { bg: { primary: { $type: 'color', $value: '{color.gray.900}' } } },
    });
    // light and dark must not bleed into one merged object
    expect(tree.semantic.color.light).not.toEqual(tree.semantic.color.dark);
  });

  it('includes typography and shadow as direct top-level categories', () => {
    const tree = buildTokenTree(fixtureTokensDir);

    expect(tree.typography).toEqual({
      typography: {
        body: {
          $type: 'typography',
          $value: { fontFamily: 'Inter', fontWeight: 400, fontSize: '16px', lineHeight: '24px' },
        },
      },
    });
    expect(tree.shadow).toEqual({
      shadow: {
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
});
