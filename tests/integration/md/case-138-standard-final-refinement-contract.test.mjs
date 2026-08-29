// @impl CDE-003, CDP-003, CDP-004, POF-001
// This deterministic fixture/adapter contract does not establish Agent behavior.

import assert from 'node:assert/strict';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { parse as parseYaml } from 'yaml';

import { readFinalReportInventory } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/final-report-series.mjs';
import { PlaybookFrontmatterSchema } from '../../../DEEP_RESEARCH_HARNESS/schema/contracts/playbook.mjs';

const ROOT = process.cwd();
const PLAYBOOK_PATH = 'experiments_playbook/exp_wff_delivery/case-138-standard-final-refinement.md';
const MANIFEST_PATH = 'exp_wff_delivery/case-138-standard-final-refinement.md';
const CASE_137_PATH = 'exp_wff_delivery/case-137-standard-fast-final-composition.md';
const playbook = readFileSync(join(ROOT, PLAYBOOK_PATH), 'utf8');
const runner = readFileSync(join(ROOT, 'experiments_env/shared/run-iterative-interaction-subject.mjs'), 'utf8');
const manifest = readFileSync(join(ROOT, 'experiments_playbook/PLAYBOOK_MANIFEST.md'), 'utf8');

function frontmatter(markdown) {
  const raw = markdown.match(/^---\n([\s\S]*?)\n---/)?.[1];
  assert.ok(raw, 'playbook frontmatter is required');
  return raw;
}

