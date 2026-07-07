---
schema: command-experiment/v1
experiment: wfn-wave2
case: case-234-heavy-subagent-search
weight: heavy
case_goal: "Verify real Wave2 targeted evidence search returns through wave2_targeted_evidence work-unit submit by work_id."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-234_w2_real_targeted_search
trace: dpt_disp_case-234_w2_real_targeted_search/rb_trace.jsonl
verdict: trace-jsonl
req: RWE-001, RWE-004, WTS-002, WTS-005
---

## Execution Contract

This is a real sub-agent canary. The targeted evidence search must be performed by a real `dpt-topic-scout` actor from the claimed `task.md`. A fixture result cannot make this case PASS. Deterministic code may allocate the work unit, submit the real result by `work_id`, run the Wave2 gate, and record trace checks.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | Real disposable Wave2 bundle |
| Framework path | Real `operate-work-unit claim/submit`, submitted ledger row, and Wave2 gate CLI |
| Fixture input | Setup may seed Wave1 artifacts only |
| Agent actor | Required real `dpt-topic-scout` |
| External calls | Real search/fetch or approved real fetch chain |
| Verdict source | Submit JSON, work-unit ledger/index, Wave2 gate JSON, trace checks |
| Does not prove | Anything when optional smoke reports `NOT_RUN` |

# case-234-heavy-subagent-search

## Expected Runtime Path

1. Create a Wave2-ready bundle and write a finding that requires targeted evidence.
2. Enqueue a `wave2_targeted_evidence` demand for `W2F-001`.
3. Claim with `operate-work-unit claim --phase wave2`.
4. Real `dpt-topic-scout` reads the generated task, searches/fetches, writes `reference/00-cross-*.md`, cache trails, runtime receipt, and result JSON.
5. Main Agent submits the result with `operate-work-unit submit --work-id <claimed id>`.
6. Wave2 synthesis/index are updated to include the submitted evidence.
7. Wave2 gate passes.

## Step 1: [MAIN/SHELL] Create Runtime Context And Search Demand

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs w2_real_targeted_search --case case-234 --force)
node --input-type=module - "$B" <<'JS'
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { enqueueWorkUnitTask, queueItemForWorkUnit, writeWave2Scaffold } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
writeWave2Scaffold(bundle, { planBasename: 'w2_real_targeted_search', staleWave2Backfill: true });
mkdirSync(path.join(bundle, 'artifacts/wave2'), { recursive: true });
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
    appears_in_synthesis: false
    hitl2_handoff: false
`);
enqueueWorkUnitTask(bundle, queueItemForWorkUnit({
  phase: 'wave2',
  queue_item_id: 'wave2-targeted-W2F-001',
  finding_id: 'W2F-001',
  title: 'Real targeted evidence search for W2F-001',
  priority_class: 'P1_state_or_gate_repair'
}), { fileName: 'case234-real-targeted-search.json' });
JS
```

## Step 2: [MAIN/SHELL] Claim Work Unit

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim "$B" --phase wave2 --count 1 > "$B/case-234-claim.json"
node - "$B" <<'JS'
const fs = require('fs');
const bundle = process.argv[2];
const claim = JSON.parse(fs.readFileSync(`${bundle}/case-234-claim.json`, 'utf8'));
console.log(JSON.stringify({ claimed_count: claim.claimed_count, work_id: claim.claimed_work_ids?.[0], prompt_refs: claim.prompt_refs }, null, 2));
process.exit(claim.claimed_count === 1 ? 0 : 1);
JS
```

Expected: one Wave2 work unit is claimed and its task directory contains the sub-agent prompt.

## Step 3: [MAIN->AGENT] Run Real dpt-topic-scout

Read the generated `task.md` for the claimed work unit and run the real actor. The result must bind:

- `work_id`
- `queue_item_id`
- `kind: wave2_targeted_evidence`
- `receipt_nonce`
- `output_files[]` including `reference/00-cross-*.md`
- `cache_trails[]`

No fixture result is acceptable for this case.

## Step 4: [MAIN/SHELL] Submit Real Result By work_id

```bash
RESULT_JSON=/absolute/path/to/real-wave2-targeted-result.json
WORK_ID=$(node -e 'const fs=require("fs"); const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); console.log(j.claimed_work_ids[0])' "$B/case-234-claim.json")
node DPT_FRAMEWORK/cli/operate-work-unit.mjs submit "$B" --work-id "$WORK_ID" --result "$RESULT_JSON" > "$B/case-234-submit.json"
```

Expected: submit succeeds and appends exactly one submitted Wave2 ledger row.

## Step 5: [MAIN] Update Wave2 Artifacts From Submitted Evidence

The Phase Agent updates:

- `artifacts/wave2/cross-topic-ledger.md`
- `artifacts/wave2/finding-index.yaml`, adding the runtime receipt ref under `subagent_receipt_refs`
- `artifacts/wave2/synthesis.md`
- `seed_topics/*.md`

The artifacts may reference `reference/00-cross-*.md` only after the submit succeeds.

## Step 6: [MAIN/SHELL] Gate And Verdict

```bash
node --input-type=module - "$B" <<'JS'
import { appendTrace } from './experiments_env/shared/work-unit-playbook-utils.mjs';
appendTrace(process.argv[2], { event: 'wave2_completion', source: 'case-234-real-targeted-search' });
JS
node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle "$B" --current-node phases/phase-wave2.md > "$B/case-234-gate.json"
node --input-type=module - "$B" <<'JS'
import { readFileSync } from 'node:fs';
import { readWorkUnitLedgerRows, recordPlaybookCheck, writeTraceVerdict } from './experiments_env/shared/work-unit-playbook-utils.mjs';
const bundle = process.argv[2];
const gate = JSON.parse(readFileSync(`${bundle}/case-234-gate.json`, 'utf8'));
const rows = readWorkUnitLedgerRows(bundle).filter((row) => row.wave === 2);
recordPlaybookCheck(bundle, { gate: 'wave2-targeted-submit-row', passed: rows.length === 1, detail: JSON.stringify(rows.map((row) => row.work_id)) });
recordPlaybookCheck(bundle, { gate: 'wave2-gate-pass', passed: gate.check?.passed === true, detail: JSON.stringify(gate.inspect || []) });
const verdict = writeTraceVerdict(bundle, 'case-234');
console.log(JSON.stringify(verdict, null, 2));
process.exit(verdict.ok ? 0 : 1);
JS
```

## Optional Automation Smoke

```bash
node experiments_env/shared/run-work-unit-playbook-case.mjs --case case-234 --target-dir tests/.test-bundles
```

Expected without `--real-result`: exit `2`, verdict `NOT_RUN`.

## Cleanup

PASS only:

```bash
node -e 'const fs=require("fs"); const v=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.exit(v.ok ? 0 : 1)' "$B/case-234-verdict.json"
rm -rf "$B"
```
