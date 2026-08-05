---
schema: command-experiment/v2
experiment: exph-workflow-foundation
case: case-901-heavy-topic-rewrite-agent
case_goal: "Prove an independent Subject Agent rewrites one vague topic under the current HITL1 contract and an actual human judges semantic quality separately from structural gates."
verdict_mode: all
required_checks: [subject-runtime-evidence, topic-rewrite-output, hitl1-recorded, topic-rewrite-real-human-review]
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
verdict_judge: real_human
---

<!-- @impl EXA-003, EXA-004, EXA-005, EXA-006, EXA-007, EXA-008, PLR-003, VER-006 -->

# case-901-heavy-topic-rewrite-agent

## Execution Contract

This is the real-human half of the co-located 901/951 pair and runs only through Interactive replay. A distinct authenticated Subject Agent owns the topic rewrite, profile choice, bounded real capability probe, and production HITL1 Gate. The Interactive Playbook Agent prepares setup, preserves Subject evidence, and records deterministic observations, but must not author the rewrite.

After Subject execution, an actual human reviews the original input, exact Subject prompt/transcript/result, final plan/profile, probe fact, and Gate result. The human judge must provide an explicit pass/fail plus rationale. No AI reviewer, default value, Gate pass, or Playbook-Agent opinion can satisfy `topic-rewrite-real-human-review`.

## Step 1: [MAIN/SHELL] Prepare The HITL1 Boundary

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs wff_rwa_human --case case-901 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
cat > "$B/rb_profile.yaml" <<'YAML'
plan_basename: wff_rwa_human
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
node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-instantiation-complete.mjs --bundle "$B" --current-node phases/phase-instantiation.md > "$B/case-901-instantiation-gate.json"
NEXT=$(node experiments_env/shared/extract-field.mjs check.next < "$B/case-901-instantiation-gate.json")
node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle "$B" --node "$NEXT" > "$B/case-901-enter-hitl1.md"
node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle "$B" --to instantiation_complete > "$B/case-901-status.json"
```

## Step 2: [MAIN->SUBJECT] Run The Independent Rewrite

The adapter injects the current production HITL1 closure, exact bundle path, and the same original input used by case-951: `帮我研究一下 AI 安全`. It retains exact prompt, raw Subject transcript, and result. Subject or external-runtime failure is an infrastructure error for this deliberate Interactive case; do not substitute another actor.

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node experiments_env/shared/run-iterative-interaction-subject.mjs 901 --bundle "$B"
```

## Step 3: [MAIN/SHELL] Record Subject-Bound Structural Facts

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { appendFileSync, readFileSync, statSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
const bundle = process.argv[2];
const planBytes = readFileSync(`${bundle}/rb_plan.md`, 'utf8');
const frontmatter = parseYaml(planBytes.match(/^---\n([\s\S]*?)\n---/)?.[1] || '');
const prompt = JSON.parse(readFileSync(`${bundle}/case-901-subject-prompt.json`, 'utf8'));
const result = JSON.parse(readFileSync(`${bundle}/case-901-subject-result.json`, 'utf8'));
const transcriptPath = `${bundle}/case-901-subject-transcript.jsonl`;
const transcript = readFileSync(transcriptPath, 'utf8');
const trace = readFileSync(`${bundle}/rb_trace.jsonl`, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const subjectRuntime = prompt.subject === '901' && result.status === 'completed' && result.completed_turns === 1 && statSync(transcriptPath).size > 0 && /WebSearch/.test(transcript);
const topics = frontmatter.topic_registry || [];
const rewriteOutput = topics.length >= 3 && topics.length <= 5 && /## Goal/.test(planBytes) && /### Purpose/.test(planBytes) && /### Research Questions/.test(planBytes) && /### Scope/.test(planBytes);
const gatePassed = trace.some((event) => event.event === 'gate_attempt' && event.gate === 'hitl1-recorded' && event.passed === true);
for (const [gate, passed] of [['subject-runtime-evidence', subjectRuntime], ['topic-rewrite-output', rewriteOutput], ['hitl1-recorded', gatePassed]]) appendFileSync(`${bundle}/rb_trace.jsonl`, `${JSON.stringify({ ts: new Date().toISOString(), event: 'check', source: 'playbook', gate, passed, expected: true })}\n`);
JS
```

## Step 4: [HUMAN] Review The Independent Subject Output

Pause and show the actual human reviewer:

- original input `帮我研究一下 AI 安全`;
- `case-901-subject-prompt.json`, `case-901-subject-transcript.jsonl`, and `case-901-subject-result.json`;
- final `rb_plan.md` and `rb_profile.yaml`;
- the bounded capability-probe fact and `hitl1-recorded` Gate result.

Ask the human to judge fidelity, question coverage and uncertainty, seed-topic relevance/independence/non-redundancy, profile fit, probe honesty/evidence isolation, and whether this is an acceptable starting interpretation. Only after the human supplies an explicit `pass` or `fail` and a non-empty rationale, write `case-901-judge-record.json` with exactly:

```json
{
  "schema_version": "agent-experiment-judge/v1",
  "source": "human",
  "case": "case-901-heavy-topic-rewrite-agent",
  "paired_case": "case-951-heavy-topic-rewrite-ai-judge",
  "verdict": "pass_or_fail_from_actual_human",
  "criteria": {},
  "rationale": "actual human rationale"
}
```

Replace the descriptive placeholders only with the actual human response; `criteria` must be a non-empty object. Do not infer or default the verdict.

## Step 5: [MAIN/SHELL] Record Structured Human Judgment And Complete

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { appendFileSync, readFileSync } from 'node:fs';
const bundle = process.argv[2];
const judge = JSON.parse(readFileSync(`${bundle}/case-901-judge-record.json`, 'utf8'));
const valid = judge.schema_version === 'agent-experiment-judge/v1'
  && judge.source === 'human'
  && judge.case === 'case-901-heavy-topic-rewrite-agent'
  && judge.paired_case === 'case-951-heavy-topic-rewrite-ai-judge'
  && ['pass', 'fail'].includes(judge.verdict)
  && judge.criteria && Object.keys(judge.criteria).length > 0
  && typeof judge.rationale === 'string' && judge.rationale.trim().length > 0;
if (!valid) throw new Error('actual human judge record is missing or malformed');
appendFileSync(`${bundle}/rb_trace.jsonl`, `${JSON.stringify({ ts: new Date().toISOString(), event: 'check', source: 'playbook', gate: 'topic-rewrite-real-human-review', passed: judge.verdict === 'pass', expected: true, verdict_judge: 'real_human' })}\n`);
JS
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B" \
  --evidence "subject_prompt=$B/case-901-subject-prompt.json" \
  --evidence "subject_transcript=$B/case-901-subject-transcript.jsonl" \
  --evidence "subject_result=$B/case-901-subject-result.json" \
  --evidence "judge_record=$B/case-901-judge-record.json"
```

Stop after native completion. Interactive v1 preserves the run root. The Supervisor owns Light health and durable audit; this human result remains distinct from case-951 AI judgment.
