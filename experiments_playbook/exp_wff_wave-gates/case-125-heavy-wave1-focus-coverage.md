---
schema: command-experiment/v2
experiment: wff-wave-gates
case: case-125-heavy-wave1-focus-coverage
case_goal: "An independent real Wave1 Subject Agent turns accepted focus context into a minimal current commitment, performs a real submitted increment, and reaches a native covered result or an honest visible limitation through the existing Wave1 checkpoint."
verdict_mode: all
required_checks: [case-125-setup-only-boundary, case-125-real-subject-current-wave1, case-125-native-focus-outcome]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: heavy
durable_evidence_roles: [subject_prompt, subject_transcript, subject_result, subject_evidence, wave1_inspect]
proof_subject: agent_behavior
subject_execution: real_agent
fixture: setup_only
runtime: real_disposable_bundle
external_calls: real
verdict_judge: deterministic
req: RWP-002
not_run_if: "The independent Wave1 Subject Agent, its required real child actor, real search/fetch capability, or a required legal Engine operation is unavailable."
---

<!-- @impl RWP-002 -->

# Case 125 - Wave1 Focus Coverage

## Execution Contract

This is an `agent_flow_e2e` case. The Playbook Agent creates only a legal Wave1 setup: one canonical Topic, an accepted natural-language focus in the existing literal controls snapshot, return-map placeholders, and one unclaimed `wave1_topic_deepening` demand. It does not create a depth review, a focus declaration, child output, submitted row, source/cache claim, verdict check beyond the setup boundary, or native completion.

One independent Subject Agent owns the semantic work. It reads the accepted focus as normal Agent context, chooses the smallest commitment, invokes one real `dpt-evidence-extractor` child, follows existing submit and closeout operations, and records the optional Phase-owned `focus_coverage` block. It can retain a limitation only after the same existing Wave1 inspect names an external, user-decision, or missing-contract boundary with no legal repair. The Playbook observer only reads retained Subject, child, and Engine facts before appending the case checks.

An unavailable Subject, child, search/fetch path, or legal Engine operation is `NOT_RUN`. Setup files and deterministic fixtures never substitute for a Subject-produced commitment, work result, focus declaration, or PASS.

## Reality Distance Ledger

| Dimension | Declaration |
| --- | --- |
| Fixture distance | `setup_only`: accepted user focus, one Topic, return-map placeholders, and one unclaimed current Wave1 demand |
| Subject execution | One independent real Wave1 Phase Agent turn |
| Child execution | One real `dpt-evidence-extractor` from the generated work-unit task |
| External calls | Child performs bounded real search and fetch |
| Focus authority | Subject-authored `depth-review.yaml`; Engine validates only its direct facts |
| Checkpoint authority | Native work-unit submit, submitted ledger/index, and Wave1 inspect JSON |
| Verdict authority | Case-owned `check` events in bundle-root `rb_trace.jsonl` |
| No substitute | Setup-only data, parent-written research content, a fabricated focus block, or a missing Subject session |

## Step 1: [PLAYBOOK AGENT] Create The Setup-Only Current Wave1 Boundary

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs wave1_focus_coverage --case case-125 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
node --input-type=module - "$B" <<'JS'
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  enqueueWorkUnitTask,
  queueItemForWorkUnit,
  recordPlaybookCheck,
  writeWave1Scaffold,
} from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
const topic = {
  topic_uid: 'tp_12500000-0000-4000-8000-000000000001',
  id: '01',
  slug: '01_focus-coverage',
  title: 'Regional Financing Choices',
  must_answer: ['How do lease, buy, and defer choices differ under regional financing constraints?'],
  scope_role: 'primary',
  depends_on_topic_uids: [],
};
writeWave1Scaffold(bundle, { planBasename: 'wave1_focus_coverage', topics: [topic] });
const planPath = join(bundle, 'rb_plan.md');
writeFileSync(planPath, `${readFileSync(planPath, 'utf8')}\n## 用户提供的本轮研究控制快照（仅作研究指导，不覆盖 Engine contracts）\n\n### 用户的重点原话（逐字保留）\n请额外比较租赁、购买与推迟决策在不同地区融资约束下的现金流、风险和适用条件。\n\n### Agent 对本轮额外研究方向的理解（可由用户修正）\n为当前 Topic 增补可提交的证据，区分地区融资约束下三种投资选择的现金流、风险与适用条件。\n`);
const profilePath = join(bundle, 'rb_profile.yaml');
writeFileSync(profilePath, readFileSync(profilePath, 'utf8').replace(
  '    final_report_view: not_started\n',
  '    final_report_view: not_started\n    rerun_count: 0\n',
));
writeFileSync(join(bundle, 'seed_topics', `${topic.slug}.md`), [
  '---', JSON.stringify(topic, null, 2), '---', `# ${topic.title}`, '',
  '## 本轮新增机制理解', '__BACKFILL_WAVE1_MECHANISMS__', '',
  '## 本轮新增趋势与难点', '__BACKFILL_WAVE1_TRENDS__', '',
  '## 待验证问题', '__BACKFILL_PENDING_QUESTIONS__', '',
].join('\n'));
enqueueWorkUnitTask(bundle, queueItemForWorkUnit({
  phase: 'wave1',
  queue_item_id: 'case-125-focus-increment',
  topic_uid: topic.topic_uid,
  topic_slug: topic.slug,
  title: 'Real current Wave1 focus increment',
  action: 'Use the accepted focus context to produce a bounded current submitted increment.',
}), { fileName: 'case-125-focus-increment.json' });
const queue = JSON.parse(readFileSync(join(bundle, 'rb_queue.json'), 'utf8'));
const passed = queue.active_window.some((item) => item.queue_item_id === 'case-125-focus-increment')
  && !existsSync(join(bundle, '_work_units', '_index.json'))
  && !existsSync(join(bundle, 'rb_output_declarations.jsonl'))
  && !existsSync(join(bundle, 'artifacts', 'wave1', topic.slug, 'depth-review.yaml'));
