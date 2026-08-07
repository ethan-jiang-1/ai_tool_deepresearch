// @impl EXA-010, RWP-002

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { parse as parseYaml } from 'yaml';
import { parsePlaybookManifest } from '../../../DEEP_RESEARCH_HARNESS/host_tools/lib/agent-experiment-contract.mjs';

const CASE_PATH = 'experiments_playbook/exp_extrem_slow/case-225-extreme-slow-returned-work-closeout.md';
const MANIFEST_PATH = 'experiments_playbook/PLAYBOOK_MANIFEST.md';
const README_PATH = 'experiments_playbook/README.md';
const HEADLESS_INSTRUCTION_PATH = 'experiments_playbook/RUN_AGENT_AUTORUN_EXPS.md';
const INTERACTIVE_INSTRUCTION_PATH = 'experiments_playbook/RUN_INTERACTIVE_EXPS.md';
const SUBJECT_RUNNER = 'experiments_env/shared/run-iterative-interaction-subject.mjs';
const WORK_UNIT_HELPERS = 'experiments_env/shared/work-unit-playbook-utils.mjs';

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

  it('retains its static Phase-Agent contract while quarantined from active execution', () => {
    assert.equal(metadata.case, 'case-225-extreme-slow-returned-work-closeout');
    assert.equal(metadata.proof_subject, 'agent_behavior');
    assert.equal(metadata.subject_execution, 'real_agent');
    assert.equal(metadata.fixture, 'setup_only');
    assert.equal(metadata.runtime, 'real_disposable_bundle');
    assert.equal(metadata.external_calls, 'real');
    assert.deepEqual(metadata.durable_evidence_roles, [
      'subject_prompt', 'subject_transcript', 'subject_result', 'child_evidence',
      'dry_submit', 'formal_submit', 'phase_closeout', 'inspect',
    ]);
    const manifest = read(MANIFEST_PATH);
    const activePaths = parsePlaybookManifest(manifest);
    assert.equal(activePaths.includes(CASE_PATH.replace(/^experiments_playbook\//, '')), false);
    assert.equal(activePaths.some((path) => path.includes('case-225-')), false);
    assert.match(manifest, /## Extreme-slow quarantine/);
    assert.match(manifest, /refactor[\s\S]*otherwise remove/i);
    for (const path of [README_PATH, HEADLESS_INSTRUCTION_PATH, INTERACTIVE_INSTRUCTION_PATH]) {
      const content = read(path);
      assert.match(content, /exp_extrem_slow/);
      assert.match(content, /refactor[\s\S]*remove/i);
    }
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

  it('binds the queued Wave1 demand to the setup Topic instead of the helper default', () => {
    const setup = markdown.match(/## Step 1:[\s\S]*?(?=\n## Step 2:)/)?.[0] || '';
    const topicUid = setup.match(/topic_uid:\s*'([^']+)'/)?.[1];
    const helperDefaultUid = read(WORK_UNIT_HELPERS).match(/topic_uid = '([^']+)'/)?.[1];
    const queueCall = setup.match(/queueItemForWorkUnit\(\{([\s\S]*?)\}\),\s*\{ fileName:/)?.[1] || '';

    assert.ok(topicUid, 'setup declares its canonical Topic UID');
    assert.ok(helperDefaultUid, 'queue helper declares its fixture default Topic UID');
    assert.notEqual(topicUid, helperDefaultUid, 'case exercises a custom Topic UID');
    assert.match(queueCall, /topic_uid:\s*topic\.topic_uid/);
  });

  it('reads materialized references from the current Phase closeout index field', () => {
    const observer = markdown.match(/## Step 3:[\s\S]*?(?=\n## Step 4:)/)?.[0] || '';

    assert.match(observer, /closeout\.materialized_reference_refs/);
    assert.doesNotMatch(observer, /closeout\.reference_refs\b/);
  });

  it('requires literal Subject index keys and anchors their identity in the Engine work record', () => {
    const runner = read(SUBJECT_RUNNER);
    const case225 = runner.match(/'225':\s*\{([\s\S]*?)\n  \},\n  '232':/)?.[1] || '';
    const observer = markdown.match(/## Step 3:[\s\S]*?(?=\n## Step 4:)/)?.[0] || '';

    assert.match(case225, /case-225-child-evidence\.json[\s\S]*?exactly these literal keys: `work_id`, `queue_item_id`/);
    assert.match(case225, /Do not substitute `claimed_work_id`/);
    assert.match(case225, /case-225-phase-closeout\.json[\s\S]*?exactly these literal keys: `submitted_work_id`, `queue_item_id`, `materialized_reference_refs`/);
    assert.match(case225, /Do not substitute `materialized_references`/);
    assert.match(observer, /Object\.values\(index\.work_units \|\| \{\}\)\.find\(\s*\(candidate\) => candidate\.queue_item_id === 'case-225-primary-1'/s);
    assert.match(observer, /const childMatchesWork = Boolean\(work\?\.work_id\)\s*&& child\.work_id === work\.work_id\s*&& child\.queue_item_id === work\.queue_item_id/);
    assert.match(observer, /const closeoutMatchesWork = Boolean\(work\?\.work_id\)\s*&& closeout\.submitted_work_id === work\.work_id\s*&& closeout\.queue_item_id === work\.queue_item_id/);
    assert.match(observer, /work\?\.status === 'submitted'/);
    assert.doesNotMatch(observer, /index\.work_units\?\.\[child\.work_id\]/);
  });

  it('classifies only the Engine-recorded unavailable required-child fallback before observation', () => {
    const subject = markdown.match(/## Step 2:[\s\S]*?(?=\n## Step 3:)/)?.[0] || '';
    const successfulSubjectClassification = subject.match(
      /if \[ "\$SUBJECT_STATUS" -eq 0 \]; then\nnode --input-type=module - "\$B" <<'JS'\n([\s\S]*?)\nJS\nfi/,
    )?.[1] || '';

    assert.match(successfulSubjectClassification, /readFileSync\(join\(bundle, '_work_units', '_index\.json'\), 'utf8'\)/);
    assert.match(successfulSubjectClassification, /queue_item_id === 'case-225-primary-1'/);
    assert.match(successfulSubjectClassification, /execution_actor_class === 'phase_agent_fallback'/);
    assert.match(successfulSubjectClassification, /fallback_from === 'delegated_subagent'/);
    assert.match(successfulSubjectClassification, /delegated_role_key === 'dpt-evidence-extractor'/);
    assert.match(successfulSubjectClassification, /observation\?\.outcome === 'unavailable'/);
    assert.match(successfulSubjectClassification, /writeFileSync\(\s*join\(bundle, 'case-225-subject-unavailable\.txt'\)/s);
    assert.doesNotMatch(successfulSubjectClassification, /execution_actor_class === 'delegated_subagent'/);
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
