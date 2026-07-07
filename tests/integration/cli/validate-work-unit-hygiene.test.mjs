import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const REPO_ROOT = path.resolve(new URL('../../..', import.meta.url).pathname);
const CLI = path.join(REPO_ROOT, 'DPT_FRAMEWORK/cli/validate-work-unit-hygiene.mjs');
const TMP_PARENT = mkdtempSync(path.join(os.tmpdir(), 'wu-hygiene-'));

after(() => rmSync(TMP_PARENT, { recursive: true, force: true }));

function run(root) {
  return spawnSync(process.execPath, [CLI, '--root', root, '--json'], { cwd: REPO_ROOT, encoding: 'utf-8' });
}

function fixtureRepo(name) {
  const root = path.join(TMP_PARENT, name);
  mkdirSync(root, { recursive: true });
  return root;
}

function writeFixture(root, rel, content) {
  const file = path.join(root, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
}

function writeMinimalWiring(root) {
  const helper = [
    'export function checkWorkUnitLedgerExists() {}',
    'export function checkWorkUnitOutputCoverage() {}',
    'export function checkWorkUnitSubmissionPresence() {}',
    'export function checkDelegatedBypassSuspected() {}',
  ].join('\n');
  writeFixture(root, 'DPT_FRAMEWORK/engine/helpers/gate-helpers-provenance.mjs', helper);
  const gateCli = [
    'checkWorkUnitLedgerExists();',
    'checkWorkUnitOutputCoverage();',
    'checkWorkUnitSubmissionPresence();',
    'checkDelegatedBypassSuspected();',
  ].join('\n');
  for (const wave of ['wave0', 'wave1', 'wave2']) {
    writeFixture(root, `DPT_FRAMEWORK/cli/gates/check-gate-${wave}-complete.mjs`, gateCli);
  }
  writeFixture(root, 'DPT_FRAMEWORK/cli/operate-work-unit.mjs', [
    'claimWorkUnits();',
    'submitWorkUnit();',
    'closeWorkUnitAttempt();',
    'openWorkUnitBatch();',
    'inspectWorkUnits();',
  ].join('\n'));
  writeFixture(root, 'DPT_FRAMEWORK/rb_templates/rb_queue.json.tmpl', JSON.stringify({
    schema_version: 'queue.v2',
    active_window: [],
    refill_pool: [],
    delegated_in_flight: {},
    terminal_history: [],
  }, null, 2));
  mkdirSync(path.join(root, 'DPT_FRAMEWORK/schema/gate_definitions'), { recursive: true });
}

function cleanRepo(name) {
  const root = fixtureRepo(name);
  writeMinimalWiring(root);
  return root;
}

function codes(result) {
  const parsed = JSON.parse(result.stdout);
  return new Set(parsed.issues.map((issue) => issue.code));
}

describe('validate-work-unit-hygiene CLI', () => {
  it('passes on a clean current-surface mini repo', () => {
    const root = cleanRepo('clean-current');
    writeFixture(root, 'openspec/specs/delegated-work-units/spec.md', 'Current delegated work uses operate-work-unit claim and submit with _work_units/ ledger coverage.\n');
    const result = run(root);
    assert.equal(result.status, 0, result.stdout || result.stderr);
    assert.equal(JSON.parse(result.stdout).passed, true);
  });

  it('fails closed on removed authority tokens, old gate checks, and old queue shape', () => {
    const root = cleanRepo('bad-current');
    writeFixture(root, 'DPT_FRAMEWORK/cli/bad-driver-doc.mjs', 'const bad = "drive-relay-slot";\n');
    writeFixture(root, 'experiments_env/shared/bad-run-log-helper.mjs', 'const detail = { slotKey: "old" };\nconst event = "relay_commit_missing";\n');
    writeFixture(root, 'DPT_FRAMEWORK/schema/gate_definitions/gate-wave0-complete.definition.json', JSON.stringify({
      gate: 'wave0-complete',
      rules: [{ id: 'old', check: 'subagent_slot_presence' }],
    }));
    writeFixture(root, 'DPT_FRAMEWORK/rb_templates/rb_queue.json.tmpl', JSON.stringify({
      slot_1_current: { work_id: 'old-demand' },
      refill_pool: [],
    }, null, 2));

    const result = run(root);
    assert.equal(result.status, 1);
    const found = codes(result);
    assert.ok(found.has('removed_cli_drive_relay_slot'));
    assert.ok(found.has('removed_slot_key_logging_context'));
    assert.ok(found.has('removed_relay_log_event'));
    assert.ok(found.has('unsupported_delegated_provenance_check'));
    assert.ok(found.has('queue_template_old_identity_or_slot_shape'));
  });

  it('excludes archived OpenSpec changes and _original archives', () => {
    const root = cleanRepo('archive-exclusions');
    writeFixture(root, 'openspec/changes/archive/2026-01-01-old/specs/x/spec.md', 'drive-relay-slot _subagents/wave_00/slot_00 slot_1_current\n');
    writeFixture(root, '_backlog/_original_snapshot/old.md', 'drive-relay-slot slot_result_ref\n');

    const result = run(root);
    assert.equal(result.status, 0, result.stdout || result.stderr);
  });

  it('detects current specs, playbooks, shared infra, docs, and current backlog stale guidance', () => {
    const root = cleanRepo('broad-surfaces');
    writeFixture(root, 'openspec/specs/current/spec.md', 'Use subagent-relay as the production delegated engine.\n');
    writeFixture(root, 'experiments_playbook/exp_old/case-1-light-old.md', 'Run drive-relay-slot stage as current proof.\n');
    writeFixture(root, 'experiments_env/shared/helper.mjs', 'export const marker = "slot_result_ref";\n');
    writeFixture(root, '_backlog/todos/todo-old.md', 'Implement new feature by extending subagent-relay.mjs.\n');
    writeFixture(root, 'README.md', 'Current delegated path uses _subagents/wave_00/slot_00.\n');

    const result = run(root);
    assert.equal(result.status, 1);
    const found = codes(result);
    assert.ok(found.has('removed_engine_subagent_relay'));
    assert.ok(found.has('removed_cli_drive_relay_slot'));
    assert.ok(found.has('removed_slot_result_ref'));
    assert.ok(found.has('removed_subagents_path'));
  });

  it('allows deprecated registry, checker self-reference, cleanup-control, negative, release-history, past-failure, and current work-unit contexts', () => {
    const root = cleanRepo('allowed-contexts');
    writeFixture(root, 'openspec/governance/req-registry.yaml', 'SRD-001: subagent-relay-driver — Old delegated driver removed [DEPRECATED]\n');
    writeFixture(root, 'DPT_FRAMEWORK/cli/validate-work-unit-hygiene.mjs', 'const pattern = /drive-relay-slot|slot_result_ref/;\n');
    writeFixture(root, 'tests/integration/cli/validate-work-unit-hygiene.test.mjs', 'const bad = "slot_1_current";\n');
    writeFixture(root, 'openspec/changes/clean-delegated-work-surfaces/tasks.md', '- remove drive-relay-slot and _subagents/ current wording\n');
    writeFixture(root, 'tests/schema/negative.test.mjs', 'assert rejects old _subagents/wave_00 path as non-authoritative diagnostic only;\n');
    writeFixture(root, 'DPT_FRAMEWORK/CHANGELOG.md', '## v0.3\nPreviously drive-relay-slot was replaced and retired.\n');
    writeFixture(root, '_backlog/bugs/BUG-old.md', 'Historical failure analysis: old drive-relay-slot path was removed and is no longer current.\n');
    writeFixture(root, 'DPT_FRAMEWORK/engine/work-unit-example.mjs', 'const row = { runtime_receipt_ref: "_work_units/wave0/wu-w0-b000-src-i0001/runtime-receipt.jsonl", receipt_nonce: "nonce" };\nconst receiptNonce = row.receipt_nonce;\n');

    const result = run(root);
    assert.equal(result.status, 0, result.stdout || result.stderr);
  });

  it('flags stale queue prose and task-card work_id demand examples while allowing queue v2 capacity wording', () => {
    const root = cleanRepo('queue-semantics');
    writeFixture(root, 'openspec/specs/queue-good/spec.md', 'Queue v2 uses ordered active_window arrays with QUEUE_ACTIVE_WINDOW_LIMIT = 20 and stages at least five items for preemption tests by active_window[0].queue_item_id.\n');
    writeFixture(root, 'experiments_playbook/exp_queue/bad.md', 'This case fills a five-slot active window and proves current queue state.\n| `work_id` | yes | `"seed-topic-x"` |\n');

    const result = run(root);
    assert.equal(result.status, 1);
    const found = codes(result);
    assert.ok(found.has('old_queue_fixed_active_window'));
    assert.ok(found.has('queue_demand_work_id_table'));
  });

  it('fails context-sensitive fields when paired with retired delegated examples', () => {
    const root = cleanRepo('context-sensitive-bad');
    writeFixture(root, 'DPT_FRAMEWORK/workflows/bad.md', 'Current example: _subagents/wave_00/slot_00/runtime-receipt.jsonl includes receiptNonce and runtime_receipt_ref.\n');

    const result = run(root);
    assert.equal(result.status, 1);
    const found = codes(result);
    assert.ok(found.has('removed_subagents_path'));
    assert.ok(found.has('runtime_receipt_ref_context'));
    assert.ok(found.has('receipt_nonce_camel_context'));
  });
});
