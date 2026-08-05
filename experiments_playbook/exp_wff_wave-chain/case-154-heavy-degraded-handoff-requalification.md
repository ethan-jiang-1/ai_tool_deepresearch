---
schema: command-experiment/v2
experiment: wff-wave-chain
case: case-154-heavy-degraded-handoff-requalification
case_goal: "Retain one bounded independent Subject observation from a current degraded Wave0 handoff through one delegated Wave2 new-evidence decision."
verdict_mode: all
required_checks: [case-154-current-degraded-wave0, case-154-legal-wave1-wave2-continuity, case-154-same-session-wave2-reload, case-154-real-two-turn-subject, case-154-named-delegated-evidence, case-154-no-direct-subject-research-tool]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: heavy
durable_evidence_roles: [subject_prompt, subject_transcript, subject_result]
proof_subject: agent_behavior
subject_execution: real_agent
fixture: setup_only
runtime: real_disposable_bundle
external_calls: real
verdict_judge: deterministic
req: RWE-013
not_run_if: "The independent Subject, required child, external research capability, legal Wave2 entry, or disposable bundle path is unavailable."
---

<!-- @impl EXA-003, EXA-005, EXA-006, EXA-007, EXA-008, PLR-003, RWE-013 -->

## Execution Contract

This is one `agent_flow_e2e` observation, not a behavior repair. Setup-only
input may establish predecessor Wave0/Wave1 facts but does not write a Wave2
decision or targeted-evidence result. The production Gate, entry, and
status-sync CLIs own all lifecycle facts. The independent Subject owns both
turns in one session; the adapter may only re-deliver the production Wave2
surface after the first turn established that entry.

The retained transcript is the closeout-review evidence for an unsolicited
user choice or phase skip. Case checks only mechanical continuity, declared
finding/binding facts, and direct Subject research-tool events. A static test,
Playbook Agent output, partial transcript, or launcher configuration cannot
substitute for Subject behavior evidence.

# case-154-heavy-degraded-handoff-requalification

## Step 1: [PLAYBOOK AGENT] Establish The Setup-Only Predecessor Boundary

```bash
B=$(node experiments_env/shared/prepare-degraded-handoff-requalification-case.mjs --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
node DEEP_RESEARCH_HARNESS/cli/validate-bundle.mjs "$B"
node --input-type=module - "$B" <<'JS'
import { readFileSync } from 'node:fs';

const bundle = process.argv[2];
const gate = JSON.parse(readFileSync(`${bundle}/case-154-wave0-gate.json`, 'utf8'));
const status = JSON.parse(readFileSync(`${bundle}/rb_status.json`, 'utf8'));
const setup = JSON.parse(readFileSync(`${bundle}/case-154-setup.json`, 'utf8'));
if (gate.check?.passed !== true || gate.check?.degraded !== true
  || JSON.stringify(gate.check?.degraded_rules) !== JSON.stringify(['shared_ref_count_floor'])
  || status.current_node !== 'phases/phase-wave1.md'
  || setup.wave2_decision_absent !== true || setup.targeted_evidence_result_absent !== true) {
  throw new Error('case-154 setup did not stop at the legal pre-Subject Wave1 boundary');
}
JS
```

## Step 2: [PLAYBOOK AGENT -> SUBJECT] Run One Same-Session Two-Turn Subject

The Subject receives the Wave1 production surface first. It can only run the
current Wave1 Gate and immediate legal handoff. The adapter rejects any other
result, reloads the exact Wave2 surface read-only, retains it under the bundle,
and supplies that exact text as the second user turn in the same session. The
second turn must use a real child for new evidence; the Subject itself must not
call `WebSearch` or `WebFetch`.

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
set +e
node experiments_env/shared/run-iterative-interaction-subject.mjs 154 --bundle "$B"
SUBJECT_STATUS=$?
set -e
if [ "$SUBJECT_STATUS" -ne 0 ]; then
  printf '%s\n' 'independent Subject, required child, external research capability, or legal Wave2 entry unavailable' > "$B/case-154-subject-unavailable.txt"
