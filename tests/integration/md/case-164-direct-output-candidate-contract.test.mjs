import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';

import { PlaybookFrontmatterSchema } from '../../../DPT_FRAMEWORK/schema/contracts/playbook.mjs';

const CASE_PATH = 'experiments_playbook/exp_evidence-extraction/case-164-heavy-direct-output-candidate-contract.md';
const MANIFEST_PATH = 'experiments_playbook/PLAYBOOK_MANIFEST.md';
const SUBJECT_RUNNER_PATH = 'experiments_env/shared/run-iterative-interaction-subject.mjs';
const CHILD_ACTOR = 'dpt-evidence-extractor child actor';

function read(path) {
  return readFileSync(path, 'utf8');
}

function frontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(match, 'case-164 frontmatter exists');
  return PlaybookFrontmatterSchema.parse(parseYaml(match[1]));
}

function readCaseMessages(runner, caseId) {
  const entryStart = runner.indexOf(`  '${caseId}': {`);
  assert.notEqual(entryStart, -1, `case ${caseId} runner entry exists`);

  const nextEntryStart = runner.indexOf("\n  '", entryStart + 1);
  assert.notEqual(nextEntryStart, -1, `case ${caseId} has a next runner entry`);
  const entry = runner.slice(entryStart, nextEntryStart);
  const messages = entry.match(/messages: \[\n([\s\S]*?)\n    \],\n    tools:/);
  assert.ok(messages, `case ${caseId} messages array exists`);

  return {
    entry,
    messages: [...messages[1].matchAll(/^      '([^']*)',?$/gm)].map((match) => match[1]),
  };
}

function assertCase164MessageProtocol(messages) {
  assert.equal(messages.length, 3, 'case 164 has exactly three Subject turns');

  const childTurns = messages.filter((message) => message.includes(CHILD_ACTOR));
  assert.equal(childTurns.length, 2, 'case 164 has exactly two child-bearing turns');
  assert.match(messages[0], new RegExp(CHILD_ACTOR), 'turn 1 requires the first child actor');
  assert.doesNotMatch(messages[1], new RegExp(CHILD_ACTOR), 'turn 2 forbids a child actor');
  assert.match(messages[2], new RegExp(CHILD_ACTOR), 'turn 3 requires the second child actor');
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
    const { entry: case164, messages } = readCaseMessages(runner, '164');
    assert.doesNotMatch(case164, /case-225-child-evidence/);
    assertCase164MessageProtocol(messages);
    assert.match(case164, /afterTurn: observeCase164Boundary/);
    assert.match(runner, /case-164 turn 2 changed first-child canonical output bytes/);
  });

  it('rejects malformed case-164 message protocols without changing runtime sources', () => {
    const { messages } = readCaseMessages(read(SUBJECT_RUNNER_PATH), '164');

    assert.throws(
      () => assertCase164MessageProtocol(messages.slice(0, 2)),
      /exactly three Subject turns/,
    );

    const childInTurn2 = [...messages];
    childInTurn2[1] = `${childInTurn2[1]} Invoke one ${CHILD_ACTOR}.`;
    assert.throws(
      () => assertCase164MessageProtocol(childInTurn2),
      /exactly two child-bearing turns/,
    );

    const onlyOneChildTurn = [...messages];
    onlyOneChildTurn[2] = onlyOneChildTurn[2].replace(CHILD_ACTOR, 'delegated actor');
    assert.throws(
      () => assertCase164MessageProtocol(onlyOneChildTurn),
      /exactly two child-bearing turns/,
    );
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
