---
schema: command-experiment/v2
experiment: iterative-interaction
case: case-715-heavy-wave-target-receipt-closure
case_goal: "A real Subject Agent completes Wave1 depth review with explicit carried targets, the Engine projects a normalized receipt, and a second Subject Agent run produces Wave2 findings with receipt-bound bindings that satisfy closure — without fabricated controls, commands, or mock coverage."
verdict_mode: all
required_checks:
  - case-715-explicit-carried-target
  - case-715-receipt-projection
  - case-715-receipt-bound-finding
  - case-715-closure-coverage
  - case-715-no-fabricated-path
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: light
durable_evidence_roles: [subject_prompt, subject_transcript, subject_result]
proof_subject: agent_behavior
subject_execution: real_agent
fixture: setup_only
runtime: real_disposable_bundle
external_calls: real
verdict_judge: deterministic
req: RWP-021, WTS-011, TRW-006, RWG-020
not_run_if: "The independent authenticated Subject Agent runtime or required real search/fetch tools are unavailable, OR fewer than two canonical topics with explicit cross-topic carried targets can be authored within a single research question."
---

<!-- @impl EXA-003, EXA-005, EXA-006, EXA-007, EXA-008 -->

# Case 715 — Wave1 Carried-Target Receipt To Wave2 Finding Closure

## Execution Contract

Prepare a fresh production bundle at the legal Wave1 boundary (hitl1 recorded, phase-wave1 entered). The independent Subject Agent must:

1. **Wave1**: Execute `phases/phase-wave1.md` for each canonical topic. Produce `depth-review.yaml` with an explicit `carried_targets` array — at least one topic must declare one or more cross-topic targets that cannot be fully resolved by its own submitted evidence. The Agent must not fabricate a target solely to satisfy the closure contract.

2. **Gate**: The Engine runs `check-gate-wave1-complete` (real CLI). On pass, it projects the versioned `carried_target_receipt` into the routed `gate_attempt` trace entry. The Playbook Agent may observe but not write the trace or receipt.

3. **Wave2**: After a legal `load_complete` handoff to `phases/phase-wave2.md`, the Subject Agent runs Wave2 synthesis. It produces `finding-index.yaml` with at least one finding that includes exact `wave1_target_bindings[]` matching the projected receipt. Remaining unresolved targets must route through existing `defer_hitl2`, `requires_internal_data`, or `record_only` disposition — the Agent must not invent a target status or skip uncovered targets silently.

4. **Closure**: The Engine runs `check-gate-wave2-complete` (real CLI). The finding-index contract must detect receipt-bound coverage without a fabricated second validator or target-level score.

The Playbook Agent may prepare the boundary, retain exact prompt/transcript/result bytes, and run deterministic observation/finalization; it must not write a depth review, finding, receipt, trace entry, or Gate result.

## Evidence And Verdict

PASS requires deterministic inspection of the real bundle and raw Subject transcripts to show all of the following:

- **Explicit carried target**: At least one `depth-review.yaml` contains a `carried_targets` array with valid `{target_id, target_text}` entries authored by the Subject Agent, not injected by the Playbook.
- **Receipt projection**: The `rb_trace.jsonl` contains exactly one `carried_target_receipt` on the routed Wave1 `gate_attempt`, with `contract_version: "wave1-carried-targets/v1"`, a valid `receipt_sha256`, and ordered `targets[]` matching only the declared carried targets.
- **Receipt-bound finding**: At least one finding in `finding-index.yaml` carries a `wave1_target_bindings[]` entry where every field exactly equals the corresponding receipt target.
- **Closure coverage**: The Wave2 Gate inspect output reports no `wave1_target_binding` coverage gap for targets bound to valid finding decisions and gap-status routes.
- **No fabricated path**: No trace entry, status field, profile parameter, or queue item was written by the Playbook Agent. The existing Engine boundary is the sole authority for receipt projection and closure validation.

If the independent Agent or real tools are unavailable, finalize `NOT_RUN` with the unavailable reason. Do not create a scripted depth review, finding, or trace entry as a fixture PASS.

