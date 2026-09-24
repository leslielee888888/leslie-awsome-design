/**
 * Walks a dotted path (e.g. "primitive.color.gray.500") through a plain object tree,
 * one segment at a time. Used as the lookup logic behind the `get_token` MCP tool, over
 * the same tree shape the `tokens://` resource serves (see ../tokenTree.ts).
 *
 * Throws on any path that doesn't resolve - a missing segment, a non-object encountered
 * mid-path, or an empty path - rather than returning `undefined`/`null`, so a later task
 * can turn the throw directly into an MCP tool error.
 */
export function walkPath(tree: unknown, path: string): unknown {
  if (path === '') {
    throw new Error(
      'get_token path must be a non-empty dotted path (e.g. "primitive.color.gray.500")'
    );
  }

  const segments = path.split('.');
  let current: unknown = tree;
  const visited: string[] = [];

  for (const segment of segments) {
    if (segment === '') {
      throw new Error(`Invalid token path "${path}": contains an empty segment`);
    }

    if (current === null || typeof current !== 'object') {
      const at = visited.length > 0 ? visited.join('.') : '<root>';
      throw new Error(
        `Invalid token path "${path}": "${at}" is not an object, cannot resolve "${segment}"`
      );
    }

    // Object.hasOwn (not `in`) - `in` walks the prototype chain, so a segment like
    // "constructor" or "toString" would resolve to an inherited Object.prototype member
    // instead of throwing "not found".
    if (!Object.hasOwn(current, segment)) {
      const at = visited.length > 0 ? visited.join('.') : '<root>';
      throw new Error(`Invalid token path "${path}": no key "${segment}" found at "${at}"`);
    }

    current = (current as Record<string, unknown>)[segment];
    visited.push(segment);
  }

  return current;
}
