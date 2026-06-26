---
title: "Queue Agentic Flow"
role: "queue-driven execution loop"
scope: "receipt preflight, slot execution, verification, writeback, refill, promotion, projection, and repair"
template_version: "<TEMPLATE_VERSION>"
reads:
  - "specs/CONSTANTS.md"
  - "specs/CHARTER.md"
  - "specs/QUEUE_CONTRACT.md"
  - "specs/GATES.md"
  - "flows/source-intake-flow.md"
  - "flows/reference-artifact-backfill.md"
writes:
  - "<STATUS_PATH>"
  - "<QUEUE_PATH>"
  - "<TRACE_PATH>"
---

# Queue Agentic Flow

This file is the action flow for Queue-driven execution. The Queue object contract lives in `specs/QUEUE_CONTRACT.md`; runtime Queue state lives in `QUEUE_PATH`.

## Fixed Loop

Every autonomous execution batch follows this loop:

```text
reload control files
-> checkpoint receipt preflight
-> select slot_1_current
-> execute declared action
-> write declared files
-> sync STATUS / QUEUE
-> verify result and completion receipt
-> refill/promote Queue
-> sync native projection if available
-> run Pre-Response Gate
```

The loop is file-system first. Chat memory never proves that a prior work unit completed.

## Reload

Before any gate audit, wave transition, HITL2 decision, readiness preflight, final delivery, source-intake fan-in, or Queue promotion, reload:

- `PROFILE_PATH`
- `PLAN_PATH`
- `STATUS_PATH`
- `QUEUE_PATH`
- `TRACE_PATH`

Use `PLAN_PATH` for targets and configured gates. Use `STATUS_PATH` for current run state, gaps, counters, and audit rows. Use `QUEUE_PATH` for executable work. Use `TRACE_PATH` for diagnostic transitions. Do not use chat context as state.

## Receipt Preflight

Before executing `slot_1_current`, inspect its `required_receipts`.

If all required receipts exist, execute the task.

If any receipt is missing:

1. Do not execute the current work unit.
2. Record the missing receipt in `STATUS_PATH` or `QUEUE_PATH`.
3. Insert or promote a concrete repair work unit.
4. Keep the blocked work visible in the active window or Refill Pool.
5. Resume the blocked work only after the receipt exists.

Critical Checkpoint Receipts from `specs/QUEUE_CONTRACT.md` must be checked at phase and steering boundaries. They are intentionally heavier than ordinary task receipts.

## Boundary Hook Execution Protocol

Boundary Hooks are foreground Queue-visible work. They are called by `flows/execution-flow.md -> Boundary Hook Call Map` and executed by this flow. A hook is not a detached event handler, not a pending-slot side effect, and not a native todo/task/plan action outside `QUEUE_PATH`.

When a boundary hook is reached, render or promote a Queue work unit whose `work_id` names the hook id, whose `producer_rule` is `boundary_hook`, and whose `required_receipts`, `done_condition`, `verification`, `writes_to`, `status_sync`, `completion_receipt`, and `failure_route` cite the matching Critical Checkpoint Receipt.

Each hook uses this sequence:

1. Reload `PROFILE_PATH`, `PLAN_PATH`, `STATUS_PATH`, `QUEUE_PATH`, and `TRACE_PATH`.
2. Inspect the hook's boundary receipts from `specs/QUEUE_CONTRACT.md -> Critical Checkpoint Receipts`.
3. Verify the relevant artifact, reference, STATUS, TRACE, and QUEUE surfaces from disk.
4. Write or sync the declared files and fields needed for the hook receipt.
5. Verify the completion receipt after writeback.
6. Promote or refill Queue only after the receipt passes, or after concrete repair work is inserted.

If a receipt is missing, an artifact is stale, a TRACE checkpoint is absent, or a declared writeback is missing, do not continue into the next lifecycle edge. Record the gap and create concrete repair work in Queue. Pending slots, Refill Pool candidates, and native projections may name upcoming hook work, but they must not execute the hook before it reaches `slot_1_current`.

