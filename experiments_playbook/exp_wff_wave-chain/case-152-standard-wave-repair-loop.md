---
schema: command-experiment/v1
experiment: wff-wave-chain
case: case-152-standard-wave-repair-loop
weight: light
case_goal: "Prove a Wave2 gate failure opens a repair/refill batch with batch_reason, then the repaired targeted evidence passes only after work-unit submit and phase drain."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-152_wave_repair_loop_*
trace: dpt_disp_case-152_wave_repair_loop_*/rb_trace.jsonl
verdict: trace-jsonl
req: RWE-001, RWE-006, AGQ-014
---

## Execution Contract

Fixture-backed Engine repair case. The initial failure is deliberate: Wave2 writes a direct `reference/00-cross-*.md` targeted evidence file without submitted work-unit coverage. The Agent must read the gate JSON, open a repair/refill batch with an explicit `batch_reason`, submit the targeted evidence through `operate-work-unit`, verify `phase_drained: true`, and only then rerun the Wave2 gate.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | Real disposable Wave2-ready bundle |
| Framework path | Real Wave2 gate, `operate-work-unit claim/open-batch/submit`, work-unit ledger/index, and trace |
| Fixture input | Controlled Wave2 targeted evidence content written after the repair work unit is claimed |
| Agent actor | None in this standard fixture smoke |
| External calls | None |
| Verdict source | Gate JSON, work-unit index/ledger state, drain JSON, and trace checks |
| Does not prove | Real targeted search quality or real Agent repair judgment |

# case-152-standard-wave-repair-loop

## Expected Runtime Path

1. Create a Wave2-ready bundle with Wave0/Wave1 scaffolding already witnessed.
2. Write Wave2 artifacts that require targeted evidence and directly place `reference/00-cross-market-shift.md`.
3. Probe Wave2 drain; only when `phase_drained: true`, run Wave2 gate.
4. Read gate JSON failure for missing work-unit coverage.
5. Open a Wave2 repair/refill batch with `--reason gate_failure_refill`.
6. Enqueue, claim, and submit the targeted evidence in `b001`.
7. Probe Wave2 drain again; only then rerun Wave2 gate.
8. Record trace checks and clean up only on PASS.

## Step 1: [MAIN/SHELL] Create Wave2-Ready Bundle With Direct Targeted Evidence

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs wave_repair_loop --case case-152 --force)
echo "BUNDLE=$B"

