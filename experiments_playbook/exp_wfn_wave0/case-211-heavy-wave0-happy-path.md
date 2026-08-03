---
schema: command-experiment/v2
experiment: wfn-wave0
case: case-211-heavy-wave0-happy-path
case_goal: "Verify that a real Wave0 source-intake Agent result reaches PASS only through a legal setup/seed predecessor, work-unit dry-submit -> submit, Engine-owned seed projection, Wave0 inspect, and monitored Gate; record NOT_RUN when the real actor is unavailable."
verdict_mode: all
required_checks: [real-submit, wave0-gate, work-unit-inspect]
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
req: RWE-001
not_run_if: "The native dpt-source-intake Sub-agent or required real search/fetch capability is unavailable."
---

<!-- @impl EXA-003, EXA-005, EXA-006, EXA-007, EXA-008, PLR-003, VER-006 -->

## Execution Contract

Heavy real-Agent case. PASS requires a real `dpt-source-intake` actor to execute the generated work-unit task and produce a real result JSON, runtime receipt, declared reference/source output files, and cache trails. The fixture supplies only fixed setup input and the existing legal setup -> seed-topics -> Wave0 route; it does not prove HITL1 or Seed Agent behavior.

The Phase Agent must consume the returned result through dry-submit, formal submit, submitted contribution inspection, the existing Wave0 Projection Packet writer, Wave0 inspect, actual completion logging, and the monitored Wave0 Gate. Fixture output, hand-written ledger rows, hand-written fake search cache, synthetic predecessor/complete trace rows, and raw Gate capture cannot produce PASS.

Without a real Agent result, this case records `NOT_RUN` and exits `2`. `NOT_RUN` is explicit deferred evidence, not PASS.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | Real disposable bundle from `experiments_env/shared/new-disposable-bundle.mjs` |
| Framework path | Real setup/seed/Wave0 gates, `enter-phase`, `advance-status`, `operate-queue enqueue`, `operate-work-unit claim/dry-submit/submit/inspect`, `operate-topic-state apply`, Wave0 inspect, completion logging, and monitored Wave0 Gate |
| Fixture input | Fixed setup/profile/seed-template input only; its legal predecessor path does not prove HITL1 or Seed Agent behavior |
| Agent actor | Required for PASS |
| External calls | Required for PASS: real WebSearch/WebFetch or approved fetch degradation chain |
| Ledger generation | Real `operate-work-unit submit` |
| Verdict source | Trace JSONL checks, submit JSON, direct inspect JSON, and monitor-owned Gate artifact |
| No-real-agent rule | Record NOT_RUN, preserve bundle, do not mark PASS |

# case-211-heavy-wave0-happy-path

## Expected Runtime Path

1. Create a disposable bundle with fixed deterministic setup input, then establish the legal setup-ready -> seed-topics-ready -> Wave0 predecessor path through existing Gates and lifecycle CLIs.
2. Enqueue and claim one Wave0 delegated queue demand whose real actor must declare the shared reference, `source.yaml`, and cache trail.
3. A real Agent executes the work-unit task using WebSearch/WebFetch and writes its own result/receipt/output/cache evidence.
4. Dry-submit and formally submit the real result, inspect the submitted contribution, retain/apply the existing Wave0 Projection Packet, and inspect Wave0 output.
5. Log actual Wave0 completion, run the Gate through the existing monitor, and record native checks from submit/inspect/monitor evidence only.
6. If no real result exists, record NOT_RUN and preserve the bundle.

## Step 1: [MAIN/SHELL] Create Fixed Setup Input Without Synthetic Wave0 Evidence

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs w0_real_agent_work_unit --case case-211 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
node --input-type=module - "$B" <<'JS'
import { renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeMinimalStatus, writeWave0Scaffold } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
const planBasename = 'w0_real_agent_work_unit';
const topicSlug = 'agentic-coding-tools';

