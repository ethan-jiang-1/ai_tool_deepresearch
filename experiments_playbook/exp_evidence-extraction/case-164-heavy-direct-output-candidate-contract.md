---
schema: command-experiment/v2
experiment: evidence-extraction
case: case-164-heavy-direct-output-candidate-contract
case_goal: "Prove one real Subject Agent preserves actor provenance when a current primary Wave1 candidate fails its direct semantic contract after work_done, then closes it through an explicit fresh-ID same-obligation replacement executed by a second real child actor."
verdict_mode: all
required_checks: [case-164-first-child-semantic-rejection, case-164-first-output-hashes-preserved, case-164-fresh-primary-replacement, case-164-second-child-independent-execution, case-164-replacement-submit-only]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: light
durable_evidence_roles: [subject_transcript, subject_result, first_child_result, second_child_result, dry_submit_rejection, output_hashes]
proof_subject: agent_behavior
subject_execution: real_agent
fixture: setup_only
runtime: real_disposable_bundle
external_calls: real
verdict_judge: deterministic
req: DEW-014, DEW-015, SNC-006
not_run_if: "The independent real Subject Agent, either required real child actor, or real search/fetch capability is unavailable."
---

<!-- @impl EXA-003, EXA-005, EXA-006, EXA-007, EXA-008, PLR-003, VER-006 -->

## Execution Contract

This is a narrow real-Agent recovery canary. Setup may create one canonical Topic and enqueue one current primary `wave1_topic_deepening` demand. Setup ends before claim. It must not write an actor result, runtime receipt, required output, source/cache fact, submitted ledger row, production lifecycle event, or verdict check. Bundle bootstrap and the production enqueue command may emit only their ordinary native diagnostics.

One independent Subject Agent acts as the Phase Agent across exactly three bounded turns in the same session. Turn 1 claims the setup demand and invokes the first real child actor. Turn 2 consumes the saved native rejection, fails the first attempt without an automatic retry, explicitly enqueues and claims a fresh same-primary replacement, then pauses before any replacement output write. Turn 3 invokes a second real child actor and submits only its valid replacement. The two child turns must each perform their own bounded real search and fetch and own their result, receipt, output, source, and cache facts.

The Playbook Agent may prepare prerequisites, retain the exact Subject transcript, record read-only hashes between turns, and derive final checks. It must not supply research semantics, edit either child candidate, hand-write receipts/ledger/lifecycle events, or turn console prose into evidence. If any required Subject/child/search/fetch surface is unavailable, finalize native `NOT_RUN` with a non-empty reason. `NOT_RUN` is incomplete and is never PASS.

## Reality Distance Ledger

| Dimension | Declaration |
| --- | --- |
| `test_class` | `agent_flow_e2e` |
| Fixture distance | `setup_only`; one Topic plus one queued primary card, ending before claim |
| Subject execution | one independent real Subject Agent, same session, three bounded turns |
| Child execution | two distinct real child actors, one in turn 1 and one in turn 3 |
| External calls | each child performs its own bounded real search and fetch |
| Runtime | one fresh real disposable bundle |
| Checkpoint authority | native `operate-work-unit dry-submit` JSON and formal submit JSON |
| Mutation evidence | queue/index/status/ledger facts produced by production CLIs |
| Observer evidence | exact Subject transcript, child result refs, dry-submit JSON, and before/after SHA-256 records |
| Verdict authority | five case-owned deterministic `check` events appended to native `rb_trace.jsonl` |
| Does not prove | research quality, universal Agent compliance, artifact-byte immutability, or Wave-wide completion |

# case-164-heavy-direct-output-candidate-contract

## Step 1: [PLAYBOOK AGENT] Prepare Only Topic And Queue Prerequisites

Create and register one disposable bundle. The setup helper below writes only the canonical Topic/status prerequisite and one task-card input, then calls the production enqueue operation. It does not claim a work unit or create any actor surface.

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs eex_direct_output_candidate --case case-164 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
node --input-type=module - "$B" <<'JS'
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  enqueueWorkUnitTask,
  writeMinimalPlan,
  writeMinimalStatus,
} from './experiments_env/shared/work-unit-playbook-utils.mjs';

