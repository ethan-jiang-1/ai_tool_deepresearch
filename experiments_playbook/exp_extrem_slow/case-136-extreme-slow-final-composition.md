---
schema: command-experiment/v2
experiment: wff-delivery
case: case-136-heavy-final-composition
case_goal: "Observe one real Subject Agent resolve HITL2 composition intent and independently deliver four view-aware terminal reports from byte-identical verified research inputs, then obtain one separate AI-judge verdict."
verdict_mode: all
required_checks: [case-136-baseline-isolation, case-136-executive-subject, case-136-claim-subject, case-136-technical-subject, case-136-custom-subject, case-136-cross-view-isolation, case-136-ai-judge]
bundle_roles: [executive, claim, technical, custom]
verdict_role: executive
health_roles: [executive, claim, technical, custom]
health_profile: heavy
durable_evidence_roles: [baseline, executive_subject_evidence, claim_subject_evidence, technical_subject_evidence, custom_subject_evidence, judge_evidence]
proof_subject: agent_behavior
subject_execution: real_agent
fixture: setup_only
runtime: real_disposable_bundle
external_calls: real
verdict_judge: ai_judge
not_run_if: "The authenticated independent Subject Agent or separate AI-judge runtime is unavailable."
---

<!-- @impl HIU-003, CDP-001, CDP-003, CDP-004, CDP-006, CDE-001, CDE-002, CDE-003 -->

> **QUARANTINED - EXTREME SLOW.** Retained Supervisor batches
> `d4d15931-f525-45b4-bdfc-3c6f2efc75a9` (`600139 ms`, `$2.066176`) and
> `f6e8d72f-371a-4e5c-9a43-315586dea8a3` (`600133 ms`, `$1.768301`) both
> ended `ERROR/agent_timeout` without a native completion. Do not run through
> Autorun or Interactive. This is diagnostic history only, not Agent-behavior
> or Change-completion evidence. A later Change must define and validate a
> sub-minute replacement before reactivation.

# case-136-heavy-final-composition

## Execution Contract

此 case 只有一个 setup-only fixture boundary：四个 bundle 的 verified research input bytes 相同，且都没有 accepted HITL2 handoff 或 report。之后每个 bundle 都由同一现有 Subject launcher 启动的独立真实 Agent 完成 HITL2 -> Readiness -> Final；Playbook Agent 不写 handoff、report、Gate result 或 judge verdict。独立 AI judge 只读取明确声明的 retained evidence，写一份 strict review record。任何 runtime 缺失都只走 `NOT_RUN`，不能由 fixture、Playbook Agent 或 deterministic check 代替。

## Reality Distance Ledger

| 维度 | 声明 |
| --- | --- |
| Setup fixture | 四个合法 HITL2 entry 的相同 verified research inputs、submitted backing 与 scenario input；不产生 accepted handoff 或 Final report |
| Subject boundary | 每个 independent Subject Agent 自己展示 recommendation、消费 natural-language resolution、写 accepted profile、运行现有 Gate/entry/status path，并持久化一份 primary report |
| Judge boundary | 独立 AI judge 仅对 retained Subject transcripts、profiles、reports 和 structural facts 做 cross-report semantic review |
| Native boundary | case-owned `check` events、persist-final-report result、trace/status/report bytes 与 native completion |
| Does not prove | 真实人类 acceptance、Engine 对 report quality 的 verdict、任何 production Sub-agent/composer path |

## Step 1: [MAIN/SHELL] Create Four Identical Verified-State Baselines

