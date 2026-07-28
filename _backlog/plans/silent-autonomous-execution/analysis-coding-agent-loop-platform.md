---
title: Silent autonomy coding-agent loop analysis
status: research_boundary_with_superseded_handoff_candidate
parent_plan: ../silent-autonomous-execution.md
candidate_change_name: make-phase-handoff-entry-direct
bugs: BUG-099, BUG-103, BUG-104, BUG-106
evidence_references:
  - ref_claude-code-agent-loop-research.md
  - ref_codex-agent-loop-research.md
revised: 2026-07-23
---

# Silent Autonomy: Coding-Agent Loop Analysis

## Superseded DPT Handoff Candidate (2026-07-28)

Archived `align-phase-handoff-status-sync-guidance` closed BUG-103's narrow
entry-guidance omission by preserving the existing two-command handoff order.
The proposed one-command DPT handoff interface and entry-core reduction
described below were not adopted. This analysis remains relevant only to the
host-liveness boundary and deferred BUG-099/104/106 research.

## 1. Decision

The two platform references are useful because they identify a boundary that the original Change 1 diagnosis could not establish from DPT code alone:

1. A visible task, plan item, or future phase gives a model useful context, but it is not a host scheduler.
2. On the normal Codex and Claude Code tool loops, an assistant response with no tool call ends the current turn.
3. A true post-turn continuation mechanism is host-owned. It needs durable goal state or equivalent completion policy plus authority to start another turn. A Markdown instruction or checklist does not supply those capabilities.

Therefore Change 1 has two deliberately separate contracts:

| Contract | Owner | Fixed Change 1 behavior | It does not promise |
| --- | --- | --- | --- |
| DPT handoff correctness and action readiness | DPT Markdown plus deterministic Engine facts | One legal handoff command completes the existing load and status chain, then delivers a bounded entry core with one exact first action. | That a model must issue the next tool call or that a host must start another turn. |
| Post-turn liveness | The selected coding-agent host | A run owner may use the host's own supported continuation feature outside the DPT bundle. | A portable DPT runtime guarantee or a new DPT scheduler. |

This is the fixed design decision. Change 1 is the root cure for DPT's malformed handoff and repeated oversized entry surface. It is not, and must not claim to be, a universal mechanism that makes Codex or Claude Code unable to end a turn.

The plan remains exactly four OpenSpec changes. There is no fifth DPT host-controller change. Building a DPT equivalent of a host goal would require persistent goal state, completion evaluation, idle lifecycle observation, and authority to inject another turn. That would violate the accepted Engine and Agent Flow boundaries.

## 2. What The Platform Evidence Establishes

The factual details and source links are deliberately kept in the two reference files:

- [Codex 2026+ first-party evidence](ref_codex-agent-loop-research.md)
- [Claude Code 2026+ first-party evidence](ref_claude-code-agent-loop-research.md)

The following design conclusions are justified by those references.

| Platform | Normal stop point | Why a visible task is insufficient | Actual host-level continuation evidence | DPT consequence |
| --- | --- | --- | --- | --- |
| Codex | A sampled assistant-only response completes the normal turn; tool calls continue only when the model requests them and the host returns their result. (Source-confirmed, `session/turn.rs`.) | update_plan records checklist state and returns a tool result; it does not evaluate unfinished items or schedule a turn. (Source-confirmed, `tools/handlers/plan.rs`.) | Current public source contains a separately persisted active-goal runtime that reacts when a thread is idle and can start a continuation turn. Local source verification establishes the decisive gate is **surface-bound**: only `codex-app-server` links `codex-goal-extension`; `core`/`cli`/`tui` do not. `Feature::Goals` is default-on/Stable, so "feature-gated" understates the real boundary — a bare CLI/TUI operator has no goal mechanism. | Never treat update_plan as a no-stop mechanism. A run may use an active goal only when the selected host surface actually exposes and enables it. |
| Claude Code | The Agent loop ends when Claude produces a response with no tool calls. **Source-corroborated** in the local mirror (`query.ts:1062`): `needsFollowUp` is set only on a `tool_use` block. | Task-list items persist across compaction or sessions, but persistence is not a post-turn scheduler. **Source-corroborated**: the task tools return a plain `tool_result` with no scheduling side effect, and the loop's exit branch never reads task status. | `/goal` evaluates completion after each turn and starts another turn on no (doc-authoritative; the local mirror is a pre-current snapshot that does not contain `/goal`, so it cannot corroborate — version gap unresolved, irrelevant to the boundary). Stop hooks can continue a turn (block-only in the mirror; the eight-consecutive limit is doc-authoritative). `/loop` is a separate scheduled-prompt mechanism (source-corroborated). A feature-gated **token-budget continuation** is an additional bounded host lever (source-observed). | Auto approval is not enough. `/goal`, a Stop hook, `/loop`, and token-budget continuation are host policies, not DPT lifecycle state or Change 1 implementation. |

The references also support a separate context conclusion: large tool output consumes useful context, and compaction is context management rather than a scheduler. This strengthens the need to reduce the normal entry surface, but it does not prove that a particular byte count caused the observed pauses.

## 3. The Correct Mental Model

The former working assumption was:

    Agent sees an unfinished to-do or a later task
      -> Agent will therefore keep working

That implication is not mechanically true on either platform. The actual arrangement is:

    DPT gives the model an actionable next step
      -> model chooses either a tool call or an assistant-only response
      -> tool call: host returns a result and the normal loop continues
      -> assistant-only response: normal turn ends
      -> host-native goal/evaluator, if configured: host may start another turn

