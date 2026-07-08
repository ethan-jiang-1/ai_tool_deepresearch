# Formal Run Bugfix Change Split Plan

> Status: closed | Created: 2026-07-08 | Closed: 2026-07-08 | Purpose: split active formal-run bugs into focused OpenSpec changes

## Summary

Use **4 OpenSpec changes**. The split is based on dependency and failure mode, not bug count. The goal is to avoid one giant, fragile change while still fixing the bugs in the order a real run depends on them.

Recommended order:

```text
1. stabilize-runtime-position-and-queue
        |
        +--> 2. simple-gate-quality-loop
        |          |
        |          +--> 3. restore-wave-depth-contracts
        |
        +--> 4. harden-run-entry-and-agent-discipline
```

Default readiness rule:

- For an engine shakedown run: complete changes 1, 2, and 4.
- For a real report-quality formal run: complete all 4 changes.
- Do not merge Wave1/Wave2 depth restoration into the gate/runtime stabilization work.

## Change 1: `stabilize-runtime-position-and-queue`

Covers:

- `BUG-057` — `rb_status.json` missing `current_node`.
- `BUG-044` — work-unit submit leaves stale `delegated_in_flight`.
- `BUG-056` — minimal queue validation fix for supplementary topic tasks.

Reasoning:

- These are runtime truth bugs. Before improving gates or research behavior, the bundle must know where it is and queue/work-unit state must be durable.
- `BUG-056` belongs here in minimal form because later Wave1/Wave2 repair depends on legal supplementary tasks.

Key behavior:

- Add `current_node` to `rb_status.json`.
- `enter-phase` writes `current_node` to the target phase node after a successful route-bound load.
- `advance-status` preserves `current_node`; it must not clear it because the accepted flow is `enter-phase` first, `advance-status` second.
- Work-unit submit must verify, after write, that the queue item moved out of `delegated_in_flight` and into terminal history.
- Queue topic identity must prefer explicit `payload.topic_slug`; `queue_item_id` parsing is fallback only and must not block valid supplementary IDs.

Tests:

- Status schema/template supports `current_node`.
- `enter-phase` updates `current_node`.
- `advance-status` updates gate window without erasing `current_node`.
- Submit success reloads queue and proves no stale in-flight binding remains.
- Enqueue accepts a second topic task such as `wave1-deepen-<topic>-v2` when `payload.topic_slug` is valid.

## Change 2: `simple-gate-quality-loop`

Covers:

- `BUG-048` — no legal degraded advance path.
- `BUG-047` — `stop:no` gate fatigue surfaces to user.
- `BUG-049` — Agent skips Wave1/Wave2/final boundary when stuck.
- `BUG-050` — retired content heuristic false-positive blocks gate.
- `BUG-051` — manual ledger edits trigger cascading distrust.
- `BUG-053` — gate provenance chain reports symptoms as root failures.

Reasoning:

- This is the quality-control layer. The gate exists to help the MD Controller produce quality; if the gate itself is complex, noisy, and false-positive prone, it becomes the quality risk.
- Apply KISS: blocking gate checks must be deterministic, low false-positive, independently explainable, and repairable. Guess-based content heuristics are removed from the quality loop instead of being preserved as diagnostics.

Key behavior:

- Add a legal degraded handoff route for repeated gate failure after required deterministic preconditions are satisfied.
- Degraded handoff must write a trace-visible witness, for example a gate attempt with `passed: true`, `degraded: true`, `degraded_reason`, `degraded_rules`, and normal `next`.
- Retire the historical content heuristic patch from Wave0/Wave1 gates; do not keep it as diagnostic/advice-only output.
- Gate feedback must identify root causes before symptoms and must not produce long, flat, equally weighted advice lists.
- Gate advice must never tell the Agent to hand-edit `rb_status.json` or `rb_output_declarations.jsonl`.
- Existing premature-final/status-drift audit from the archived change remains the protection for `BUG-049`; this change only keeps it covered in the degraded-flow scenarios.

Tests:

- A realistic repeated gate failure can legally degrade and enter the next phase.
- Degraded pass is distinguishable from clean pass in trace/inspect output.
- `stop:no` fatigue path does not surface to user and does not write final output.
- Retired content heuristics are absent from the active gate loop.
- Manual ledger drift produces "do not hand-edit; restore/re-submit through valid path" advice.
- Gate output groups root cause vs symptom and keeps advice short.

## Change 3: `restore-wave-depth-contracts`