fi
```

## Step 3: [PLAYBOOK AGENT] Append Bounded Case Checks

Skip this step when `case-154-subject-unavailable.txt` exists. This observer
reads retained Subject and Engine facts and appends checks; it neither repairs
the run nor judges a user choice or phase skip.

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { recordPlaybookCheck } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
const readJson = (ref) => JSON.parse(readFileSync(resolve(bundle, ref), 'utf8'));
const trace = readFileSync(resolve(bundle, 'rb_trace.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const gate = readJson('case-154-wave0-gate.json');
const before = readJson('case-154-before-wave0-handoff-status.json');
const wave1Entry = readJson('case-154-wave1-entry-status.json');
const finalStatus = readJson('rb_status.json');
const surface = readJson('case-154-wave2-surface.json');
const prompt = readJson('case-154-subject-prompt.json');
const subject = readJson('case-154-subject-result.json');
const transcriptPath = resolve(bundle, 'case-154-subject-transcript.jsonl');
const transcriptEvents = readFileSync(transcriptPath, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => {
  try { return JSON.parse(line); } catch { return null; }
}).filter(Boolean);
const index = parseYaml(readFileSync(resolve(bundle, 'artifacts/wave2/finding-index.yaml'), 'utf8'));
const finding = (index.findings || []).find((item) => item.id === 'W2F-154');
const targeted = readJson('case-154-targeted-evidence.json');
const workIndex = readJson('_work_units/_index.json');
const work = workIndex.work_units?.[targeted.work_id];
const ledger = readFileSync(resolve(bundle, 'rb_output_declarations.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const hasDirectResearchTool = (value) => {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(hasDirectResearchTool);
  if (value.type === 'tool_use' && ['WebSearch', 'WebFetch'].includes(value.name)) return true;
  return Object.values(value).some(hasDirectResearchTool);
};
const wave0Current = gate.check?.passed === true && gate.check?.degraded === true
  && JSON.stringify(gate.check?.degraded_rules) === JSON.stringify(['shared_ref_count_floor'])
  && before.current_node === 'phases/phase-wave0.md' && wave1Entry.current_node === 'phases/phase-wave1.md';
const continuity = finalStatus.current_node === 'phases/phase-wave2.md'
  && finalStatus.current_gate === 'wave1_complete'
  && trace.some((event) => event.event === 'load_complete' && event.entry === 'phases/phase-wave2.md')
  && trace.some((event) => event.event === 'phase_transition' && event.to === 'wave1_complete');
const reload = surface.node_ref === 'phases/phase-wave2.md'
  && typeof surface.sha256 === 'string' && surface.sha256.length === 64
  && typeof surface.surface === 'string' && surface.surface.includes('phase-wave2.md')
  && surface.loaded_after_turn === 1;
const subjectRan = prompt.subject === '154' && subject.status === 'completed' && subject.subject === '154'
  && subject.completed_turns === 2 && subject.result_events?.every((event) => event.subtype === 'success' && event.is_error !== true)
  && statSync(transcriptPath).size > 0;
const delegated = ['explore_search', 'exploit_search'].includes(finding?.decision)
  && finding?.gap_status === 'search_submitted'
  && Array.isArray(finding?.subagent_receipt_refs) && finding.subagent_receipt_refs.length > 0
  && targeted.finding_id === 'W2F-154' && work?.kind === 'wave2_targeted_evidence'
  && work?.status === 'submitted' && work?.actor_execution?.execution_actor_class === 'delegated_subagent'
  && ledger.some((row) => row.work_id === targeted.work_id);
recordPlaybookCheck(bundle, { gate: 'case-154-current-degraded-wave0', passed: wave0Current, detail: JSON.stringify({ degraded_rules: gate.check?.degraded_rules, before: before.current_node, wave1: wave1Entry.current_node }) });
recordPlaybookCheck(bundle, { gate: 'case-154-legal-wave1-wave2-continuity', passed: continuity, detail: JSON.stringify({ node: finalStatus.current_node, gate: finalStatus.current_gate }) });
recordPlaybookCheck(bundle, { gate: 'case-154-same-session-wave2-reload', passed: reload, detail: JSON.stringify({ node: surface.node_ref, loaded_after_turn: surface.loaded_after_turn }) });
recordPlaybookCheck(bundle, { gate: 'case-154-real-two-turn-subject', passed: subjectRan, detail: JSON.stringify({ turns: subject.completed_turns, status: subject.status }) });
recordPlaybookCheck(bundle, { gate: 'case-154-named-delegated-evidence', passed: delegated, detail: JSON.stringify({ finding: finding?.id, decision: finding?.decision, work_id: targeted.work_id, work_status: work?.status }) });
recordPlaybookCheck(bundle, { gate: 'case-154-no-direct-subject-research-tool', passed: !hasDirectResearchTool(transcriptEvents), detail: JSON.stringify({ direct_subject_research_tool: hasDirectResearchTool(transcriptEvents) }) });
JS
```

## Step 4: [PLAYBOOK AGENT] Native Completion

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
EXTRA_ARGS=()
if [ -f "$B/case-154-subject-unavailable.txt" ]; then
  EXTRA_ARGS+=(--not-run-reason "independent Subject, required child, external research capability, or legal Wave2 entry unavailable")
else
  EXTRA_ARGS+=(
    --evidence "subject_prompt=$B/case-154-subject-prompt.json"
    --evidence "subject_transcript=$B/case-154-subject-transcript.jsonl"
    --evidence "subject_result=$B/case-154-subject-result.json"
  )
fi
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B" "${EXTRA_ARGS[@]}"
```

Stop after native completion. The Supervisor owns heavy health, audit,
preservation, and any cancellation, error, or budget boundary before native
completion. Do not retry this case. A later C3 is admissible only if retained
actual evidence shows the specified prohibited Subject behavior.
