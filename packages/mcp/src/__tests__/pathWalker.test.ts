import { describe, expect, it } from 'vitest';
import { walkPath } from '../tools/pathWalker';

describe('walkPath', () => {
  const tree = {
    primitive: {
      color: {
        gray: {
          '500': { $type: 'color', $value: '#71717A' },
        },
      },
    },
    semantic: {
      color: {
        light: {
          color: {
            bg: {
              primary: { $type: 'color', $value: '{color.white}' },
            },
          },
        },
      },
    },
  };

  it('resolves a value found 3+ levels deep', () => {
    const result = walkPath(tree, 'primitive.color.gray.500');
    expect(result).toEqual({ $type: 'color', $value: '#71717A' });
  });

  it('resolves a value found even deeper', () => {
    const result = walkPath(tree, 'semantic.color.light.color.bg.primary');
    expect(result).toEqual({ $type: 'color', $value: '{color.white}' });
  });

  it('throws (not returns undefined/null) when a segment is missing', () => {
    expect(() => walkPath(tree, 'primitive.color.gray.999')).toThrow();
  });

  it('throws when descending into a non-object', () => {
    expect(() => walkPath(tree, 'primitive.color.gray.500.$value.nope')).toThrow();
  });

  it('throws on an empty-string path instead of returning the whole tree', () => {
    expect(() => walkPath(tree, '')).toThrow();
  });

  it('throws on an inherited Object.prototype member instead of resolving it (regression: `in` walks the prototype chain)', () => {
    expect(() => walkPath(tree, 'primitive.constructor')).toThrow();
    expect(() => walkPath(tree, 'primitive.toString')).toThrow();
    expect(() => walkPath(tree, 'primitive.hasOwnProperty')).toThrow();
  });
});
