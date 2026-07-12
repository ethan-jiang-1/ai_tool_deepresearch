> req: REI-002

## MODIFIED Requirements

### Requirement: Rerun node analyzes rationale vs seed_topics and produces topic adjustment plan

`phase-rerun.md` body SHALL instruct the Agent to:

1. Read `rb_profile.yaml#/human_decision_checkpoints/hitl2/rationale`, canonical `rb_plan.md#/topic_registry`, current `seed_topics/`, and `operate-topic-state inspect` including its copy-ready layout baseline.
2. Produce a semantic adjustment plan that distinguishes topics to keep, existing topics whose intent needs refinement, new topics to add, explicit current-layout rename/reorder/renumber, and requested remove operations.
3. Prepare exactly one explicit topic-state apply form:
   - add/refine uses `add_topic` and `update_intent` with existing C3A fields;
   - layout mutation uses one complete `mutate_layout` target with `expected_plan_sha256`, ordered retained UID/title/slug-stem entries and explicit remove UIDs;
   - migrate-legacy remains its own complete reconciliation and SHALL NOT mix with either form.
4. Run topic-state apply before queueing new work. Consume structured blockers and rerun the same operation after repair. Active queue/work-unit blockers are ordinary Agent-owned mechanical work.
5. For each successfully added/refined topic, write or update the UID-bound seed `## 本轮重跑方向` section with the existing Agent-facing content: `action`, new search dimensions, adjusted depth, search guardrails and rationale excerpt. These labels remain guidance content, not a second machine state. Layout-only mutation SHALL preserve existing seed body guidance while updating current seed metadata/path.
6. Increment `rb_profile.yaml#/human_decision_checkpoints/hitl2/rerun_count` through the existing profile path. If registry length changed through add or safe remove, run the existing `apply-research-style.mjs` owner before the rerun-ready gate.
7. Preserve the incoming accepted rerun status window until `check-gate-rerun-ready.mjs` passes. After pass, consume `check.next` through `enter-phase`, then run source-gate `advance-status --to rerun_ready`.

Rename/reorder/renumber SHALL use only canonical topic-state apply; it SHALL NOT fall back to direct multi-file edits. Historical artifact/reference/output paths SHALL remain untouched and continue to resolve through previous layout. Remove SHALL proceed only when Engine proves the UID has no dependency or historical work/content facts; otherwise the Agent SHALL report the single provenance-preserving boundary rather than delete history or invent retirement state.

If update-intent or mutate-layout is blocked by queued, delegated-in-flight or nonterminal work, the Agent SHALL use the existing queue/work-unit inspect, submit, repair or terminalization path and rerun topic-state apply. This mechanical blocker SHALL NOT be pushed to the user unless a new semantic conflict remains after the direct owner is resolved.

Topic-state apply in rerun SHALL be authorized only when `rb_status.json#/current_node` is `phases/phase-rerun.md`, the incoming `current_gate: hitl2_recorded` / `next_gate: rerun_ready` window remains intact, and one of two route-bound witness classes is valid and non-superseded:

- the existing HITL2 gate→rerun handoff plus load; or
- an accepted `post_final_reentry` event whose after-profile still matches current HITL2 semantics/hash, plus its route-bound rerun load and existing `advance-status` phase transition under `POF-003`.

The post-final witness SHALL not be added as a fake chain/gate outcome; it is an explicit exceptional entry into the same rerun node. A caller-declared rerun context, HITL2 rationale or human-directed prose alone SHALL NOT authorize mutation. `migrate_legacy` and `mutate_layout` SHALL be unavailable outside this sanctioned rerun context. The phase SHALL preserve existing loop protection and increment `rerun_count`; it SHALL NOT treat post-final origin as permission to reset or skip the count.

The exact event-bound after-profile requirement applies to the initial reentry/topic-state authorization window. After topic-state preparation succeeds, the existing rerun phase remains the sole owner of the sanctioned `rerun_count` increment from the event-bound `current_count` to `next_count`. That one-field exact change SHALL NOT be misclassified as forged C5 profile drift; every other profile field SHALL still match the event-bound after-profile, and the updated count SHALL remain subject to the same active rule digest and normal profile/gate validation.

#### Scenario: Rerun preserves incoming HITL2 status window before gate pass
- **WHEN** normal HITL2 or accepted post-final recovery has selected and loaded `phase-rerun.md`
- **THEN** the Agent SHALL keep `current_gate: hitl2_recorded` and `next_gate: rerun_ready` while preparing/applying topic intent or layout
- **AND** it SHALL NOT advance status before the rerun-ready gate passes

