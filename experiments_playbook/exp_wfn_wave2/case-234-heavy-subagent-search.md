---
schema: command-experiment/v2
experiment: wfn-wave2
case: case-234-heavy-subagent-search
case_goal: "Verify real Wave2 targeted evidence search returns through wave2_targeted_evidence work-unit submit by work_id."
verdict_mode: all
required_checks: [real-subagent-search-result, targeted-receipt-ingested, index-updated, resynthesis-promoted, wave2-targeted-submit-row, wave2-gate-pass]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: heavy
durable_evidence_roles: [subject_task, subject_result, subject_receipt, subject_output]
proof_subject: agent_behavior
subject_execution: real_subagent
fixture: setup_only
runtime: real_disposable_bundle
external_calls: real
verdict_judge: deterministic
req: RWE-001, RWE-004, WTS-002, WTS-005
not_run_if: "The native dpt-topic-scout Sub-agent or required real search/fetch capability is unavailable."
---

<!-- @impl EXA-003, EXA-005, EXA-006, EXA-007, EXA-008, PLR-003, VER-006 -->

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
| Does not prove | Anything when native completion reports `NOT_RUN` |

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
B=$(node experiments_env/shared/new-disposable-bundle.mjs w2_real_targeted_search --case case-234 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
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
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim "$B" --phase wave2 --count 1 --actor-outcome available --actor-source native_probe --actor-role-key dpt-topic-scout --actor-reason probe_succeeded --execution-actor delegated_subagent > "$B/case-234-claim.json"
node - "$B" <<'JS'
const fs = require('fs');
const bundle = process.argv[2];
const claim = JSON.parse(fs.readFileSync(`${bundle}/case-234-claim.json`, 'utf8'));
console.log(JSON.stringify({ claimed_count: claim.claimed_count, work_id: claim.claimed_work_ids?.[0], prompt_refs: claim.prompt_refs }, null, 2));
process.exit(claim.claimed_count === 1 ? 0 : 1);
JS
```

Expected: one Wave2 work unit is claimed and its task directory contains the sub-agent prompt.

## Step 3: [MAIN->SUBAGENT] Run Real dpt-topic-scout

Read the generated `task.md` for the claimed work unit and run the real actor. The result must bind:

- `work_id`
- `queue_item_id`
- `kind: wave2_targeted_evidence`
- `receipt_nonce`
- `output_files[]` including `reference/00-cross-*.md`
- `cache_trails[]`

After return, write `case-234-subagent-evidence.json` as a path-only index containing exact absolute `task`, `result`, `receipt`, and one Subject-written declared `output` path. No fixture result, Playbook-Agent output, or parent summary is acceptable. If the native actor or external capability is unavailable, write `case-234-subject-unavailable.txt` and continue directly to Step 7.

## Step 4: [MAIN/SHELL] Submit Real Result By work_id

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
RESULT_JSON=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(x.result)' "$B/case-234-subagent-evidence.json")
WORK_ID=$(node -e 'const fs=require("fs"); const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); console.log(j.claimed_work_ids[0])' "$B/case-234-claim.json")
node DPT_FRAMEWORK/cli/operate-work-unit.mjs submit "$B" --work-id "$WORK_ID" --result "$RESULT_JSON" > "$B/case-234-submit.json"
```

Expected: submit succeeds and appends exactly one submitted Wave2 ledger row.

## Step 5: [MAIN] Update Wave2 Artifacts From Submitted Evidence

After the real submit succeeds, the Playbook Agent consumes the Subject result and updates:

- `artifacts/wave2/cross-topic-ledger.md`
- `artifacts/wave2/finding-index.yaml`, adding the runtime receipt ref under `subagent_receipt_refs`
- `artifacts/wave2/synthesis.md`
- `seed_topics/*.md`

The artifacts may reference `reference/00-cross-*.md` only after the submit succeeds. `finding-index.yaml` must retain `search_required: true`, set the finding to its resolved/submitted state, include the actual runtime receipt ref under `subagent_receipt_refs`, and make the submitted target eligible for synthesis. The synthesis and both seed-topic backfills must incorporate the submitted finding without fabricating any unsubmitted reference.

## Step 6: [MAIN/SHELL] Gate And Verdict

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { appendTrace } from './experiments_env/shared/work-unit-playbook-utils.mjs';
appendTrace(process.argv[2], { event: 'wave2_completion', source: 'case-234-real-targeted-search' });
JS
node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle "$B" --current-node phases/phase-wave2.md > "$B/case-234-gate.json"
node --input-type=module - "$B" <<'JS'
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { readWorkUnitLedgerRows, recordPlaybookCheck } from './experiments_env/shared/work-unit-playbook-utils.mjs';
const bundle = process.argv[2];
const gate = JSON.parse(readFileSync(`${bundle}/case-234-gate.json`, 'utf8'));
const rows = readWorkUnitLedgerRows(bundle).filter((row) => row.wave === 2);
const evidence = JSON.parse(readFileSync(`${bundle}/case-234-subagent-evidence.json`, 'utf8'));
const result = JSON.parse(readFileSync(evidence.result, 'utf8'));
const receipts = readFileSync(evidence.receipt, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const idx = parseYaml(readFileSync(`${bundle}/artifacts/wave2/finding-index.yaml`, 'utf8'));
const finding = (idx.findings || []).find((entry) => entry.id === 'W2F-001');
const synthesis = readFileSync(`${bundle}/artifacts/wave2/synthesis.md`, 'utf8');
const subjectBound = existsSync(evidence.task) && existsSync(evidence.output)
  && rows.some((row) => row.work_id === result.work_id)
  && receipts.some((row) => row.work_id === result.work_id)
  && (result.output_files || []).some((row) => resolve(bundle, row.path) === resolve(evidence.output));
const receiptIngested = (finding?.subagent_receipt_refs || []).some((ref) => resolve(bundle, ref) === resolve(evidence.receipt));
const indexUpdated = finding?.search_required === true && ['resolved', 'submitted'].includes(finding?.status) && receiptIngested;
const resynthesisPromoted = synthesis.includes('W2F-001') && (result.output_files || []).some((row) => synthesis.includes(row.path) || synthesis.includes('submitted targeted evidence'));
recordPlaybookCheck(bundle, { gate: 'real-subagent-search-result', passed: subjectBound && (result.cache_trails || []).length > 0, detail: result.work_id });
recordPlaybookCheck(bundle, { gate: 'targeted-receipt-ingested', passed: receiptIngested, detail: JSON.stringify(finding?.subagent_receipt_refs || []) });
recordPlaybookCheck(bundle, { gate: 'index-updated', passed: indexUpdated, detail: JSON.stringify(finding || {}) });
recordPlaybookCheck(bundle, { gate: 'resynthesis-promoted', passed: resynthesisPromoted, detail: 'W2F-001 submitted evidence appears in synthesis' });
recordPlaybookCheck(bundle, { gate: 'wave2-targeted-submit-row', passed: rows.length === 1 && rows[0].work_id === result.work_id, detail: JSON.stringify(rows.map((row) => row.work_id)) });
recordPlaybookCheck(bundle, { gate: 'wave2-gate-pass', passed: gate.check?.passed === true, detail: JSON.stringify(gate.inspect || []) });
console.log('Recorded native facts; finalizer owns completion.');
JS
```

## Step 7: [MAIN/SHELL] Native Completion

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
EXTRA_ARGS=()
if [ -f "$B/case-234-subject-unavailable.txt" ]; then
  EXTRA_ARGS+=(--not-run-reason "native dpt-topic-scout Sub-agent or required real search/fetch capability unavailable")
else
  TASK=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.task)' "$B/case-234-subagent-evidence.json")
  RESULT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.result)' "$B/case-234-subagent-evidence.json")
  RECEIPT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.receipt)' "$B/case-234-subagent-evidence.json")
  OUTPUT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.output)' "$B/case-234-subagent-evidence.json")
  EXTRA_ARGS+=(--evidence "subject_task=$TASK" --evidence "subject_result=$RESULT" --evidence "subject_receipt=$RECEIPT" --evidence "subject_output=$OUTPUT")
fi
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B" "${EXTRA_ARGS[@]}"
```

Stop after native completion. The Autorun Supervisor owns Heavy health, durable Subject-evidence export, audit, preservation, and optional clean-PASS cleanup.