// This only creates fixed fixture inputs. No Engine transition has run yet.
writeWave0Scaffold(bundle, {
  planBasename,
  topics: [{ id: 't1', slug: topicSlug, title: 'Agentic coding tools' }],
  referenceRows: ['| 00-shared-agentic-coding-tools.md | secondary | practitioner | Tier 2 | all | wave0_foundation | accepted | 2026-07-06 |'],
  syntheticWave0Trace: false,
});

// Keep the canonical template out of seed_topics until the loaded Seed Topics step.
renameSync(
  join(bundle, 'seed_topics', `${topicSlug}.md`),
  join(bundle, 'case-211-seed-template.md'),
);
writeMinimalStatus(bundle, {
  current_gate: 'setup_ready',
  next_gate: 'seed_topics_ready',
  state: 'in_progress',
});
writeFileSync(join(bundle, 'rb_profile.yaml'), `plan_basename: ${planBasename}
research_profile: debug
root_must_answer_set:
  - "Which real source supports the Wave0 foundation for agentic coding tools?"
research_style_params:
  user_visible: false
  wave0_per_topic_source_floor: 1
  wave0_shared_ref_total: 1
  wave1_per_topic_ref_floor: 1
  topic_unique_ratio: 0
  counterexample_search: false
  cross_verification: false
  p0p1_independent_backing: 1
  quality_min_tier: tier_4
  quality_min_substance: none
  wave2_cross_topic_depth: 0
  wave2_emergent_search_rounds: 0
research_access:
  status: available
  probed_at: "2026-07-10T00:00:00.000Z"
  result_url: "https://example.com/case-211-fixture"
  fetch_outcome: success
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-07-10T00:00:00.000Z"
  hitl2:
    status: not_started
    answerability_class: not_assessed
    user_decision: not_started
    final_report_view: not_started
`);
JS
node DPT_FRAMEWORK/cli/validate-bundle.mjs "$B"
echo "BUNDLE=$B"
```

Expected: the bundle has no fixture-authored `seed-topics-ready`, `load_complete`, or `wave0_completion` trace evidence. The direct initial files are fixed deterministic setup input, not evidence that HITL1 or a Seed Agent ran.

## Step 2: [MAIN/SHELL] Establish Setup-Ready -> Seed Topics Through Existing Commands

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
SETUP_GATE_JSON=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate setup-ready -- node DPT_FRAMEWORK/cli/gates/check-gate-setup-ready.mjs --bundle "$B" --current-node phases/phase-setup.md)
printf '%s\n' "$SETUP_GATE_JSON" > "$B/case-211-setup-gate.json"
NEXT=$(printf '%s\n' "$SETUP_GATE_JSON" | node experiments_env/shared/extract-field.mjs check.next)
node - "$B/case-211-setup-gate.json" <<'JS'
const fs = require('fs');
const gate = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
console.log(JSON.stringify({ passed: gate.check?.passed, next: gate.check?.next, inspect: gate.inspect || [] }, null, 2));
process.exit(gate.check?.passed === true && gate.check?.next === 'phases/phase-seed-topics.md' ? 0 : 1);
JS
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle "$B" --node "$NEXT" > "$B/case-211-enter-seed-topics.md"
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$B" --to setup_ready > "$B/case-211-advance-setup.json"
```

Expected: the setup Gate and `enter-phase` create the route-bound predecessor evidence for Seed Topics; no trace/status is hand-authored as a substitute.

## Step 3: [MAIN/SHELL] Materialize Seed Topic, Pass Seed-Topics-Ready, And Enter Wave0

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { renameSync } from 'node:fs';
import { join } from 'node:path';

const bundle = process.argv[2];
renameSync(
  join(bundle, 'case-211-seed-template.md'),
  join(bundle, 'seed_topics', 'agentic-coding-tools.md'),
);
JS

