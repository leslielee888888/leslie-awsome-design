import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { load } from 'js-yaml';

interface WorkflowStep {
  run?: string;
  uses?: string;
  with?: Record<string, unknown>;
}
interface Workflow {
  on: { push?: { branches?: string[] } };
  permissions: Record<string, string>;
  jobs: { release: { steps: WorkflowStep[] } };
}

interface RootPackageJson {
  scripts?: Record<string, string>;
}

describe('release workflow', () => {
  it('is valid YAML, triggers on push to main, and has packages: write permission', () => {
    const filePath = path.join(process.cwd(), '.github', 'workflows', 'release.yml');
    const doc = load(readFileSync(filePath, 'utf-8')) as Workflow;

    expect(doc.on.push?.branches).toContain('main');
    expect(doc.permissions.packages).toBe('write');
    expect(doc.jobs.release.steps.some((s) => s.uses?.startsWith('changesets/action'))).toBe(true);
  });

  it('pins changesets/action to v2 and points publish-script at a real root script', () => {
    const filePath = path.join(process.cwd(), '.github', 'workflows', 'release.yml');
    const doc = load(readFileSync(filePath, 'utf-8')) as Workflow;

    const changesetsStep = doc.jobs.release.steps.find((s) =>
      s.uses?.startsWith('changesets/action')
    );
    expect(changesetsStep).toBeDefined();
    expect(changesetsStep?.uses).toBe('changesets/action@v2');

    const publishScript = changesetsStep?.with?.['publish-script'];
    expect(typeof publishScript).toBe('string');

    const scriptName = (publishScript as string).replace(/^(pnpm|npm run)\s+/, '').trim();

    const pkgPath = path.join(process.cwd(), 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as RootPackageJson;

    expect(pkg.scripts).toBeDefined();
    expect(pkg.scripts).toHaveProperty(scriptName);
  });
});