```bash
REPO_ROOT=$(pwd)
create_case136_bundle() {
  local role="$1"
  local bundle
  bundle=$(node experiments_env/shared/new-disposable-bundle.mjs case136 --case "case-136-${role}" --force --target-dir {{CASE_RUN_ROOT_SH}})
  node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role "$role" --path "$bundle"
  node --input-type=module - "$bundle" "$role" <<'JS'
import { mkdirSync, writeFileSync } from 'node:fs';
import { parse, stringify } from 'yaml';
import { writeGateAttempt } from './DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers.mjs';
import {
  claimAndSubmitFixtureWorkUnit,
  sourceYamlContent,
  writeWave0Scaffold,
} from './experiments_env/shared/work-unit-playbook-utils.mjs';

const [bundle, role] = process.argv.slice(2);
writeWave0Scaffold(bundle, {
  planBasename: 'case136',
  topics: [{ id: 't1', slug: 'topic-a', title: 'Decision Evidence' }],
  syntheticWave0Trace: false,
});
claimAndSubmitFixtureWorkUnit(bundle, {
  phase: 'wave0',
  queue_item_id: 'case-136-verified-source',
  topic_slug: 'topic-a',
  output_path: 'artifacts/wave0/topic-a/source.yaml',
  role: 'source_yaml',
  source_url: 'https://evidence.example.test/case-136/decision-source',
  source_slug: 'case136-source',
  output_content: sourceYamlContent({
    source_url: 'https://evidence.example.test/case-136/decision-source',
    topic_slug: 'topic-a',
    title: 'Case 136 verified fixture source',
  }),
});

mkdirSync(`${bundle}/artifacts/wave1/topic-a`, { recursive: true });
mkdirSync(`${bundle}/artifacts/wave2`, { recursive: true });
mkdirSync(`${bundle}/artifacts/hitl2`, { recursive: true });
mkdirSync(`${bundle}/seed_topics`, { recursive: true });
writeFileSync(`${bundle}/seed_topics/topic-a.md`, '# Decision Evidence\n\n## Scope\n\nA bounded decision question.\n');
writeFileSync(`${bundle}/artifacts/wave1/topic-a/evidence-summary.md`, '# Key Findings\n\n- F-136-1: The evaluated option improves the target outcome under the stated operating conditions.\n- Limitation: the observation is bounded and should not be generalized outside those conditions.\n');
writeFileSync(`${bundle}/artifacts/wave1/topic-a/question-list.md`, '# Open Questions\n\n- Which operating conditions would reverse the observed benefit?\n');
writeFileSync(`${bundle}/artifacts/wave2/synthesis.md`, '# Synthesis\n\nThe verified evidence supports a conditional decision, retains one material limitation, and exposes the evidence boundary.\n');
writeFileSync(`${bundle}/rb_plan.md`, [
  '---',
  'topic_registry:',
  '  - topic_uid: tp_00000001-0000-4000-8000-000000000000',
  '    slug: topic-a',
  '    title: Decision Evidence',
  '---',
  '',
  '# Case 136 Research Plan',
  '',
  '## Goal',
  '',
  'Determine the decision implication while preserving the evidence boundary.',
  '',
].join('\n'));

const profile = parse(`plan_basename: case136
research_profile: quick_factual
root_must_answer_set:
  - "What is the supported decision implication and its material limitation?"
research_access:
  status: available
  probed_at: "2026-08-15T00:00:00.000Z"
  sample_observations:
    - { sample_id: gov_cn, source_group: china, outcome: content, retrieval_surface: native }
    - { sample_id: gitee, source_group: china, outcome: failed }
    - { sample_id: xinhuanet, source_group: china, outcome: failed }
    - { sample_id: cnki_catalog, source_group: china, outcome: failed }
    - { sample_id: wikipedia, source_group: overseas, outcome: failed }
    - { sample_id: github, source_group: overseas, outcome: failed }
    - { sample_id: iana, source_group: overseas, outcome: failed }
    - { sample_id: arxiv, source_group: overseas, outcome: failed }
    - { sample_id: rfc_editor, source_group: overseas, outcome: failed }
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-08-15T00:01:00.000Z"
  hitl2:
    status: pending_user
    answerability_class: ready_substantive
    user_decision: not_started
    final_report_view: not_started
    rerun_count: 0
