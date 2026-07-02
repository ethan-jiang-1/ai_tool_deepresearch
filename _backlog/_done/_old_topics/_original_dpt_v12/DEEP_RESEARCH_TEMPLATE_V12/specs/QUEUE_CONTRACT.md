---
title: "Queue Contract"
role: "execution queue object contract"
scope: "queue authority boundary, work-unit schema, producer rules, receipts, and projection constraints"
template_version: "<TEMPLATE_VERSION>"
reads:
  - "specs/CONSTANTS.md"
  - "specs/CHARTER.md"
  - "specs/GATES.md"
writes: []
---

# Queue Contract

This file is the Source of Record for the Queue object contract. It defines what a Queue work unit is, which information Queue owns, which information Queue may only cite, and which receipts must exist before execution may advance.

It does not define the step-by-step execution loop. The action flow lives in `flows/queue-agentic-flow.md`. Runtime data lives in `QUEUE_PATH`, rendered from `output_templates/QUEUE.md`.

## Queue Authority Boundary

`QUEUE_PATH` owns:

- executable work units
- the five-slot sequential rolling window
- Refill Pool candidates
- user-visible stop authorization fields
- native todo/task/plan projection state
- repair work created after failed verification, failed receipt checks, failed gate audits, topology drift, artifact staleness, or source-intake closeout

`QUEUE_PATH` must not own or invent:

- PLAN targets, topic identity, configured floors, or profile configuration
- STATUS gaps, gate audit truth, counters, inventories, blockers, or run state
- REFERENCE evidence bodies or counted source authority
- ARTIFACT synthesis truth
- TRACE diagnostic history

Queue work must cite those authorities through lineage and writeback fields. If the needed upstream state is absent, the correct action is repair/refill work, not silent advancement.

## Queue Work Unit Contract

Every active slot work unit and every Refill Pool candidate must be executable, auditable, and repairable.

Required fields for an active slot:

- `work_id`: stable local id for the current Queue unit
- `action`: the concrete tool/file/search/check/refill/promotion/action to execute
- `producer_rule`: the rule or event that created this work unit
- one lineage field: `source_gap`, `status_gap`, `gate_gap`, `plan_target`, or `trigger`
- `why_this_matters`: why this work changes run quality or prevents drift
- `impact_scope`: files, topics, gates, artifacts, references, or stop states affected by the work
- `required_receipts`: files/fields/states that must already exist before the work starts, or `not_applicable`
- `done_condition`: what must be true when the work is complete
- `verification`: how the agent or CLI can check that the work really completed
- `writes_to`: concrete local write targets or `not_applicable_read_only_check` with an explanation in `verification`
- `status_sync`: STATUS/QUEUE fields that must be synced, or `not_applicable_read_only_check`
- `completion_receipt`: the durable receipt this work leaves for later work or gates
- `failure_route`: where to record failure and what repair work to queue

Required fields for a Refill Pool candidate:

- `work_id`
- `candidate`
- `priority_class`
- `producer_rule`
- one lineage field: `source_gap`, `status_gap`, `gate_gap`, `plan_target`, or `trigger`
- `why_this_matters`
- `impact_scope`
- `required_receipts`
- `prerequisite`
- `promotion_trigger`
- `done_condition`
- `verification`
- `writes_to`
- `status_sync`
- `completion_receipt`
- `failure_route`
- `preempted_from_slot`
- `restore_priority`

All candidates record `preempted_from_slot` and `restore_priority` so refill sorting has one data shape. Non-preempted candidates set `preempted_from_slot=not_applicable` and `restore_priority=normal`. Preempted candidates record the displaced slot and use `restore_priority=next_tail_opening` unless a stricter restore rule is explicitly recorded.

## Legal Producer Rules

Queue work may be created only by a named producer rule:

- `initial_window_render`
- `setup_repair`
- `slot_completion_refill`
- `queue_thin_refill`
- `urgent_preemption`
- `failed_gate_audit`
- `gate_reopen`
- `topology_delta`
- `reference_landed`
- `topic_ref_count_changed`
- `source_intake_fan_in`
- `hitl2_readiness_path`
- `blocker_path`
- `boundary_hook`

Each produced work unit must cite the producer rule and the concrete lineage source. A Queue item that appears without a producer rule is not valid Deep Research queue work.

## Illegal Queue Work

The following are not valid Queue work units:

- `report progress`
- `progress recap`
- `summarize and wait`
- `ask user to continue`
- `continue or adjust direction?`
- `await user review`
- `tell user next task`
- generic `continue research`
- generic `advance wave`
- generic `update status`
- `/goal` or another slash command as framework-controlled work