recordPlaybookCheck(bundle, {
  gate: 'case-125-setup-only-boundary',
  passed,
  detail: JSON.stringify({ queued: 'case-125-focus-increment', depth_review_exists: existsSync(join(bundle, 'artifacts', 'wave1', topic.slug, 'depth-review.yaml')) }),
});
if (!passed) throw new Error('case-125 setup crossed the pre-Subject boundary');
JS
node DEEP_RESEARCH_HARNESS/cli/validate-bundle.mjs "$B"
```

## Step 2: [PLAYBOOK AGENT -> SUBJECT AGENT] Perform Current Focus Work

The adapter supplies the exact bundle path and current production Wave1 surface to one separately authenticated Subject Agent. The Subject and its child own all semantic and evidence-producing work after setup.

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
set +e
node experiments_env/shared/run-iterative-interaction-subject.mjs 125 --bundle "$B"
SUBJECT_STATUS=$?
set -e
if [ "$SUBJECT_STATUS" -eq 0 ] && [ -f "$B/_work_units/_index.json" ]; then
  node --input-type=module - "$B" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const bundle = process.argv[2];
const index = JSON.parse(readFileSync(join(bundle, '_work_units', '_index.json'), 'utf8'));
const work = Object.values(index.work_units || {}).find((item) => item.queue_item_id === 'case-125-focus-increment');
const execution = work?.actor_execution;
const childUnavailable = execution?.execution_actor_class === 'phase_agent_fallback'
  && execution?.fallback_from === 'delegated_subagent'
  && execution?.delegated_role_key === 'dpt-evidence-extractor'
  && execution?.observation?.outcome === 'unavailable';
if (childUnavailable) writeFileSync(join(bundle, 'case-125-subject-unavailable.txt'), 'independent Wave1 Subject Agent child actor unavailable\n');
JS
fi
if [ "$SUBJECT_STATUS" -ne 0 ]; then
  printf '%s\n' 'independent Wave1 Subject Agent, child actor, real search/fetch, or legal Engine operation unavailable' > "$B/case-125-subject-unavailable.txt"
fi
```

## Step 3: [PLAYBOOK OBSERVER] Record Native Coverage Facts