## Step 1: [PLAYBOOK AGENT] Prepare Legal Wave1 Boundary

```bash
B=$(node experiments_env/shared/prepare-iterative-interaction-case.mjs 715 --target-dir {{CASE_RUN_ROOT_SH}} 2>/dev/null) || true
if [ -z "$B" ] || [ ! -d "$B" ]; then
  B=$(printf '%s/dpt_disp_case-715_NOTREADY' {{CASE_RUN_ROOT_SH}})
  mkdir -p "$B"
  printf '%s\n' 'case-715 infrastructure not ready: prepare helper does not support case 715' > "$B/case-715-infra-unavailable.txt"
fi
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
```

## Step 2: [SUBJECT AGENT] Wave1 Depth Review With Carried Targets

If the prepare infrastructure is unavailable, skip Subject execution and proceed to finalization. Otherwise, run one independently authenticated real Agent session for Wave1 depth review.

The subject system instruction is limited to:

```text
You are the independent subject Agent for case 715 Wave1. Work only in the exact bundle path provided by the runner. Load the bundle's current production lifecycle surface and direct facts. Execute the current phase's depth review contract and produce carried_targets where evidence naturally crosses topic boundaries.
```

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
if [ -f "$B/case-715-infra-unavailable.txt" ]; then
  printf '%s\n' 'case-715 infrastructure not ready — skipping Subject execution' > "$B/case-715-subject-unavailable.txt"
else
  set +e
  node experiments_env/shared/run-iterative-interaction-subject.mjs 715-wave1 --bundle "$B" 2>/dev/null
  SUBJECT_STATUS=$?
  set -e
  if [ "$SUBJECT_STATUS" -ne 0 ]; then
    printf '%s\n' 'independent Subject Agent or required real tools unavailable' > "$B/case-715-subject-unavailable.txt"
  fi
fi
```

## Step 3: [SUBJECT AGENT] Wave2 Synthesis With Receipt-Bound Findings

After the Wave1 Gate passes and projects the carried_target_receipt, run a second independent Subject session for Wave2 synthesis. If the first Subject session was unavailable, skip.

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
if [ ! -f "$B/case-715-subject-unavailable.txt" ] && [ ! -f "$B/case-715-infra-unavailable.txt" ]; then
  set +e
  node experiments_env/shared/run-iterative-interaction-subject.mjs 715-wave2 --bundle "$B" 2>/dev/null
  SUBJECT2_STATUS=$?
  set -e
  if [ "$SUBJECT2_STATUS" -ne 0 ]; then
    printf '%s\n' 'independent Wave2 Subject Agent unavailable' > "$B/case-715-subject-unavailable.txt"
  fi
fi
```

## Step 4: [OBSERVER] Hash And Derive Native Verdict

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
EXTRA_ARGS=()
if [ -f "$B/case-715-subject-unavailable.txt" ]; then
  EXTRA_ARGS+=(--not-run-reason "$(cat "$B/case-715-subject-unavailable.txt")")
elif [ -f "$B/case-715-infra-unavailable.txt" ]; then
  EXTRA_ARGS+=(--not-run-reason "$(cat "$B/case-715-infra-unavailable.txt")")
fi
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B" "${EXTRA_ARGS[@]}"
```

PASS requires deterministic inspection of the real bundle and raw Subject transcripts showing explicit carried targets, receipt projection, receipt-bound findings, closure coverage, and no fabricated path. When the infrastructure or Subject Agent is unavailable, the case produces an honest NOT_RUN through the single native finalizer boundary.

The light health profile is intentional because the verdict checks focus on structural contract compliance at the Wave1→Wave2 boundary. The filename's `heavy` cost continues to describe the real external Subject expense.

## Step 5: [PLAYBOOK AGENT] Stop

Stop after native completion. The Autorun Supervisor validates the completion, runs Light health, exports durable Subject evidence, and preserves FAIL or NOT_RUN roots.
