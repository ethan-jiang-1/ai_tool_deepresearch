// @impl VER-002, VER-003
import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { stringify as stringifyYaml } from 'yaml';

const REPO = process.cwd();
const CHECKER = join(REPO, 'openspec', 'governance', 'check-verification-routing.mjs');
const roots = [];

function write(root, path, content) {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function routePlan({ playbookPath = 'experiments_playbook/exp_example/case-11-light-example.md' } = {}) {
  return {
    schema_version: 'verification-routing/v1',
    change: 'example-change',
    test_classes: {
      unit: { status: 'selected', rationale: 'focused parser' },
      integration: { status: 'not_applicable', rationale: 'none needed' },
      deterministic_e2e: { status: 'not_applicable', rationale: 'none needed' },
      agent_flow_e2e: { status: 'selected', rationale: 'playbook proof' },
    },
    claims: [
      {
        id: 'parser-contract', statement: 'Parser contract.', test_class: 'unit', proof_subject: 'deterministic_contract',
        asset: { kind: 'node_test', path: 'tests/governance/parser.test.mjs' },
        execution_profile: { fixture: 'none', subject_execution: 'none', runtime: 'none', external_calls: 'none', verdict_judge: 'deterministic' },
        verdict_authority: 'node_test_exit',
      },
      {
        id: 'agent-contract', statement: 'Agent contract.', test_class: 'agent_flow_e2e', proof_subject: 'agent_behavior',
        asset: { kind: 'markdown_playbook', path: playbookPath },
        execution_profile: { fixture: 'setup_only', subject_execution: 'real_agent', runtime: 'real_disposable_bundle', external_calls: 'none', verdict_judge: 'deterministic' },
        verdict_authority: 'trace_jsonl',
      },
    ],
  };
}

const PLAYBOOK = `---
schema: command-experiment/v1
experiment: example
case: case-11-light-example
weight: light
case_goal: "Verify example behavior."
runner: coding-agent
agent_mode: real-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_example_case11
trace: dpt_disp_example_case11/rb_trace.jsonl
verdict: trace-jsonl
---

# case-11-light-example
`;

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'verification-routing-'));
  roots.push(root);
  write(root, 'openspec/changes/example-change/verification-plan.yaml', stringifyYaml(routePlan()));
  write(root, 'tests/governance/parser.test.mjs', '// fixture asset\n');
  write(root, 'experiments_playbook/exp_example/case-11-light-example.md', PLAYBOOK);
  write(root, 'experiments_playbook/RUN_EXPS.md', '| case-11 | `exp_example/case-11-light-example.md` | proof |\n');
  symlinkSync(join(REPO, 'DPT_FRAMEWORK'), join(root, 'DPT_FRAMEWORK'), 'dir');
  return root;
}

function run(root, mode = 'plan', extraEnv = {}) {
  return spawnSync(process.execPath, [CHECKER, '--change', 'example-change', '--mode', mode], {
    cwd: REPO,
    env: { ...process.env, VERIFICATION_ROUTING_PROJECT_ROOT: root, ...extraEnv },
    encoding: 'utf8',
    timeout: 10000,
  });
}

after(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

describe('check-verification-routing.mjs', () => {
  let root;
  beforeEach(() => { root = fixture(); });

  it('validates plan shape without requiring planned assets to exist', () => {
    rmSync(join(root, 'tests/governance/parser.test.mjs'));
    const result = run(root, 'plan');
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /plan valid/);
  });

  it('validates existing assets, playbook identity, and exact manifest registration', () => {
    const before = readFileSync(join(root, 'openspec/changes/example-change/verification-plan.yaml'), 'utf8');
    const result = run(root, 'assets');
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.equal(readFileSync(join(root, 'openspec/changes/example-change/verification-plan.yaml'), 'utf8'), before);
  });

  it('reports the nearest field and same-mode rerun for an invalid plan', () => {
    const value = routePlan();
    value.claims[0].method = 'regression';
    write(root, 'openspec/changes/example-change/verification-plan.yaml', stringifyYaml(value));
    const result = run(root, 'plan');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /claims\.0: Unrecognized key/);
    assert.match(result.stderr, /--mode plan/);
  });

  it('rejects missing assets only in assets mode', () => {
    rmSync(join(root, 'tests/governance/parser.test.mjs'));
    assert.equal(run(root, 'plan').status, 0);
    const result = run(root, 'assets');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /declared asset is missing/);
    assert.match(result.stderr, /write_to: tests\/governance\/parser\.test\.mjs/);
  });

  it('rejects a symlink whose realpath escapes the owned boundary', () => {
    const outside = join(root, 'outside.test.mjs');
    writeFileSync(outside, '// outside\n');
    rmSync(join(root, 'tests/governance/parser.test.mjs'));
    symlinkSync(outside, join(root, 'tests/governance/parser.test.mjs'));
    const result = run(root, 'assets');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /realpath escapes its owned boundary/);
  });

  it('rejects filename/frontmatter mismatch and duplicate case identity', () => {
    write(root, 'experiments_playbook/exp_other/case-11-light-example.md', PLAYBOOK);
    const duplicate = run(root, 'assets');
    assert.equal(duplicate.status, 1);
    assert.match(duplicate.stderr, /case identity is not globally unique/);
    rmSync(join(root, 'experiments_playbook/exp_other'), { recursive: true });
    write(root, 'experiments_playbook/exp_example/case-11-light-example.md', PLAYBOOK.replace('case: case-11-light-example', 'case: case-12-light-other'));
    const mismatch = run(root, 'assets');
    assert.equal(mismatch.status, 1);
    assert.match(mismatch.stderr, /filename stem does not match frontmatter case/);
  });

  it('rejects missing and duplicate active runner registration', () => {
    write(root, 'experiments_playbook/RUN_EXPS.md', '# none\n');
    const missing = run(root, 'assets');
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /found 0/);
    const ref = 'exp_example/case-11-light-example.md';
    write(root, 'experiments_playbook/RUN_EXPS.md', `${ref}\n${ref}\n`);
    const duplicate = run(root, 'assets');
    assert.equal(duplicate.status, 1);
    assert.match(duplicate.stderr, /found 2/);
  });

  it('rejects malformed invocation with configuration exit 2', () => {
    const result = spawnSync(process.execPath, [CHECKER, '--change', '../bad', '--mode', 'plan'], { cwd: REPO, encoding: 'utf8' });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Usage:/);
  });
});
