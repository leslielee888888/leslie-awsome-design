import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Project } from 'ts-morph';
import { extractBehaviorManifest, generateManifest, kebabToPascal } from './generate-manifest';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

describe('kebabToPascal', () => {
  it('converts a kebab-case behavior directory name to a PascalCase interface prefix', () => {
    expect(kebabToPascal('pin-input')).toBe('PinInput');
    expect(kebabToPascal('sample-behavior')).toBe('SampleBehavior');
  });
});

describe('extractBehaviorManifest (fixture)', () => {
  const fixtureDir = path.join(scriptDir, '__fixtures__', 'sample-behavior');

  function loadFixtureManifest() {
    const project = new Project({ skipAddingFilesFromTsConfig: true });
    const typesSourceFile = project.addSourceFileAtPath(path.join(fixtureDir, 'types.ts'));
    return extractBehaviorManifest(project, typesSourceFile, fixtureDir, 'sample-behavior');
  }

  it('extracts the config interface with field name, type and optionality', () => {
    const manifest = loadFixtureManifest();

    expect(manifest.config.interfaceName).toBe('SampleBehaviorProps');
    expect(manifest.config.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'count', type: 'number', optional: false }),
        expect.objectContaining({ name: 'mode', type: "'single' | 'multiple'", optional: true }),
        expect.objectContaining({ name: 'disabled', type: 'boolean', optional: true }),
      ])
    );
  });

  it('captures a field JSDoc description', () => {
    const manifest = loadFixtureManifest();

    const count = manifest.config.fields.find((field) => field.name === 'count');
    expect(count?.description).toBe('Number of visible items.');
  });

  it('captures an @default JSDoc tag as the field default', () => {
    const manifest = loadFixtureManifest();

    const mode = manifest.config.fields.find((field) => field.name === 'mode');
    expect(mode?.default).toBe("'single'");
  });

  it('extracts the state interface', () => {
    const manifest = loadFixtureManifest();

    expect(manifest.state.interfaceName).toBe('SampleBehaviorState');
    expect(manifest.state.fields).toEqual([
      {
        name: 'activeIndex',
        type: 'number | null',
        optional: false,
        description: 'Currently active index, or null when nothing is active.',
      },
    ]);
  });

  it('keys a prop-getter by its returned interface name rather than the getter function name', () => {
    const manifest = loadFixtureManifest();

    // sampleBehavior.ts's getter is named `getWidgetProps` but returns
    // `SampleBehaviorPanelProps` — the manifest key must come from the
    // returned interface ("panel"), not the getter's own name ("widget").
    expect(Object.keys(manifest.props)).toEqual(['panel']);
    expect(manifest.props.panel.interfaceName).toBe('SampleBehaviorPanelProps');
    expect(manifest.props.panel.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'role',
          type: "'region'",
          optional: false,
          description: 'ARIA role for the panel element.',
        }),
        expect.objectContaining({ name: 'data-state', type: "'open' | 'closed'", optional: false }),
      ])
    );
  });

  it('strips surrounding quotes from string-literal-named fields (e.g. "data-state")', () => {
    const manifest = loadFixtureManifest();

    const names = manifest.props.panel.fields.map((field) => field.name);
    expect(names).not.toContain("'data-state'");
    expect(names).toContain('data-state');
  });
});

describe('generateManifest against the real pin-input source (smoke test)', () => {
  const behaviorsDir = path.join(scriptDir, '..', '..', 'core', 'src', 'behaviors');
  const typesFilePath = path.join(scriptDir, '..', '..', 'core', 'src', 'types.ts');

  it('matches the committed packages/mcp/manifest.json exactly', () => {
    const manifest = generateManifest(behaviorsDir, typesFilePath);
    const committedManifest = JSON.parse(
      readFileSync(path.join(scriptDir, '..', 'manifest.json'), 'utf-8')
    );

    expect(manifest).toEqual(committedManifest);
  });

  it("includes pin-input's config, state, root and box shapes with JSDoc metadata", () => {
    const manifest = generateManifest(behaviorsDir, typesFilePath);
    const pinInput = manifest['pin-input'];

    expect(pinInput.config.interfaceName).toBe('PinInputProps');
    expect(pinInput.state.interfaceName).toBe('PinInputState');
    expect(pinInput.props.root.interfaceName).toBe('PinInputRootProps');
    expect(pinInput.props.box.interfaceName).toBe('PinInputBoxProps');

    const typeField = pinInput.config.fields.find((field) => field.name === 'type');
    expect(typeField?.type).toBe("'numeric' | 'alphanumeric'");
    expect(typeField?.default).toBe("'numeric'");

    const invalidField = pinInput.config.fields.find((field) => field.name === 'invalid');
    expect(invalidField?.description).toBe(
      'Consumer-supplied validation result — core has no concept of "invalid" itself.'
    );
  });
});