For boundary hooks, a TRACE checkpoint receipt means a distinct, non-correction trace entry with the exact `gate_transition` for that lifecycle edge. Do not accept a final correction, a multi-gate summary, or a "missed checkpoints" note as proof that Wave 0, Wave 1, or Wave 2 transition checkpoints happened. If the exact checkpoint is absent, keep the boundary closed and queue trace/status/queue repair or re-earned gate-audit work.

## Boundary Hook Catalog

| hook_id | call point | receipt authority | required outcome |
| --- | --- | --- | --- |
| `hook_setup_to_wave0_start` | after `setup_ready`, before Wave 0 source intake or decomposition continuation | `Critical Checkpoint Receipts -> setup_ready -> Wave 0 start` | framework snapshot, root control files, command entrypoint, directory bindings, seed intake state, and any setup/decomposition repair queue are verified before Wave 0 work starts |
| `hook_wave0_closeout_to_wave1_start` | after Wave 0 closeout, before Wave 1 starts | `Critical Checkpoint Receipts -> Wave 0 closeout -> Wave 1 start` | shared reference inventory, `00-shared-*` provenance, topic-start rows, unresolved intake gaps, TRACE checkpoint whose `gate_transition` value is `wave0_complete`, and non-chat Wave 1 continuation are present |
| `hook_wave1_topic_fanin_steering` | after a topic-affecting accepted reference lands or topic reference count changes, before next Wave 1 source-intake, cross-topic handoff, or topic deepening | `Critical Checkpoint Receipts -> Wave 1 topic fan-in -> next topic search/deepening` | accepted topic inventory and seed backfill are current or queue-deferred; artifact steering resolves through `artifact_steering_current`, `artifact_refresh_not_due`, or foreground `queued_artifact_repair`; missing initial artifacts must be produced immediately or promoted into `slot_1_current`/`slot_2_next`, not left only in Refill Pool; question-list records the four-section exploration ledger and exploration/exploitation consequence |
| `hook_wave1_closeout_to_wave2_start` | after Wave 1 closeout, before Wave 2 synthesis starts | `Critical Checkpoint Receipts -> Wave 1 closeout -> Wave 2 start` | per-topic floors or structured exceptions pass, topic target coverage and Wave 2 synthesis routes are accounted for, seed backfill is current or explicitly deferred, artifacts are fresh at the Wave 1 gate audit, question reconciliation is complete, TRACE checkpoint whose `gate_transition` value is `wave1_complete`, and non-chat Wave 2 continuation is queued or started |
| `hook_wave2_closeout_to_hitl2` | after Wave 2 closeout, before HITL2/readiness path | `Critical Checkpoint Receipts -> Wave 2 closeout -> HITL2/readiness` | cross-topic synthesis, conclusion matrix, synthesis must-answer coverage, conflict/tension handling, TRACE checkpoint whose `gate_transition` value is `wave2_complete`, human-decision brief when needed, and the `hitl2_pending_or_recorded_ready` branch receipt are present before either pending-user HITL2 stop or recorded Readiness continuation |
| `hook_readiness_closeout_to_final_delivery` | after readiness closeout, before final delivery | `Critical Checkpoint Receipts -> Readiness closeout -> final delivery` | runtime qualification PASS, local retrieval route, completed STATUS, `current_gate=readiness_passed`, `next_gate=none`, TRACE checkpoint whose `gate_transition` value is `readiness_passed`, closed Queue, and final delivery stop authorization are synced |

## Boundary Hook Command Matrix

This matrix is the strict command/action mapping for Boundary Hooks. A hook work unit must not improvise a different command route unless it records a concrete blocker or a newer framework migration explicitly changes this table.

Run read-only CLI gates with:

```bash
node <RUN_DIR>/_framework/cli_tools/check_framework.mjs --gate <gate> <RUN_DIR>
```

Read-only CLI gates diagnose and verify. They do not write repairs, promote evidence, mark gates passed, or authorize final delivery by themselves. Write-capable work happens through the foreground Queue work unit and the command playbook or flow named below.