node --input-type=module - "$B" <<'JS'
import { appendTrace, referenceContent, writeWave2Scaffold } from './experiments_env/shared/work-unit-playbook-utils.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const bundle = process.argv[2];
const topics = [
  { id: 't1', slug: 'topic-a', title: 'Topic A' },
  { id: 't2', slug: 'topic-b', title: 'Topic B' }
];
writeWave2Scaffold(bundle, { planBasename: 'wave_repair_loop', topics });
mkdirSync(path.join(bundle, 'reference'), { recursive: true });
writeFileSync(path.join(bundle, 'reference/00-cross-market-shift.md'), referenceContent({
  source_url: 'https://research-source.test/wave2/market-shift',
  topic_slug: 'cross-topic',
  title: 'Direct Cross Reference',
  key_facts: [
    'Direct targeted evidence exists before submitted coverage.',
    'The gate must reject this direct file as non-authoritative.',
    'The repair batch must create a new b001 work-unit attempt.',
    'Submitted coverage must bind output, cache, receipt, and nonce.',
    'The repaired gate can then pass with ledger-first provenance.'
  ]
}));
mkdirSync(path.join(bundle, 'artifacts/wave2'), { recursive: true });
writeFileSync(path.join(bundle, 'artifacts/wave2/synthesis.md'), `# Cross-Topic Synthesis

W2F-001 compares [Topic A evidence](../wave1/topic-a/evidence-summary.md) with [Topic B questions](../wave1/topic-b/question-list.md).

The synthesis requires targeted Wave2 evidence, but the direct cross-reference is intentionally not submitted yet.
`);
writeFileSync(path.join(bundle, 'artifacts/wave2/cross-topic-ledger.md'), `# Cross-Topic Ledger

## Cross-Topic Scan Matrix

| pair_id | topics | checked_dimensions | finding_ids | notes |
| --- | --- | --- | --- | --- |
| P01 | topic-a + topic-b | emergent_question | W2F-001 | targeted search required |

## Wave1 Legacy Questions

- topic-a and topic-b need a cross-topic evidence update.

## Cross-Topic Resolutions

- None before repair.

## Emergent Cross-Topic Questions

- W2F-001 requires targeted evidence search.

## Exploration Decisions

| W2F-001 | explore_search | delegated targeted evidence must submit by work_id |

## HITL2 Handoff

- None.
`);
writeFileSync(path.join(bundle, 'artifacts/wave2/finding-index.yaml'), `version: "0.1"
source_layer: wave2_cross_topic
ledger: artifacts/wave2/cross-topic-ledger.md
synthesis: artifacts/wave2/synthesis.md
scan:
  topics: [topic-a, topic-b]
  topic_count: 2
  pair_count_expected: 1
  pair_count_checked: 1
findings:
  - id: W2F-001
    type: cross_topic_emergent_question
    status: resolved
    decision: explore_search
    affected_topics: [topic-a, topic-b]
    origin_refs: [artifacts/wave1/topic-a/question-list.md]
    trigger_refs: [artifacts/wave1/topic-b/evidence-summary.md]
    search_required: true
    subagent_receipt_refs: []
    appears_in_synthesis: true
    hitl2_handoff: false
`);
appendTrace(bundle, { event: 'wave2_completion', source: 'case-152-before-repair' });
JS
```

## Step 2: [MAIN/SHELL] Probe Drain, Then Run Initial Gate

```bash
set +e
node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim "$B" --phase wave2 --count 1 > "$B/case-152-wave2-drain-before-gate.json"
DRAIN_BEFORE_STATUS=$?
set -e
node - "$B/case-152-wave2-drain-before-gate.json" "$DRAIN_BEFORE_STATUS" <<'JS'
const fs = require('fs');
const [file, status] = process.argv.slice(2);
const drain = JSON.parse(fs.readFileSync(file, 'utf8'));
console.log(JSON.stringify({ status: Number(status), phase_drained: drain.phase_drained, in_flight_count: drain.in_flight_count, unclaimed_delegated_count: drain.unclaimed_delegated_count }, null, 2));
process.exit(Number(status) === 1 && drain.phase_drained === true ? 0 : 1);
JS

set +e
node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle "$B" --current-node phases/phase-wave2.md > "$B/case-152-gate-before-repair.json"
GATE_BEFORE_STATUS=$?
set -e
node - "$B/case-152-gate-before-repair.json" "$GATE_BEFORE_STATUS" <<'JS'
const fs = require('fs');
const [file, status] = process.argv.slice(2);
const gate = JSON.parse(fs.readFileSync(file, 'utf8'));
console.log(JSON.stringify({ status: Number(status), passed: gate.check?.passed, inspect: gate.inspect || [] }, null, 2));
process.exit(Number(status) === 1 && gate.check?.passed === false && /work-unit|coverage|bypass/i.test(JSON.stringify(gate.inspect || [])) ? 0 : 1);
JS
```

Expected: the phase is drained, but the gate fails because the direct cross-reference lacks submitted work-unit coverage.

## Step 3: [MAIN/SHELL] Open Repair Batch With Explicit Batch Reason

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs open-batch "$B" --phase wave2 --reason gate_failure_refill > "$B/case-152-open-batch.json"
node - "$B/case-152-open-batch.json" <<'JS'
const fs = require('fs');
const opened = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
console.log(JSON.stringify({ batch_id: opened.batch_id, batch_reason: opened.batch_reason }, null, 2));
process.exit(opened.ok === true && opened.batch_id === 'b001' && opened.batch_reason === 'gate_failure_refill' ? 0 : 1);
JS
```

