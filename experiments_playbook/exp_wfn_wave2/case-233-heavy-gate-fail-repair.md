---
schema: command-experiment/v1
experiment: wfn-wave2
case: case-233-heavy-gate-fail-repair
weight: heavy
case_goal: "Verify Wave2 gate failure for uncovered targeted evidence opens a repair/refill batch and passes only after work-unit submit."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-233_w2_gate_refill_repair
trace: dpt_disp_case-233_w2_gate_refill_repair/rb_trace.jsonl
verdict: trace-jsonl
req: RWE-001, RWE-004, RWE-006, WTS-005
---

## Execution Contract

Fixture-backed Engine repair case. Controlled targeted evidence content may be written only after a Wave2 work unit is claimed. The pass condition is deterministic: initial gate fails for direct `reference/00-cross-*.md`, repair opens `b001`, `operate-work-unit submit` appends the submitted ledger row, and the next Wave2 gate passes.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | Real disposable Wave2 bundle |
| Framework path | Real Wave2 gate, `operate-work-unit open-batch`, claim, submit, ledger, and inspect |
| Fixture input | Controlled cross-reference evidence after claim |
| Agent actor | None in optional smoke |
| External calls | None in optional smoke |
| Verdict source | Gate JSON, work-unit index/ledger, trace checks |
| Does not prove | Real Agent repair judgment or external search quality |

# case-233-heavy-gate-fail-repair

## Expected Runtime Path

1. Create a Wave2-ready bundle.
2. Write Wave2 artifacts that request targeted evidence and directly place `reference/00-cross-market-shift.md`.
3. Run Wave2 gate; it must fail for missing submitted work-unit coverage.
4. Open Wave2 repair/refill batch `b001`.
5. Enqueue, claim, and submit the targeted evidence through `operate-work-unit`.
6. Update Wave2 index/ledger/synthesis to reference the submitted receipt.
7. Rerun Wave2 gate and verify fail-then-pass trace.

## Step 1: [MAIN/SHELL] Create Bundle And Failing Direct Cross Reference

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs w2_gate_refill_repair --case case-233 --force)
node --input-type=module - "$B" <<'JS'
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { appendTrace, referenceContent, writeWave2Scaffold } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
writeWave2Scaffold(bundle, { planBasename: 'w2_gate_refill_repair' });
mkdirSync(path.join(bundle, 'reference'), { recursive: true });
mkdirSync(path.join(bundle, 'artifacts/wave2'), { recursive: true });
writeFileSync(path.join(bundle, 'reference/00-cross-market-shift.md'), referenceContent({
  source_url: 'https://research-source.test/wave2/market-shift',
  topic_slug: 'cross-topic',
  title: 'Direct Cross Reference'
}));
writeFileSync(path.join(bundle, 'artifacts/wave2/synthesis.md'), `# Cross-Topic Synthesis

W2F-001 uses [Topic A evidence](../wave1/topic-a/evidence-summary.md) and requires targeted evidence.
`);
writeFileSync(path.join(bundle, 'artifacts/wave2/cross-topic-ledger.md'), `# Cross-Topic Ledger

## Cross-Topic Scan Matrix

| pair_id | topics | checked_dimensions | finding_ids | notes |
| --- | --- | --- | --- | --- |
| P01 | topic-a + topic-b | emergent_question | W2F-001 | targeted search required |

## Wave1 Legacy Questions

- topic-a requires a cross-topic update.

## Cross-Topic Resolutions

- None before repair.

## Emergent Cross-Topic Questions

- W2F-001 requires targeted evidence.

## Exploration Decisions

| W2F-001 | explore_search | repair through work-unit submit |

## HITL2 Handoff

- None.
`);
writeFileSync(path.join(bundle, 'artifacts/wave2/finding-index.yaml'), `version: "0.1"
source_layer: wave2_cross_topic
ledger: artifacts/wave2/cross-topic-ledger.md
synthesis: artifacts/wave2/synthesis.md
scan: { topics: [topic-a, topic-b], topic_count: 2, pair_count_expected: 1, pair_count_checked: 1 }
findings:
  - id: W2F-001
    type: cross_topic_emergent_question
    status: open
    decision: explore_search
    affected_topics: [topic-a, topic-b]
    origin_refs: [artifacts/wave1/topic-a/question-list.md]
    trigger_refs: [artifacts/wave1/topic-b/evidence-summary.md]
    search_required: true
    subagent_receipt_refs: []
    appears_in_synthesis: true
    hitl2_handoff: false
`);
for (const topic of ['topic-a', 'topic-b']) {
  writeFileSync(path.join(bundle, 'seed_topics', `${topic}.md`), `# ${topic}

## Wave2 Judgment
Targeted evidence repair pending.

## Pending Questions
- [open] W2F-001
`);
}
appendTrace(bundle, { event: 'wave2_completion', source: 'case-233-before-repair' });
JS
```

## Step 2: [MAIN/SHELL] First Gate Must Fail

```bash
set +e
node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle "$B" --current-node phases/phase-wave2.md > "$B/case-233-gate-before-repair.json"
GATE_STATUS=$?
set -e
node - "$B" "$GATE_STATUS" <<'JS'
const fs = require('fs');
const [bundle, status] = process.argv.slice(2);
const gate = JSON.parse(fs.readFileSync(`${bundle}/case-233-gate-before-repair.json`, 'utf8'));
console.log(JSON.stringify({ status: Number(status), passed: gate.check?.passed, inspect: gate.inspect || [] }, null, 2));
process.exit(Number(status) === 1 && gate.check?.passed === false && /work-unit|coverage|bypass/i.test(JSON.stringify(gate.inspect || [])) ? 0 : 1);
JS
```

Expected: gate rejects the direct cross-reference as non-authoritative.

## Step 3: [MAIN/SHELL] Open Repair Batch And Submit Targeted Evidence

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs open-batch "$B" --phase wave2 --reason gate_failure_refill > "$B/case-233-open-batch.json"
node --input-type=module - "$B" <<'JS'
import { writeFileSync } from 'node:fs';
import {
  enqueueWorkUnitTask,
  queueItemForWorkUnit,
  referenceContent,
  submitWorkUnitViaCli,
  writeFixtureResultForWorkUnit
} from './experiments_env/shared/work-unit-playbook-utils.mjs';
import { loadWorkUnitIndex } from './DPT_FRAMEWORK/engine/work-unit-core.mjs';
import { spawnSync } from 'node:child_process';

const bundle = process.argv[2];
enqueueWorkUnitTask(bundle, queueItemForWorkUnit({
  phase: 'wave2',
  queue_item_id: 'wave2-targeted-W2F-001',
  finding_id: 'W2F-001',
  title: 'Repair targeted evidence for W2F-001',
  priority_class: 'P1_state_or_gate_repair'
}), { fileName: 'case233-targeted-repair.json' });
const claim = JSON.parse(spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-work-unit.mjs', 'claim', bundle, '--phase', 'wave2'], { encoding: 'utf8' }).stdout);
const workId = claim.claimed_work_ids[0];
const fixture = writeFixtureResultForWorkUnit(bundle, {
  work_id: workId,
  output_path: 'reference/00-cross-market-shift.md',
  source_url: 'https://research-source.test/wave2/market-shift',
  source_slug: 'market-shift',
  output_content: referenceContent({
    source_url: 'https://research-source.test/wave2/market-shift',
    topic_slug: 'cross-topic',
    title: 'Submitted Cross Reference'
  }),
  cache_trails: ['_cache/wave2/primary/W2F-001/market-shift']
});
const submit = submitWorkUnitViaCli(bundle, { work_id: workId, resultPath: fixture.resultPath });
const record = loadWorkUnitIndex(bundle).work_units[workId];
writeFileSync(`${bundle}/case-233-repair-submit.json`, `${JSON.stringify({ claim, submit, record }, null, 2)}\n`);
console.log(JSON.stringify({ claim, submit, record }, null, 2));
process.exit(record.batch_id === 'b001' && submit.ok === true ? 0 : 1);
JS
```

