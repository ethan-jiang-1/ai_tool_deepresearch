// @impl AGT-003, RWE-002, DEW-009, SNC-007, RWP-015

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { parse as parseYaml } from 'yaml';

const CASE_PATH = 'experiments_playbook/exp_wfn_wave1/case-221-heavy-batch-subagent.md';
const FIXTURE_RUNNER_PATH = 'experiments_env/shared/run-fixture-backed-case.mjs';

function readCase() {
  return readFileSync(CASE_PATH, 'utf8');
}

function frontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(match, 'case frontmatter exists');
  return parseYaml(match[1]);
}

describe('case-221 first-return proof contract', () => {
  it('preserves the actor-checkpoint identity, checks and durable evidence roles', () => {
    const markdown = readCase();
    const metadata = frontmatter(markdown);
    assert.equal(metadata.case, 'case-221-heavy-batch-subagent');
    assert.deepEqual(metadata.required_checks, ['real-wave1-batch-submit', 'work-unit-inspect']);
    assert.deepEqual(metadata.durable_evidence_roles, ['subject_task', 'subject_result', 'subject_receipt', 'subject_output']);
    assert.equal(metadata.proof_subject, 'agent_behavior');
    assert.equal(metadata.subject_execution, 'real_subagent');
  });

  it('requires both generated-surface actors to dry-submit before formal submit and preserves only one raw output role', () => {
    const markdown = readCase();
    assert.match(markdown, /two actor entries keyed by `work_id`/);
    assert.match(markdown, /supply only its generated task prompt to a real `dpt-evidence-extractor` actor/);
    assert.match(markdown, /dry-submit/);
    assert.match(markdown, /dry_submit_all_pass/);
    assert.match(markdown, /const submits = dryPass/);
    assert.match(markdown, /case-221-first-return\.json/);
    assert.match(markdown, /subject_output=\$OUTPUT/);
    assert.doesNotMatch(markdown, /subject_output_pair|subject_fetch_observation|first-return-curl/);
  });

  it('binds the representative actor to manifest-derived paired targets, work_done, dry/formal outcomes and stable hashes', () => {
    const markdown = readCase();
    assert.match(markdown, /manifest\.output_contract\.required_outputs/);
    assert.match(markdown, /row\.event === 'work_done'/);
    assert.match(markdown, /targetPaths\.length === 2/);
    assert.match(markdown, /createHash\('sha256'\)/);
    assert.match(markdown, /pre_hashes/);
    assert.match(markdown, /post_hashes/);
    assert.match(markdown, /hashesMatch/);
    assert.match(markdown, /formal_submit/);
    assert.match(markdown, /passed,\n  detail: JSON\.stringify/);
  });

  it('stops after submit and inspection without Phase completion or Gate verdict work', () => {
    const markdown = readCase();
    const runner = readFileSync(FIXTURE_RUNNER_PATH, 'utf8');
    const case221Runner = runner.slice(runner.indexOf('function case221'), runner.indexOf('function case222'));
    assert.match(markdown, /does not establish Phase-owned Wave1 semantic projections, invoke a Wave1 Gate, or report Wave1 readiness/);
    assert.match(markdown, /recordPlaybookCheck\(bundle, \{\s+gate: 'real-wave1-batch-submit'/);
    assert.match(markdown, /recordPlaybookCheck\(bundle, \{ gate: 'work-unit-inspect'/);
    assert.doesNotMatch(markdown, /wave1_completion/);
    assert.doesNotMatch(markdown, /check-gate-wave1-complete\.mjs/);
    assert.doesNotMatch(markdown, /case-221-gate\.json/);
    assert.doesNotMatch(markdown, /gate: 'wave1-gate'/);
    assert.doesNotMatch(case221Runner, /wave1_completion/);
    assert.doesNotMatch(case221Runner, /runWave1Gate/);
    assert.doesNotMatch(case221Runner, /wave1-gate/);
  });
});
