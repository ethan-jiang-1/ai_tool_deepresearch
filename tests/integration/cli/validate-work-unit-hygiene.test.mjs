import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const REPO_ROOT = path.resolve(new URL('../../..', import.meta.url).pathname);
const CLI = path.join(REPO_ROOT, 'DPT_FRAMEWORK/cli/validate-work-unit-hygiene.mjs');
const TMP = mkdtempSync(path.join(os.tmpdir(), 'wu-hygiene-'));

after(() => rmSync(TMP, { recursive: true, force: true }));

function run(args = [], cwd = REPO_ROOT) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf-8' });
}

function writeFixture(rel, content) {
  const file = path.join(TMP, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
}

function writeMinimalWiring(root = TMP) {
  const helper = [
    'export function checkWorkUnitLedgerExists() {}',
    'export function checkWorkUnitOutputCoverage() {}',
    'export function checkWorkUnitSubmissionPresence() {}',
    'export function checkDelegatedBypassSuspected() {}',
  ].join('\n');
  writeFixture('DPT_FRAMEWORK/engine/helpers/gate-helpers-provenance.mjs', helper);
  const gateCli = [
    'checkWorkUnitLedgerExists();',
    'checkWorkUnitOutputCoverage();',
    'checkWorkUnitSubmissionPresence();',
    'checkDelegatedBypassSuspected();',
  ].join('\n');
  for (const wave of ['wave0', 'wave1', 'wave2']) {
    writeFixture(`DPT_FRAMEWORK/cli/gates/check-gate-${wave}-complete.mjs`, gateCli);
  }
  writeFixture('DPT_FRAMEWORK/cli/operate-work-unit.mjs', [
    'claimWorkUnits();',
    'submitWorkUnit();',
    'closeWorkUnitAttempt();',
    'openWorkUnitBatch();',
    'inspectWorkUnits();',
  ].join('\n'));
  mkdirSync(path.join(root, 'DPT_FRAMEWORK/schema/gate_definitions'), { recursive: true });
  writeFixture('DPT_FRAMEWORK/rb_templates/rb_queue.json.tmpl', JSON.stringify({
    schema_version: 'queue.v2',
    active_window: [],
    refill_pool: [],
    delegated_in_flight: {},
    terminal_history: [],
  }, null, 2));
}

describe('validate-work-unit-hygiene CLI', () => {
  it('passes on the shipped active framework surfaces', () => {
    const result = run(['--json']);
    assert.equal(result.status, 0, result.stdout || result.stderr);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.passed, true);
  });

  it('fails closed on removed authority tokens, old gate checks, and old queue shape', () => {
    writeMinimalWiring();
    writeFixture('DPT_FRAMEWORK/cli/bad-driver-doc.mjs', 'const bad = "drive-relay-slot";\n');
    writeFixture('experiments_env/shared/bad-run-log-helper.mjs', 'const detail = { slotKey: "old" };\nconst event = "relay_commit_missing";\n');
    writeFixture('DPT_FRAMEWORK/schema/gate_definitions/gate-wave0-complete.definition.json', JSON.stringify({
      gate: 'wave0-complete',
      rules: [{ id: 'old', check: 'subagent_slot_presence' }],
    }));
    writeFixture('DPT_FRAMEWORK/rb_templates/rb_queue.json.tmpl', JSON.stringify({
      slot_1_current: { work_id: 'old-demand' },
      refill_pool: [],
    }, null, 2));

    const result = run(['--root', TMP, '--json']);
    assert.equal(result.status, 1);
    const parsed = JSON.parse(result.stdout);
    const codes = new Set(parsed.issues.map((issue) => issue.code));
    assert.ok(codes.has('removed_cli_drive_relay_slot'));
    assert.ok(codes.has('removed_slot_key_logging_context'));
    assert.ok(codes.has('removed_relay_log_event'));
    assert.ok(codes.has('unsupported_delegated_provenance_check'));
    assert.ok(codes.has('queue_template_old_identity_or_slot_shape'));
  });
});
