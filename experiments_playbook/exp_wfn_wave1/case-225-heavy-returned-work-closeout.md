---
schema: command-experiment/v2
experiment: wfn-wave1
case: case-225-heavy-returned-work-closeout
case_goal: "Prove that an independent real Wave1 Phase Agent consumes one real child return through dry-submit, formal submit, submitted-backed closeout, and inspect."
verdict_mode: all
required_checks: [case-225-real-phase-agent, case-225-native-dry-submit-before-formal-submit, case-225-submitted-closeout, case-225-inspect-ran]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: heavy
durable_evidence_roles: [subject_prompt, subject_transcript, subject_result, child_evidence, dry_submit, formal_submit, phase_closeout, inspect]
proof_subject: agent_behavior
subject_execution: real_agent
fixture: setup_only
runtime: real_disposable_bundle
external_calls: real
verdict_judge: deterministic
req: RWP-002
not_run_if: "The independent real Phase Agent, its required real child actor, real search/fetch, or required Engine operation is unavailable."
---

<!-- @impl EXA-003, EXA-005, EXA-006, EXA-007, EXA-008, RWP-002, VER-006 -->

## Execution Contract

This is a real Phase-Agent canary. Setup creates only one canonical Wave1 topic, its return-map skeleton, and one queued primary demand; it stops before claim and does not create a child result, receipt, output, cache trail, submitted row, Phase closeout, verdict check, or native completion.

One independent Subject Agent acts as the Wave1 Phase Agent in one bounded turn. It claims the setup demand, invokes one real `dpt-evidence-extractor` child from the generated work-unit prompt, preserves the child/Engine facts, then follows the loaded production decision point: dry-submit, formal submit only after the Engine recommends it, the existing submitted-backed reference/index-depth-backfill closeout, and inspect. The Playbook Agent may set up the legal boundary, inspect retained evidence, append the four case-owned checks, and finalize native completion. It must not impersonate the Subject or child, or write Actor/Engine authority.

PASS requires retained Subject evidence, a delegated-subagent work-unit record, native dry-submit/formal-submit JSON, a submitted ledger row, Phase-owned closeout paths, and an inspect result. Any unavailable Subject, child, external, or legal Engine boundary becomes `NOT_RUN`, never a fixture-backed PASS.

## Reality Distance Ledger

| Dimension | Declaration |
| --- | --- |
| Fixture distance | `setup_only`: one topic, seed return-map skeleton, and one unclaimed primary demand |
| Subject execution | One independent real Phase Agent, one bounded turn |
| Child execution | One real `dpt-evidence-extractor` actor started from generated task/beacon/schema |
| External calls | Child performs bounded real search and fetch |
| Checkpoint authority | Native dry-submit and formal-submit JSON; formal submitted ledger row |
| Closeout authority | Existing Phase reference/index, depth-review, return-map, and inspect surfaces |
| Verdict authority | Four case-owned deterministic `check` events appended to native `rb_trace.jsonl` |
| Does not prove | Universal Agent compliance, Wave-wide completion, or research quality |

# case-225-heavy-returned-work-closeout

## Step 1: [PLAYBOOK AGENT] Establish A Setup-Only Wave1 Boundary

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs wave1_returned_work_closeout --case case-225 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
node --input-type=module - "$B" <<'JS'
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { enqueueWorkUnitTask, queueItemForWorkUnit, writeWave1Scaffold } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
const topic = {
  topic_uid: 'tp_22500000-0000-4000-8000-000000000001',
  id: '01',
  slug: '01_returned-work-closeout',
  title: 'Returned Work Closeout',
  must_answer: ['How does a submitted delegated result become a Phase-owned consumer projection?'],
  scope_role: 'primary',
  depends_on_topic_uids: [],
};
writeWave1Scaffold(bundle, { planBasename: 'wave1_returned_work_closeout', topics: [topic] });
writeFileSync(join(bundle, 'seed_topics', `${topic.slug}.md`), [
  '---', JSON.stringify(topic, null, 2), '---', `# ${topic.title}`, '',
  '## 本轮新增机制理解', '__BACKFILL_WAVE1_MECHANISMS__', '',
  '## 本轮新增趋势与难点', '__BACKFILL_WAVE1_TRENDS__', '',
  '## 待验证问题', '__BACKFILL_PENDING_QUESTIONS__', '',
].join('\n'));
enqueueWorkUnitTask(bundle, queueItemForWorkUnit({
  phase: 'wave1',
  queue_item_id: 'case-225-primary-1',
  topic_slug: topic.slug,
  title: 'Real Wave1 returned-work closeout canary',
}), { fileName: 'case-225-primary-1.json' });
const queue = JSON.parse(readFileSync(join(bundle, 'rb_queue.json'), 'utf8'));
const forbidden = ['_work_units/_index.json', 'rb_output_declarations.jsonl', `artifacts/wave1/${topic.slug}/evidence-summary.md`];
if (!queue.active_window.some((item) => item.queue_item_id === 'case-225-primary-1')
  || forbidden.some((ref) => existsSync(join(bundle, ref)))) {
  throw new Error('case-225 setup crossed the pre-claim boundary');
}
JS
node DEEP_RESEARCH_HARNESS/cli/validate-bundle.mjs "$B"
```

## Step 2: [PLAYBOOK AGENT -> SUBJECT AGENT] Execute One Returned-Work Loop

The adapter injects the current production Wave1 surface and exact bundle path. The Subject Agent, not the Playbook Agent, claims the queued work, invokes the real child, and performs every verdict-affecting Phase action after return.

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
set +e
node experiments_env/shared/run-iterative-interaction-subject.mjs 225 --bundle "$B"
SUBJECT_STATUS=$?
set -e
if [ "$SUBJECT_STATUS" -ne 0 ]; then
  printf '%s\n' 'independent Phase Agent, child actor, real search/fetch, or required Engine operation unavailable' > "$B/case-225-subject-unavailable.txt"
fi
```