If the next task is known, execute it. Do not queue a chat message about knowing it.

## Receipt Protocol

A receipt is durable local evidence that a work unit or phase boundary really happened. Receipts must be visible in files, fields, indexes, trace entries, queue state, or concrete paths. Chat memory is not a receipt.

Use receipt fields as follows:

- `required_receipts`: what must already exist before the work may start
- `completion_receipt`: what this work must leave behind before it may close

Receipt values may cite:

- `file:<run-local path>`
- `dir:<run-local path>`
- `status:<field><operator><value>`, where `<operator>` is `=`, `>`, or `>=`
- `queue:<field><operator><value>`, where `<operator>` is `=`, `>`, or `>=`
- `trace:<entry label or required text>`
- `index:<path> contains <text>`
- `artifact_steering_current:<topic-id>/<topic-slug>`
- `artifact_refresh_not_due:<topic-id>/<topic-slug>`
- `queued_artifact_repair:<topic-id>/<topic-slug>`
- `direct_reference_exception`
- `active_window_contract_complete`
- `topology_delta_disposed`
- `hitl2_pending_or_recorded_ready`

Machine receipt fields are fail-closed: unknown receipt prefixes are invalid. Split multiple required receipts with semicolons. A single semicolon-delimited receipt part may use whole-receipt alternatives with `A or B`, but each side of the `or` must itself be a valid machine receipt such as `file:<path>`, `status:<field>=<value>`, `status:derived_topic_count>=1`, or a named branch receipt. Status and queue receipt operators are limited to exact match `=`, numeric greater-than `>`, and numeric greater-or-equal `>=`; numeric comparisons require a parseable integer field value in the checked file. When a status or queue field may accept several exact values, express the alternatives inside the value with `_or_`, for example `status:source_intake_status=fan_in_ready_or_failed_or_suspended`. Do not use `_or_` for numeric comparison branches. Do not put prose-only requirements in `required_receipts` or `completion_receipt`; keep those in `done_condition`, `verification`, or `failure_route`.

Named branch receipts carry stricter semantics than a generic field/value check:

- `artifact_steering_current`: STATUS records both topic artifacts at the current accepted reference count and both artifact files exist.
- `artifact_refresh_not_due`: topic artifacts already exist, both produced counters are nonzero, and the accepted-reference delta has not reached the refresh threshold (`accepted_topic_ref_count - min(produced_at_ref_count) < 2`).
- `queued_artifact_repair`: concrete artifact work exists for the topic. If either initial topic artifact is still missing (`produced_at_ref_count=0` or the file is absent), the production work must be in the foreground active window at `slot_1_current` or `slot_2_next`; a Refill Pool candidate alone is not a valid receipt. For already-produced artifacts that are stale by the refresh threshold, visible refresh repair may live in the active window or Refill Pool until a gate/audit boundary requires freshness.
- `direct_reference_exception`: the current Queue work is a direct landing task for already-known local/user-provided material and explicitly says all three: no retrieval, no search, and no fetch.
- `active_window_contract_complete`: every non-closed active slot in the five-slot rolling window satisfies the active Queue Work Unit Contract, or the queue is legitimately closed.
- `topology_delta_disposed`: STATUS records meaningful pending topology candidates and each candidate has exactly one final disposition from `merge_existing / formalize_new_topic / suspend / archive / redirect`; `pending` is not a completion disposition.
- `hitl2_pending_or_recorded_ready`: the HITL2 brief exists and the run is in one of two valid branches: pending-user decision blocker state, or recorded decision state with the next continuation authorized by that recorded decision.

When a required receipt is missing, the current work must not run. The agent must record the missing receipt, insert or promote concrete repair work, and resume the blocked work only after the receipt exists.

## Critical Checkpoint Receipts

Critical Checkpoint Receipts apply at phase and steering boundaries. They prevent the agent from running into the next stage while missing the files that should steer that stage.

TRACE checkpoint receipts are specific, not generic. A phase-boundary receipt that says a Wave or Readiness transition TRACE checkpoint exists means a distinct non-correction `TRACE_PATH` entry exists with the exact single `gate_transition` field value for that boundary:

- Wave 0 closeout: `wave0_complete`
- Wave 1 closeout: `wave1_complete`
- Wave 2 closeout: `wave2_complete`
- Readiness closeout: `readiness_passed`