## Step 4: [MAIN/SHELL] Rerun Gate And Verdict

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle "$B" --current-node phases/phase-wave2.md > "$B/case-233-gate-after-repair.json"
node --input-type=module - "$B" <<'JS'
import { readFileSync } from 'node:fs';
import { loadWorkUnitIndex } from './DPT_FRAMEWORK/engine/work-unit-core.mjs';
import { readTrace, recordPlaybookCheck, writeTraceVerdict } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
const before = JSON.parse(readFileSync(`${bundle}/case-233-gate-before-repair.json`, 'utf8'));
const after = JSON.parse(readFileSync(`${bundle}/case-233-gate-after-repair.json`, 'utf8'));
const opened = JSON.parse(readFileSync(`${bundle}/case-233-open-batch.json`, 'utf8'));
const index = loadWorkUnitIndex(bundle);
const repairRows = Object.values(index.work_units).filter((row) => row.batch_id === 'b001');
const attempts = readTrace(bundle).filter((event) => event.event === 'gate_attempt' && event.gate === 'wave2-complete');
recordPlaybookCheck(bundle, { gate: 'wave2-initial-gate-fails', passed: before.check?.passed === false, detail: JSON.stringify(before.inspect || []) });
recordPlaybookCheck(bundle, { gate: 'wave2-repair-batch', passed: opened.batch_id === 'b001' && repairRows.length >= 1, detail: JSON.stringify(repairRows.map((row) => row.work_id)) });
recordPlaybookCheck(bundle, { gate: 'wave2-repaired-gate-passes', passed: after.check?.passed === true, detail: JSON.stringify(after.inspect || []) });
recordPlaybookCheck(bundle, { gate: 'wave2-gate-fail-then-pass', passed: attempts.some((event) => event.passed === false) && attempts.some((event) => event.passed === true), detail: `${attempts.length} gate_attempt event(s)` });
const verdict = writeTraceVerdict(bundle, 'case-233');
console.log(JSON.stringify(verdict, null, 2));
process.exit(verdict.ok ? 0 : 1);
JS
```

## Optional Automation Smoke

```bash
node experiments_env/shared/run-fixture-backed-case.mjs --case case-233 --target-dir tests/.test-bundles --cleanup-pass
```

## Cleanup

PASS only:

```bash
node -e 'const fs=require("fs"); const v=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.exit(v.ok ? 0 : 1)' "$B/case-233-verdict.json"
rm -rf "$B"
```
