---
schema: command-experiment/v2
experiment: wff-delivery
case: case-137-standard-fast-final-composition
case_goal: "Observe one independent Subject Agent complete one minimal existing Final composition from a legal setup-only predecessor without judging report quality."
verdict_mode: all
required_checks: [case-137-fixture-boundary, case-137-subject-final, case-137-terminal-discipline]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: standard
durable_evidence_roles: [subject_prompt, subject_transcript, subject_result, subject_observation, final_persistence, final_report]
proof_subject: agent_behavior
subject_execution: real_agent
fixture: setup_only
runtime: real_disposable_bundle
external_calls: none
verdict_judge: deterministic
---

<!-- @impl CDE-003 -->

> **QUARANTINED - NO FAST EVIDENCE.** Retained Supervisor batch
> `53e68120-9201-45e0-9e9b-df83ad811779` ran this case once for `45177 ms`
> at `$0.328053` and ended `ERROR/agent_timeout` without native completion or
> health output. Do not run through Autorun or Interactive. This is diagnostic
> history only, not Agent-behavior or Change-completion evidence. It has moved
> out of the active manifest with no retry; a later Change must define and
> validate a different bounded path before reactivation.

## Execution Contract

此 case 只观察一个已经合法进入 Final 的 bundle：fixture 建立一个 accepted
`composition_handoff`、一个 root must-answer、一个 submitted-backed finding 和它的
Evidence Map backing。fixture 不写 Final report、Subject prompt/transcript/result、persistence
result 或 native completion。随后一名独立 Subject Agent 只执行一次现有 Final guidance，并经
`persist-final-report` 写入一份小报告。这个 case 不评价报告质量、读者适配或结论正确性。

# case-137-standard-fast-final-composition

## Reality Distance Ledger

| Dimension | Declaration |
| --- | --- |
| Runtime context | `new-disposable-bundle.mjs` creates one real disposable bundle |
| Fixture boundary | Legal Final entry, one accepted handoff, one must-answer, and one submitted backing only |
| Subject boundary | One real Subject Agent produces the report, persistence result, prompt, transcript, result, and observation after setup |
| Production boundary | Existing Final guidance, `persist-final-report`, `enter-phase`, `advance-status`, and native completion |
| Verdict source | Case-owned `check` events plus native completion; Supervisor report/audit supplies duration, lifecycle, and health |
| Does not prove | Report quality, reader-value, semantic correctness, HITL2 interaction, cross-view behavior, or a production Sub-agent path |

## Step 1: [MAIN/SHELL] Create One Minimal Legal Final Predecessor

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs case137 --case case-137 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
node --input-type=module - "$B" <<'JS'
import { mkdirSync, writeFileSync } from 'node:fs';
import { parse, stringify } from 'yaml';
import { evaluateCompositionProceed } from './DEEP_RESEARCH_HARNESS/engine/helpers/composition-handoff.mjs';
import { writeGateAttempt } from './DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers.mjs';
import {
  claimAndSubmitFixtureWorkUnit,
  sourceYamlContent,
  writeWave0Scaffold,
} from './experiments_env/shared/work-unit-playbook-utils.mjs';

const [bundle] = process.argv.slice(2);
writeWave0Scaffold(bundle, {
  planBasename: 'case137',
  topics: [{ id: 't1', slug: 'topic-a', title: 'Minimal Final Evidence' }],
  syntheticWave0Trace: false,
});
claimAndSubmitFixtureWorkUnit(bundle, {
  phase: 'wave0',
  queue_item_id: 'case-137-verified-source',
  topic_slug: 'topic-a',
  output_path: 'artifacts/wave0/topic-a/source.yaml',
  role: 'source_yaml',
  source_url: 'https://evidence.example.test/case-137/minimal-source',
  source_slug: 'case137-source',
  output_content: sourceYamlContent({
    source_url: 'https://evidence.example.test/case-137/minimal-source',
    topic_slug: 'topic-a',
    title: 'Case 137 submitted fixture source',
  }),
});

