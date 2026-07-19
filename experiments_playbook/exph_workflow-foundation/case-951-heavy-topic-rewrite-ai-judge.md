---
schema: command-experiment/v2
experiment: exph-workflow-foundation
case: case-951-heavy-topic-rewrite-ai-judge
case_goal: "Run the same independent Subject Agent topic-rewrite contract as case-901, then obtain a separate structured AI-reviewer judgment without replacing the human half of the pair."
verdict_mode: all
required_checks: [subject-runtime-evidence, topic-rewrite-output, hitl1-recorded, topic-rewrite-ai-review]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: light
durable_evidence_roles: [subject_prompt, subject_transcript, subject_result, judge_record]
proof_subject: agent_behavior
subject_execution: real_agent
fixture: setup_only
runtime: real_disposable_bundle
external_calls: real
verdict_judge: ai_judge
not_run_if: "The independent Subject Agent runtime, external capability, or separate AI reviewer runtime is unavailable."
---

<!-- @impl EXA-003, EXA-004, EXA-005, EXA-006, EXA-007, EXA-008, PLR-003, VER-006 -->

# case-951-heavy-topic-rewrite-ai-judge

## Execution Contract

This is the AI-judge half of the co-located 901/951 pair. One independent authenticated Subject Agent owns the topic rewrite, profile choice, bounded real capability probe, and production HITL1 Gate. A second independent AI reviewer session evaluates the retained Subject output and writes a structured judge record. The Playbook Agent is neither producer nor semantic judge.

The input and review criteria match case-901. AI evidence remains explicitly `source: ai-judge`; it cannot complete, replace, delete, or be reported as the real-human result. Hard-coded PASS, Subject self-review, Playbook-Agent review, and Gate-only success are forbidden.

## Step 1: [MAIN/SHELL] Prepare The HITL1 Boundary

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs wff_rwa_ai --case case-951 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
cat > "$B/rb_profile.yaml" <<'YAML'
plan_basename: wff_rwa_ai
research_profile: standard
root_must_answer_set: []
research_access:
  status: unprobed
human_decision_checkpoints:
  hitl1:
    status: not_started
  hitl2:
    status: not_started
    answerability_class: not_assessed
    user_decision: not_started
    final_report_view: not_started
YAML
node DPT_FRAMEWORK/cli/gates/check-gate-instantiation-complete.mjs --bundle "$B" --current-node phases/phase-instantiation.md > "$B/case-951-instantiation-gate.json"
NEXT=$(node experiments_env/shared/extract-field.mjs check.next < "$B/case-951-instantiation-gate.json")
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle "$B" --node "$NEXT" > "$B/case-951-enter-hitl1.md"
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$B" --to instantiation_complete > "$B/case-951-status.json"
```

## Step 2: [MAIN->SUBJECT] Run The Independent Rewrite

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
set +e
node experiments_env/shared/run-iterative-interaction-subject.mjs 951 --bundle "$B"
SUBJECT_STATUS=$?
set -e
if [ "$SUBJECT_STATUS" -ne 0 ]; then
  printf '%s\n' 'independent Subject Agent runtime or real external capability unavailable' > "$B/case-951-actor-unavailable.txt"
fi
```

## Step 3: [MAIN->AI-JUDGE] Run A Separate Reviewer

Skip this step when `case-951-actor-unavailable.txt` exists. The reviewer receives the original input and retained Subject/runtime surfaces, does not share the Subject session, and may write only `case-951-judge-record.json`.

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
if [ ! -f "$B/case-951-actor-unavailable.txt" ]; then
  set +e
  node experiments_env/shared/run-iterative-interaction-subject.mjs 951-judge --bundle "$B"
  JUDGE_STATUS=$?
  set -e
  if [ "$JUDGE_STATUS" -ne 0 ] || [ ! -f "$B/case-951-judge-record.json" ]; then
    printf '%s\n' 'separate AI reviewer runtime unavailable' > "$B/case-951-actor-unavailable.txt"
  fi
