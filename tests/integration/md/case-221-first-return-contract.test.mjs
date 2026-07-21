// @impl DEW-009, SNC-007, RWP-015

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { parse as parseYaml } from 'yaml';

const CASE_PATH = 'experiments_playbook/exp_wfn_wave1/case-221-heavy-batch-subagent.md';

function readCase() {
  return readFileSync(CASE_PATH, 'utf8');
}

function frontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(match, 'case frontmatter exists');
  return parseYaml(match[1]);
}

describe('case-221 first-return proof contract', () => {
  it('preserves the existing case identity, checks and durable evidence roles', () => {
    const markdown = readCase();
    const metadata = frontmatter(markdown);
    assert.equal(metadata.case, 'case-221-heavy-batch-subagent');
    assert.deepEqual(metadata.required_checks, ['real-wave1-batch-submit', 'wave1-gate', 'work-unit-inspect']);
    assert.deepEqual(metadata.durable_evidence_roles, ['subject_task', 'subject_result', 'subject_receipt', 'subject_output']);
    assert.equal(metadata.proof_subject, 'agent_behavior');
    assert.equal(metadata.subject_execution, 'real_subagent');
  });

  it('requires both generated-surface actors to dry-submit before formal submit and preserves only one raw output role', () => {
    const markdown = readCase();
    assert.match(markdown, /two actor entries keyed by `work_id`/);
    assert.match(markdown, /generated task-directed role\/shared guidance/);
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
});
