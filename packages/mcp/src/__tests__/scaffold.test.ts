import { describe, expect, it } from 'vitest';

describe('mcp package scaffold', () => {
  it('resolves @leslielee888888/tokens via workspace:* wiring', async () => {
    const tokens = await import('@leslielee888888/tokens');

    expect(tokens).toBeTypeOf('object');
    expect(tokens.validate).toBeTypeOf('function');
  });

  it('resolves @leslielee888888/core via workspace:* wiring', async () => {
    const core = await import('@leslielee888888/core');

    expect(core).toBeTypeOf('object');
    expect(core.validate).toBeTypeOf('function');
  });
});
