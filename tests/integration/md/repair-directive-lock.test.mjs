// repair-directive-lock.test.mjs
// Locks FIO-008: file-observability names its feedback field repair_directive,
// distinct from the gate/phase and work-unit repair_kind fields; and locks the
// CONTEXT.md pointer/glossary repairs (F-03/F-23).
// @impl FIO-008

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..');

function read(rel) {
  return readFileSync(join(REPO_ROOT, rel), 'utf8');
}

describe('repair-directive and CONTEXT locks (FIO-008, F-03, F-23)', () => {
  it('file-observability emitter uses repair_directive with its six values', () => {
    const emitter = read('DEEP_RESEARCH_HARNESS/engine/helpers/file-observability.mjs');
    assert.ok(emitter.includes('repair_directive:'), 'repair_directive field missing');
    assert.ok(!emitter.includes('repair_kind:'), 'file-observability still emits repair_kind');
    for (const value of [
      'materialize_canonical_surface',
      'reconcile_topic_identity',
      'repair_topic_reference',
      'classify_namespace',
      'current_entry_contract',
      'exact_topic_state_recover',
    ]) {
      assert.ok(emitter.includes(value), `value ${value} missing from emitter`);
    }
  });

  it('consumer reads the renamed field', () => {
    const consumer = read('DEEP_RESEARCH_HARNESS/cli/check-reentry.mjs');
    assert.ok(consumer.includes('root.repair_directive'), 'consumer does not read repair_directive');
  });

  it('CONTEXT.md disambiguates the three repair vocabularies', () => {
    const context = read('CONTEXT.md');
    assert.ok(context.includes('`repair_directive`（file-observability 面）'), 'repair_directive glossary row missing');
    assert.ok(context.includes('`resolution_owner`（gate/phase 門禁面）') || context.includes('`resolution_owner`（gate/phase 门禁面）'), 'gate/phase resolution_owner row missing');
    assert.ok(context.includes('`recovery_action`（work-unit 恢复面）') || context.includes('`recovery_action`（work-unit 復面）'), 'work-unit recovery_action row missing');
    assert.ok(context.includes('work-unit-repair-vocabulary.mjs'), 'vocabulary pointer missing');
    assert.ok(context.includes('ResearchConfigLock（研究风格锁定契约）') && context.includes('ReopenResearchPass（终态重开通行证）'), 'Lifecycle concept rows missing');
  });

  it('work-unit and gate/phase repair_kind enumerations are unchanged', () => {
    const vocab = read('DEEP_RESEARCH_HARNESS/engine/work-unit-repair-vocabulary.mjs');
    assert.ok((vocab.includes("wait: 'wait'") || vocab.includes('wait: "wait"')) && (vocab.includes("supersede: 'supersede'") || vocab.includes('supersede: "supersede"')), 'work-unit enum changed');
  });
});