An unfinished task is still valuable. It improves the model's local decision context and makes the intended action easier to recognize. It is not durable execution authority. The design must not confuse action readiness with turn liveness.

There is one narrower reason the old intuition can appear to work: creating or updating a task item is itself a tool call. While the model makes that call, the host returns its result and samples the model again in the same normal tool loop. Once that result is returned, however, the unfinished item has no authority to schedule another sample or another turn. This is why a task list can be useful scaffolding without being a reliable no-stop mechanism.

## 4. DPT's Root Cure

Change 1 removes two deterministic DPT causes of an avoidable pause before the Agent makes its next decision:

1. The current public recipe exposes an intermediate state after target load, then tells the Agent to execute the loaded node even though source status synchronization is still mandatory.
2. The current loader emits a repeated 95--111 KB mandatory dependency closure before the Agent reaches the next decision point.

The normal Agent-facing path becomes:

    passed or degraded Gate handoff
      -> consume-phase-handoff --bundle <bundle>
      -> resolve the latest legal handoff from existing trace/topology facts
      -> ensure the exact route-bound target load witness and current_node
      -> ensure the exact source-gate status window and phase_transition
      -> render the bounded canonical target entry core
      -> one truthful first-action instruction

The command is atomic to its caller, not a false all-or-nothing filesystem transaction. It resumes a valid partial load/status chain from existing trace and status evidence, does not duplicate durable witnesses, and fails closed on contradiction. The lower-level load and status operations remain the implementation and recovery seams.

The entry core makes a fresh Agent able to take the first legal target action. Branch-only and recovery material stays canonical but becomes an explicitly named read before its branch is taken. This reduces normal decision friction without pretending the Engine can prove what an older session read.

The corrected claim is precise:

> Change 1 ensures that DPT never asks a normal caller to infer a source gate, execute a target before status synchronization, or choose a first action from an unnecessarily repeated full closure. It improves the quality of the model's next decision. It cannot compel a general coding-agent host to take that decision in the same or a later turn.

## 5. Host Policy Outside DPT

When a run needs post-turn continuity, the run owner uses the selected host's native feature outside the DPT bundle and records the host/version/mode in experiment evidence.

| Host | Fixed operating rule |
| --- | --- |
| Codex | Use an active goal only when that exact Codex surface documents it as available and has it enabled. Do not substitute update_plan, a visible plan, or a DPT Markdown instruction. |
| Claude Code | Use /goal when a host-owned per-turn completion evaluator is needed and permitted by the selected environment. Do not call Auto mode a scheduler. Stop-hook and /loop policies are different operational choices and are not introduced by Change 1. |

No DPT code, bundle state, Gate, trace event, or Markdown file may infer that a host goal is enabled, inspect whether a turn ended, retry after a silent assistant response, or turn host-only task state into DPT routing authority. The host feature also never authorizes bypassing a failed Gate, changing DPT state, or treating a new turn as submitted work.

## 6. Verification Consequences

The experiment must prove the two contracts separately.

| Evidence | What it can prove | What it cannot prove |
| --- | --- | --- |
| Unit, integration, and deterministic E2E against the new public handoff command | Correct target derivation, witness/status ordering, idempotent resume, fail-closed conflict handling, and bounded entry-core delivery. | That a model continued after reading the output. |
| Real agent_flow_e2e in a named Codex or Claude Code environment | That the observed Agent executed the target first action after a legal completed handoff. | That the result generalizes to every model, context, or host configuration. |
| Host-native goal evidence | That that particular host configuration began another turn after its evaluator said unfinished. | That DPT owns or can reproduce the scheduler. |

For every real-Agent observation, preserve the Subject prompt/transcript/result, host name and version, whether a native continuation feature was enabled, the completed DPT trace/status handoff, emitted entry core, and first target action. Record an ordinary terminal assistant response as a host-turn outcome, not as fabricated DPT state.

BUG-099 and BUG-106 still close only after repeated real Agent-flow evidence. A native goal producing an additional turn is useful experimental context, but it does not by itself prove that the next action was correct or silent.

## 7. Rejected Designs

| Rejected design | Why it is wrong |
| --- | --- |
| Add more no-stop prose or a larger to-do list | It can influence a model but cannot schedule a host turn; it also creates competing control surfaces. |
| Treat Codex update_plan or Claude Code task lists as execution authority | The platform evidence explicitly separates task tracking from host continuation. |
| Copy Codex active goals or Claude Code /goal into DPT | The copied design would create a session registry, completion evaluator, idle hook, and second state machine in a framework that is intentionally not the host. |
| Detect missing tool calls or classify chat text in the Engine | DPT lacks legitimate authority over conversation transport, and detection would occur only after the turn already ended. |
| Use session-aware dependency de-duplication | It replaces an unknown context-retention assumption with false durable authority. |
| Rely on host continuation instead of a direct DPT handoff | A resumed turn still needs the correct legal source, synchronized state, and first action. Host liveness cannot repair a malformed handoff. |

## 8. Scope Firewall

This analysis changes the precision of Change 1's claim and verification design. It does not add a platform adapter, external scheduler, hook, new runtime state, task-list schema, goal schema, daemon, watcher, generic controller, or a fifth change.

The future OpenSpec proposal must cite this decision together with the two evidence references, keep host configuration outside DPT implementation scope, and retain the existing BUG-099/106 real-actor closure boundary.
