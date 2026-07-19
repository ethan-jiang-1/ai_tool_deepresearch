import { describe, it, before, after } from 'node:test';
// @impl EXA-004, PLR-001, VER-006
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createTempDir, cleanupAll } from '../../helpers/temp-dirs.mjs';

const VALIDATE = join(process.cwd(), 'DPT_FRAMEWORK/cli/validate-playbook.mjs');
const VALID = `---
schema: command-experiment/v2
experiment: gate-fork
case: case-11-light-four-returns
case_goal: Verify forkGate four returns.
verdict_mode: all
required_checks: [branch, schema_fail]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: light
durable_evidence_roles: []
proof_subject: deterministic_contract
subject_execution: none
fixture: fixture_backed
runtime: real_disposable_bundle
external_calls: none
verdict_judge: deterministic
---

# case-11-light-four-returns
`;

describe('validate-playbook.mjs command-experiment/v2', () => {
  let tmpDir;
  before(() => { tmpDir = createTempDir('validate-playbook'); });
  after(cleanupAll);

  function run(target) {
    return spawnSync('node', [VALIDATE, target], { encoding: 'utf8', timeout: 5000 });
  }

  it('passes one strict V2 playbook', () => {
    const file = join(tmpDir, 'case-11-light-four-returns.md');
    writeFileSync(file, VALID);
    assert.equal(run(file).status, 0);
  });

  it('rejects V1, retired fields and unknown fields', () => {
    for (const raw of [
      VALID.replace('command-experiment/v2', 'command-experiment/v1'),
      VALID.replace('case_goal:', 'weight: light\ncase_goal:'),
      VALID.replace('case_goal:', 'custom_field: value\ncase_goal:'),
    ]) {
      const file = join(tmpDir, `case-${Math.random().toString(16).slice(2)}-light-invalid.md`);
      writeFileSync(file, raw);
      assert.equal(run(file).status, 1);
    }
  });

  it('directory mode selects only runnable case filenames', () => {
    const dir = join(tmpDir, 'playbooks');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'case-11-light-four-returns.md'), VALID);
    writeFileSync(join(dir, 'README.md'), '# no frontmatter');
    writeFileSync(join(dir, 'RUN_AGENT_AUTORUN_EXPS.md'), '# instruction');
    writeFileSync(join(dir, 'PLAYBOOK_MANIFEST.md'), '# manifest');
    const result = run(dir);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /1 passed, 0 failed/);
  });

  it('fails when a runnable case has invalid policy', () => {
    const dir = join(tmpDir, 'mixed');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'case-11-light-four-returns.md'), VALID);
    writeFileSync(join(dir, 'case-12-standard-repair-retry.md'), VALID.replace('case-11-light-four-returns', 'case-12-standard-repair-retry').replace('health_roles: [verdict]', 'health_roles: []'));
    assert.equal(run(dir).status, 1);
  });
});
