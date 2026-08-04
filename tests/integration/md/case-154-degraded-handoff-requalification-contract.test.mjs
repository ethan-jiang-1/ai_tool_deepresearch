// @impl RWE-013

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { parse as parseYaml } from 'yaml';

const CASE_PATH = 'experiments_playbook/exp_wff_wave-chain/case-154-heavy-degraded-handoff-requalification.md';
const MANIFEST_PATH = 'experiments_playbook/PLAYBOOK_MANIFEST.md';
const SUBJECT_RUNNER = 'experiments_env/shared/run-iterative-interaction-subject.mjs';
const SETUP_HELPER = 'experiments_env/shared/prepare-degraded-handoff-requalification-case.mjs';

function read(path) {
  return readFileSync(path, 'utf8');
}

function frontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(match, 'case frontmatter exists');
  return parseYaml(match[1]);
}

describe('case-154 degraded-handoff requalification contract', () => {
  const markdown = read(CASE_PATH);
  const metadata = frontmatter(markdown);

  it('registers exactly one bounded real-Agent V2 observation', () => {
    assert.equal(metadata.case, 'case-154-heavy-degraded-handoff-requalification');
    assert.equal(metadata.proof_subject, 'agent_behavior');
    assert.equal(metadata.subject_execution, 'real_agent');
    assert.equal(metadata.fixture, 'setup_only');
    assert.equal(metadata.runtime, 'real_disposable_bundle');
    assert.equal(metadata.external_calls, 'real');
    assert.deepEqual(metadata.durable_evidence_roles, ['subject_prompt', 'subject_transcript', 'subject_result']);
    assert.equal((read(MANIFEST_PATH).match(/case-154-heavy-degraded-handoff-requalification\.md/g) || []).length, 1);
  });

  it('uses current production Gate, entry, and status commands for the degraded predecessor boundary', () => {
    const setup = markdown.match(/## Step 1:[\s\S]*?(?=\n## Step 2:)/)?.[0] || '';
    const helper = read(SETUP_HELPER);
    assert.match(setup, /prepare-degraded-handoff-requalification-case\.mjs/);
    assert.match(helper, /check-gate-\$\{name\}\.mjs/);
    assert.match(helper, /'wave0-complete'/);
    assert.match(helper, /attempt: 3/);
    assert.match(helper, /shared_ref_count_floor/);
    assert.match(helper, /enter-phase\.mjs/);
    assert.match(helper, /advance-status\.mjs/);
    assert.match(helper, /wave2_decision_absent: true/);
    assert.match(helper, /targeted_evidence_result_absent: true/);
  });

  it('reloads only the established Wave2 surface in the same Subject session', () => {
    const runner = read(SUBJECT_RUNNER);
    assert.match(runner, /'154':\s*\{/);
    assert.match(runner, /bundlePrefix:\s*'dpt_disp_case-154_'/);
    assert.match(runner, /afterTurn:\s*reloadCase154Wave2Surface/);
    assert.match(runner, /function reloadCase154Wave2Surface/);
    assert.match(runner, /status\.current_node !== 'phases\/phase-wave2\.md'/);
    assert.match(runner, /loadProductionSurface\(bundle\)/);
    assert.match(runner, /case-154-wave2-surface\.json/);
    assert.match(runner, /turnMessages\[turnIndex \+ 1\] = followup\.message/);
  });

  it('requires the named delegated Wave2 evidence path and has no static behavior claim', () => {
    const subject = markdown.match(/## Step 2:[\s\S]*?(?=\n## Step 3:)/)?.[0] || '';
    const observer = markdown.match(/## Step 3:[\s\S]*?(?=\n## Step 4:)/)?.[0] || '';
    assert.match(subject, /run-iterative-interaction-subject\.mjs 154/);
    assert.match(subject, /one same-session two-turn Subject/i);
    assert.match(markdown, /W2F-154/);
    assert.match(read(SUBJECT_RUNNER), /gap_status: needs_search/);
    assert.match(markdown, /wave2_targeted_evidence/);
    assert.match(markdown, /Subject itself must not\s+call `WebSearch` or `WebFetch`/);
    assert.match(observer, /case-154-targeted-evidence\.json/);
    assert.match(observer, /delegated_subagent/);
    assert.match(observer, /type === 'tool_use'/);
    assert.match(markdown, /cannot\s+substitute for Subject behavior evidence/i);
  });

  it('maps capability absence to native NOT_RUN without a substitute result', () => {
    assert.match(markdown, /case-154-subject-unavailable\.txt/);
    assert.match(markdown, /--not-run-reason/);
    assert.match(markdown, /Do not retry this case/);
    assert.match(markdown, /retained\s+actual evidence shows the specified prohibited Subject behavior/i);
  });
});