const [bundle] = process.argv.slice(2);
const topic = {
  topic_uid: 'tp_16400000-0000-4000-8000-000000000001',
  id: '01',
  slug: '01_candidate-contract',
  title: 'Candidate Direct Contract',
  must_answer: ['How does bounded candidate validation preserve delegated authorship?'],
  scope_role: 'primary',
  depends_on_topic_uids: [],
};
writeMinimalPlan(bundle, { planBasename: 'eex_direct_output_candidate', topics: [topic] });
writeMinimalStatus(bundle, {
  current_gate: 'wave0_complete',
  next_gate: 'wave1_complete',
  current_node: 'phases/phase-wave1.md',
});
const evidencePath = `artifacts/wave1/${topic.slug}/evidence-summary.md`;
const questionsPath = `artifacts/wave1/${topic.slug}/question-list.md`;
enqueueWorkUnitTask(bundle, {
  queue_item_id: 'case-164-primary-1',
  title: 'Primary direct-output candidate canary',
  targets: {
    controller: 'main-agent',
    delegates: { to: 'sub-agent', role_key: 'dpt-evidence-extractor', timeout_ms: 600000 },
  },
  kind: 'wave1_topic_deepening',
  producer_rule: 'topic_deepening',
  priority_class: 'P4_progressive_artifact_or_seed_backfill',
  action: 'Perform bounded real search/fetch and write the assigned Wave1 evidence summary, question list, source claims, and cache trails. This canary controls one semantic fault through the child prompt; all bytes remain child-owned.',
  writes_to: [evidencePath, questionsPath],
  required_receipts: [`file:${evidencePath}`, `file:${questionsPath}`],
  done_condition: 'The real child actor writes and verifies all assigned surfaces; the Phase Agent runs dry-submit after return.',
  verification: { engine: ['work_unit_submit'], agent: ['real_search_fetch', 'direct_contract_checked'] },
  status_sync: ['wave1_topic_deepening_submitted'],
  completion_receipt: 'work_unit:submitted-ledger',
  failure_route: 'work_unit_repair',
  status: 'queued',
  restore_priority: 'normal',
  payload: {
    topic_uid: topic.topic_uid,
    topic_slug: topic.slug,
    topic_title: topic.title,
    assignment_mode: 'primary',
    wave: 1,
  },
  lineage: { topic_uid: topic.topic_uid, topic_slug: topic.slug, phase: 'wave1' },
}, { fileName: 'case-164-primary-1.json' });

