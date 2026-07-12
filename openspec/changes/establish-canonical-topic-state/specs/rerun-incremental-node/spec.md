> req: REI-006

## MODIFIED Requirements

### Requirement: Rerun node analyzes rationale vs seed_topics and produces topic adjustment plan

`phase-rerun.md` body SHALL instruct the Agent to:

1. Read `rb_profile.yaml#/human_decision_checkpoints/hitl2/rationale`, canonical `rb_plan.md#/topic_registry`, current `seed_topics/`, and `operate-topic-state inspect`.
2. Produce a semantic adjustment plan that distinguishes topics to keep, existing topics whose intent needs refinement, new topics to add, and requested remove/rename/renumber operations that require the deferred C3B capability.
3. For add/refine only, prepare explicit topic-state apply JSON:
   - `add_topic` contains title, descriptive slug stem, non-empty must-answer set, scope role and dependency UIDs;
   - `update_intent` identifies immutable topic UID and may change title, must-answer set, scope role and dependency UIDs, but not id/slug.
4. Run topic-state apply before queueing new work. Consume structured blockers and rerun the same operation after repair.
5. For each successfully added/refined topic, write or update the UID-bound seed `## 本轮重跑方向` section with the existing Agent-facing content: `action`, new search dimensions, adjusted depth, search guardrails and rationale excerpt. These labels remain guidance content, not a second machine state.
6. Increment `rb_profile.yaml#/human_decision_checkpoints/hitl2/rerun_count` through the existing profile path. If registry length changed, run the existing `apply-research-style.mjs` owner before the rerun-ready gate.
7. Preserve the incoming HITL2→rerun status window until `check-gate-rerun-ready.mjs` passes. After pass, consume `check.next` through `enter-phase`, then run source-gate `advance-status --to rerun_ready`.

Requested remove/rename/renumber SHALL NOT fall back to direct multi-file edits, deletion or a parallel addendum namespace. Existing artifacts/references SHALL remain untouched. Direction guidance for successfully added/refined topics MAY continue in their UID-bound seed files after canonical apply.

If update-intent is blocked by queued or claimed work, the Agent SHALL use the existing queue/work-unit inspect, submit, repair or terminalization path and rerun topic-state apply. This mechanical blocker SHALL NOT be pushed to the user unless a new semantic conflict remains after the direct owner is resolved.

Topic-state apply in rerun SHALL be authorized only when `rb_status.json#/current_node` is `phases/phase-rerun.md`, the latest non-superseded HITL2 gate handoff has a route-bound load witness for that node, and the incoming `current_gate: hitl2_recorded` / `next_gate: rerun_ready` window remains intact. A caller-declared rerun context or HITL2 rationale alone SHALL NOT authorize mutation. `migrate_legacy` SHALL be unavailable outside this sanctioned rerun context.

#### Scenario: Rerun preserves incoming HITL2 status window before gate pass
- **WHEN** HITL2 has selected rerun and loaded `phase-rerun.md`
- **THEN** the Agent SHALL keep `current_gate: hitl2_recorded` and `next_gate: rerun_ready` while preparing/applying topic intent
- **AND** it SHALL NOT advance status before the rerun-ready gate passes

#### Scenario: Rerun status sync happens only after rerun-ready pass
- **WHEN** rerun-ready passes with `check.next: phases/phase-seed-topics.md`
- **THEN** the Agent SHALL enter that node first and then run `advance-status --to rerun_ready`

#### Scenario: Route-bound rerun entry authorizes topic apply
- **WHEN** HITL2 emitted the rerun target, `enter-phase` recorded the matching route-bound load witness, and the incoming rerun status window is current
- **THEN** rerun topic-state apply MAY migrate legacy state or add/refine canonical intent

#### Scenario: Missing or superseded rerun witness blocks apply
- **WHEN** current-node/context claims rerun but the matching HITL2→rerun witness is missing or superseded by a newer route decision
- **THEN** apply SHALL reject before workspace creation and point to the existing lifecycle route repair
- **AND** the Agent SHALL NOT ask the user to approve a mechanical bypass

#### Scenario: New rerun topic materializes before work
- **WHEN** the rationale requires a new topic
- **THEN** the Agent SHALL commit add-topic registry+seed intent before enqueueing Wave0/Wave1 work

#### Scenario: Existing topic intent update preserves layout
- **WHEN** the rationale refines an existing topic
- **THEN** update-intent SHALL preserve its UID/id/slug and existing artifacts

#### Scenario: First rerun increments count and writes guidance
- **WHEN** rerun_count is absent or 0 and topic-state preparation succeeds
- **THEN** the Agent SHALL write rerun_count 1 through the existing profile path
- **AND** affected UID-bound seeds SHALL contain updated rerun direction guidance

#### Scenario: Second rerun preserves existing loop protection
- **WHEN** rerun_count is 1 and another sanctioned rerun preparation succeeds
- **THEN** the Agent SHALL write rerun_count 2 and update affected direction guidance

#### Scenario: Existing artifacts remain preserved
- **WHEN** rerun add/refine preparation executes
- **THEN** existing `reference/` and `artifacts/` SHALL NOT be deleted or rewritten by topic-state operations

#### Scenario: Remove or layout mutation remains blocked
- **WHEN** the rationale requests remove, rename or renumber
- **THEN** the Agent SHALL report/retain the C3B missing-capability blocker
- **AND** SHALL NOT directly edit multiple runtime surfaces to simulate success
