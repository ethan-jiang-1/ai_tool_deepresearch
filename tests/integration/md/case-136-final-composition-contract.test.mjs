// @impl HIU-003, CDP-001, CDP-003, CDP-004, CDP-006, CDE-001, CDE-002, CDE-003

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { PlaybookFrontmatterSchema } from '../../../DEEP_RESEARCH_HARNESS/schema/contracts/playbook.mjs';

const ROOT = process.cwd();
const PLAYBOOK_PATH = 'experiments_playbook/exp_extrem_slow/case-136-extreme-slow-final-composition.md';
const MANIFEST_PATH = 'exp_extrem_slow/case-136-extreme-slow-final-composition.md';
const playbook = readFileSync(`${ROOT}/${PLAYBOOK_PATH}`, 'utf8');
const runner = readFileSync(`${ROOT}/experiments_env/shared/run-iterative-interaction-subject.mjs`, 'utf8');
const manifest = readFileSync(`${ROOT}/experiments_playbook/PLAYBOOK_MANIFEST.md`, 'utf8');

function frontmatter(markdown) {
  const raw = markdown.match(/^---\n([\s\S]*?)\n---/)?.[1];
  assert.ok(raw, 'playbook frontmatter is required');
  return raw;
}

describe('case-136 Final composition experiment contract', () => {
  it('is quarantined after retained real-Agent timeouts', async () => {
    const { parse } = await import('yaml');
    const policy = PlaybookFrontmatterSchema.parse(parse(frontmatter(playbook)));

    assert.equal(policy.case, 'case-136-heavy-final-composition');
    assert.equal(policy.proof_subject, 'agent_behavior');
    assert.equal(policy.subject_execution, 'real_agent');
    assert.equal(policy.fixture, 'setup_only');
    assert.equal(policy.verdict_judge, 'ai_judge');
    assert.deepEqual(policy.bundle_roles, ['executive', 'claim', 'technical', 'custom']);
    assert.deepEqual(policy.health_roles, ['executive', 'claim', 'technical', 'custom']);
    const active = manifest.match(/<!-- agent-experiment-manifest:v1 -->\n([\s\S]*?)<!-- \/agent-experiment-manifest -->/)?.[1] || '';
    assert.equal(active.includes(MANIFEST_PATH), false);
    assert.match(playbook, /QUARANTINED - EXTREME SLOW/);
    assert.match(playbook, /600139 ms/);
    assert.match(playbook, /600133 ms/);
  });

  it('uses the existing Subject launcher for HILT2, Readiness, Final, and a separate judge', () => {
    assert.match(playbook, /run-iterative-interaction-subject\.mjs 136 --bundle/);
    assert.match(playbook, /run-iterative-interaction-subject\.mjs 136-judge --bundle/);
    assert.match(runner, /'136': \{/);
    assert.match(runner, /'136-judge': \{/);
    assert.match(runner, /afterTurn: observeCase136Boundary/);
    assert.match(runner, /case-136-subject-observation\.json/);
    assert.match(runner, /persist-final-report/);
    assert.match(runner, /tools: 'Bash,Edit,Glob,Grep,Read,Write'/);
    assert.doesNotMatch(runner.match(/'136': \{[\s\S]*?\n  \},\n  '136-judge'/)?.[0] || '', /Task,/);
  });

  it('keeps one primary report, existing persistence admission, and the terminal boundary explicit', () => {
    for (const marker of [
      'case-136-baseline-isolation',
      'case-136-executive-subject',
      'case-136-claim-subject',
      'case-136-technical-subject',
      'case-136-custom-subject',
      'case-136-cross-view-isolation',
      'case-136-ai-judge',
      'case-136-judge-record.json',
    ]) assert.ok(playbook.includes(marker), marker);

    assert.match(playbook, /exactly one primary Final Markdown report/i);
    assert.match(playbook, /no Subject transcript names another view bundle/i);
    assert.match(playbook, /NOT_RUN/);
    for (const marker of [
      'persist-final-report',
      'final_response_has_question',
      'final_gate_attempt_present',
      'final_delivery_trace_present',
    ]) assert.ok(runner.includes(marker), marker);
  });
});