SEED_GATE_JSON=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate seed-topics-ready -- node DPT_FRAMEWORK/cli/gates/check-gate-seed-topics-ready.mjs --bundle "$B" --current-node phases/phase-seed-topics.md)
printf '%s\n' "$SEED_GATE_JSON" > "$B/case-211-seed-gate.json"
NEXT=$(printf '%s\n' "$SEED_GATE_JSON" | node experiments_env/shared/extract-field.mjs check.next)
node - "$B/case-211-seed-gate.json" <<'JS'
const fs = require('fs');
const gate = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
console.log(JSON.stringify({ passed: gate.check?.passed, next: gate.check?.next, inspect: gate.inspect || [] }, null, 2));
process.exit(gate.check?.passed === true && gate.check?.next === 'phases/phase-wave0.md' ? 0 : 1);
JS
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle "$B" --node "$NEXT" > "$B/case-211-enter-wave0.md"
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$B" --to seed_topics_ready > "$B/case-211-advance-seed-topics.json"
```

Expected: only the existing gate/entry/status operations establish the Wave0 window required by Wave Projection authorization and handoff preflight. This deterministic predecessor remains setup-only evidence.

## Step 4: [MAIN/SHELL] Enqueue And Claim The Real Source-Intake Work Unit

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { enqueueWorkUnitTask, queueItemForWorkUnit } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
const sharedReference = 'reference/00-shared-agentic-coding-tools.md';
const sourceYaml = 'artifacts/wave0/agentic-coding-tools/source.yaml';
const task = queueItemForWorkUnit({
  queue_item_id: 'wave0-source-agentic-coding-tools',
  topic_slug: 'agentic-coding-tools',
  title: 'Real Wave0 source intake',
  action: 'Research and submit one real Wave0 source-intake contribution for agentic coding tools.',
  writes_to: [sharedReference, sourceYaml],
  task_brief: [
    'You are the real dpt-source-intake actor for this claimed work unit.',
    `Write and declare ${sharedReference}; it must be a real fetched reference, not a Phase-authored substitute.`,
    'Its declared output metadata must contain a real HTTP(S) source_url for the source actually used.',
    `Write and declare ${sourceYaml} as the required Wave0 source metadata array for this Topic.`,
    'Declare cache_trails[] that map to the same real source_url and preserve the actor-created cache evidence.',
    'Return only your own result/receipt/output declarations; do not ask the Phase Agent to create any reference, source YAML, cache trail, ledger row, or receipt for you.',
  ].join('\n'),
});
const enqueue = enqueueWorkUnitTask(bundle, task, { fileName: 'case211-real-task.json' });
console.log(JSON.stringify(enqueue, null, 2));
JS

CLAIM_JSON=$(node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim "$B" --phase wave0 --count 1 --actor-outcome available --actor-source native_probe --actor-role-key dpt-source-intake --actor-reason probe_succeeded --execution-actor delegated_subagent)
printf '%s\n' "$CLAIM_JSON" > "$B/case-211-claim.json"
WORK_ID=$(printf '%s\n' "$CLAIM_JSON" | node -e 'const j=JSON.parse(require("fs").readFileSync(0,"utf8")); console.log(j.claimed_work_ids[0]);')
printf '%s\n' "$CLAIM_JSON" | node -e '
const j = JSON.parse(require("fs").readFileSync(0, "utf8"));
console.log(`claimed_count=${j.claimed_count}`);
console.log(`work_id=${j.claimed_work_ids[0]}`);
console.log(`prompt_ref=${j.claimed?.[0]?.prompt_ref || j.prompt_refs?.[0] || "see work-unit envelope"}`);
process.exit(j.claimed_count === 1 ? 0 : 1);
'
```

Expected: one `wave0_source_intake` work unit is claimed. The controller must read the claim JSON and generated work-unit envelope before dispatching the Agent.

## Step 5: [MAIN->AGENT] Produce The Real Actor Result

A real project Agent must execute the generated work-unit task from `_work_units/wave0/$WORK_ID/task.md`, obey its manifest, beacon, result schema, receipt nonce, output declaration, and cache policy.

Expected real runtime evidence:

