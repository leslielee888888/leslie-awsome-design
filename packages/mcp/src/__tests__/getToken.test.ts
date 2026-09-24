import { describe, expect, it } from 'vitest';
import { getTokenToolHandler } from '../tools/getToken';

function textOf(content: { type: string; text?: string }[]): string {
  const [first] = content;
  if (!first || first.type !== 'text' || typeof first.text !== 'string') {
    throw new Error('Expected a single text content block');
  }
  return first.text;
}

describe('get_token tool handler', () => {
  it('resolves a real committed token path and returns its node as JSON text content', async () => {
    const result = await getTokenToolHandler({ path: 'semantic.color.light.bg.primary' });

    expect(JSON.parse(textOf(result.content))).toEqual({
      $type: 'color',
      $value: '{color.white}',
    });
  });

  it('throws for an unresolved path (surfaces as an MCP tool error once wired through registerTool)', async () => {
    await expect(
      getTokenToolHandler({ path: 'primitive.color.not.a.real.path' })
    ).rejects.toThrow();
  });
});