## Step 4: [MAIN/SHELL] Claim And Submit Repair Targeted Evidence

```bash
node --input-type=module - "$B" <<'JS'
import { enqueueWorkUnitTask, queueItemForWorkUnit } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
enqueueWorkUnitTask(bundle, queueItemForWorkUnit({
  phase: 'wave2',
  queue_item_id: 'wave2-targeted-W2F-001',
  finding_id: 'W2F-001',
  title: 'Repair targeted evidence for W2F-001',
  priority_class: 'P1_state_or_gate_repair'
}), { fileName: 'case152-targeted-repair.json' });
JS

CLAIM_REPAIR=$(node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim "$B" --phase wave2 --count 1)
printf '%s\n' "$CLAIM_REPAIR" > "$B/case-152-repair-claim.json"
WORK_REPAIR=$(printf '%s\n' "$CLAIM_REPAIR" | node -e 'const j=JSON.parse(require("fs").readFileSync(0,"utf8")); console.log(j.claimed_work_ids[0]);')
printf '%s\n' "$WORK_REPAIR" | grep -- '-b001-'

RESULT_REPAIR=$(node --input-type=module - "$B" "$WORK_REPAIR" <<'JS'
import { referenceContent, writeFixtureResultForWorkUnit } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const [bundle, workId] = process.argv.slice(2);
const fixture = writeFixtureResultForWorkUnit(bundle, {
  work_id: workId,
  output_path: 'reference/00-cross-market-shift.md',
  source_url: 'https://research-source.test/wave2/market-shift',
  source_slug: 'market-shift',
  output_content: referenceContent({
    source_url: 'https://research-source.test/wave2/market-shift',
    topic_slug: 'cross-topic',
    title: 'Submitted Cross Reference',
    key_facts: [
      'Submitted targeted evidence compares the two Wave1 topics directly.',
      'The work-unit result declares the cross-reference output path.',
      'The runtime receipt binds work_id, queue_item_id, kind, and nonce.',
      'The cache trail contains meta, page, and search files.',
      'The Wave2 gate can cross-check ledger, index, manifest, result, receipt, and cache.'
    ]
  }),
  cache_trails: ['_cache/wave2/primary/W2F-001/market-shift']
});
console.log(fixture.resultPath);
JS
)
node DPT_FRAMEWORK/cli/operate-work-unit.mjs submit "$B" --work-id "$WORK_REPAIR" --result "$RESULT_REPAIR" > "$B/case-152-repair-submit.json"
```

## Step 5: [MAIN/SHELL] Update Wave2 Receipt Context, Drain Again, Then Rerun Gate

```bash
node --input-type=module - "$B" "$WORK_REPAIR" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import { loadWorkUnitIndex } from './DPT_FRAMEWORK/engine/work-unit-core.mjs';

const [bundle, workId] = process.argv.slice(2);
const record = loadWorkUnitIndex(bundle).work_units[workId];
const receiptRef = record.paths.runtime_receipt_ref;
const indexRaw = readFileSync(`${bundle}/artifacts/wave2/finding-index.yaml`, 'utf8');
writeFileSync(`${bundle}/artifacts/wave2/finding-index.yaml`, indexRaw.replace('    subagent_receipt_refs: []', `    subagent_receipt_refs:\n      - ${receiptRef}`));
JS

set +e
node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim "$B" --phase wave2 --count 1 > "$B/case-152-wave2-drain-after-repair.json"
DRAIN_AFTER_STATUS=$?
set -e
node - "$B/case-152-wave2-drain-after-repair.json" "$DRAIN_AFTER_STATUS" <<'JS'
const fs = require('fs');
const [file, status] = process.argv.slice(2);
const drain = JSON.parse(fs.readFileSync(file, 'utf8'));
console.log(JSON.stringify({ status: Number(status), phase_drained: drain.phase_drained, in_flight_count: drain.in_flight_count, unclaimed_delegated_count: drain.unclaimed_delegated_count }, null, 2));
process.exit(Number(status) === 1 && drain.phase_drained === true ? 0 : 1);
JS

node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle "$B" --current-node phases/phase-wave2.md > "$B/case-152-gate-after-repair.json"
```