- A result JSON matching the claimed `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`.
- A runtime receipt event with the same `receipt_nonce`.
- A Subject-written and declared `reference/00-shared-agentic-coding-tools.md` with a real `source_url`.
- A Subject-written and declared `artifacts/wave0/agentic-coding-tools/source.yaml`.
- Declared `cache_trails[]` whose source metadata maps to that real `source_url`.
- No Phase-authored reference, source YAML, cache trail, receipt, or ledger row.

After the native Sub-agent returns, write `case-211-subagent-evidence.json` as a path-only index containing exact absolute `task`, `result`, `receipt`, `reference_output`, and `source_output` paths. The paths must come from the claim prompt refs and returned result. If the actor cannot run or produce its assigned files, write `case-211-subject-unavailable.txt` with a non-empty reason and skip directly to Step 12; do not create substitute output.

## Step 6: [MAIN/SHELL] No-Result Checkpoint

If no real result exists, use the unavailable marker described above. Native completion will publish `NOT_RUN`; no fixture runner or parent output is allowed.

## Step 7: [MAIN/SHELL] Dry-Submit, Formally Submit, And Inspect The Submitted Contribution

Run only after Step 5 has produced a real Agent result file.

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
REAL_RESULT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.result)' "$B/case-211-subagent-evidence.json")
WORK_ID=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.claimed_work_ids[0])' "$B/case-211-claim.json")

set +e
node DPT_FRAMEWORK/cli/operate-work-unit.mjs dry-submit "$B" --work-id "$WORK_ID" --result "$REAL_RESULT" > "$B/case-211-dry-submit.json"
DRY_SUBMIT_STATUS=$?
set -e
node - "$B/case-211-dry-submit.json" "$DRY_SUBMIT_STATUS" <<'JS'
const fs = require('fs');
const [file, status] = process.argv.slice(2);
const dry = JSON.parse(fs.readFileSync(file, 'utf8'));
console.log(JSON.stringify({ status: Number(status), ok: dry.ok, expected_submit: dry.expected_submit, recommended_action: dry.recommended_action, attempt_disposition: dry.attempt_disposition || null, violations: dry.violations || [] }, null, 2));
process.exit(Number(status) === 0 && dry.ok === true && dry.expected_submit === 'pass' && dry.recommended_action === 'submit' ? 0 : 1);
JS

node DPT_FRAMEWORK/cli/operate-work-unit.mjs submit "$B" --work-id "$WORK_ID" --result "$REAL_RESULT" > "$B/case-211-submit.json"
node - "$B/case-211-submit.json" <<'JS'
const fs = require('fs');
const submit = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
console.log(JSON.stringify({ ok: submit.ok, status: submit.status, work_id: submit.work_id }, null, 2));
process.exit(submit.ok === true ? 0 : 1);
JS

