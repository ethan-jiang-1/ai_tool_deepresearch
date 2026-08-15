// @impl CDE-003
// This is deterministic-contract proof only; it cannot establish Agent behavior.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { PlaybookFrontmatterSchema } from '../../../DEEP_RESEARCH_HARNESS/schema/contracts/playbook.mjs';

const ROOT = process.cwd();
const PLAYBOOK_PATH = 'experiments_playbook/exp_extrem_slow/case-137-extreme-slow-final-composition.md';
const MANIFEST_PATH = 'exp_wff_delivery/case-137-standard-fast-final-composition.md';
const NO_EVIDENCE_PATH = 'openspec/changes/fast-final-composition-evidence/agent-run-evidence.md';
const playbook = readFileSync(`${ROOT}/${PLAYBOOK_PATH}`, 'utf8');
const runner = readFileSync(`${ROOT}/experiments_env/shared/run-iterative-interaction-subject.mjs`, 'utf8');
const manifest = readFileSync(`${ROOT}/experiments_playbook/PLAYBOOK_MANIFEST.md`, 'utf8');
const noEvidence = readFileSync(`${ROOT}/${NO_EVIDENCE_PATH}`, 'utf8');

function frontmatter(markdown) {
  const raw = markdown.match(/^---\n([\s\S]*?)\n---/)?.[1];
  assert.ok(raw, 'playbook frontmatter is required');
  return raw;
}

function activeManifestPaths() {
  const table = manifest.match(/<!-- agent-experiment-manifest:v1 -->\n([\s\S]*?)<!-- \/agent-experiment-manifest -->/)?.[1] || '';
  return [...table.matchAll(/^\| `([^`]+)` \|$/gm)].map((match) => match[1]);
}

function case137SubjectConfig() {
  const config = runner.match(/  '137': \{[\s\S]*?\n  \},\n  '136-judge': \{/)?.[0];
  assert.ok(config, 'case-137 Subject configuration is required');
  return config;
}

describe('case-137 fast Final composition source contract', () => {
  it('retains the setup-only real-Agent source contract while it is quarantined', async () => {
    const { parse } = await import('yaml');
    const policy = PlaybookFrontmatterSchema.parse(parse(frontmatter(playbook)));

    assert.equal(policy.case, 'case-137-standard-fast-final-composition');
    assert.equal(policy.proof_subject, 'agent_behavior');
    assert.equal(policy.subject_execution, 'real_agent');
    assert.equal(policy.fixture, 'setup_only');
    assert.equal(policy.runtime, 'real_disposable_bundle');
    assert.equal(policy.external_calls, 'none');
    assert.equal(policy.verdict_judge, 'deterministic');
    assert.deepEqual(policy.bundle_roles, ['verdict']);
    assert.deepEqual(policy.health_roles, ['verdict']);
    assert.deepEqual(policy.required_checks, [
      'case-137-fixture-boundary',
      'case-137-subject-final',
      'case-137-terminal-discipline',
    ]);
    assert.equal(activeManifestPaths().filter((path) => path === MANIFEST_PATH).length, 0);
  });

  it('keeps the fixture and Subject scope to one legal Final composition', () => {
    for (const marker of [
      'new-disposable-bundle.mjs case137',
      'root_must_answer_set:',
      'case-137-verified-source',
      'evaluateCompositionProceed(profile)',
      'compositionHandoffReceipt: composition.receipt',
      'reports.length === 0',
      'run-iterative-interaction-subject.mjs 137 --bundle',
      'persist-final-report',
      'case-137-final-persistence.json',
      'case-137-subject-observation.json',
      'report_bytes <= 1600',
      'evidence_map_rows === 1',
      'node --input-type=module - "$B" {{RUN_CONTEXT_SH}}',
    ]) assert.ok(playbook.includes(marker), marker);

    assert.equal((playbook.match(/run-iterative-interaction-subject\.mjs 137 --bundle/g) || []).length, 1);
    assert.match(playbook, /length: concise/);
    assert.match(playbook, /evidence_exposure: audit_ready/);

    const config = case137SubjectConfig();
    const messages = config.match(/messages:\s*\[([\s\S]*?)\],\n    tools:/)?.[1] || '';
    assert.ok(messages, 'case-137 must define one Subject message');
    assert.equal((messages.match(/Execute the injected current Final Phase guidance/g) || []).length, 1);
    assert.match(config, /tools: 'Bash,Glob,Grep,Read,Write'/);
    assert.match(config, /afterTurn: observeCase137Boundary/);
    assert.match(config, /timeoutMs: 30_000/);
    assert.doesNotMatch(config.match(/tools: '[^']+'/)?.[0] || '', /Task|WebFetch|WebSearch/);
  });

  it('records terminal discipline and the separate 30/45/5/60-second evidence boundary', () => {
    const config = case137SubjectConfig();
    const observer = runner.match(/function observeCase137Boundary\([\s\S]*?\n}\n\nfunction observeCase318CrashWindow/)?.[0] || '';

    for (const marker of [
      'completedTurns !== 1',
      'reports.length !== 1',
      'reportBytes > 1600',
      'evidenceMapRows !== 1',
      'persist-final-report',
      'prohibited_tool_present',
      "['Task', 'WebFetch', 'WebSearch']",
    ]) assert.ok(observer.includes(marker), marker);

    assert.match(config, /Use exactly one Final-only turn/);
    assert.match(playbook, /--timeout 45000/);
    assert.match(playbook, /--health-timeout 5000/);
    assert.match(playbook, /duration_ms <= 60000/);
    assert.match(playbook, /native outcome is `PASS`/);
    assert.match(playbook, /lifecycle outcome\s+is null/);
    assert.match(playbook, /health is `CLEAN`/);
    assert.match(playbook, /not a whole-case deadline/);
  });

  it('records the one-shot no-evidence outcome without semantic judging or historical substitutes', () => {
    assert.doesNotMatch(frontmatter(playbook), /ai_judge/);
    assert.match(playbook, /do\s+not prove report quality/i);
    assert.match(playbook, /case-135 and case-136 diagnostics cannot substitute/i);
    assert.doesNotMatch(playbook, /run-iterative-interaction-subject\.mjs (?:135|136) --bundle/);
    assert.doesNotMatch(playbook, /case-136-judge|AI judge/);
    assert.match(playbook, /QUARANTINED - NO FAST EVIDENCE/);
    assert.match(playbook, /53e68120-9201-45e0-9e9b-df83ad811779/);
    assert.match(playbook, /45177 ms/);
    assert.match(playbook, /ERROR\/agent_timeout/);
    assert.match(manifest, /exp_extrem_slow\/case-137-extreme-slow-final-composition\.md/);
    assert.match(noEvidence, /outcome: no-evidence/);
    assert.match(noEvidence, /native_outcome: null/);
    assert.match(noEvidence, /lifecycle_outcome: ERROR/);
    assert.match(noEvidence, /health: null/);
    assert.match(noEvidence, /no\s+CDE-003 Agent-behavior\s+PASS claim/);
  });
});
