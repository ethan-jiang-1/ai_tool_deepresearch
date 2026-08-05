---
schema: command-experiment/v2
experiment: wfn-rerun
case: case-318-heavy-rerun-direction-recovery
case_goal: "Prove an independent real Subject Agent submits a direction-only topic-state candidate, crosses a direction/profile crash window, and recovers through the real rerun Gate without rewriting that direction."
verdict_mode: all
required_checks: [case-318-current-direction-produced, case-318-direction-preserved-during-recovery, case-318-profile-recovered-to-direction, case-318-real-rerun-gate-pass, case-318-real-subject-executions, case-318-witnessed-seed-topics-handoff]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: heavy
durable_evidence_roles: [subject_prompt, subject_transcript, subject_result]
proof_subject: agent_behavior
subject_execution: real_agent
fixture: setup_only
runtime: real_disposable_bundle
external_calls: none
verdict_judge: deterministic
req: VER-001, VER-003, VER-004, RTI-007
not_run_if: "The independent authenticated Subject Agent runtime is unavailable."
---

<!-- @impl EXA-003, EXA-005, EXA-006, EXA-007, EXA-008, PLR-003 -->

# Case 318 - Independent Rerun Direction Recovery

## Execution Contract

This is an `agent_flow_e2e` case. The Playbook Agent prepares and observes a legal setup-only boundary. A distinct authenticated Subject Agent owns both verdict-affecting actions: producing the current rerun direction, then recognizing and recovering the direction/profile mismatch through the production rerun Gate and immediate handoff. The Subject uses no search or external calls.

The adapter runs two Subject turns in one independent session. After the first successful turn and before sending the recovery turn, it records a deterministic read-only snapshot of the direction hash, target count, unchanged profile count, and unchanged rerun status. The adapter does not repair the bundle, write verdict checks, run health, or clean up.

Fixture output, Playbook-Agent-authored direction text, missing Subject session bytes, or a parent summary cannot satisfy this case. If the independent Subject runtime cannot complete, finalize `NOT_RUN` and preserve the run root.

## Step 1 - Establish and register the legal rerun boundary

```bash
B=$(node experiments_env/shared/prepare-rerun-direction-canary.mjs --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
node --input-type=module - "$B" <<'JS'
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
const [bundle] = process.argv.slice(2);
const setup = JSON.parse(readFileSync(join(bundle, 'case-318-setup.json'), 'utf8'));
const profile = parseYaml(readFileSync(join(bundle, 'rb_profile.yaml'), 'utf8'));
const seed = readFileSync(join(bundle, 'seed_topics/topic-a.md'), 'utf8');
const status = JSON.parse(readFileSync(join(bundle, 'rb_status.json'), 'utf8'));
const ok = setup.fixture === 'setup_only'
  && setup.subject_execution === 'real_agent'
  && setup.runtime === 'real_disposable_bundle'
  && setup.external_calls === 'none'
  && status.current_node === 'phases/phase-rerun.md'
  && status.current_gate === 'hitl2_recorded'
  && status.next_gate === 'rerun_ready'
  && profile.human_decision_checkpoints.hitl2.rerun_count === 0
  && !/^## 本轮重跑方向$/m.test(seed);
if (!ok) throw new Error('case-318 setup helper did not stop at the declared pre-Subject boundary');
JS
```

## Step 2 - Run the independent two-turn Subject Agent

The first turn forms and applies only a retained `set_rerun_direction` candidate through the existing `operate-topic-state apply` CLI, then stops before profile mutation. The adapter snapshots that crash window from durable Subject transcript evidence plus the resulting future direction/profile facts. The second turn must preserve the direction bytes, align the profile count, run the real `rerun-ready` Gate, consume its `check.next`, enter Seed Topics, and synchronize status.

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
set +e
node experiments_env/shared/run-iterative-interaction-subject.mjs 318 --bundle "$B"
SUBJECT_STATUS=$?
set -e
if [ "$SUBJECT_STATUS" -ne 0 ]; then
  printf '%s\n' 'independent authenticated Subject Agent runtime unavailable' > "$B/case-318-subject-unavailable.txt"