The entry must also record `evidence_bundle`, `queue_consequence`, and `status_pointer_sync`; Wave 0/1/2 entries must record concrete `continuation_action_started`. A `gate_correction`, `correction`, or "missed checkpoint" entry may diagnose the absence of a checkpoint, but it is not a receipt for the missing transition and cannot authorize crossing the boundary.

### setup_ready -> Wave 0 start

Required receipts:

- run-local `_framework` exists and is version/snapshot aligned
- root control files exist
- Runtime Command Entrypoint points to run-local `_framework`
- `TOPIC_ROOT`, `REFERENCE_DIR`, and `ARTIFACT_DIR` align with `RUN_DIR/seed_topics`
- seed intake is `yes`, or concrete `gap_queue_backed` repair work exists
- zero-topic or intake-gap runs stay on decomposition/intake repair, not evidence retrieval

### Wave 0 closeout -> Wave 1 start

Required receipts:

- shared reference inventory is updated
- accepted shared references use `00-shared-*` names
- topic-start rows pass
- unresolved intake gaps are repaired or still block Wave 1
- Wave 0 transition TRACE checkpoint exists with exact `gate_transition` field value `wave0_complete`
- non-chat Wave 1 continuation is queued or started

### Wave 1 topic fan-in -> next topic search/deepening

Required receipts after a topic-affecting reference lands:

- accepted topic reference inventory is updated
- affected topic seed backfill is current or explicitly queue-deferred
- if `topic_unique_ref_count >= 1`, `evidence-summary.md` exists or initial artifact production is the current or next foreground Queue task; Refill Pool-only production is not enough
- if `topic_unique_ref_count >= 1`, `question-list.md` exists or initial artifact production is the current or next foreground Queue task; Refill Pool-only production is not enough
- artifact steering resolves through one of the valid fan-in branches: `artifact_steering_current`, `artifact_refresh_not_due`, or `queued_artifact_repair`
- question-list records the four-section exploration ledger and exploration/exploitation consequence

Artifact steering surfaces are receipts, not optional cleanup.

### Wave 1 closeout -> Wave 2 start

Required receipts:

- per-topic floors pass or structured stop/scarcity exceptions exist
- topic target coverage is accounted for: Wave 1 topic-answer entries are answered, downgraded, blocked, or queue-backed, and Wave 2 synthesis entries have a concrete synthesis route
- seed backfill is current or queue-deferred
- artifact freshness is current at the Wave 1 gate audit; queued artifact refresh is only a repair state before Wave 2 work, not a Wave 2 entry receipt
- question reconciliation is complete
- Wave 1 transition TRACE checkpoint exists with exact `gate_transition` field value `wave1_complete`
- non-chat Wave 2 continuation is queued or started

### Wave 2 closeout -> HITL2/readiness

Required receipts:

- `cross-topic-synthesis.md` exists
- Cross-Topic Conclusion Matrix is populated where applicable
- synthesis-phase must-answer entries are covered or explicitly not required
- conflict/tension handling is recorded
- Wave 2 transition TRACE checkpoint exists with exact `gate_transition` field value `wave2_complete`
- human-decision brief is prepared when needed, and the `hitl2_pending_or_recorded_ready` branch receipt passes before either a user-facing HITL2 stop or a recorded Readiness continuation
- HITL2 pending-user state is activated only after PROFILE/STATUS/QUEUE sync; Readiness continuation requires the recorded HITL2 state, `user_decision=proceed_to_readiness`, concrete final report view, and deterministic `final_output_dir`

### Readiness closeout -> final delivery

Required receipts:

- runtime qualification PASS is recorded by the execution agent
- 30-second local retrieval route is recorded
- STATUS state is completed
- `current_gate=readiness_passed`
- `next_gate=none`
- Readiness closeout TRACE checkpoint exists with exact `gate_transition` field value `readiness_passed`
- Queue is closed with `closure_reason=readiness_passed`
- final-delivery stop authorization is synced

## Search Provider Boundary

The default search route is `native_search`. Queue work may name Exa only when:

- the user explicitly selected Exa search, or
- the work unit explains the Exa-specific capability required for the intake.

Fail-soft Exa output may route back to `native_search`. Exa may not silently replace the default route.

## Projection Boundary

Native todo/task/plan surfaces are projections of `QUEUE_PATH`. They may mirror only the active executable window. They may not introduce work, authorize stopping, mark gates passed, or override Queue promotion/refill.

When projection drift is found, repair Queue or regenerate the projection from Queue. Do not make the native task surface the Source of Record.
