import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';

import { PlaybookFrontmatterSchema } from '../../../DPT_FRAMEWORK/schema/contracts/playbook.mjs';

const CASE_PATH = 'experiments_playbook/exp_evidence-extraction/case-164-heavy-direct-output-candidate-contract.md';
const MANIFEST_PATH = 'experiments_playbook/PLAYBOOK_MANIFEST.md';
const SUBJECT_RUNNER_PATH = 'experiments_env/shared/run-iterative-interaction-subject.mjs';

function read(path) {
  return readFileSync(path, 'utf8');
}

function frontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(match, 'case-164 frontmatter exists');
  return PlaybookFrontmatterSchema.parse(parseYaml(match[1]));
}

describe('case-164 real-Agent candidate contract', () => {
  const markdown = read(CASE_PATH);

  it('declares the selected V2 agent-flow execution profile and durable evidence', () => {
    const parsed = frontmatter(markdown);
    assert.equal(parsed.subject_execution, 'real_agent');
    assert.equal(parsed.fixture, 'setup_only');
    assert.equal(parsed.runtime, 'real_disposable_bundle');
    assert.equal(parsed.external_calls, 'real');
    assert.equal(parsed.verdict_judge, 'deterministic');
    assert.equal(parsed.health_profile, 'light');
    assert.deepEqual(parsed.durable_evidence_roles, [
      'subject_transcript',
      'subject_result',
      'first_child_result',
      'second_child_result',
      'dry_submit_rejection',
      'output_hashes',
    ]);
    assert.equal(parsed.required_checks.length, 5);
  });

  it('stops setup before claim and requires three bounded Subject turns plus two child actors', () => {
    const setup = markdown.slice(markdown.indexOf('## Step 1:'), markdown.indexOf('## Step 2:'));
    assert.match(setup, /kind: 'wave1_topic_deepening'/);
    assert.match(setup, /assignment_mode: 'primary'/);
    assert.match(setup, /'_work_units\/_index\.json'/);
    assert.doesNotMatch(setup, /\n\s*'_work_units',/);
    assert.doesNotMatch(setup, /operate-work-unit\.mjs claim/);
    assert.match(markdown, /same Subject session/i);
    assert.match(markdown, /first Subject turn/i);
    assert.match(markdown, /Turn 2 Closes And Replaces/i);
    assert.match(markdown, /Turn 3 Executes Only The Replacement/i);
    assert.match(markdown, /first real child actor/i);
    assert.match(markdown, /second distinct real child actor/i);
    assert.match(markdown, /bounded real search and fetch/i);
    assert.match(markdown, /run-iterative-interaction-subject\.mjs 164 --bundle/);
    assert.match(markdown, /nohup \/bin\/sh/);
    assert.match(markdown, /case-164-subject-adapter-status\.json/);
    assert.match(markdown, /do not read private child transcript files, delete evidence, restart setup/i);
    assert.match(markdown, /Never repair or restart the case after a nonzero adapter status/);
    const runner = read(SUBJECT_RUNNER_PATH);
    const case164 = runner.slice(runner.indexOf("'164':"), runner.indexOf("'232':"));
    assert.match(case164, /messages: \[/);
    assert.equal((case164.match(/dpt-evidence-extractor child actor/g) || []).length, 2);
    assert.match(case164, /afterTurn: observeCase164Boundary/);
    assert.match(runner, /case-164 turn 2 changed first-child canonical output bytes/);
  });

  it('retains native rejection and hash boundaries without fixture authority', () => {
    assert.match(markdown, /case-164-turn1-dry-submit\.json/);
    assert.match(markdown, /repair_scope: semantic_content/);
    assert.match(markdown, /recommended_action: fail_and_replace/);
    assert.match(markdown, /semantic_contract:<primary_root_code>/);
    assert.match(markdown, /fresh globally unused queue_item_id/i);
    assert.match(markdown, /before_turn2/);
    assert.match(markdown, /after_turn2/);
    for (const ref of ['case-164-turn2-fail.json', 'case-164-turn2-enqueue.json', 'case-164-turn2-claim.json']) {
      assert.match(markdown, new RegExp(ref.replaceAll('.', '\\.')));
      assert.match(read(SUBJECT_RUNNER_PATH), new RegExp(ref.replaceAll('.', '\\.')));
    }
    assert.match(markdown, /must not write an actor result, runtime receipt, required output, source\/cache fact, submitted ledger row/i);
  });

  it('keeps PASS narrow and unavailable execution honestly NOT_RUN', () => {
    assert.match(markdown, /append only the five case-owned `check` events/i);
    assert.match(markdown, /subject\.status === 'completed' && subject\.completed_turns === 3/);
    assert.match(markdown, /WorkUnitResultSchema\.safeParse\(secondResult\)/);
    assert.match(markdown, /must not invent dry-submit output, work-unit lifecycle events, actor receipts, queue transitions, or submitted rows/i);
    assert.match(markdown, /proves only that this Subject followed the explicit post-`work_done` semantic replacement procedure/i);
    assert.match(markdown, /native `NOT_RUN`/);
    assert.match(markdown, /`NOT_RUN` is incomplete and is never PASS/);
  });

  it('registers the exact case path once', () => {
    const manifest = read(MANIFEST_PATH);
    const escaped = CASE_PATH.replace(/^experiments_playbook\//, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.equal((manifest.match(new RegExp(escaped, 'g')) || []).length, 1);
  });
});
