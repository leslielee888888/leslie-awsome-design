import { describe, expect, it } from 'vitest';
import { getComponentToolHandler } from '../tools/getComponent';

function textOf(content: { type: string; text?: string }[]): string {
  const [first] = content;
  if (!first || first.type !== 'text' || typeof first.text !== 'string') {
    throw new Error('Expected a single text content block');
  }
  return first.text;
}

describe('get_component tool handler', () => {
  it('returns the real pin-input manifest entry', async () => {
    const result = await getComponentToolHandler({ name: 'pin-input' });
    const entry = JSON.parse(textOf(result.content)) as {
      config: { interfaceName: string };
      props: { root: { interfaceName: string } };
    };

    expect(entry.config.interfaceName).toBe('PinInputProps');
    expect(entry.props.root.interfaceName).toBe('PinInputRootProps');
  });

  it('throws for an unknown component name (surfaces as an MCP tool error once wired through registerTool)', async () => {
    await expect(getComponentToolHandler({ name: 'nonexistent' })).rejects.toThrow();
  });

  it('throws instead of resolving an inherited Object.prototype member (regression: Object.hasOwn, not `in`)', async () => {
    await expect(getComponentToolHandler({ name: 'constructor' })).rejects.toThrow();
    await expect(getComponentToolHandler({ name: 'toString' })).rejects.toThrow();
  });
});
