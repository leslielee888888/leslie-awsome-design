// Parses the generated `dist-styles/tokens.css` (from @leslielee888888/tokens)
// into structured data for the Storybook "Design Tokens" docs page. Reads the
// real generated CSS rather than the raw DTCG JSON so this page can never
// drift out of sync with what generate-css.ts actually produced.

export interface TokenEntry {
  /** CSS custom property name, e.g. "--color-gray-50" */
  name: string;
  /** Resolved value, e.g. "#FAFAFA" or "4px" */
  value: string;
}

export interface ParsedTokens {
  light: TokenEntry[];
  dark: TokenEntry[];
}

const DECLARATION_PATTERN = /--([a-z0-9-]+):\s*([^;]+);/gi;

function extractBlock(css: string, blockPattern: RegExp): TokenEntry[] {
  const match = css.match(blockPattern);
  if (!match) return [];
  const entries: TokenEntry[] = [];
  for (const declaration of match[0].matchAll(DECLARATION_PATTERN)) {
    entries.push({ name: `--${declaration[1]}`, value: declaration[2].trim() });
  }
  return entries;
}

export function parseTokensCss(css: string): ParsedTokens {
  const light = extractBlock(css, /:root\s*\{[^}]*\}/);
  const dark = extractBlock(css, /:root\[data-theme=["']dark["']\]\s*\{[^}]*\}/);
  return { light, dark };
}

/** Groups token entries by their first dash-separated segment, e.g. "--color-gray-50" -> "color". */
export function groupByPrefix(entries: TokenEntry[]): Map<string, TokenEntry[]> {
  const groups = new Map<string, TokenEntry[]>();
  for (const entry of entries) {
    const prefix = entry.name.replace(/^--/, '').split('-')[0];
    const group = groups.get(prefix) ?? [];
    group.push(entry);
    groups.set(prefix, group);
  }
  return groups;
}
