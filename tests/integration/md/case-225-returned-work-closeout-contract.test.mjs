// @impl RWP-002

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { parse as parseYaml } from 'yaml';

const CASE_PATH = 'experiments_playbook/exp_wfn_wave1/case-225-heavy-returned-work-closeout.md';
const MANIFEST_PATH = 'experiments_playbook/PLAYBOOK_MANIFEST.md';
const SUBJECT_RUNNER = 'experiments_env/shared/run-iterative-interaction-subject.mjs';

function read(path) {
  return readFileSync(path, 'utf8');
}

function frontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(match, 'case frontmatter exists');
  return parseYaml(match[1]);
}

describe('case-225 returned-work closeout evidence boundary', () => {
  const markdown = read(CASE_PATH);
  const metadata = frontmatter(markdown);

  it('registers one real Phase-Agent case with retained native evidence', () => {
    assert.equal(metadata.case, 'case-225-heavy-returned-work-closeout');
    assert.equal(metadata.proof_subject, 'agent_behavior');
    assert.equal(metadata.subject_execution, 'real_agent');
    assert.equal(metadata.fixture, 'setup_only');
    assert.equal(metadata.runtime, 'real_disposable_bundle');
    assert.equal(metadata.external_calls, 'real');
    assert.deepEqual(metadata.durable_evidence_roles, [
      'subject_prompt', 'subject_transcript', 'subject_result', 'child_evidence',
      'dry_submit', 'formal_submit', 'phase_closeout', 'inspect',
    ]);
    assert.equal((read(MANIFEST_PATH).match(/case-225-heavy-returned-work-closeout\.md/g) || []).length, 1);
  });

  it('keeps setup before claim and gives the independent Subject the returned-work loop', () => {
    const setup = markdown.match(/## Step 1:[\s\S]*?(?=\n## Step 2:)/)?.[0] || '';
    const subject = markdown.match(/## Step 2:[\s\S]*?(?=\n## Step 3:)/)?.[0] || '';

    assert.doesNotMatch(setup, /operate-work-unit\.mjs claim/);
    assert.doesNotMatch(setup, /operate-work-unit\.mjs (?:dry-submit|submit)/);
    assert.match(subject, /run-iterative-interaction-subject\.mjs 225/);
    assert.match(subject, /Subject Agent, not the Playbook Agent/i);
    assert.match(markdown, /real `dpt-evidence-extractor` child/i);
    assert.match(markdown, /native dry-submit.*formal submit/is);
    assert.match(markdown, /submitted-backed reference\/index-depth-backfill closeout/i);
  });

  it('retains the adapter boundary and finalizes NOT_RUN without a fixture substitute', () => {
    const runner = read(SUBJECT_RUNNER);
    assert.match(runner, /'225':\s*\{/);
    assert.match(runner, /bundlePrefix:\s*'dpt_disp_case-225_'/);
    assert.match(runner, /Task,Bash,Edit,Glob,Grep,Read,WebFetch,WebSearch,Write/);
    assert.match(runner, /Do not append playbook verdict checks, native completion, health output, cleanup/);
    assert.match(markdown, /case-225-subject-unavailable\.txt/);
    assert.match(markdown, /--not-run-reason/);
    assert.match(markdown, /becomes `NOT_RUN`, never a fixture-backed PASS/i);
  });

  it('limits Playbook mutation to case-owned checks after native Subject evidence exists', () => {
    const observer = markdown.match(/## Step 3:[\s\S]*?(?=\n## Step 4:)/)?.[0] || '';
    assert.match(observer, /read-only over Subject, child, and Engine authority/i);
    assert.match(observer, /recordPlaybookCheck/);
    assert.match(observer, /delegated_subagent/);
    assert.match(observer, /rb_output_declarations\.jsonl/);
    assert.match(observer, /case-225-(?:dry-submit|formal-submit|phase-closeout|inspect)\.json/);
  });
});