| hook_id | foreground Queue action | command/playbook or flow to open | read-only CLI gates to run | failure route |
| --- | --- | --- | --- | --- |
| `hook_setup_to_wave0_start` | run setup preflight, repair framework/navigation/seed-intake surfaces, and block source intake until setup is ready or concrete setup/intake repair is queued | `command_playbooks/check-seed-intake.md`; `command_playbooks/check-surfaces.md`; `command_playbooks/decompose-seed-topics.md` for setup-time decomposition/intake repair; `command_playbooks/repair-framework-snapshot.md` only for allowed same-version missing-file repair | `check-gate-setup-ready`; `check-seed-intake`; `check-surfaces`; `check-instantiation` if root bundle or `_framework` structure is in doubt | queue `setup_repair`, decomposition, or intake repair; do not schedule Wave 0 source intake or Wave 1 deepening |
| `hook_wave0_closeout_to_wave1_start` | close Wave 0 only after shared reference inventory, topic-start readiness, transition TRACE, and non-chat Wave 1 continuation are present | `command_playbooks/check-runtime.md`; `command_playbooks/check-queue-receipts.md`; `flows/reference-artifact-backfill.md` for reference/index/backfill write work | `check-gate-wave0-complete`; `check-queue-receipts`; `check-runtime` when transition drift or local sync is in doubt | queue same-wave Wave 0 gate repair; keep Wave 1 blocked until receipts pass |
| `hook_wave1_topic_fanin_steering` | after topic reference count changes, complete fan-in steering before next Wave 1 source-intake, cross-topic handoff, or topic deepening: promote reviewed references, sync inventory and seed backfill, produce initial artifacts, refresh artifacts when thresholded, or record the not-due artifact branch | `command_playbooks/check-queue-receipts.md`; `command_playbooks/check-surfaces.md`; `command_playbooks/repair-wave1-artifact-steering.md` for foreground artifact repair; `flows/source-intake-flow.md` for source-intake fan-in boundaries; `flows/reference-artifact-backfill.md` for seed/artifact steering rules | `check-queue-receipts`; `check-surfaces`; `check-runtime` only when broader active-run drift is suspected | queue `source_intake_fan_in`, `topic_ref_count_changed`, seed-backfill, or artifact repair; missing initial artifact repair must be `slot_1_current` or `slot_2_next`; do not run next source-intake/deepening |
| `hook_wave1_closeout_to_wave2_start` | close Wave 1 only after per-topic floors or structured exceptions, topic target coverage, Wave 2 synthesis routes, seed backfill, artifact freshness, question reconciliation, transition TRACE, and non-chat Wave 2 continuation are present | `command_playbooks/check-runtime.md`; `command_playbooks/check-queue-receipts.md`; `command_playbooks/repair-wave1-artifact-steering.md` for final Wave 1 artifact/backfill repair; `flows/reference-artifact-backfill.md` for artifact/backfill rules | `check-gate-wave1-complete`; `check-queue-receipts`; `check-runtime` | queue same-wave Wave 1 evidence/backfill/artifact/question/target repair; keep Wave 2 blocked until receipts pass |
| `hook_wave2_closeout_to_hitl2` | close Wave 2 only after synthesis artifact, conclusion matrix, synthesis must-answer coverage, conflict handling, human-decision brief when needed, HITL2 sync, and `hitl2_pending_or_recorded_ready` branch receipt are present | `command_playbooks/check-runtime.md`; `command_playbooks/check-queue-receipts.md` | `check-gate-wave2-complete`; `check-queue-receipts`; `check-runtime` | queue Wave 2 synthesis/matrix/conflict/HITL2-brief repair; do not activate a user-facing HITL2 stop or Readiness continuation before the matching branch receipt passes |
| `hook_readiness_closeout_to_final_delivery` | close Readiness and authorize final delivery only after runtime qualification, retrieval route, completed STATUS, closed Queue, and final-delivery stop authorization are synced | `command_playbooks/check-runtime.md`; `command_playbooks/check-queue-receipts.md`; `command_playbooks/create-final.md` only after readiness passes | `check-gate-readiness-passed`; `check-queue-receipts`; `check-runtime` | queue readiness/runtime/queue-closure repair; do not create final output or report final delivery |

## Slot Execution

Sequential execution means only `slot_1_current` executes.

The following do not execute hidden work:

- `slot_2_next`
- `slot_3_pending`
- `slot_4_pending`
- `slot_5_tail`
- Refill Pool candidates
- native todo/task/plan projections
- trigger lineage fields
- producer-rule promotion conditions

Source-intake runners are foreground queue-visible work. A runner may write only the cache paths declared in its active work unit. Main-agent fan-in owns promotion to references, status inventories, seed backfill, artifacts, and gate consequences.

## Verification And Writeback

After execution and writeback, verify the declared result before closing `slot_1_current`.

Completion requires:

- `done_condition` satisfied
- `verification` performed
- declared `writes_to` completed, or read-only status explained
- declared `status_sync` completed, or read-only status explained
- `completion_receipt` exists

If any item fails, keep or reopen the relevant gate, record the concrete gap, and queue repair work. Do not promote a task just because a partial write happened.

## Completion Receipt Check

The completion receipt is the next task's durable proof that the current task happened.

Examples:

- reference file exists under `REFERENCE_DIR`
- `_INDEX.md` contains the new reference entry
- accepted inventory row is updated
- affected topic seed cites local reference paths
- `evidence-summary.md` and `question-list.md` exist after the topic artifact trigger fires
- artifact steering is current, refresh-not-due under the delta threshold, or backed by queued artifact repair
- source-intake cache files and `_cache/promote-log.md` exist
- wave transition TRACE checkpoint exists with the exact single `gate_transition` value for that boundary
- Queue closed with `closure_reason=readiness_passed`

Artifact steering surfaces are completion receipts. They are not optional cleanup after Wave 1. For initial missing topic artifacts, a Refill Pool candidate alone is not a completion receipt because it can be bypassed by already-filled pending source-intake work; the production task must be the current or next foreground Queue task unless the artifacts already exist.

## Refill And Promotion

Before closing `slot_1_current`, refill the active window.

Normal promotion:

1. Move `slot_2_next` to `slot_1_current`.
2. Move `slot_3_pending` to `slot_2_next`.
3. Move `slot_4_pending` to `slot_3_pending`.
4. Move `slot_5_tail` to `slot_4_pending`.
5. Fill `slot_5_tail` from the highest-priority ready Refill Pool candidate.

Queue-thin refill promotes ready candidates until the five-slot window is executable or a real blocker is recorded.

Urgent preemption may insert a repair work unit into the earliest valid pending slot. Do not interrupt `slot_1_current` unless continuing it would write incorrect state, cross a gate illegally, or waste work against a known blocker. When a full window is preempted, move the displaced `slot_5_tail` to the top of Refill Pool with `preempted_from_slot=slot_5_tail` and `restore_priority=next_tail_opening`.

## Failure Routes

Failures are repair-producing events, not chat events.

- Missing required receipt: queue receipt repair.
- Verification failure: queue the exact repair for the failed condition.
- Missing writeback: queue writeback repair and keep the gate open.
- Failed gate audit: refill same-wave work that names the failed audit row.
- Gate reopen: restore the last still-valid gate, record reopen fields, and refill affected-wave work.
- Topic ref count changed: queue artifact steering production or refresh when thresholds fire; initial production preempts pending evidence/source work into `slot_1_current` or `slot_2_next`, while thresholded refresh may be queued until the next same-topic decision or gate boundary.
- Source-intake failure: move to fan-in closeout or fallback intake route; do not count cache material.
- Topology drift: record STATUS candidate, queue topology triage, and mutate PLAN only after disposition.
- HITL2 blocked state: prepare local brief and projections before asking the user.

## Source Search Route

The default source search route is `native_search`.

Queue work may activate Exa only when:

- the user explicitly requested Exa search, or
- the work unit states the Exa-specific capability required.

Fail-soft Exa output must write cache notes and may route the same intake request through `native_search`. Exa does not become the silent default.

## Pre-Response Gate

After refill/promotion and native projection sync, run the Pre-Response Gate.

User-visible output is allowed only when Queue and STATUS show:

- `final_delivery`
- `decision_blocker`
- `empty_queue_after_refill`

Otherwise the next assistant action is another tool, file, search, reference capture, artifact update, gate audit, Queue promotion, Queue refill, or verification batch.
