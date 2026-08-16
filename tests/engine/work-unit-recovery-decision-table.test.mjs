// work-unit-recovery-decision-table.test.mjs
// Locks the RUN.md work-unit recovery decision table against the engine's
// attempt-owned recovery repair_kind vocabulary: every repair_kind the engine
// can emit for work-unit recovery must have a table row and a matching CLI
// verb (or exact command string) in RUN.md.
// @impl CHI-004

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');

function read(rel) {
  return readFileSync(join(REPO_ROOT, rel), 'utf8');
}

// Attempt-owned work-unit recovery repair_kind values the engine emits for the
// five feedback surfaces. Source of truth: engine emission points
// (work-unit-transaction.mjs, work-unit-supersession.mjs,
// work-unit-submit-integrity.mjs, work-unit-attempt-disposition.mjs).
const RECOVERY_REPAIR_KINDS = [
  'recover-transaction',
  'recover-declaration',
  'supersede',
  'wait',
  'missing_contract',
];

// The CLI verb each repair_kind must map to, in operate-work-unit.mjs.
const REPAIR_KIND_TO_CLI_VERB = {
  'recover-transaction': 'recover-transaction',
  'recover-declaration': 'recover-declaration',
  supersede: 'supersede',
  wait: null, // no CLI verb: the caller reruns the exact same operation
  'missing_contract': null, // stop boundary: no command
};

// Every recovery repair_kind the engine can emit, in CLI-verb spelling.
const ENGINE_SPELLINGS = {
  'recover-transaction': 'recover-transaction',
  'recover-declaration': 'recover-declaration',
  supersede: 'supersede',
  wait: 'wait',
  'missing_contract': 'missing_contract',
};

describe('work-unit recovery decision table lock', () => {
  it('RUN.md contains one decision-table row per attempt-owned recovery repair_kind', () => {
    const run = read('DEEP_RESEARCH_HARNESS/RUN.md');
    assert.match(run, /## .*work-unit.*recovery.*decision table|decision table below is the single disposition → `repair_kind` → CLI verb → rerun map/i);
    for (const kind of RECOVERY_REPAIR_KINDS) {
      assert.ok(run.includes(`\`${kind}\``), `RUN.md decision table missing repair_kind row: ${kind}`);
    }
  });

  it('engine repair_kind values use CLI-verb spelling (no underscore recovery kinds)', () => {
    const sources = [
      'DEEP_RESEARCH_HARNESS/engine/work-unit-transaction.mjs',
      'DEEP_RESEARCH_HARNESS/engine/work-unit-supersession.mjs',
      'DEEP_RESEARCH_HARNESS/engine/work-unit-submit-integrity.mjs',
      'DEEP_RESEARCH_HARNESS/engine/work-unit-attempt-disposition.mjs',
    ];
    const joined = sources.map(read).join('\n');
    for (const oldSpelling of ['recover_transaction', 'recover_declaration']) {
      assert.doesNotMatch(joined, new RegExp(`['"\`]${oldSpelling}['"\`]`), `underscore recovery spelling still emitted: ${oldSpelling}`);
    }
    for (const kind of RECOVERY_REPAIR_KINDS) {
      assert.ok(ENGINE_SPELLINGS[kind], `unexpected repair_kind in lock set: ${kind}`);
    }
  });

  it('each repair_kind maps to the matching operate-work-unit CLI verb or explicit rerun', () => {
    const run = read('DEEP_RESEARCH_HARNESS/RUN.md');
    const tableRow = (kind) => {
      const lines = run.split('\n');
      const idx = lines.findIndex((line) => line.includes(`| \`${kind}\` |`));
      return idx >= 0 ? lines[idx] : null;
    };
    for (const kind of RECOVERY_REPAIR_KINDS) {
      const row = tableRow(kind);
      assert.ok(row, `no RUN.md table row for ${kind}`);
      const verb = REPAIR_KIND_TO_CLI_VERB[kind];
      if (verb) {
        assert.ok(row.includes(`operate-work-unit.mjs ${verb}`), `RUN.md row for ${kind} must name operate-work-unit.mjs ${verb}`);
      } else {
        assert.ok(
          row.includes('同一 operation') || row.includes('same operation') || row.includes('停止边界') || row.includes('no legal recovery path') || row.includes('missing_contract'),
          `RUN.md row for ${kind} must state the wait/stop rerun boundary`,
        );
      }
    }
  });
});