node DPT_FRAMEWORK/cli/operate-work-unit.mjs inspect "$B" --eligible-rows --phase wave0 > "$B/case-211-inspect.json"
set +e
node DPT_FRAMEWORK/cli/inspect-wave0-output.mjs --bundle "$B" > "$B/case-211-wave0-pre-projection-inspect.json"
PRE_PROJECTION_INSPECT_STATUS=$?
set -e
node DPT_FRAMEWORK/cli/operate-topic-state.mjs schema --context wave_projection > "$B/case-211-wave0-projection-schema.json"
node - "$B/case-211-inspect.json" "$B/case-211-wave0-pre-projection-inspect.json" "$B/case-211-wave0-projection-schema.json" "$WORK_ID" "$PRE_PROJECTION_INSPECT_STATUS" <<'JS'
const fs = require('fs');
const [inspectPath, wave0InspectPath, schemaPath, workId, wave0InspectStatus] = process.argv.slice(2);
const inspect = JSON.parse(fs.readFileSync(inspectPath, 'utf8'));
const wave0Inspect = JSON.parse(fs.readFileSync(wave0InspectPath, 'utf8'));
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const row = (inspect.eligible_rows || []).find((candidate) => candidate.work_id === workId);
console.log(JSON.stringify({ inspect_passed: inspect.passed, eligible_row: row || null, pre_projection_inspect_status: Number(wave0InspectStatus), pre_projection_inspect: wave0Inspect.inspect || [], schema_ok: schema.ok, forms: schema.forms || [] }, null, 2));
process.exit(inspect.passed === true && Boolean(row) && schema.ok === true ? 0 : 1);
JS
```

If dry-submit does not recommend `submit`, the Phase Agent reads its structured disposition and repairs only the named candidate/assigned surface before rerunning dry-submit. It must not bypass the feedback with a ledger/index/status/receipt/cache edit or ask the user to run ordinary commands.

## Step 8: [MAIN->AGENT] Retain The Existing Wave0 Projection Packet

Read `case-211-inspect.json`, `case-211-wave0-pre-projection-inspect.json`, `case-211-wave0-projection-schema.json`, and the submitted result. Retain exactly one complete Wave0 Projection Packet at `case-211-wave0-projection.json` using the schema just returned by `operate-topic-state schema --context wave_projection`.

The packet must use the submitted row's canonical `topic_uid`, the submitted `work_id`, and every exact contribution-owned `<work_id>/N` candidate ordinal reported by the pre-projection Wave0 inspect. A materializable candidate uses the actor-written `reference/00-shared-agentic-coding-tools.md`; a genuinely non-materializable candidate uses the existing `defers`/`deferred` form with `refs: ["none"]` and an explicit limitation. The Phase Agent supplies the semantic evidence meaning, but it must not hard-code a packet schema, infer ordinals from source-file bytes, or hand-edit the seed topic.

## Step 9: [MAIN/SHELL -> AGENT] Apply The Packet And Inspect Wave0 Output

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DPT_FRAMEWORK/cli/operate-topic-state.mjs apply --bundle "$B" --input "$B/case-211-wave0-projection.json" > "$B/case-211-wave0-projection-apply.json"
set +e
node DPT_FRAMEWORK/cli/inspect-wave0-output.mjs --bundle "$B" > "$B/case-211-wave0-inspect.json"
WAVE0_INSPECT_STATUS=$?
set -e
node - "$B/case-211-wave0-inspect.json" "$WAVE0_INSPECT_STATUS" <<'JS'
const fs = require('fs');
const [file, status] = process.argv.slice(2);
const inspect = JSON.parse(fs.readFileSync(file, 'utf8'));
console.log(JSON.stringify({ status: Number(status), passed: inspect.check?.passed, inspect: inspect.inspect || [], hints: inspect.hints || [] }, null, 2));
process.exit(Number(status) === 0 && inspect.check?.passed === true ? 0 : 1);
JS
```

If the inspect names an omitted current candidate, repair only the retained packet through the same `operate-topic-state apply` -> `inspect-wave0-output` loop. If it names another authority boundary, preserve that boundary; do not proceed to completion or Gate with a failed Wave0 inspect.

## Step 10: [MAIN/SHELL] Log Actual Completion And Run The Monitored Wave0 Gate

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DPT_FRAMEWORK/cli/log-event.mjs --bundle "$B" --event wave0_completion --detail '{"source":"case-211-phase-closeout"}'

