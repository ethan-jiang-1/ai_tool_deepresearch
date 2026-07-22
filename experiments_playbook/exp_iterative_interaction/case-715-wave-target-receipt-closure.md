---
schema: command-experiment/v2
experiment: iterative-interaction
case: case-715-wave-target-receipt-closure
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

## Run

Use the existing iterative-interaction Subject adapter and finalizer pattern from case 711, substituting case id `715`. The Subject Agent must run two sequential phases (Wave1 then Wave2) within the same bundle, with a real `enter-phase` transition and `load_complete` handoff between them.

The research question must involve at least two canonical topics where one topic's evidence naturally raises a question best answered by cross-topic synthesis — giving the Agent a legitimate reason to declare carried targets rather than fabricating them.

Preserve the adapter-owned `subject_prompt`, raw `subject_transcript`, and `subject_result` for each phase in the verdict bundle before the one native finalizer boundary.
