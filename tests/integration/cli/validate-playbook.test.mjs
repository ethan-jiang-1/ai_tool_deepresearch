// tests/integration/cli/validate-playbook.test.mjs
import { describe, it, before, after } from 'node:test';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createTempDir, cleanupAll } from '../../helpers/temp-dirs.mjs';

const VALIDATE = join(process.cwd(), 'DPT_FRAMEWORK/cli/validate-playbook.mjs');

const VALID_FRONTMATTER = `---
schema: command-experiment/v1
experiment: gate-fork
case: case-11-light-four-returns
weight: light
case_goal: "Verify forkGate four returns."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-11_gf_simple
trace: dpt_disp_case-11_gf_simple/_logs/_trace.jsonl
verdict: trace-jsonl
---

# case-11-light-four-returns

Some body content.
`;

describe('validate-playbook.mjs integration', () => {
  let tmpDir;

  before(() => {
    tmpDir = createTempDir('validate-playbook');
  });

  after(cleanupAll);

  it('passes on valid playbook (single file)', () => {
    const f = join(tmpDir, 'case-valid.md');
    writeFileSync(f, VALID_FRONTMATTER);
    const r = spawnSync('node', [VALIDATE, f], { encoding: 'utf-8', timeout: 5000 });
    if (r.status !== 0) throw new Error(`Expected exit 0, got ${r.status}\n${r.stdout}\n${r.stderr}`);
  });

  it('fails on missing schema field (single file)', () => {
    const f = join(tmpDir, 'case-bad.md');
    writeFileSync(f, `---
experiment: test
case: case-01
weight: light
case_goal: test
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_test
trace: dpt_disp_test/_logs/_trace.jsonl
verdict: trace-jsonl
---

# Test
`);
    const r = spawnSync('node', [VALIDATE, f], { encoding: 'utf-8', timeout: 5000 });
    if (r.status !== 1) throw new Error(`Expected exit 1, got ${r.status}\n${r.stdout}`);
  });

  it('fails on invalid weight enum', () => {
    const f = join(tmpDir, 'case-weight.md');
    writeFileSync(f, VALID_FRONTMATTER.replace('weight: light', 'weight: wrong'));
    const r = spawnSync('node', [VALIDATE, f], { encoding: 'utf-8', timeout: 5000 });
    if (r.status !== 1) throw new Error(`Expected exit 1, got ${r.status}\n${r.stdout}`);
  });

  it('passes with optional req field', () => {
    const f = join(tmpDir, 'case-req.md');
    writeFileSync(f, VALID_FRONTMATTER.replace('verdict: trace-jsonl', 'verdict: trace-jsonl\nreq: AGQ-006'));
    const r = spawnSync('node', [VALIDATE, f], { encoding: 'utf-8', timeout: 5000 });
    if (r.status !== 0) throw new Error(`Expected exit 0, got ${r.status}\n${r.stdout}\n${r.stderr}`);
  });

  it('passes on directory of valid playbooks', () => {
    const d = join(tmpDir, 'playbooks');
    mkdirSync(d, { recursive: true });
    writeFileSync(join(d, 'case-a.md'), VALID_FRONTMATTER);
    writeFileSync(join(d, 'case-b.md'), VALID_FRONTMATTER.replace('weight: light', 'weight: heavy'));
    writeFileSync(join(d, 'case-c.md'), VALID_FRONTMATTER.replace('verdict: trace-jsonl', 'verdict: filesystem'));
    const r = spawnSync('node', [VALIDATE, d], { encoding: 'utf-8', timeout: 5000 });
    if (r.status !== 0) throw new Error(`Expected exit 0 for 3 valid playbooks, got ${r.status}\n${r.stdout}\n${r.stderr}`);
  });

  it('fails when directory has one bad playbook', () => {
    const d = join(tmpDir, 'playbooks-mixed');
    mkdirSync(d, { recursive: true });
    writeFileSync(join(d, 'case-good.md'), VALID_FRONTMATTER);
    writeFileSync(join(d, 'case-bad.md'), VALID_FRONTMATTER.replace('weight: light', 'weight: invalid_weight'));
    const r = spawnSync('node', [VALIDATE, d], { encoding: 'utf-8', timeout: 5000 });
    if (r.status !== 1) throw new Error(`Expected exit 1 for mixed dir, got ${r.status}\n${r.stdout}`);
  });

  it('skips README.md and RUN_EXPS.md', () => {
    const d = join(tmpDir, 'playbooks-skip');
    mkdirSync(d, { recursive: true });
    writeFileSync(join(d, 'case-ok.md'), VALID_FRONTMATTER);
    // Write a bad "playbook" as README.md — should be skipped
    writeFileSync(join(d, 'README.md'), '# Not a playbook\n\nNo frontmatter here.');
    // Write a bad "playbook" as RUN_EXPS.md — should be skipped
    writeFileSync(join(d, 'RUN_EXPS.md'), '# Runner\n\nInstructions.');
    const r = spawnSync('node', [VALIDATE, d], { encoding: 'utf-8', timeout: 5000 });
    if (r.status !== 0) throw new Error(`Expected exit 0 (README/RUN_EXPS skipped), got ${r.status}\n${r.stdout}`);
  });

  it('passes on 75 real playbooks', () => {
    const r = spawnSync('node', [VALIDATE, 'experiments_playbook/'], { encoding: 'utf-8', timeout: 15000 });
    if (r.status !== 0) throw new Error(`Expected exit 0 for all real playbooks, got ${r.status}\n${r.stdout}`);
  });
});