mkdirSync(`${bundle}/artifacts/wave1/topic-a`, { recursive: true });
mkdirSync(`${bundle}/artifacts/wave2`, { recursive: true });
mkdirSync(`${bundle}/artifacts/hitl2`, { recursive: true });
mkdirSync(`${bundle}/seed_topics`, { recursive: true });
writeFileSync(`${bundle}/seed_topics/topic-a.md`, '# Minimal Final Evidence\n\n## Scope\n\nOne bounded answer.\n');
writeFileSync(`${bundle}/artifacts/wave1/topic-a/evidence-summary.md`, '# Key Findings\n\n- F-137-1: The submitted evidence supports the bounded fixture conclusion.\n');
writeFileSync(`${bundle}/artifacts/wave1/topic-a/question-list.md`, '# Open Questions\n\n- No further question is in scope for this fixture.\n');
writeFileSync(`${bundle}/artifacts/wave2/synthesis.md`, '# Synthesis\n\nF-137-1 is the one submitted-backed fixture finding.\n');
writeFileSync(`${bundle}/artifacts/hitl2/decision-brief.md`, '# Decision Brief\n\n## Key Findings\n\nF-137-1 is available for the selected final view.\n');
writeFileSync(`${bundle}/rb_plan.md`, [
  '---',
  'topic_registry:',
  '  - topic_uid: tp_00000001-0000-4000-8000-000000000137',
  '    slug: topic-a',
  '    title: Minimal Final Evidence',
  '---',
  '',
  '# Case 137 Research Plan',
  '',
  '## Goal',
  '',
  'Answer one bounded question from one submitted fixture source.',
  '',
].join('\n'));

const profile = parse(`plan_basename: case137
research_profile: quick_factual
root_must_answer_set:
  - "What does the submitted fixture evidence support?"
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-08-15T00:01:00.000Z"
  hitl2:
    status: recorded
    answerability_class: ready_substantive
    user_decision: proceed_to_readiness
    final_report_view: executive_brief
    rerun_count: 0
    rationale: "Fixture-authored Final predecessor for one bounded evidence observation."
    composition_handoff:
      contract_version: 1
      for_rerun_count: 0
      reader:
        description: "Operators reviewing one bounded fixture finding."
        familiarity: working
      intended_use: "Read the one submitted-backed conclusion and its boundary."
      primary_focus: "The single declared finding and its submitted backing."
      content_priorities:
        foreground: ["Declared finding", "Submitted backing"]
        compress: ["Historical setup"]
      delivery:
        language: zh-CN
        length: concise
        evidence_exposure: audit_ready
        appendix: none
`);
writeFileSync(`${bundle}/rb_profile.yaml`, stringify(profile));