Skip this observer when `case-125-subject-unavailable.txt` exists. It reads the retained evidence and Engine products before appending only the two case-owned checks.

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
if [ ! -f "$B/case-125-subject-unavailable.txt" ]; then
node --input-type=module - "$B" <<'JS'
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { recordPlaybookCheck } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
const readJson = (ref) => JSON.parse(readFileSync(resolve(bundle, ref), 'utf8'));
const subject = readJson('case-125-subject-result.json');
const evidence = readJson('case-125-subject-evidence.json');
const inspect = readJson('case-125-inspect.json');
const transcriptPath = join(bundle, 'case-125-subject-transcript.jsonl');
const index = readJson('_work_units/_index.json');
const ledger = readFileSync(join(bundle, 'rb_output_declarations.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const profile = parseYaml(readFileSync(join(bundle, 'rb_profile.yaml'), 'utf8'));
const review = parseYaml(readFileSync(resolve(bundle, evidence.depth_review_ref), 'utf8'));
const focus = review?.focus_coverage;
const work = Object.values(index.work_units || {}).find((item) => item.queue_item_id === 'case-125-focus-increment');
const currentRound = profile.human_decision_checkpoints?.hitl2?.rerun_count;
const subjectRan = subject.status === 'completed'
  && subject.subject === '125'
  && subject.completed_turns === 1
  && statSync(transcriptPath).size > 0
  && work?.actor_execution?.execution_actor_class === 'delegated_subagent';
const submittedByRef = new Map(Object.values(index.work_units || {})
  .filter((item) => item.status === 'submitted')
  .map((item) => [item.paths?.work_unit_dir, item]));
const covered = Array.isArray(focus?.commitments)
  ? focus.commitments.filter((commitment) => commitment.state === 'covered')
  : [];
const limited = Array.isArray(focus?.commitments)
  ? focus.commitments.filter((commitment) => commitment.state === 'limited')
  : [];
const coveredRefsCurrent = covered.length > 0 && covered.every((commitment) =>
  Array.isArray(commitment.submitted_work_unit_refs) && commitment.submitted_work_unit_refs.length > 0
    && commitment.submitted_work_unit_refs.every((ref) => {
      const candidate = submittedByRef.get(ref);
      return candidate?.wave === 1 && candidate?.kind === 'wave1_topic_deepening' && candidate?.rerun_count === currentRound;
    }));
const limitationVisible = limited.length > 0 && limited.every((commitment) =>
  typeof commitment.limitation === 'string' && commitment.limitation.trim()
    && ['external_action', 'user_decision', 'missing_contract'].includes(commitment.boundary_kind));
const outcomeShape = focus?.topic_uid && focus.rerun_count === currentRound
  && ['covered', 'partial', 'blocked'].includes(focus.outcome)
  && ((focus.outcome === 'covered' && covered.length > 0 && limited.length === 0)
    || (focus.outcome === 'partial' && covered.length > 0 && limited.length > 0)
    || (focus.outcome === 'blocked' && covered.length === 0 && limited.length > 0));
const gateFailed = inspect?.check?.failed_rule_ids || [];
const nativeOutcome = outcomeShape
  && ((focus.outcome === 'covered' && inspect?.check?.passed === true && coveredRefsCurrent)
    || ((focus.outcome === 'partial' || focus.outcome === 'blocked')
      && gateFailed.length === 1 && gateFailed[0] === 'focus_coverage_limit'
      && (focus.outcome === 'blocked' ? limitationVisible : coveredRefsCurrent && limitationVisible)));
const subjectEvidence = evidence.focus_context_ref === 'rb_plan.md'
  && evidence.queue_item_id === 'case-125-focus-increment'
  && evidence.work_id === work?.work_id
  && evidence.formal_submit_ref === 'case-125-formal-submit.json'
  && evidence.inspect_ref === 'case-125-inspect.json'
  && existsSync(resolve(bundle, evidence.child_evidence_ref));
const submitted = ledger.some((row) => row.work_id === work?.work_id) && work?.status === 'submitted';
recordPlaybookCheck(bundle, {
  gate: 'case-125-real-subject-current-wave1',
  passed: subjectRan && subjectEvidence && (submitted || focus?.outcome === 'blocked'),
  detail: JSON.stringify({ subject_ran: subjectRan, subject_evidence: subjectEvidence, submitted, outcome: focus?.outcome ?? null }),
});
recordPlaybookCheck(bundle, {
  gate: 'case-125-native-focus-outcome',
  passed: nativeOutcome,
  detail: JSON.stringify({ outcome: focus?.outcome ?? null, current_round: currentRound ?? null, covered_refs_current: coveredRefsCurrent, limitation_visible: limitationVisible, failed_rules: gateFailed }),
});
JS
fi
```

## Step 4: [PLAYBOOK AGENT] Finalize Native Completion

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
EXTRA_ARGS=()
if [ -f "$B/case-125-subject-unavailable.txt" ]; then
  EXTRA_ARGS+=(--not-run-reason "independent Wave1 Subject Agent, child actor, real search/fetch, or legal Engine operation unavailable")
else
  EXTRA_ARGS=(
    --evidence "subject_prompt=$B/case-125-subject-prompt.json"
    --evidence "subject_transcript=$B/case-125-subject-transcript.jsonl"
    --evidence "subject_result=$B/case-125-subject-result.json"
    --evidence "subject_evidence=$B/case-125-subject-evidence.json"
    --evidence "wave1_inspect=$B/case-125-inspect.json"
  )
fi
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B" "${EXTRA_ARGS[@]}"
```

Stop after native completion. The Autorun Supervisor owns health, durable evidence export, audit, preservation, and optional cleanup. This playbook is intentionally not executed during this change: without a retained native run it has no PASS/FAIL observation, only its prescribed `NOT_RUN` branch.