`);
writeFileSync(`${bundle}/rb_profile.yaml`, stringify(profile));

const fixtures = [
  ['instantiation-complete', 'phases/phase-instantiation.md', 'phases/phase-hitl1.md'],
  ['hitl1-recorded', 'phases/phase-hitl1.md', 'phases/phase-setup.md'],
  ['setup-ready', 'phases/phase-setup.md', 'phases/phase-seed-topics.md'],
  ['seed-topics-ready', 'phases/phase-seed-topics.md', 'phases/phase-wave0.md'],
  ['wave0-complete', 'phases/phase-wave0.md', 'phases/phase-wave1.md'],
  ['wave1-complete', 'phases/phase-wave1.md', 'phases/phase-wave2.md'],
  ['wave2-complete', 'phases/phase-wave2.md', 'phases/phase-hitl2.md'],
];
for (const [gate, currentNodeRef, next] of fixtures) {
  writeGateAttempt(bundle, {
    check: { gate, passed: true, currentNodeRef, next },
    routing: { kind: 'next', next, detail: 'declared setup-only verified-state predecessor' },
    inspect: [],
    advice: [],
  });
}

const scenarios = {
  executive: {
    schema_version: 'case-136-scenario/v1',
    scenario_id: 'executive',
    view: 'executive_brief',
    requires_clarification: false,
    initial_user_message: '我需要一份给管理层决策使用的报告，请基于当前研究给出最合适的交付建议。',
    resolution_message: '按你刚才的建议出报告：面向管理层，优先给出决策、风险、取舍和未知，同时保留关键证据。不要再确认。',
  },
  claim: {
    schema_version: 'case-136-scenario/v1',
    scenario_id: 'claim',
    view: 'claim_judgment',
    requires_clarification: false,
    initial_user_message: '我需要判断这项结论是否成立，并让评审者能看到支持、反证、条件和不确定性。请建议如何交付。',
    resolution_message: '采用你建议的 claim judgment 方式交付，读者是负责审核结论的分析人员。保留反证和限制，直接继续，不要再确认。',
  },
  technical: {
    schema_version: 'case-136-scenario/v1',
    scenario_id: 'technical',
    view: 'technical_deep_dive',
    requires_clarification: false,
    initial_user_message: '我需要给技术评审看机制、依赖和未解决假设。请基于研究建议合适的最终报告。',
    resolution_message: '采用你建议的 technical deep dive 交付，读者是技术评审组。清楚区分观察、推断和未知，直接生成，不要再确认。',
  },
  custom: {
    schema_version: 'case-136-scenario/v1',
    scenario_id: 'custom',
    view: 'custom',
    requires_clarification: true,
    initial_user_message: '我想要一个自定义交付给内部评审，但还没决定报告应该怎样组织。请先给建议。',
    resolution_message: '用于内部技术与风险联合评审。请按“决策结论、条件与机制、风险与未解问题、证据附录”组织，避免营销式摘要；保留限制和关键证据。按这个自定义建议直接交付，不要再确认。',
  },
};
writeFileSync(`${bundle}/case-136-scenario.json`, `${JSON.stringify(scenarios[role], null, 2)}\n`);
JS
  node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle "$bundle" --node phases/phase-hitl2.md > "$bundle/case-136-enter-hitl2.json"
  node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle "$bundle" --to wave2_complete > "$bundle/case-136-advance-wave2.json"
}

create_case136_bundle executive
create_case136_bundle claim
create_case136_bundle technical
create_case136_bundle custom
```

## Step 2: [MAIN/SHELL] Prove Setup Isolation Before Any Subject Turn

