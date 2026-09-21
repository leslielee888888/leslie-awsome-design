import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { load } from 'js-yaml';

interface WorkflowStep {
  run?: string;
  uses?: string;
}

interface Workflow {
  on: { pull_request?: { paths?: string[] }; push?: { paths?: string[] } };
  jobs: { validate: { steps: WorkflowStep[] } };
}

describe('validate-tokens workflow', () => {
  it('is valid YAML with the expected job and trigger paths', () => {
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
    const filePath = path.join(repoRoot, '.github', 'workflows', 'validate-tokens.yml');
    const doc = load(readFileSync(filePath, 'utf-8')) as Workflow;

    expect(doc.jobs.validate).toBeDefined();
    expect(doc.on.pull_request?.paths).toContain('packages/tokens/**');
    expect(doc.jobs.validate.steps.some((s) => (s.run ?? '').includes('run validate'))).toBe(true);
  });
});