Covers:

- `BUG-054` — Wave1 sub-agents summarize Wave0 instead of deepening.
- `BUG-055` — Wave2 skips cross-topic synthesis work.
- `BUG-058` — Wave1 cache trails are too thin for claimed sources.

Depends on:

- Change 1 for supplementary task support and reliable queue state.
- Change 2 so Wave1/Wave2 are not forced through noisy/false gate failures.

Reasoning:

- These are research-method bugs, not runtime/gate bugs. They should be fixed after the system can legally continue, repair, and diagnose.
- Wave1/Wave2 depth should not be solved by making gates smarter and more complicated; instead, phase instructions and artifacts should make the Agent do the real work.

Key behavior:

- Wave1 must require new topic-specific evidence, mechanism analysis, trend/difficulty/limitation analysis, and profile-driven counterexample/cross-verification when enabled.
- Phase Agent must review Wave1 work-unit output before accepting it; shallow output triggers supplementary tasks, not force-advance.
- Every Wave1 claimed source must have a matching cache trail or explicit degraded capture.
- Wave2 must complete scan matrix, finding confidence triage, gap analysis, and emergent search decision before writing final synthesis.
- Pure Wave2 synthesis path is allowed only after the scan matrix shows no unresolved evidence gap.

Tests:

- Shallow Wave1 output with too few new sources fails.
- Wave1 evidence-summary URLs without cache trails fail submit/preflight.
- Wave1 supplementary task loop succeeds using the Change 1 queue behavior.
- Wave2 synthesis without scan matrix/confidence triage fails.
- Wave2 uncertain findings trigger targeted delegated search.
- Happy-path run reaches HITL2 with non-shallow Wave1/Wave2 artifacts.

## Change 4: `harden-run-entry-and-agent-discipline`

Covers:

- `BUG-045` — built-in `deep-research` skill overrides `DPT_FRAMEWORK`.
- `BUG-046` — Wave0 source intake runs serially despite independent tasks.
- `BUG-052` — Agent defaults to Python in a pure Node.js repo.

Depends on:

- Change 1 before enabling parallel claim behavior.

Reasoning:

- These are operator/session discipline and throughput bugs. They matter before a formal run, but they should not pollute the runtime/gate/depth changes.
- Keep this change mostly guidance and invocation behavior, except for parallel claim tests where queue lifecycle correctness matters.

Key behavior:

- Root-level and framework entry guidance must explicitly route research intent to `DPT_FRAMEWORK` and suppress built-in deep-research shortcuts.
- Project guidance must prohibit Python for repo data manipulation; use Node.js ESM and existing dependencies.
- Wave0 and independent Wave1 queue work may be claimed in batches, bounded by existing queue limits/profile settings.
- Parallelism must not be introduced for cross-topic Wave2 synthesis itself.

Tests:

- Docs/guidance contain explicit deep-research suppression.
- Static guidance check finds no Python recommendation for project operations.
- Batch claim produces multiple independent in-flight work units.
- Parallel Wave0 submit drains cleanly with no stale queue state.
- Wave2 synthesis remains phase-level/cross-topic, not blindly parallelized.

## Assumptions

- The archived `harden-autonomous-research-return-map` change already covers manual status drift audit, premature final diagnostics, and silent surfacing observability.
- `BUG-049` is treated as a regression scenario under degraded handoff, not as a fresh standalone redesign.
- `BUG-056` is intentionally split: minimal queue identity fix in Change 1, iterative deepening usage in Change 3.
- Gate KISS is a governing principle for Change 2: JS gates should be simple, deterministic quality checkpoints that assist the MD Controller, not complex controllers that require their own quality-control loop.

## Completion Notes (2026-07-08)

Changes 1-3 delivered, each archived or applied:

- **Change 1** `stabilize-runtime-position-and-queue` → archived, framework v0.6. Resolved BUG-044, BUG-056, BUG-057.
- **Change 2** `simple-gate-quality-loop` → archived, framework v0.7. Resolved BUG-047, BUG-048, BUG-049, BUG-050, BUG-051, BUG-053.
- **Change 3** `restore-wave-depth-contracts` → applied (pending archive), framework v0.8. Resolved BUG-054, BUG-055, BUG-058.

Change 4 (`harden-run-entry-and-agent-discipline`, covering BUG-045, BUG-046, BUG-052) remains as a standalone future change — the three remaining bugs are queued in `_backlog/bugs/`.