```bash
EXEC=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role executive)
CLAIM=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role claim)
TECH=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role technical)
CUSTOM=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role custom)
node --input-type=module - "$EXEC" "$CLAIM" "$TECH" "$CUSTOM" <<'JS'
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { parse } from 'yaml';
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';

const [executive, ...bundles] = process.argv.slice(2);
const allBundles = [executive, ...bundles];
const inputs = [
  'seed_topics/topic-a.md',
  'artifacts/wave0/topic-a/source.yaml',
  'artifacts/wave1/topic-a/evidence-summary.md',
  'artifacts/wave1/topic-a/question-list.md',
  'artifacts/wave2/synthesis.md',
  'reference/_INDEX.md',
];
const digest = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const snapshots = allBundles.map((bundle) => ({
  bundle,
  inputs: Object.fromEntries(inputs.map((relative) => [relative, digest(`${bundle}/${relative}`)])),
  profile: parse(readFileSync(`${bundle}/rb_profile.yaml`, 'utf8')),
  final_reports_present: existsSync(`${bundle}/final`)
    ? readdirSync(`${bundle}/final`, { withFileTypes: true }).some((entry) => entry.isFile())
    : false,
}));
const firstInputs = JSON.stringify(snapshots[0].inputs);
const clean = snapshots.every((snapshot) => JSON.stringify(snapshot.inputs) === firstInputs
  && snapshot.profile.human_decision_checkpoints.hitl2.status === 'pending_user'
  && snapshot.profile.human_decision_checkpoints.hitl2.user_decision === 'not_started'
  && snapshot.profile.human_decision_checkpoints.hitl2.final_report_view === 'not_started'
  && snapshot.profile.human_decision_checkpoints.hitl2.composition_handoff === undefined
  && snapshot.final_reports_present === false);
const baseline = {
  schema_version: 'case-136-baseline/v1',
  source: 'setup-only-fixture',
  verified_research_inputs: snapshots.map(({ bundle, inputs: itemInputs }) => ({ bundle, inputs: itemInputs })),
  no_accepted_handoff_or_report: clean,
};
writeFileSync(`${executive}/case-136-baseline.json`, `${JSON.stringify(baseline, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
recordCheck(`${executive}/rb_trace.jsonl`, {
  gate: 'case-136-baseline-isolation',
  passed: clean,
  detail: 'four setup-only bundles have byte-identical verified research inputs and no accepted handoff or Final report',
});
JS
```

## Step 3: [MAIN->SUBJECT] Run Four Isolated Real Subject Executions

```bash
EXEC=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role executive)
for role in executive claim technical custom; do
  B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role "$role")
  set +e
  node experiments_env/shared/run-iterative-interaction-subject.mjs 136 --bundle "$B"
  SUBJECT_STATUS=$?
  set -e
  if [ "$SUBJECT_STATUS" -ne 0 ]; then
    printf '%s\n' "independent Subject runtime unavailable or failed for ${role}" > "$EXEC/case-136-actor-unavailable.txt"
    break
  fi
