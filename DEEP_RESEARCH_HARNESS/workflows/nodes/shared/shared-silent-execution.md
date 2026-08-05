---
node_type: shared
id: shared-silent-execution
shared_scope: silent-execution
authority: behavioral-contract
execution_contract:
  surface: shared-guidance
  search_policy: no_search
requires: []
suggested_context:
  - shared/shared-repair-guidance
  - shared/shared-anti-cheating-rules
---

# Shared: Silent Execution（静默自主执行）

## Direction-Aware Baseline

@impl SWE-001, SWE-004, SWE-005, SWE-006

This contract applies to non-terminal lifecycle phases whose current loaded node has `stop: no`. Silence means **the framework and Agent do not initiate user-facing interaction**. They SHALL NOT initiate a question, confirmation, acknowledgement, progress report, partial delivery, idle report, A/B choice, approval request, or continuation request. Gate failure, local completion, an empty active window, fatigue, and an outer task notification do not change that placement.

When a normal user-initiated message is already the current conversation turn, answer it directly from current verified facts, or state the smallest missing-path boundary. That factual reply creates no checkpoint, state, permission, route, mutation or reentry authority, pause/interrupt lifecycle, or durable mid-run intent. It does not change `stop`, the current node, or the projected `next_action`; absent a separately accepted task change, autonomous work remains the obligation after the reply. Do not claim that supplemental scope was persisted or applied unless an existing accepted owner/path actually did so.

An approval prompt, harness/task notification, language preference, or unrelated background-workflow signal is not a user-initiated conversation turn and is never a continuation dependency. Language preference is not surfacing permission: it never authorizes status replies, acknowledgements, progress, partial delivery, questions, or approval requests on its own. The Engine does not inspect or classify chat state; this is Agent-facing direction guidance, not a new message transport or controller.

Final is governed by its terminal-delivery contract, not this non-terminal baseline. HITL1 and HITL2 remain the only framework-initiated in-run decision checkpoints.

## Autonomous Work Loop

@impl SWE-001, GSK-006, CHI-001

Read direct bundle truth and checkpoint output, then follow the shortest legal path:

1. Repair the named deterministic root cause and rerun the same Gate.
2. If the repair is not converging, change strategy rather than repeating it.
3. Consume a legal clean or degraded Gate handoff.
4. If no legal route exists, record accepted diagnostics when available and hold silently at the current phase.

Gate failure is a normal checkpoint result, not permission to involve the user. A degraded handoff is legal only when the Gate returns `check.passed: true`, `check.degraded: true`, and `check.next`; it is not a clean quality pass. Diagnostic events such as `silent_degradation`, `silent_gap`, `silent_gap_critical`, and `silent_unpassable` are not pass, routing, status, or delivery authority. Do not write `state: blocked`, hand-edit status, skip a phase, or write `final/` early merely because repair is exhausted.

If the Agent can identify that it is about to initiate prohibited surfacing, abort that path and record `surfacing_intent` when the accepted diagnostic command is available:

```bash
node DEEP_RESEARCH_HARNESS/cli/log-event.mjs --bundle <bundle> --surfacing-intent --node phases/<phase>.md --intent-type <ask_user|progress_report|partial_delivery|user_choice|wait_for_input|other> --reason "<why you almost surfaced>"
```

`surfacing_intent` is diagnostic only. Do not record it solely because the Agent directly answered a user-initiated current turn.

## Fatigue and Strategy Change

@impl SWE-002, GSK-006

After 3 consecutive Gate failures on the same issue, pause the attempted repair, reread the current phase and direct Gate `inspect`/`advice`, and switch strategy. Preserve the real Gate verdict and rerun the same Gate with the 1-based compatibility hint:

```bash
node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-<gate-name>.mjs --bundle <path> --current-node phases/<phase>.md --attempt <N>
```

At the fatigue threshold, `fatigue_warning` and `step_back` mean change strategy and follow the active rule/definition; they do not change the verdict, authorize a user question, or supply a copied rule boundary. Engine-derived `attempt_count`, `attempt_trend`, and cross-attempt deltas are stronger diagnostics than the self-reported counter.

For a structural failure, repair the named structure without fabricating authority. For a retryable quality or coverage failure, change search angle, queue demand, work-unit role/kind, or accepted repair path. For a failure that remains unpassable under the active rule, record the smallest diagnostic and use Silent hold. Never replace the active definition with a remembered numeric limit.

## Delegated Work Polling

@impl SWE-006, DEW-003

Delegated stop:no phases use an **active poll-submit-repair-terminalize loop**. Notifications are hints only. Reconstruct in-flight work from bundle truth, including queue state, `_work_units/` manifests/status/results, runtime receipts, output/cache files, and:

```bash
node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs inspect <bundle>
```

Inspect result, receipt, output, cache, status, and deadline signals. Submit ready attempts without waiting for the user or a task notification. If submit rejects, repair that attempt when possible; otherwise explicitly terminalize it before replacement. Do not run the phase Gate while delegated demand or reconstructed in-flight work remains.

A successful claim continuation cue names `work_ids` to inspect and poll next. It does not prove readiness or create interaction authority; the loaded lifecycle node remains the placement authority.

## Gate and Handoff Boundary

@impl SWE-001, SWE-002

### Phase Handoff Comes ONLY from Gate CLI and `enter-phase`

The Gate CLI's `check.next` is the only phase handoff authority. On pass, consume it through:

```bash
node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle <path> --node <check.next>
```

Then run `advance-status --to <source_gate_enum>` only as the current phase instructs, to synchronize the just-passed source gate. This is status synchronization authority only. Do NOT use `advance-status` as a substitute for `enter-phase`. `enter-phase` and route-bound `load_complete` witness entry; they do not prove target-phase work completion. A continuation cue is only a projection of already-valid direct facts and never replaces Gate, load, status, or work-unit evidence.

### Silent hold

When runtime blockers remain and there is no legal `check.next`, keep the latest legal phase coordinate, preserve the failed verdict, record accepted trace/log diagnostics if available, and stop repeating the same ineffective repair. Silent hold is not completion, phase bypass, final delivery, or permission to ask the user.

On context recovery, reload `rb_status.json.current_node` and bundle truth. If `current_node` is absent, use trace/reentry diagnostics; do not infer the phase from `current_gate` alone or restart completed work from chat memory.

## Authority Boundary

This file governs Agent behavior. Current lifecycle placement comes from the loaded manifest node; Gate truth, handoff, status, receipts, and trace remain Engine/runtime authority. Shared repair and anti-cheating guidance use this same direction-aware baseline and cannot create another interaction point.