set +e
node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate wave0-complete -- node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle "$B" --current-node phases/phase-wave0.md > "$B/case-211-wave0-gate-stdout.json"
GATE_STATUS=$?
set -e
GATE_MONITOR_PATH=$(find "$B/_observability/gates" -type f -name '*-wave0-complete.json' | sort | tail -n 1)
test -n "$GATE_MONITOR_PATH"
printf '%s\n' "$GATE_MONITOR_PATH" > "$B/case-211-wave0-gate-monitor.path"
printf '%s\n' "$GATE_STATUS" > "$B/case-211-wave0-gate.status"
```

Expected: monitor-owned Gate evidence is retained under `_observability/gates/`; the wrapped Gate remains the verdict authority. Do not invoke the Wave0 Gate directly or manufacture a Gate trace/log row.

## Step 11: [MAIN/SHELL] Record Native Verdict Checks From Real Evidence

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
WORK_ID=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.claimed_work_ids[0])' "$B/case-211-claim.json")
node --input-type=module - "$B" "$WORK_ID" <<'JS'
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { recordPlaybookCheck } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const [bundle, workId] = process.argv.slice(2);
const dry = JSON.parse(readFileSync(`${bundle}/case-211-dry-submit.json`, 'utf8'));
const submit = JSON.parse(readFileSync(`${bundle}/case-211-submit.json`, 'utf8'));
const inspect = JSON.parse(readFileSync(`${bundle}/case-211-inspect.json`, 'utf8'));
const evidence = JSON.parse(readFileSync(`${bundle}/case-211-subagent-evidence.json`, 'utf8'));
const result = JSON.parse(readFileSync(evidence.result, 'utf8'));
const receipts = readFileSync(evidence.receipt, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const monitorPath = readFileSync(`${bundle}/case-211-wave0-gate-monitor.path`, 'utf8').trim();
const monitor = JSON.parse(readFileSync(monitorPath, 'utf8'));
const gate = monitor.parsed_json || null;
const referencePath = 'reference/00-shared-agentic-coding-tools.md';
const sourcePath = 'artifacts/wave0/agentic-coding-tools/source.yaml';
const declaredReference = (result.output_files || []).find((row) => (
  row.path === referencePath && typeof row.source_url === 'string' && /^https?:\/\//.test(row.source_url)
));
const declaredSource = (result.output_files || []).find((row) => row.path === sourcePath);
const subjectBound = Boolean(
  existsSync(evidence.task)
  && existsSync(evidence.reference_output)
  && existsSync(evidence.source_output)
  && result.work_id === workId
  && receipts.some((row) => row.work_id === workId)
  && declaredReference
  && declaredSource
  && resolve(bundle, declaredReference.path) === resolve(evidence.reference_output)
  && resolve(bundle, declaredSource.path) === resolve(evidence.source_output)
);

recordPlaybookCheck(bundle, {
  gate: 'real-submit',
  passed: dry.ok === true && dry.expected_submit === 'pass' && dry.recommended_action === 'submit' && submit.ok === true && subjectBound,
  detail: workId,
});
recordPlaybookCheck(bundle, {
  gate: 'wave0-gate',
  passed: monitor.exit_code === 0 && gate?.check?.passed === true,
  detail: JSON.stringify(gate?.inspect || []),
});
recordPlaybookCheck(bundle, {
  gate: 'work-unit-inspect',
  passed: inspect.passed === true,
  detail: JSON.stringify(inspect.inspect || []),
});

console.log('Recorded native checks; Supervisor finalizer is authoritative.');
JS
```

Expected: PASS only with a real Agent result submitted through the work-unit boundary, an Engine-applied projection, a passing Wave0 inspect, and a passing monitored Gate.

## Step 12: [MAIN/SHELL] Native Completion

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
EXTRA_ARGS=()
if [ -f "$B/case-211-subject-unavailable.txt" ]; then
  EXTRA_ARGS+=(--not-run-reason "native dpt-source-intake Sub-agent or required real search/fetch capability unavailable")
else
  TASK=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.task)' "$B/case-211-subagent-evidence.json")
  RESULT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.result)' "$B/case-211-subagent-evidence.json")
  RECEIPT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.receipt)' "$B/case-211-subagent-evidence.json")
  OUTPUT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.reference_output)' "$B/case-211-subagent-evidence.json")
  EXTRA_ARGS+=(--evidence "subject_task=$TASK" --evidence "subject_result=$RESULT" --evidence "subject_receipt=$RECEIPT" --evidence "subject_output=$OUTPUT")
fi
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B" "${EXTRA_ARGS[@]}"
```

Stop after native completion. The Autorun Supervisor owns Heavy health, durable Subject-evidence export, audit, preservation, and optional clean-PASS cleanup.