## Step 3: [PLAYBOOK AGENT] Read Native Evidence And Append Case Checks

Skip this step when `case-225-subject-unavailable.txt` exists. This observer is read-only over Subject, child, and Engine authority until it appends the four case-owned checks.

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { recordPlaybookCheck } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
const readJson = (ref) => JSON.parse(readFileSync(resolve(bundle, ref), 'utf8'));
const subject = readJson('case-225-subject-result.json');
const child = readJson('case-225-child-evidence.json');
const dry = readJson('case-225-dry-submit.json');
const formal = readJson('case-225-formal-submit.json');
const closeout = readJson('case-225-phase-closeout.json');
const inspect = readJson('case-225-inspect.json');
const transcript = readFileSync(resolve(bundle, 'case-225-subject-transcript.jsonl'), 'utf8');
const index = readJson('_work_units/_index.json');
const ledger = readFileSync(resolve(bundle, 'rb_output_declarations.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const projection = dry.candidate_projection || dry;
const work = index.work_units?.[child.work_id];
const paths = [...(closeout.reference_refs || []), closeout.depth_review_ref, closeout.seed_ref, closeout.inspect_ref]
  .filter(Boolean)
  .map((ref) => resolve(bundle, ref));
const submitted = formal.ok === true && ledger.some((row) => row.work_id === child.work_id);
const subjectRan = subject.status === 'completed' && subject.subject === '225' && subject.completed_turns === 1
  && subject.result_events?.every((event) => event.subtype === 'success' && event.is_error !== true)
  && /Task/.test(transcript);
const closeoutExists = closeout.submitted_work_id === child.work_id && paths.length >= 4
  && paths.every((target) => existsSync(target) && statSync(target).isFile());
const seed = readFileSync(resolve(bundle, closeout.seed_ref), 'utf8');
const backfilled = !/__BACKFILL_WAVE1_(MECHANISMS|TRENDS)__|__BACKFILL_PENDING_QUESTIONS__/.test(seed);
recordPlaybookCheck(bundle, { gate: 'case-225-real-phase-agent', passed: subjectRan && work?.actor_execution?.execution_actor_class === 'delegated_subagent', detail: JSON.stringify({ work_id: child.work_id, subject_turns: subject.completed_turns }) });
recordPlaybookCheck(bundle, { gate: 'case-225-native-dry-submit-before-formal-submit', passed: projection.recommended_action === 'submit' && formal.ok === true, detail: JSON.stringify({ dry_action: projection.recommended_action, formal_ok: formal.ok === true }) });
recordPlaybookCheck(bundle, { gate: 'case-225-submitted-closeout', passed: submitted && closeoutExists && backfilled, detail: JSON.stringify({ submitted, closeout_paths: paths.length, backfilled }) });
recordPlaybookCheck(bundle, { gate: 'case-225-inspect-ran', passed: inspect && typeof inspect === 'object' && closeout.inspect_ref === 'case-225-inspect.json', detail: JSON.stringify({ passed: inspect.passed ?? null, inspect_count: inspect.inspect?.length ?? null }) });
JS
```

## Step 4: [PLAYBOOK AGENT] Native Completion

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
EXTRA_ARGS=()
if [ -f "$B/case-225-subject-unavailable.txt" ]; then
  EXTRA_ARGS+=(--not-run-reason "independent Phase Agent, child actor, real search/fetch, or required Engine operation unavailable")
else
  EXTRA_ARGS+=(
    --evidence "subject_prompt=$B/case-225-subject-prompt.json"
    --evidence "subject_transcript=$B/case-225-subject-transcript.jsonl"
    --evidence "subject_result=$B/case-225-subject-result.json"
    --evidence "child_evidence=$B/case-225-child-evidence.json"
    --evidence "dry_submit=$B/case-225-dry-submit.json"
    --evidence "formal_submit=$B/case-225-formal-submit.json"
    --evidence "phase_closeout=$B/case-225-phase-closeout.json"
    --evidence "inspect=$B/case-225-inspect.json"
  )
fi
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B" "${EXTRA_ARGS[@]}"
```

Stop after native completion. The Autorun Supervisor owns health, audit, preservation, and optional clean-PASS cleanup.