## Step 6: [MAIN/SHELL] Record Verdict

```bash
node --input-type=module - "$B" "$WORK_REPAIR" <<'JS'
import { readFileSync } from 'node:fs';
import { loadWorkUnitIndex } from './DPT_FRAMEWORK/engine/work-unit-core.mjs';
import { readTrace, recordPlaybookCheck, writeTraceVerdict } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const [bundle, workId] = process.argv.slice(2);
const beforeDrain = JSON.parse(readFileSync(`${bundle}/case-152-wave2-drain-before-gate.json`, 'utf8'));
const beforeGate = JSON.parse(readFileSync(`${bundle}/case-152-gate-before-repair.json`, 'utf8'));
const opened = JSON.parse(readFileSync(`${bundle}/case-152-open-batch.json`, 'utf8'));
const submit = JSON.parse(readFileSync(`${bundle}/case-152-repair-submit.json`, 'utf8'));
const afterDrain = JSON.parse(readFileSync(`${bundle}/case-152-wave2-drain-after-repair.json`, 'utf8'));
const afterGate = JSON.parse(readFileSync(`${bundle}/case-152-gate-after-repair.json`, 'utf8'));
const record = loadWorkUnitIndex(bundle).work_units[workId];
const attempts = readTrace(bundle).filter((event) => event.event === 'gate_attempt' && event.gate === 'wave2-complete');

recordPlaybookCheck(bundle, { gate: 'drained-before-initial-gate', passed: beforeDrain.phase_drained === true, detail: JSON.stringify(beforeDrain) });
recordPlaybookCheck(bundle, { gate: 'initial-gate-fails', passed: beforeGate.check?.passed === false && /work-unit|coverage|bypass/i.test(JSON.stringify(beforeGate.inspect || [])), detail: JSON.stringify(beforeGate.inspect || []) });
recordPlaybookCheck(bundle, { gate: 'repair-batch-opened', passed: opened.ok === true && opened.batch_id === 'b001' && opened.batch_reason === 'gate_failure_refill', detail: `${opened.batch_id}:${opened.batch_reason}` });
recordPlaybookCheck(bundle, { gate: 'repair-claim-uses-refill-batch', passed: record?.batch_id === 'b001' && workId.includes('-b001-'), detail: workId });
recordPlaybookCheck(bundle, { gate: 'repair-submit', passed: submit.ok === true, detail: workId });
recordPlaybookCheck(bundle, { gate: 'drained-after-repair-before-gate', passed: afterDrain.phase_drained === true, detail: JSON.stringify(afterDrain) });
recordPlaybookCheck(bundle, { gate: 'repaired-gate-passes', passed: afterGate.check?.passed === true, detail: JSON.stringify(afterGate.inspect || []) });
recordPlaybookCheck(bundle, { gate: 'gate-attempts-fail-then-pass', passed: attempts.some((event) => event.passed === false) && attempts.some((event) => event.passed === true), detail: `${attempts.length} gate_attempt event(s)` });
const verdict = writeTraceVerdict(bundle, 'case-152');
console.log(JSON.stringify(verdict, null, 2));
process.exit(verdict.ok ? 0 : 1);
JS
```

## Step 7: [MAIN] Result Interpretation

PASS means the repair loop used gate feedback as the reason to open a new batch, the batch recorded `batch_reason: gate_failure_refill`, the repair attempt used `b001`, and the repaired Wave2 gate passed only after submitted work-unit coverage and a second drain proof.

## Step 8: [MAIN/SHELL] Cleanup

PASS only:

```bash
node -e 'const fs=require("fs"); const v=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.exit(v.ok ? 0 : 1)' "$B/case-152-verdict.json"
rm -rf "$B"
```

## Optional Automation Smoke

```bash
node experiments_env/shared/run-fixture-backed-case.mjs --case case-152 --target-dir tests/.test-bundles --cleanup-pass
```
