---
schema: command-experiment/v2
experiment: wff-delivery
case: case-138-standard-final-refinement
case_goal: "Observe one real Subject session deliver an empty Final, make two same-lineage presentation revisions, leave the satisfaction turn without runtime mutation, then accept one explicit evidence-expansion C5 request."
verdict_mode: all
required_checks: [case-138-final-refinement]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: standard
durable_evidence_roles: [subject_prompt, subject_transcript, subject_result, subject_observation]
proof_subject: agent_behavior
subject_execution: real_agent
fixture: setup_only
runtime: real_disposable_bundle
external_calls: none
verdict_judge: deterministic
req: CDE-003, CDP-003, CDP-004, POF-001
not_run_if: "The authenticated Subject Agent, required production tools, or native completion is unavailable; the single 120-second attempt must not be retried automatically."
---

<!-- @impl CDE-003, CDP-003, CDP-004, POF-001 -->

# Case 138 - Standard Final Refinement

## Execution Contract

The setup helper creates exactly one legal Final boundary with an empty primary
inventory, one supplied submitted backing, and no report. It performs no
network research and does not generate a Subject result or native verdict.

One independent authenticated Subject Agent receives five supplied turns in one
session: initial delivery, unlabelled presentation revision, labelled technical
presentation revision, a no-more-revision response, then explicit evidence
expansion. The runner's per-turn observer freezes Final inventory, status,
Profile, and trace after turn four before turn five is sent. It checks only
observable procedure and retained production results; it does not judge report
quality, user satisfaction, or general intent-classification accuracy.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Fixture boundary | Setup-only legal Final entry, one supplied finding/backing reference, empty primary inventory |
| Subject execution | One real authenticated Subject Agent session, five supplied turns |
| Production boundaries | `publish-final-report`, Final inventory resolver, and existing C5 inspect/apply |
| Network | Forbidden for this case |
| Verdict source | Retained Subject prompt/transcript/result plus per-turn adapter observation and root trace |
| Does not prove | Report improvement, generic feedback classification, genuine user satisfaction, or rerun completion |

## Step 1 - Prepare The Setup-Only Final Boundary

```bash
B=$(node experiments_env/shared/prepare-iterative-interaction-case.mjs 138 --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
```

The created bundle must contain `case-138-setup.json` and
`case-138-final-backing.json`, while `final/` has no primary report. The setup
does not create a report, transcript, Subject result, or native completion.

## Step 2 - Run The Single Subject Session

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
set +e
node experiments_env/shared/run-iterative-interaction-subject.mjs 138 --bundle "$B"
SUBJECT_STATUS=$?
set -e
if [ "$SUBJECT_STATUS" -ne 0 ]; then
  printf '%s\n' 'case-138 authenticated Subject session was unavailable, failed, or exceeded its 120-second total cap' > "$B/case-138-subject-unavailable.txt"
fi
```

Only this one invocation is authorized. A timeout, missing actor, missing
tooling, failed observer, or other native failure is preserved as `NOT_RUN`;
this playbook neither retries it nor substitutes fixture or Playbook-Agent work.

## Step 3 - Bind The Retained Procedure Observation

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
EXTRA_ARGS=()
if [ -f "$B/case-138-subject-unavailable.txt" ]; then
  EXTRA_ARGS+=(--not-run-reason "$(cat "$B/case-138-subject-unavailable.txt")")
else
  node --input-type=module - "$B" <<'JS'
import { readFileSync } from 'node:fs';
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';

const [bundle] = process.argv.slice(2);
const observation = JSON.parse(readFileSync(`${bundle}/case-138-subject-observation.json`, 'utf8'));
const result = JSON.parse(readFileSync(`${bundle}/case-138-subject-result.json`, 'utf8'));
const pass = result.status === 'completed'
  && result.timed_out === false
  && result.completed_turns === 5
  && observation.completed_turns === 5
  && observation.first_delivery_before_feedback === true
  && JSON.stringify(observation.primary_targets) === JSON.stringify([
    'final/final.md',
    'final/final_v1.md',
    'final/final_technical_deep_dive_v2.md',
  ])
  && observation.immutable_prior_bytes === true
  && observation.turn4_frozen_without_runtime_mutation === true
  && observation.turn5_c5_accepted_without_report_or_completed_rerun === true;
recordCheck(`${bundle}/rb_trace.jsonl`, {
  gate: 'case-138-final-refinement',
  passed: pass,
  detail: 'retained native Subject and deterministic observer facts bind the five-turn Final/C5 procedure only',
});
JS
  EXTRA_ARGS+=(
    --evidence "subject_prompt=$B/case-138-subject-prompt.json"
    --evidence "subject_transcript=$B/case-138-subject-transcript.jsonl"
    --evidence "subject_result=$B/case-138-subject-result.json"
    --evidence "subject_observation=$B/case-138-subject-observation.json"
  )
fi
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B" "${EXTRA_ARGS[@]}"
```

Stop after native completion. The Autorun Supervisor owns health, durable
evidence export, audit, preservation, and cleanup. Historical case 137 remains
quarantined diagnostic material and is not a substitute for this observation.