const predecessorGates = [
  ['instantiation-complete', 'phases/phase-instantiation.md', 'phases/phase-hitl1.md'],
  ['hitl1-recorded', 'phases/phase-hitl1.md', 'phases/phase-setup.md'],
  ['setup-ready', 'phases/phase-setup.md', 'phases/phase-seed-topics.md'],
  ['seed-topics-ready', 'phases/phase-seed-topics.md', 'phases/phase-wave0.md'],
  ['wave0-complete', 'phases/phase-wave0.md', 'phases/phase-wave1.md'],
  ['wave1-complete', 'phases/phase-wave1.md', 'phases/phase-wave2.md'],
  ['wave2-complete', 'phases/phase-wave2.md', 'phases/phase-hitl2.md'],
];
for (const [gate, currentNodeRef, next] of predecessorGates) {
  writeGateAttempt(bundle, {
    check: { gate, passed: true, currentNodeRef, next },
    routing: { kind: 'next', next, detail: 'declared setup-only predecessor' },
    inspect: [],
    advice: [],
  });
}
const composition = evaluateCompositionProceed(profile);
if (!composition.ok) throw new Error(`case 137 fixture handoff is invalid: ${composition.reason_code}`);
writeGateAttempt(bundle, {
  check: { gate: 'hitl2-recorded', passed: true, currentNodeRef: 'phases/phase-hitl2.md', next: 'phases/phase-readiness.md' },
  routing: { kind: 'next', next: 'phases/phase-readiness.md', detail: 'declared setup-only accepted composition predecessor' },
  inspect: [],
  advice: [],
}, { strictTrace: true, compositionHandoffReceipt: composition.receipt });
writeGateAttempt(bundle, {
  check: { gate: 'readiness-passed', passed: true, currentNodeRef: 'phases/phase-readiness.md', next: 'phases/phase-final.md' },
  routing: { kind: 'next', next: 'phases/phase-final.md', detail: 'declared setup-only legal Final predecessor' },
  inspect: [],
  advice: [],
});
JS
node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle "$B" --node phases/phase-final.md > "$B/case-137-enter-final.md"
node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle "$B" --to readiness_passed > "$B/case-137-advance-readiness.json"
```

## Step 2: [MAIN/SHELL] Prove The Setup-Only Boundary

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { parse } from 'yaml';
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';

const [bundle] = process.argv.slice(2);
const profile = parse(readFileSync(`${bundle}/rb_profile.yaml`, 'utf8'));
const trace = readFileSync(`${bundle}/rb_trace.jsonl`, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const reports = existsSync(`${bundle}/final`)
  ? readdirSync(`${bundle}/final`, { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
  : [];
const accepted = trace.some((event) => event.event === 'gate_attempt'
  && event.gate === 'hitl2-recorded' && event.passed === true
  && event.next === 'phases/phase-readiness.md' && event.composition_handoff_receipt);
const readiness = trace.some((event) => event.event === 'gate_attempt'
  && event.gate === 'readiness-passed' && event.passed === true && event.next === 'phases/phase-final.md');
const valid = profile.human_decision_checkpoints.hitl2.status === 'recorded'
  && profile.human_decision_checkpoints.hitl2.user_decision === 'proceed_to_readiness'
  && profile.human_decision_checkpoints.hitl2.composition_handoff?.for_rerun_count === 0
  && profile.root_must_answer_set?.length === 1
  && existsSync(`${bundle}/artifacts/wave0/topic-a/source.yaml`)
  && accepted && readiness && reports.length === 0;
writeFileSync(`${bundle}/case-137-fixture-boundary.json`, `${JSON.stringify({
  schema_version: 'case-137-fixture-boundary/v1',
  source: 'setup-only-fixture',
  legal_final_entry: valid,
  final_reports_present: reports.length,
}, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
recordCheck(`${bundle}/rb_trace.jsonl`, {
  gate: 'case-137-fixture-boundary',
  passed: valid,
  detail: 'setup-only fixture established legal Final entry, one handoff, one must-answer, one submitted backing, and no Subject report',
});
JS
```

## Step 3: [MAIN->SUBJECT] Run One Independent Final Composition

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
set +e
node experiments_env/shared/run-iterative-interaction-subject.mjs 137 --bundle "$B"
SUBJECT_STATUS=$?
set -e
if [ "$SUBJECT_STATUS" -ne 0 ]; then
  printf '%s\n' 'independent Subject runtime unavailable or failed before Final evidence completed' > "$B/case-137-actor-unavailable.txt"
fi
```

## Step 4: [MAIN/SHELL] Record Bounded Subject And Terminal Evidence

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
if [ ! -f "$B/case-137-actor-unavailable.txt" ]; then
  node --input-type=module - "$B" <<'JS'
import { readFileSync } from 'node:fs';
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';

const [bundle] = process.argv.slice(2);
const observation = JSON.parse(readFileSync(`${bundle}/case-137-subject-observation.json`, 'utf8'));
const prompt = JSON.parse(readFileSync(`${bundle}/case-137-subject-prompt.json`, 'utf8'));
const result = JSON.parse(readFileSync(`${bundle}/case-137-subject-result.json`, 'utf8'));
const persistence = JSON.parse(readFileSync(`${bundle}/case-137-final-persistence.json`, 'utf8'));
const trace = readFileSync(`${bundle}/rb_trace.jsonl`, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const allowedTools = 'Bash,Glob,Grep,Read,Write';
const subjectCompleted = observation.completed_turns === 1
  && result.status === 'completed'
  && result.completed_turns === 1
  && prompt.tools === allowedTools
  && observation.report_bytes <= 1600
  && observation.evidence_map_rows === 1
  && observation.persistence_operation === 'persist-final-report'
  && observation.persistence_verdict === 'committed'
  && persistence.operation === 'persist-final-report'
  && persistence.verdict === 'committed'
  && persistence.check?.passed === true;
const terminal = observation.final_response_has_question === false
  && observation.final_gate_attempt_present === false
  && observation.final_delivery_trace_present === false
  && observation.prohibited_tool_present === null
  && !trace.some((event) => event.event === 'gate_attempt' && /final/i.test(String(event.gate || '')));
recordCheck(`${bundle}/rb_trace.jsonl`, {
  gate: 'case-137-subject-final',
  passed: subjectCompleted,
  detail: 'one retained real Subject execution produced one bounded Final report through committed persist-final-report',
});
recordCheck(`${bundle}/rb_trace.jsonl`, {
  gate: 'case-137-terminal-discipline',
  passed: terminal,
  detail: 'Final created no question, Gate, final trace event, outgoing transition, or direct network/Task/delegation tool use',
});
JS
fi
```

## Step 5: [MAIN/SHELL] Publish Native Completion Without A Semantic Judge

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" {{RUN_CONTEXT_SH}} <<'JS'
import { existsSync, readFileSync } from 'node:fs';
import { finalizeAgentExperiment } from './experiments_env/shared/wff-playbook-utils.mjs';

const [bundle, contextPath] = process.argv.slice(2);
const unavailable = `${bundle}/case-137-actor-unavailable.txt`;
if (existsSync(unavailable)) {
  const reason = readFileSync(unavailable, 'utf8').trim();
  finalizeAgentExperiment({
    contextPath,
    bundles: [{ role: 'verdict', path: bundle }],
    notRunReason: reason,
    expectedMode: 'all',
  });
} else {
  const observation = JSON.parse(readFileSync(`${bundle}/case-137-subject-observation.json`, 'utf8'));
  finalizeAgentExperiment({
    contextPath,
    bundles: [{ role: 'verdict', path: bundle }],
    evidence: [
      { role: 'subject_prompt', path: `${bundle}/case-137-subject-prompt.json` },
      { role: 'subject_transcript', path: `${bundle}/case-137-subject-transcript.jsonl` },
      { role: 'subject_result', path: `${bundle}/case-137-subject-result.json` },
      { role: 'subject_observation', path: `${bundle}/case-137-subject-observation.json` },
      { role: 'final_persistence', path: `${bundle}/case-137-final-persistence.json` },
      { role: 'final_report', path: `${bundle}/${observation.final_report}` },
    ],
    expectedMode: 'all',
  });
}
JS
```

## Retained Fast-Evidence Boundary

Only this one invocation may create CDE-003 runtime evidence. It requires an
approved positive budget and the existing Supervisor's separate Headless and
health boundaries; the options below are not a whole-case deadline.

```bash
node DEEP_RESEARCH_HARNESS/host_tools/run-agent-experiment.mjs \
  --case case-137-standard-fast-final-composition \
  --timeout 45000 \
  --health-timeout 5000 \
  --max-total-budget-usd <approved-positive-budget>
```

Only the retained Supervisor result may establish the bounded observation, and
only when `duration_ms <= 60000`, native outcome is `PASS`, lifecycle outcome
is null, and health is `CLEAN`. This playbook and its static contract test do
not prove report quality, reader value, semantic correctness, or HITL2
interaction. Retained case-135 and case-136 diagnostics cannot substitute for
this one real-Subject result.