done
```

## Step 4: [MAIN/SHELL] Index Retained Subject Evidence And Prepare The Judge Input

Skip this step when `case-136-actor-unavailable.txt` exists.

```bash
EXEC=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role executive)
if [ ! -f "$EXEC/case-136-actor-unavailable.txt" ]; then
  CLAIM=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role claim)
  TECH=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role technical)
  CUSTOM=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role custom)
  node --input-type=module - "$EXEC" "$CLAIM" "$TECH" "$CUSTOM" <<'JS'
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const [executive, claim, technical, custom] = process.argv.slice(2);
const entries = [
  ['executive', executive],
  ['claim', claim],
  ['technical', technical],
  ['custom', custom],
];
const digest = (path) => ({ path, sha256: createHash('sha256').update(readFileSync(path)).digest('hex') });
const judgeBundles = [];
for (const [role, bundle] of entries) {
  const observation = JSON.parse(readFileSync(`${bundle}/case-136-subject-observation.json`, 'utf8'));
  const evidencePaths = [
    `${bundle}/case-136-subject-prompt.json`,
    `${bundle}/case-136-subject-transcript.jsonl`,
    `${bundle}/case-136-subject-result.json`,
    `${bundle}/case-136-subject-observation.json`,
    `${bundle}/case-136-final-persistence.json`,
    `${bundle}/${observation.final_report}`,
  ];
  const evidence = {
    schema_version: 'case-136-subject-evidence/v1',
    source: 'retained-real-subject-runtime',
    role,
    files: evidencePaths.map(digest),
  };
  writeFileSync(`${bundle}/case-136-${role}-subject-evidence.json`, `${JSON.stringify(evidence, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  judgeBundles.push({
    role,
    bundle,
    scenario: JSON.parse(readFileSync(`${bundle}/case-136-scenario.json`, 'utf8')),
    profile_path: `${bundle}/rb_profile.yaml`,
    transcript_path: `${bundle}/case-136-subject-transcript.jsonl`,
    observation_path: `${bundle}/case-136-subject-observation.json`,
    report_path: `${bundle}/${observation.final_report}`,
    report_sha256: digest(`${bundle}/${observation.final_report}`).sha256,
  });
}
const judgeInput = {
  schema_version: 'case-136-judge-input/v1',
  source: 'playbook-retained-runtime-index',
  case: 'case-136-heavy-final-composition',
  baseline_path: `${executive}/case-136-baseline.json`,
  bundles: judgeBundles,
};
writeFileSync(`${executive}/case-136-judge-input.json`, `${JSON.stringify(judgeInput, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
JS
fi
```

## Step 5: [MAIN->AI-JUDGE] Run One Independent Cross-Report Judge

```bash
EXEC=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role executive)
if [ ! -f "$EXEC/case-136-actor-unavailable.txt" ]; then
  set +e
  node experiments_env/shared/run-iterative-interaction-subject.mjs 136-judge --bundle "$EXEC"
  JUDGE_STATUS=$?
  set -e
  if [ "$JUDGE_STATUS" -ne 0 ] || [ ! -f "$EXEC/case-136-judge-record.json" ]; then
    printf '%s\n' 'separate AI judge runtime unavailable or failed' > "$EXEC/case-136-actor-unavailable.txt"
  fi
fi
```

## Step 6: [MAIN/SHELL] Record Native Subject, Isolation, And Judge Checks

Skip this step when `case-136-actor-unavailable.txt` exists.

```bash
EXEC=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role executive)
if [ ! -f "$EXEC/case-136-actor-unavailable.txt" ]; then
  CLAIM=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role claim)
  TECH=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role technical)
  CUSTOM=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role custom)
  node --input-type=module - "$EXEC" "$CLAIM" "$TECH" "$CUSTOM" <<'JS'
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';

