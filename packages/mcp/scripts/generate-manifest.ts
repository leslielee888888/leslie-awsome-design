import { readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  Node,
  Project,
  type FunctionDeclaration,
  type InterfaceDeclaration,
  type SourceFile,
} from 'ts-morph';

/**
 * Static, build-time extraction of `packages/core`'s behavior config/state/
 * prop-getter shapes into a JSON manifest, for the `components://manifest`
 * MCP resource (added in a later task). Run via `pnpm --filter mcp
 * generate-manifest`, review the diff, and commit `packages/mcp/manifest.json`
 * — never generated live by a running server (same pattern as
 * `packages/tokens/scripts/generate-css.ts`).
 */

export interface FieldManifest {
  name: string;
  type: string;
  optional: boolean;
  description?: string;
  default?: string;
}

export interface InterfaceManifest {
  interfaceName: string;
  fields: FieldManifest[];
}

export interface BehaviorManifest {
  config: InterfaceManifest;
  state: InterfaceManifest;
  props: Record<string, InterfaceManifest>;
}

export type Manifest = Record<string, BehaviorManifest>;

/** "pin-input" -> "PinInput". The naming convention every behavior directory follows. */
export function kebabToPascal(kebabName: string): string {
  return kebabName
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('');
}

function stripQuotes(name: string): string {
  const match = name.match(/^(['"])(.*)\1$/);
  return match ? match[2] : name;
}

// Collapses a (possibly multi-line, CRLF-containing) JSDoc comment into a
// single line of normalized whitespace — the manifest is data for display,
// not source code, so the author's line-wrapping shouldn't leak through.
function normalizeWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

function extractFields(iface: InterfaceDeclaration): FieldManifest[] {
  return iface.getProperties().map((prop) => {
    const jsDoc = prop.getJsDocs()[0];
    const description = jsDoc && normalizeWhitespace(jsDoc.getDescription());
    const defaultTag = jsDoc?.getTags().find((tag) => tag.getTagName() === 'default');
    const defaultValue =
      defaultTag?.getCommentText() && normalizeWhitespace(defaultTag.getCommentText()!);

    const field: FieldManifest = {
      name: stripQuotes(prop.getName()),
      type: prop.getTypeNodeOrThrow().getText(),
      optional: prop.hasQuestionToken(),
    };
    if (description) field.description = description;
    if (defaultValue) field.default = defaultValue;
    return field;
  });
}

function getInterfaceOrThrow(sourceFile: SourceFile, name: string): InterfaceDeclaration {
  const iface = sourceFile.getInterface(name);
  if (!iface) {
    throw new Error(`Interface "${name}" not found in ${sourceFile.getFilePath()}`);
  }
  return iface;
}

/**
 * Finds the behavior's main exported function: the one whose return type is
 * an object literal with `get*Props` prop-getter members (e.g. `pinInput` in
 * pinInput.ts, returning `{ getRootProps, getInputProps, ... }`). Scans every
 * non-test `.ts` file directly under the behavior directory rather than
 * assuming a filename, since only pin-input exists today.
 */
function findBehaviorFunction(behaviorSourceFiles: SourceFile[]): FunctionDeclaration | undefined {
  for (const sourceFile of behaviorSourceFiles) {
    for (const fn of sourceFile.getFunctions()) {
      if (!fn.isExported()) continue;
      const returnTypeNode = fn.getReturnTypeNode();
      if (!returnTypeNode || !Node.isTypeLiteral(returnTypeNode)) continue;
      const hasPropGetter = returnTypeNode
        .getMembers()
        .some(
          (member) => Node.isPropertySignature(member) && /^get.+Props$/.test(member.getName())
        );
      if (hasPropGetter) return fn;
    }
  }
  return undefined;
}

/**
 * Reads off the interface names returned by each `get*Props` member of the
 * behavior function's return type (e.g. `getRootProps: (...) => PinInputRootProps`
 * -> `"PinInputRootProps"`). Declaration order in the source is preserved.
 */
function extractPropGetterInterfaceNames(behaviorFn: FunctionDeclaration): string[] {
  const returnTypeNode = behaviorFn.getReturnTypeNode();
  if (!returnTypeNode || !Node.isTypeLiteral(returnTypeNode)) return [];

  const interfaceNames: string[] = [];
  for (const member of returnTypeNode.getMembers()) {
    if (!Node.isPropertySignature(member)) continue;
    if (!/^get.+Props$/.test(member.getName())) continue;
    const typeNode = member.getTypeNode();
    if (!typeNode || !Node.isFunctionTypeNode(typeNode)) continue;
    const returnTypeOfGetter = typeNode.getReturnTypeNode();
    if (!returnTypeOfGetter) continue;
    interfaceNames.push(returnTypeOfGetter.getText());
  }
  return interfaceNames;
}

/**
 * Inference rule (the one non-obvious design decision here): the manifest key
 * for a prop-getter comes from the *interface it returns*, not from the
 * getter function's own name. pinInput's `getInputProps` returns
 * `PinInputBoxProps` — the DOM-facing verb ("input") the author chose for the
 * function doesn't match the semantic part name ("box") the type conveys, and
 * it's the type's identity a manifest consumer cares about. So the key is
 * built by stripping the behavior's interface prefix (e.g. "PinInput") and
 * the trailing "Props" off the *returned interface name*, then lower-casing
 * the first letter: "PinInputBoxProps" -> "Box" -> "box". Reusing
 * `get*Props`'s member names as the source of *which* interfaces are
 * prop-getters (rather than pattern-matching every `${prefix}*Props`
 * interface in types.ts) keeps a stray same-shaped interface that isn't
 * actually returned by any getter from being picked up by accident.
 */
function propGetterKey(returnedInterfaceName: string, prefix: string): string {
  const withoutPrefix = returnedInterfaceName.startsWith(prefix)
    ? returnedInterfaceName.slice(prefix.length)
    : returnedInterfaceName;
  const part = withoutPrefix.endsWith('Props')
    ? withoutPrefix.slice(0, -'Props'.length)
    : withoutPrefix;
  return part.charAt(0).toLowerCase() + part.slice(1);
}

/**
 * Extracts one behavior's manifest entry.
 *
 * @param project - shared ts-morph `Project`, used to load the behavior
 *   directory's source files (kept separate from `typesSourceFile`, which the
 *   caller already loaded, so it's only parsed once across all behaviors).
 * @param typesSourceFile - the source file holding the behavior's config,
 *   state and prop-getter-return interfaces (`packages/core/src/types.ts` for
 *   real behaviors; a fixture's own `types.ts` in tests).
 * @param behaviorDir - the behavior's directory, e.g.
 *   `packages/core/src/behaviors/pin-input`.
 * @param dirName - the behavior directory's kebab-case name, e.g. "pin-input".
 */
export function extractBehaviorManifest(
  project: Project,
  typesSourceFile: SourceFile,
  behaviorDir: string,
  dirName: string
): BehaviorManifest {
  const prefix = kebabToPascal(dirName);

  const configInterface = getInterfaceOrThrow(typesSourceFile, `${prefix}Props`);
  const stateInterface = getInterfaceOrThrow(typesSourceFile, `${prefix}State`);

  const behaviorSourceFiles = project
    .addSourceFilesAtPaths(path.join(behaviorDir, '*.ts'))
    .filter((sourceFile) => !sourceFile.getFilePath().endsWith('.test.ts'));

  const behaviorFn = findBehaviorFunction(behaviorSourceFiles);
  if (!behaviorFn) {
    throw new Error(
      `No exported function with a get*Props-bearing return type found under ${behaviorDir}`
    );
  }

  const props: Record<string, InterfaceManifest> = {};
  for (const interfaceName of extractPropGetterInterfaceNames(behaviorFn)) {
    const key = propGetterKey(interfaceName, prefix);
    const iface = getInterfaceOrThrow(typesSourceFile, interfaceName);
    props[key] = { interfaceName, fields: extractFields(iface) };
  }

  return {
    config: { interfaceName: configInterface.getName(), fields: extractFields(configInterface) },
    state: { interfaceName: stateInterface.getName(), fields: extractFields(stateInterface) },
    props,
  };
}

/**
 * Walks every directory under `behaviorsDir` (e.g.
 * `packages/core/src/behaviors`) and builds a manifest entry for each, keyed
 * by the directory's kebab-case name.
 */
export function generateManifest(behaviorsDir: string, typesFilePath: string): Manifest {
  const project = new Project({ skipAddingFilesFromTsConfig: true });
  const typesSourceFile = project.addSourceFileAtPath(typesFilePath);

  const behaviorDirNames = readdirSync(behaviorsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const manifest: Manifest = {};
  for (const dirName of behaviorDirNames) {
    manifest[dirName] = extractBehaviorManifest(
      project,
      typesSourceFile,
      path.join(behaviorsDir, dirName),
      dirName
    );
  }
  return manifest;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const behaviorsDir = path.join(scriptDir, '..', '..', 'core', 'src', 'behaviors');
  const typesFilePath = path.join(scriptDir, '..', '..', 'core', 'src', 'types.ts');
  const outPath = path.join(scriptDir, '..', 'manifest.json');

  const manifest = generateManifest(behaviorsDir, typesFilePath);
  writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote ${path.relative(process.cwd(), outPath)}`);
}