fi
```

## Step 3 - Record native facts and finalize once

For an unavailable actor, the same finalizer publishes `NOT_RUN` without substituting Playbook-Agent output. Otherwise the Playbook Agent records six deterministic checks from the retained Subject evidence, the turn-boundary snapshot, final direction bytes, production Gate attempt, handoff trace, profile, and status.

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
EXTRA_ARGS=()
if [ -f "$B/case-318-subject-unavailable.txt" ]; then
  EXTRA_ARGS+=(--not-run-reason "independent authenticated Subject Agent runtime unavailable")
else
  node --input-type=module - "$B" <<'JS'
import { createHash } from 'node:crypto';
import { appendFileSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
const [bundle] = process.argv.slice(2);
const tracePath = join(bundle, 'rb_trace.jsonl');
const crash = JSON.parse(readFileSync(join(bundle, 'case-318-crash-window.json'), 'utf8'));
const prompt = JSON.parse(readFileSync(join(bundle, 'case-318-subject-prompt.json'), 'utf8'));
const result = JSON.parse(readFileSync(join(bundle, 'case-318-subject-result.json'), 'utf8'));
const transcriptPath = join(bundle, 'case-318-subject-transcript.jsonl');
const seed = readFileSync(join(bundle, 'seed_topics/topic-a.md'), 'utf8');
const section = seed.match(/##\s*本轮重跑方向[\s\S]*?(?=\n##\s+|$)/)?.[0] || '';
const profile = parseYaml(readFileSync(join(bundle, 'rb_profile.yaml'), 'utf8'));
const status = JSON.parse(readFileSync(join(bundle, 'rb_status.json'), 'utf8'));
const events = readFileSync(tracePath, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const directionHash = createHash('sha256').update(section).digest('hex');
const subjectExecutions = prompt.subject === '318'
  && prompt.messages?.length === 2
  && result.status === 'completed'
  && result.subject === '318'
  && result.completed_turns === 2
  && statSync(transcriptPath).size > 0;
const checks = [
  ['case-318-real-subject-executions', subjectExecutions],
  ['case-318-current-direction-produced', crash.direction_count === 1 && crash.profile_count === 0 && crash.action_is_supplement && crash.requested_dimensions_present && crash.subject_apply_observed],
  ['case-318-direction-preserved-during-recovery', directionHash === crash.direction_sha256],
  ['case-318-profile-recovered-to-direction', profile.human_decision_checkpoints.hitl2.rerun_count === crash.direction_count],
  ['case-318-real-rerun-gate-pass', events.some((event) => event.event === 'gate_attempt' && event.gate === 'rerun-ready' && event.passed === true)],
  ['case-318-witnessed-seed-topics-handoff', events.some((event) => event.event === 'load_complete' && event.entry === 'phases/phase-seed-topics.md' && event.handoff_source_gate === 'rerun-ready') && status.current_node === 'phases/phase-seed-topics.md' && status.current_gate === 'rerun_ready'],
];
for (const [gate, passed] of checks) appendFileSync(tracePath, `${JSON.stringify({ ts:new Date().toISOString(), event:'check', source:'playbook', gate, passed, expected:true })}\n`);
JS
  EXTRA_ARGS+=(
    --evidence "subject_prompt=$B/case-318-subject-prompt.json"
    --evidence "subject_transcript=$B/case-318-subject-transcript.jsonl"
    --evidence "subject_result=$B/case-318-subject-result.json"
  )
fi
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B" "${EXTRA_ARGS[@]}"
```

PASS requires all six checks. Gate PASS alone cannot substitute for Subject execution or direction preservation. Stop after native completion. The Autorun Supervisor owns Heavy health, durable Subject evidence export, audit, preservation, and optional clean-PASS cleanup.