#### Scenario: Rerun status sync happens only after rerun-ready pass
- **WHEN** rerun-ready passes with `check.next: phases/phase-seed-topics.md`
- **THEN** the Agent SHALL enter that node first and then run `advance-status --to rerun_ready`

#### Scenario: Route-bound rerun entry authorizes topic apply
- **WHEN** HITL2 emitted the rerun target, `enter-phase` recorded the matching route-bound load witness, and the incoming rerun status window is current
- **THEN** rerun topic-state apply MAY migrate legacy state, add/refine canonical intent or apply one complete layout target

#### Scenario: Route-bound post-final recovery entry authorizes the same topic apply
- **WHEN** a valid C5 event is bound to the latest Final lineage, current profile matches its bound after-profile, `enter-phase` recorded the matching rerun load witness, existing `advance-status` wrote the matching phase transition, and the incoming rerun status window is current
- **THEN** rerun SHALL use the same topic-state actions, count increment and gate as a normal HITL2 rerun
- **AND** SHALL NOT create a post-final-specific topic or chain path

#### Scenario: Missing or superseded rerun witness blocks apply
- **WHEN** current-node/context claims rerun but neither accepted normal nor post-final route-bound witness is valid and current
- **THEN** apply SHALL reject before workspace creation and point to the existing lifecycle/recovery owner
- **AND** the Agent SHALL NOT ask the user to approve a mechanical bypass

#### Scenario: New rerun topic materializes before work
- **WHEN** the rationale requires a new topic
- **THEN** the Agent SHALL commit add-topic registry+seed intent before enqueueing Wave0/Wave1 work

#### Scenario: Existing topic intent update preserves layout
- **WHEN** the rationale refines an existing topic without requesting layout change
- **THEN** update-intent SHALL preserve its UID/id/slug and existing artifacts

#### Scenario: Complete layout target preserves historical outputs
- **WHEN** rationale clearly requests rename or reorder/renumber
- **THEN** the Agent SHALL edit inspect's complete layout baseline and run mutate-layout
- **AND** historical artifact/reference/output files SHALL remain at recorded paths while new work uses current slug

#### Scenario: Safe remove is Engine-proven
- **WHEN** rationale requests removal of a never-worked UID with no inbound dependency
- **THEN** mutate-layout MAY remove its registry/current-seed projection and renumber retained topics
- **AND** a UID with any historical fact SHALL remain blocked without partial layout edits

#### Scenario: First rerun increments count and writes guidance
- **WHEN** rerun_count is absent or 0 and topic-state preparation succeeds
- **THEN** the Agent SHALL write rerun_count 1 through the existing profile path
- **AND** affected add/refine UID-bound seeds SHALL contain updated rerun direction guidance

#### Scenario: Second rerun preserves existing loop protection
- **WHEN** rerun_count is 1 and another sanctioned normal or post-final rerun preparation succeeds
- **THEN** the Agent SHALL write rerun_count 2 and update affected add/refine direction guidance

#### Scenario: Existing rerun count mutation does not invalidate entry lineage

- **WHEN** the initial C5 profile/event/load/phase-transition window authorized topic-state preparation and the rerun phase then increments `rerun_count` through its existing owner
- **THEN** the C5 event SHALL remain the historical entry witness for that rerun attempt
- **AND** downstream rerun-ready validation SHALL accept only the event-bound `current_count → next_count` one-field profile delta and evaluate it through the existing gate rule rather than require the pre-increment profile hash

#### Scenario: Existing artifacts remain preserved
- **WHEN** rerun add/refine or layout preparation executes
- **THEN** existing `reference/`, `artifacts/`, submitted ledger and work-unit history SHALL NOT be deleted, renamed or rewritten by topic-state operations

#### Scenario: Remove or layout mutation remains blocked
> **@deprecated** — Direct multi-file or imperative layout mutation remains blocked; C3B now provides one complete sanctioned `mutate_layout` target.

- **WHEN** the rationale requests remove, rename or renumber
- **THEN** the Agent SHALL use the complete topic-state layout target rather than direct edits or a parallel namespace
- **AND** if Engine history, dependency, quiescence or lifecycle checks reject that target, the layout SHALL remain unchanged and the Agent SHALL follow the single returned owner/boundary action