const [executive, claim, technical, custom] = process.argv.slice(2);
const entries = [
  ['executive', executive],
  ['claim', claim],
  ['technical', technical],
  ['custom', custom],
];
const trace = (bundle) => readFileSync(`${bundle}/rb_trace.jsonl`, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const reports = [];
const observations = [];
for (const [role, bundle] of entries) {
  const observation = JSON.parse(readFileSync(`${bundle}/case-136-subject-observation.json`, 'utf8'));
  const result = JSON.parse(readFileSync(`${bundle}/case-136-subject-result.json`, 'utf8'));
  const prompt = JSON.parse(readFileSync(`${bundle}/case-136-subject-prompt.json`, 'utf8'));
  const events = trace(bundle);
  const report = readFileSync(`${bundle}/${observation.final_report}`, 'utf8');
  const accepted = events.some((event) => event.event === 'gate_attempt'
    && event.gate === 'hitl2-recorded' && event.passed === true && event.next === 'phases/phase-readiness.md'
    && event.composition_handoff_receipt?.final_report_view === observation.view);
  const readiness = events.some((event) => event.event === 'gate_attempt'
    && event.gate === 'readiness-passed' && event.passed === true && event.next === 'phases/phase-final.md');
  const oneReport = observation.completed_turns === 4
    && result.status === 'completed'
    && result.completed_turns === 4
    && observation.persistence_operation === 'persist-final-report'
    && observation.persistence_verdict === 'committed'
    && observation.final_response_has_question === false
    && observation.final_gate_attempt_present === false
    && observation.final_delivery_trace_present === false
    && accepted && readiness
    && !prompt.tools.split(',').includes('Task')
    && (report.match(/^## Evidence Map$/gm) || []).length === 1;
  recordCheck(`${executive}/rb_trace.jsonl`, {
    gate: `case-136-${role}-subject`,
    passed: oneReport,
  detail: `${role} retained one real Subject execution with exactly one primary Final Markdown report and no Final interaction or Gate`,
  });
  reports.push({ role, bundle, path: `${bundle}/${observation.final_report}`, sha256: createHash('sha256').update(report).digest('hex') });
  observations.push({ role, bundle, observation, transcript: readFileSync(`${bundle}/case-136-subject-transcript.jsonl`, 'utf8') });
}
const uniqueReportBytes = new Set(reports.map((report) => report.sha256)).size === reports.length;
const noCrossRead = observations.every((entry) => observations
  .filter((other) => other.bundle !== entry.bundle)
  .every((other) => !entry.transcript.includes(other.bundle)));
recordCheck(`${executive}/rb_trace.jsonl`, {
  gate: 'case-136-cross-view-isolation',
  passed: uniqueReportBytes && noCrossRead,
  detail: 'all four final reports differ in bytes and no Subject transcript names another view bundle or report',
});

const judge = JSON.parse(readFileSync(`${executive}/case-136-judge-record.json`, 'utf8'));
const criterionNames = [
  'hitl2_recommendation',
  'natural_language_resolution',
  'bounded_clarification',
  'view_difference',
  'verified_meaning_stability',
  'terminal_discipline',
];
const validJudge = judge.schema_version === 'agent-experiment-judge/v1'
  && judge.source === 'ai-judge'
  && judge.case === 'case-136-heavy-final-composition'
  && ['pass', 'fail'].includes(judge.verdict)
  && judge.criteria && JSON.stringify(Object.keys(judge.criteria).sort()) === JSON.stringify([...criterionNames].sort())
  && criterionNames.every((name) => ['pass', 'fail'].includes(judge.criteria[name]?.verdict)
    && typeof judge.criteria[name]?.rationale === 'string' && judge.criteria[name].rationale.trim())
  && typeof judge.rationale === 'string' && judge.rationale.trim();
recordCheck(`${executive}/rb_trace.jsonl`, {
  gate: 'case-136-ai-judge',
  passed: validJudge && judge.verdict === 'pass',
  detail: 'a separate AI judge retained one strict cross-report semantic verdict',
  extra: { verdict_judge: 'ai_judge' },
});
JS
fi
```

## Step 7: [MAIN/SHELL] Native Completion

```bash
EXEC=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role executive)
CLAIM=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role claim)
TECH=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role technical)
CUSTOM=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role custom)
ARGS=(
  --context {{RUN_CONTEXT_SH}}
  --bundle "executive=$EXEC"
  --bundle "claim=$CLAIM"
  --bundle "technical=$TECH"
  --bundle "custom=$CUSTOM"
)
if [ -f "$EXEC/case-136-actor-unavailable.txt" ]; then
  ARGS+=(--not-run-reason "$(cat "$EXEC/case-136-actor-unavailable.txt")")
else
  ARGS+=(
    --evidence "baseline=$EXEC/case-136-baseline.json"
    --evidence "executive_subject_evidence=$EXEC/case-136-executive-subject-evidence.json"
    --evidence "claim_subject_evidence=$CLAIM/case-136-claim-subject-evidence.json"
    --evidence "technical_subject_evidence=$TECH/case-136-technical-subject-evidence.json"
    --evidence "custom_subject_evidence=$CUSTOM/case-136-custom-subject-evidence.json"
    --evidence "judge_evidence=$EXEC/case-136-judge-record.json"
  )
fi
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs "${ARGS[@]}"
```

## Result Interpretation

`PASS` requires all seven native checks, four complete independent Subject runtimes, four declared evidence indexes, and one valid `ai_judge` record. It proves a real Subject behavior observation within this bounded fixture setup, not a real-human acceptance and not an Engine report-quality verdict. A failed Subject/judge launch is `NOT_RUN`; a semantic judge `fail` remains a native `FAIL` with its retained record.

Stop after native completion. The Autorun Supervisor owns Heavy health, audit, preservation, and optional clean-PASS cleanup.