function activeManifestPaths() {
  const table = manifest.match(/<!-- agent-experiment-manifest:v1 -->\n([\s\S]*?)<!-- \/agent-experiment-manifest -->/)?.[1] || '';
  return [...table.matchAll(/^\| `([^`]+)` \|$/gm)].map((match) => match[1]);
}

function case138SubjectConfig() {
  const config = runner.match(/  '138': \{[\s\S]*?\n  \},\n  '136-judge': \{/)?.[0];
  assert.ok(config, 'case-138 Subject configuration is required');
  return config;
}

describe('case-138 standard Final refinement source contract', () => {
  it('registers one active real-Agent procedural playbook while preserving case 137 quarantine', () => {
    const policy = PlaybookFrontmatterSchema.parse(parseYaml(frontmatter(playbook)));

    assert.equal(policy.case, 'case-138-standard-final-refinement');
    assert.equal(policy.proof_subject, 'agent_behavior');
    assert.equal(policy.subject_execution, 'real_agent');
    assert.equal(policy.fixture, 'setup_only');
    assert.equal(policy.runtime, 'real_disposable_bundle');
    assert.equal(policy.external_calls, 'none');
    assert.equal(policy.verdict_judge, 'deterministic');
    assert.deepEqual(policy.bundle_roles, ['verdict']);
    assert.deepEqual(policy.health_roles, ['verdict']);
    assert.deepEqual(policy.required_checks, ['case-138-final-refinement']);

    const active = activeManifestPaths();
    assert.equal(active.filter((path) => path === MANIFEST_PATH).length, 1);
    assert.equal(active.includes(CASE_137_PATH), false);
    assert.match(manifest, /exp_extrem_slow\/case-137-extreme-slow-final-composition\.md/);
  });

  it('keeps the setup-only Final boundary empty and free of Subject/native output', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'case-138-setup-'));
    try {
      const setup = spawnSync(process.execPath, [
        'experiments_env/shared/prepare-iterative-interaction-case.mjs',
        '138',
        '--target-dir',
        tempRoot,
      ], { cwd: ROOT, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
      assert.equal(setup.status, 0, `${setup.stdout}\n${setup.stderr}`);

      const bundle = setup.stdout.trim();
      const status = JSON.parse(readFileSync(join(bundle, 'rb_status.json'), 'utf8'));
      const profile = parseYaml(readFileSync(join(bundle, 'rb_profile.yaml'), 'utf8'));
      const setupFacts = JSON.parse(readFileSync(join(bundle, 'case-138-setup.json'), 'utf8'));
      const inventory = readFinalReportInventory(bundle);

      assert.deepEqual(
        { current_node: status.current_node, current_gate: status.current_gate, next_gate: status.next_gate },
        { current_node: 'phases/phase-final.md', current_gate: 'readiness_passed', next_gate: 'none' },
      );
      assert.equal(inventory.primary_series.valid, true);
      assert.equal(inventory.primary_series.classification, 'empty');
      assert.deepEqual(inventory.primary_series.primary_entries, []);
      assert.equal(setupFacts.final_reports_present, 0);
      assert.equal(setupFacts.evidence_map_rows_supplied, 1);
      assert.equal(profile.human_decision_checkpoints.hitl2.composition_handoff.for_rerun_count, 0);
      for (const file of [
        'case-138-subject-prompt.json',
        'case-138-subject-transcript.jsonl',
        'case-138-subject-result.json',
        'case-138-subject-observation.json',
      ]) assert.equal(existsSync(join(bundle, file)), false, file);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('binds five same-session turns and the bounded Final/ReopenResearchPass observations', () => {
    const config = case138SubjectConfig();
    const observer = runner.match(/function observeCase138Boundary\([\s\S]*?\n}\n\nfunction observeCase318CrashWindow/)?.[0] || '';
    const messages = config.match(/messages:\s*\[([\s\S]*?)\],\n    tools:/)?.[1] || '';

    assert.ok(messages, 'case 138 requires supplied Subject turns');
    assert.equal((messages.match(/publish-final-report/g) || []).length, 3);
    assert.match(messages, /first Final entry/i);
    assert.match(messages, /未标记的 presentation revision/);
    assert.match(messages, /technical_deep_dive/);
    assert.match(messages, /不要发布文件、不要写 runtime state/);
    assert.match(messages, /新的来源/);
    assert.match(config, /tools: 'Bash,Edit,Glob,Grep,Read,Write'/);
    assert.doesNotMatch(config.match(/tools: '[^']+'/)?.[0] || '', /Task|WebFetch|WebSearch/);
    assert.match(config, /afterTurn: observeCase138Boundary/);
    assert.match(config, /timeoutMs: 120_000/);
    assert.match(config, /hard 120-second total runtime/);

    for (const marker of [
      "completedTurns === 1",
      "completedTurns === 2",
      "completedTurns === 3",
      "completedTurns === 4",
      "completedTurns === 5",
      "case-138-turn4-freeze.json",
      "sameCase138FrozenFacts",
      "case-138-c5-apply.json",
      "post_final_reentry",
      "rerun-ready",
      "turn5_c5_accepted_without_report_or_completed_rerun",
    ]) assert.ok(observer.includes(marker), marker);

    assert.match(observer, /final\/final\.md/);
    assert.match(observer, /final\/final_v1\.md/);
    assert.match(observer, /final\/final_technical_deep_dive_v2\.md/);
    assert.match(observer, /immutable_prior_bytes: true/);
  });

  it('binds one user-confirmed replacement attempt without report-quality, generic-intent, or satisfaction proof', () => {
    assert.equal((playbook.match(/run-iterative-interaction-subject\.mjs 138 --bundle/g) || []).length, 1);
    assert.match(playbook, /authorization: 'user_confirmed_replacement'/);
    assert.match(playbook, /original_attempt: 'quarantined_not_run'/);
    assert.match(playbook, /replacement_attempt_limit: 1/);
    assert.match(playbook, /replacement 120-second attempt must not be retried automatically/i);
    assert.match(playbook, /does not erase the[\s\S]*original diagnostic,[\s\S]*grant a third attempt/i);
    assert.match(playbook, /NOT_RUN/);
    assert.match(playbook, /does not judge report\s+quality, user satisfaction, or general intent-classification accuracy/i);
    assert.match(playbook, /Does not prove \| Report improvement, generic feedback classification, genuine user satisfaction, or rerun completion/);
    assert.doesNotMatch(playbook, /genuine satisfaction was established/i);
    assert.doesNotMatch(playbook, /report quality (?:passed|proved|established)/i);
    assert.doesNotMatch(playbook, /generic intent (?:passed|proved|established)/i);
  });
});
