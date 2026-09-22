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

describe('release workflow', () => {
  it('is valid YAML, triggers on push to main, and has packages: write permission', () => {
    const filePath = path.join(process.cwd(), '.github', 'workflows', 'release.yml');
    const doc = load(readFileSync(filePath, 'utf-8')) as Workflow;

    expect(doc.on.push?.branches).toContain('main');
    expect(doc.permissions.packages).toBe('write');
    expect(doc.jobs.release.steps.some((s) => s.uses?.startsWith('changesets/action'))).toBe(true);
  });
});
