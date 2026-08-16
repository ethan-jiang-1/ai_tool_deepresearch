// work-unit-recovery-decision-table.test.mjs
// Locks the RUN.md work-unit recovery decision table against the engine-owned
// repair-kind vocabulary export: every value in WORK_UNIT_REPAIR_KINDS must
// have one RUN.md row and a CLI-verb mapping (or an explicit wait/stop
// boundary), and the four emission modules must not contain bare repair_kind
// string literals. The row set is DERIVED from the export, not hand-enumerated.
// @impl CHI-004

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  WORK_UNIT_REPAIR_KINDS,
  REPAIR_KIND_CLI_VERB,
} from '../../DEEP_RESEARCH_HARNESS/engine/work-unit-repair-vocabulary.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');

function read(rel) {
  return readFileSync(join(REPO_ROOT, rel), 'utf8');
}

const EMISSION_MODULES = [
  'DEEP_RESEARCH_HARNESS/engine/work-unit-transaction.mjs',
  'DEEP_RESEARCH_HARNESS/engine/work-unit-supersession.mjs',
  'DEEP_RESEARCH_HARNESS/engine/work-unit-submit-integrity.mjs',
  'DEEP_RESEARCH_HARNESS/engine/work-unit-attempt-disposition.mjs',
];

describe('work-unit recovery decision table lock', () => {
  it('RUN.md contains one decision-table row per exported repair kind', () => {
    const run = read('DEEP_RESEARCH_HARNESS/RUN.md');
    assert.match(run, /decision table below is the single disposition → `repair_kind` → CLI verb → rerun map/i);
    for (const kind of WORK_UNIT_REPAIR_KINDS) {
      assert.ok(run.includes(`| \`${kind}\` |`), `RUN.md decision table missing repair_kind row: ${kind}`);
    }
  });

  it('each repair kind maps to the matching CLI verb or an explicit wait/stop boundary', () => {
    const run = read('DEEP_RESEARCH_HARNESS/RUN.md');
    const tableRow = (kind) => {
      const lines = run.split('\n');
      const idx = lines.findIndex((line) => line.includes(`| \`${kind}\` |`));
      return idx >= 0 ? lines[idx] : null;
    };
    for (const kind of WORK_UNIT_REPAIR_KINDS) {
      const row = tableRow(kind);
      assert.ok(row, `no RUN.md table row for ${kind}`);
      const verb = REPAIR_KIND_CLI_VERB[kind];
      if (verb) {
        assert.ok(row.includes(`operate-work-unit.mjs ${verb}`), `RUN.md row for ${kind} must name operate-work-unit.mjs ${verb}`);
      } else {
        assert.ok(
          row.includes('等待') || row.includes('作者') || row.includes('停止边界')
            || row.includes('同一 operation') || row.includes('same operation')
            || row.includes('no legal recovery path') || row.includes('missing_contract'),
          `RUN.md row for ${kind} must state the wait/author/stop rerun boundary`,
        );
      }
    }
  });

  it('emission modules carry no bare repair_kind string literals', () => {
    for (const rel of EMISSION_MODULES) {
      const src = read(rel);
      assert.doesNotMatch(src, /repair_kind:\s*'/, `${rel} has a bare repair_kind literal`);
      assert.doesNotMatch(src, /repairKind:\s*'/, `${rel} has a bare repairKind literal`);
      for (const kind of WORK_UNIT_REPAIR_KINDS) {
        assert.ok(!src.includes(`'${kind}'`), `${rel} must reference the export instead of literal '${kind}'`);
      }
    }
  });

  it('underscore recovery spellings stay absent across engine and guidance surfaces', () => {
    const sources = [
      ...EMISSION_MODULES,
      'DEEP_RESEARCH_HARNESS/COMMANDS.md',
      'DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-subagent-protocol.md',
      'DEEP_RESEARCH_HARNESS/cli/README.md',
      'DEEP_RESEARCH_HARNESS/command_playbook/provenance-forensics-guide.md',
      'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave0.md',
      'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave1.md',
      'DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave2.md',
    ];
    const joined = sources.map(read).join('\n');
    for (const oldSpelling of ['recover_transaction', 'recover_declaration']) {
      assert.doesNotMatch(joined, new RegExp(`['"\`]${oldSpelling}['"\`]`), `underscore recovery spelling still emitted: ${oldSpelling}`);
      assert.doesNotMatch(joined, new RegExp(`repair_kind:\\s*['"\`]?${oldSpelling}`), `underscore repair_kind value still present: ${oldSpelling}`);
    }
  });
});