fi
```

## Step 4: [MAIN/SHELL] Record Subject And Structured Judge Facts

Skip this step when `case-951-actor-unavailable.txt` exists.

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { appendFileSync, readFileSync, statSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
const bundle = process.argv[2];
const planBytes = readFileSync(`${bundle}/rb_plan.md`, 'utf8');
const frontmatter = parseYaml(planBytes.match(/^---\n([\s\S]*?)\n---/)?.[1] || '');
const prompt = JSON.parse(readFileSync(`${bundle}/case-951-subject-prompt.json`, 'utf8'));
const result = JSON.parse(readFileSync(`${bundle}/case-951-subject-result.json`, 'utf8'));
const transcriptPath = `${bundle}/case-951-subject-transcript.jsonl`;
const transcript = readFileSync(transcriptPath, 'utf8');
const judge = JSON.parse(readFileSync(`${bundle}/case-951-judge-record.json`, 'utf8'));
const trace = readFileSync(`${bundle}/rb_trace.jsonl`, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const subjectRuntime = prompt.subject === '951' && result.status === 'completed' && result.completed_turns === 1 && statSync(transcriptPath).size > 0 && /WebSearch/.test(transcript);
const topics = frontmatter.topic_registry || [];
const rewriteOutput = topics.length >= 3 && topics.length <= 5 && /## Goal/.test(planBytes) && /### Purpose/.test(planBytes) && /### Research Questions/.test(planBytes) && /### Scope/.test(planBytes);
const gatePassed = trace.some((event) => event.event === 'gate_attempt' && event.gate === 'hitl1-recorded' && event.passed === true);
const validJudge = judge.schema_version === 'agent-experiment-judge/v1'
  && judge.source === 'ai-judge'
  && judge.case === 'case-951-heavy-topic-rewrite-ai-judge'
  && judge.paired_case === 'case-901-heavy-topic-rewrite-agent'
  && ['pass', 'fail'].includes(judge.verdict)
  && judge.criteria && Object.keys(judge.criteria).length > 0
  && typeof judge.rationale === 'string' && judge.rationale.trim().length > 0;
for (const [gate, passed] of [['subject-runtime-evidence', subjectRuntime], ['topic-rewrite-output', rewriteOutput], ['hitl1-recorded', gatePassed]]) appendFileSync(`${bundle}/rb_trace.jsonl`, `${JSON.stringify({ ts: new Date().toISOString(), event: 'check', source: 'playbook', gate, passed, expected: true })}\n`);
if (!validJudge) throw new Error('independent AI judge record is malformed');
appendFileSync(`${bundle}/rb_trace.jsonl`, `${JSON.stringify({ ts: new Date().toISOString(), event: 'check', source: 'playbook', gate: 'topic-rewrite-ai-review', passed: judge.verdict === 'pass', expected: true, verdict_judge: 'ai_judge' })}\n`);
JS
```

## Step 5: [MAIN/SHELL] Native Completion

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
EXTRA_ARGS=()
if [ -f "$B/case-951-actor-unavailable.txt" ]; then
  EXTRA_ARGS+=(--not-run-reason "independent Subject Agent, external capability, or separate AI reviewer unavailable")
else
  EXTRA_ARGS+=(
    --evidence "subject_prompt=$B/case-951-subject-prompt.json"
    --evidence "subject_transcript=$B/case-951-subject-transcript.jsonl"
    --evidence "subject_result=$B/case-951-subject-result.json"
    --evidence "judge_record=$B/case-951-judge-record.json"
  )
fi
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B" "${EXTRA_ARGS[@]}"
```

Stop after native completion. The Autorun Supervisor owns Light health, durable evidence export, audit, preservation, and optional clean-PASS cleanup. Case-901 remains a separate real-human claim regardless of this outcome.