const queue = JSON.parse(readFileSync(join(bundle, 'rb_queue.json'), 'utf8'));
const setupCard = queue.active_window.find((item) => item.queue_item_id === 'case-164-primary-1');
const forbidden = [
  '_work_units/_index.json',
  'rb_output_declarations.jsonl',
  evidencePath,
  questionsPath,
];
if (!setupCard || setupCard.payload?.assignment_mode !== 'primary'
  || setupCard.required_receipts?.length !== 2
  || forbidden.some((ref) => existsSync(join(bundle, ref)))) {
  throw new Error('case-164 setup crossed the pre-claim boundary');
}
JS
```

## Step 2: [PLAYBOOK AGENT] Start One Three-Turn Subject Session

Start one independent real Subject Agent through the shared same-session adapter and preserve its exact native prompt/transcript/result events. Its system instruction is limited to the bundle identity, the loaded production Wave1/shared work-unit surfaces, the three-turn boundary below, and the prohibition on writing playbook verdict checks or native completion. Do not include expected work IDs, root codes, or verdict answers.

The first Subject turn is:

```text
Act as the Phase Agent for the single queued Wave1 primary demand. Perform the required role-bound availability observation, claim exactly that demand through the production work-unit CLI, and invoke one real child actor with the exact generated task/beacon/schema. The child must independently do one bounded real search and fetch, write its own source/cache/result/receipt and both assigned outputs, record work_done, and deliberately leave only the Key Findings section semantically empty as this controlled canary fault. After the child returns, preserve a path-only first-child evidence index and run native dry-submit once. Save its complete JSON as case-164-turn1-dry-submit.json and stop. Do not repair, fail, enqueue, claim a replacement, submit, append verdict checks, or fabricate any child surface.
```

PASS eligibility requires a distinct native child actor. Subject-authored substitute output, chat-only child output, missing real search/fetch, or a hand-written dry-submit result makes the case `NOT_RUN` or FAIL, never PASS.

The adapter sends all three turns to one session and runs the read-only Step 3/Step 4 hash observers between successful result events. It does not write actor output, receipts, queue/index/ledger authority, verdict checks, completion, health, or cleanup.

Launch the adapter as one detached host process so a single Agent Bash-tool timeout cannot kill Turn 3. The detached wrapper writes one atomic status file only after the adapter exits. It does not restart or resume the Subject.

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
CASE164_BUNDLE="$B" nohup /bin/sh -c '
  node experiments_env/shared/run-iterative-interaction-subject.mjs 164 --bundle "$CASE164_BUNDLE" > "$CASE164_BUNDLE/case-164-subject-adapter.stdout" 2> "$CASE164_BUNDLE/case-164-subject-adapter.stderr"
  code=$?
  tmp="$CASE164_BUNDLE/case-164-subject-adapter-status.json.tmp.$$"
  printf "{\"exit_code\":%s}\n" "$code" > "$tmp"
  mv "$tmp" "$CASE164_BUNDLE/case-164-subject-adapter-status.json"
' > "$B/case-164-subject-adapter.launch.log" 2>&1 < /dev/null &
printf '%s\n' "$!" > "$B/case-164-subject-adapter.pid"
```

Poll with separate short Bash calls. While this prints `RUNNING`, wait and run the same poll again; do not read private child transcript files, delete evidence, restart setup, launch another Subject, or edit actor/Engine surfaces.

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
if [ -f "$B/case-164-subject-adapter-status.json" ]; then
  cat "$B/case-164-subject-adapter-status.json"
elif kill -0 "$(cat "$B/case-164-subject-adapter.pid")" 2>/dev/null; then
  echo RUNNING
else
  echo 'adapter exited without atomic status' >&2
  exit 1
fi
```

When the atomic status appears, require `exit_code: 0` before Step 6. A nonzero status is an unavailable/incomplete Subject boundary: write the non-empty marker, invoke the native finalizer with `--not-run-reason`, and stop the playbook immediately. Never repair or restart the case after a nonzero adapter status.

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
SUBJECT_STATUS=$(node -e 'process.stdout.write(String(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).exit_code))' "$B/case-164-subject-adapter-status.json")
if [ "$SUBJECT_STATUS" -ne 0 ]; then
  printf '%s\n' 'independent Subject/child Agent or real search/fetch capability unavailable' > "$B/case-164-subject-unavailable.txt"
  node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B" --not-run-reason "independent Subject/child Agent or real search/fetch capability unavailable"
fi
```

## Step 3: [PLAYBOOK AGENT] Hash First Outputs Before Turn 2

After turn 1 completes and before sending turn 2, the adapter reads the first child evidence index and native dry-submit JSON. It requires `repair_scope: semantic_content`, `recommended_action: fail_and_replace`, a non-empty Engine-derived `primary_root_code`, and a real `work_done` receipt. It hashes the two canonical assigned outputs and writes `case-164-output-hashes.json` with immutable `before_turn2` facts. This adapter observer is read-only over actor and Engine authority; any missing boundary terminates the Subject run nonzero.

## Step 4: [SUBJECT AGENT] Turn 2 Closes And Replaces Without Overwrite

Resume the same Subject session with only this turn:

```text
Consume case-164-turn1-dry-submit.json and case-164-output-hashes.json. Use the exact Engine-derived primary_root_code to run non-retry `operate-work-unit fail --reason semantic_contract:<primary_root_code>` for the first attempt. Explicitly enqueue a new primary Wave1 demand for the same canonical Topic and exact paired receipts under a fresh globally unused queue_item_id; do not reuse the failed ID, weaken it to supplementary, use actor_spawn_unavailable, or rely on automatic retry. Save the complete native outputs at bundle-root `case-164-turn2-fail.json`, `case-164-turn2-enqueue.json`, and `case-164-turn2-claim.json` respectively. Claim exactly that replacement and preserve a path-only replacement evidence index containing its identity/envelope refs plus those three native JSON refs. Stop before invoking another child or writing, repairing, or submitting replacement output.
```

After turn 2 returns, the adapter hashes the same canonical outputs again, requires exact equality with `before_turn2`, validates a fresh replacement work/queue identity, and adds `after_turn2` to the existing hash evidence without changing either output. Only then does it send turn 3 to the same Subject session.

## Step 5: [SUBJECT AGENT] Turn 3 Executes Only The Replacement

Resume the same Subject session with only this final turn:

```text
Read the saved replacement claim and exact generated task/beacon/schema. Invoke a second distinct real child actor. It must independently perform its own bounded real search and fetch, own new source/cache/result/receipt facts, write both canonical required outputs with every direct semantic section non-empty, and verify writes before work_done. Do not return while the child is merely running in the background; wait for its native completion notification. Preserve a path-only second-child evidence index only after that completion. Run native dry-submit for the replacement, then formal submit only if that fresh dry-submit predicts pass. Save both complete native JSON results and stop. Do not submit or rewrite the failed first attempt, append playbook verdict checks, materialize Wave-wide completion, or claim research quality.
```

If the same child identity is reused, independent search/fetch evidence is absent, or any Subject/child surface is unavailable, record a non-empty unavailable reason and proceed only to `NOT_RUN` finalization.

## Step 6: [OBSERVER] Derive Five Checks And Finalize Once

The deterministic postcheck reads native Subject/child evidence, queue/index/status/ledger facts, dry-submit/formal-submit JSON, and the retained hashes. It may append only the five case-owned `check` events below. It must not invent dry-submit output, work-unit lifecycle events, actor receipts, queue transitions, or submitted rows.

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
EXTRA_ARGS=()
if [ -f "$B/case-164-subject-unavailable.txt" ]; then
  EXTRA_ARGS+=(--not-run-reason "independent Subject/child Agent or real search/fetch capability unavailable")
else
  node --input-type=module - "$B" <<'JS'
import { appendFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { WorkUnitResultSchema } from './DPT_FRAMEWORK/schema/contracts/work-unit.mjs';
const [bundle] = process.argv.slice(2);
const readJson = (ref) => JSON.parse(readFileSync(resolve(bundle, ref), 'utf8'));
const first = readJson('case-164-first-child-evidence.json');
const second = readJson('case-164-second-child-evidence.json');
const dry1 = readJson('case-164-turn1-dry-submit.json');
const dry3 = readJson('case-164-turn3-dry-submit.json');
const submit3 = readJson('case-164-turn3-submit.json');
const hashes = readJson('case-164-output-hashes.json');
const subject = readJson('case-164-subject-result.json');
const queue = readJson('rb_queue.json');
const index = readJson('_work_units/_index.json');
const ledger = readFileSync(join(bundle, 'rb_output_declarations.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const firstRecord = index.work_units?.[first.work_id];
const secondRecord = index.work_units?.[second.work_id];
const secondManifest = readJson(secondRecord.paths.manifest_ref);
const firstResult = readJson(first.result_ref);
const secondResult = readJson(second.result_ref);
const projection1 = dry1.candidate_projection || dry1;
const projection3 = dry3.candidate_projection || dry3;
const sameHashes = JSON.stringify(hashes.before_turn2) === JSON.stringify(hashes.after_turn2);
const firstTerminal = queue.terminal_history?.find((item) => item.queue_item_id === first.queue_item_id && item.work_id === first.work_id);
const secondTerminal = queue.terminal_history?.find((item) => item.queue_item_id === second.queue_item_id && item.work_id === second.work_id);
const firstUrls = new Set(firstResult.accepted_source_urls || []);
const secondUrls = new Set(secondResult.accepted_source_urls || []);
const independentUrls = secondUrls.size > 0 && [...secondUrls].some((url) => !firstUrls.has(url));
const independentCache = (secondResult.cache_trails || []).length > 0
  && (secondResult.cache_trails || []).every((ref) => !(firstResult.cache_trails || []).includes(ref));
const subjectCompletedAllTurns = subject.status === 'completed' && subject.completed_turns === 3
  && Array.isArray(subject.result_events) && subject.result_events.length === 3
  && subject.result_events.every((event) => event.subtype === 'success' && event.is_error !== true);
const secondResultValid = WorkUnitResultSchema.safeParse(secondResult).success;
const checks = [
  ['case-164-first-child-semantic-rejection', firstRecord?.actor_execution?.execution_actor_class === 'delegated_subagent' && projection1.recommended_action === 'fail_and_replace' && Boolean(projection1.primary_root_code) && dry1.violations?.some((item) => item.repair_scope === 'semantic_content')],
  ['case-164-first-output-hashes-preserved', sameHashes],
  ['case-164-fresh-primary-replacement', first.queue_item_id !== second.queue_item_id && first.work_id !== second.work_id && firstTerminal?.terminal_status === 'failed' && firstTerminal?.reason === `semantic_contract:${projection1.primary_root_code}` && secondManifest.queue_item?.payload?.assignment_mode === 'primary' && secondManifest.queue_item?.required_receipts?.length === 2],
  ['case-164-second-child-independent-execution', subjectCompletedAllTurns && secondRecord?.actor_execution?.execution_actor_class === 'delegated_subagent' && independentUrls && independentCache],
  ['case-164-replacement-submit-only', secondResultValid && projection3.recommended_action === 'submit' && submit3.ok === true && !ledger.some((row) => row.work_id === first.work_id) && ledger.some((row) => row.work_id === second.work_id) && secondTerminal?.terminal_status === 'done'],
];
for (const [gate, passed] of checks) appendFileSync(join(bundle, 'rb_trace.jsonl'), `${JSON.stringify({ ts: new Date().toISOString(), event: 'check', source: 'playbook', gate, passed, expected: true })}\n`);
JS
  FIRST_RESULT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(require("path").resolve(process.argv[2],x.result_ref))' "$B/case-164-first-child-evidence.json" "$B")
  SECOND_RESULT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(require("path").resolve(process.argv[2],x.result_ref))' "$B/case-164-second-child-evidence.json" "$B")
  EXTRA_ARGS+=(
    --evidence "subject_transcript=$B/case-164-subject-transcript.jsonl"
    --evidence "subject_result=$B/case-164-subject-result.json"
    --evidence "first_child_result=$FIRST_RESULT"
    --evidence "second_child_result=$SECOND_RESULT"
    --evidence "dry_submit_rejection=$B/case-164-turn1-dry-submit.json"
    --evidence "output_hashes=$B/case-164-output-hashes.json"
  )
fi
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B" "${EXTRA_ARGS[@]}"
```

PASS requires all five current-run checks. It proves only that this Subject followed the explicit post-`work_done` semantic replacement procedure with two real child executions. A missing or unavailable Subject/child/search/fetch surface is native `NOT_RUN`; a fixture, parent-authored substitute, or incomplete evidence set cannot become PASS. Stop after native completion. The Autorun Supervisor owns declared health, durable evidence export, audit, preservation, and optional clean-PASS cleanup.

The light health profile is intentional because this canary stops after one delegated replacement submit and does not claim a Wave Gate attempt, reference materialization, source-recoverability coverage, or phase completion. The five deterministic checks plus production result schema remain the proof authority for the narrow recovery procedure.
