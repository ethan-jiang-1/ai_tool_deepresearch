# Rerun Incremental Node Delta

> req: REI-006

## MODIFIED Requirements

### Requirement: Rerun node analyzes rationale vs seed_topics and produces topic adjustment plan

`phase-rerun.md` SHALL instruct the Agent to read the existing
`rb_profile.yaml#/human_decision_checkpoints/hitl2/rationale`, canonical
`rb_plan.md#/topic_registry`, current `seed_topics/`, and
`operate-topic-state inspect` including its copy-ready layout baseline. It
SHALL produce one semantic adjustment plan that distinguishes Topics to keep,
existing Topics whose intent needs refinement, new Topics to add, explicit
current-layout rename/reorder/renumber, and requested remove operations.

When a legal HITL2 rerun rationale contains a labelled focus wording and Agent
interpretation, the rerun phase SHALL treat those existing rationale parts as
the current incremental research direction. It SHALL compare them with current
Topic/seed facts and form existing per-Topic direction guidance only for
affected Topics. It SHALL retain past direction sections, submitted evidence,
artifacts, reference paths, and output history as historical context. No past
direction or evidence can be represented as newly produced work or as
satisfaction of a new/revised focus.

The phase SHALL prepare exactly one existing explicit topic-state apply form:

1. add/refine uses `add_topic` and `update_intent` with existing C3A fields;
2. direction-only change uses existing `set_rerun_direction` for an existing
   Topic without changing canonical intent;
3. layout mutation uses one complete `mutate_layout` target with
   `expected_plan_sha256`, ordered retained UID/title/slug-stem entries and
   explicit remove UIDs; and
4. migrate-legacy remains its own complete reconciliation and SHALL NOT mix
   with either form.

For every successfully added, refined, or direction-adjusted Topic, the
existing UID-bound seed `## 本轮重跑方向` section SHALL contain the current
`rerun_count`, action, new search dimensions, adjusted depth, search
guardrails, and rationale excerpt. These existing labels remain Agent guidance,
not a second machine state, focus coverage result, or historical evidence
projection. Layout-only mutation SHALL preserve existing seed body guidance
while updating current seed metadata/path.

The phase SHALL run topic-state apply before queueing new work, consume
structured blockers, and rerun the same operation after repair. Active
queue/work-unit blockers remain ordinary Agent-owned mechanical work. It SHALL
increment the existing
`rb_profile.yaml#/human_decision_checkpoints/hitl2/rerun_count` through the
existing profile path and, if registry length changed through add or safe
remove, use the existing `apply-research-style.mjs` owner before the
rerun-ready Gate. It SHALL preserve the incoming accepted rerun status window
until `check-gate-rerun-ready.mjs` passes, then consume `check.next` through
`enter-phase` before source-gate `advance-status --to rerun_ready`.

If update-intent or mutate-layout is blocked by queued, delegated-in-flight,
or nonterminal work, the Agent SHALL use the existing queue/work-unit inspect,
submit, repair, or terminalization path and rerun topic-state apply. This
mechanical blocker SHALL NOT be pushed to the user unless a new semantic
conflict remains after the direct owner is resolved.

Rename/reorder/renumber SHALL use only canonical topic-state apply; it SHALL
NOT fall back to direct multi-file edits. Historical artifact/reference/output
paths SHALL remain untouched and continue to resolve through previous layout.
Remove SHALL proceed only when Engine proves the UID has no dependency or
historical work/content facts; otherwise the Agent SHALL report the single
provenance-preserving boundary rather than delete history or invent retirement
state.

Topic-state apply in rerun SHALL remain authorized only when
`rb_status.json#/current_node` is `phases/phase-rerun.md`, the incoming
`current_gate: hitl2_recorded` / `next_gate: rerun_ready` window remains
intact, and one of the two existing route-bound witness classes is valid and
non-superseded: the normal HITL2 witness or the accepted post-final reentry
witness. The post-final witness SHALL NOT become a fake chain/Gate outcome; it
is an exceptional entry into this same rerun node. A caller-declared rerun
context, focus prose, rationale, or human-directed wording alone SHALL NOT
authorize mutation. The phase SHALL preserve existing loop protection,
profile/style ownership, and rerun-ready Gate semantics; it SHALL NOT reset or
skip count, add a focus-specific Gate, create a new route, or ask a new
question from this `stop: no` phase.

#### Scenario: Rerun uses a current focus only for the new increment
- **WHEN** an accepted HITL2 rerun rationale contains labelled focus wording
  and a current Agent interpretation
- **THEN** the Agent SHALL derive affected current direction candidates from
  that rationale and write them only through existing topic-state apply
- **AND** prior direction/evidence SHALL remain history and SHALL NOT be
  described as new focus work or current coverage

#### Scenario: Rerun preserves incoming HITL2 status window before gate pass
- **WHEN** normal HITL2 or accepted post-final recovery has selected and loaded `phase-rerun.md`
- **THEN** the Agent SHALL keep `current_gate: hitl2_recorded` and `next_gate: rerun_ready` while preparing/applying topic intent or direction
- **AND** it SHALL NOT advance status before the rerun-ready gate passes

#### Scenario: Rerun status sync happens only after rerun-ready pass
- **WHEN** rerun-ready passes with `check.next: phases/phase-seed-topics.md`
- **THEN** the Agent SHALL enter that node first and then run `advance-status --to rerun_ready`

#### Scenario: Route-bound rerun entry authorizes topic apply
- **WHEN** HITL2 emitted the rerun target, `enter-phase` recorded the matching route-bound load witness, and the incoming rerun status window is current
- **THEN** rerun topic-state apply MAY migrate legacy state, add/refine canonical intent, set current direction, or apply one complete layout target

#### Scenario: Route-bound post-final recovery entry authorizes the same topic apply
- **WHEN** accepted post-final recovery selected and loaded `phase-rerun.md`,
  recorded its valid non-superseded reentry witness, and the incoming rerun
  status window is current
- **THEN** the same existing topic-state apply forms remain legal
- **AND** focus prose or a caller-declared recovery context alone SHALL NOT
  substitute for that witness

#### Scenario: Missing or superseded rerun witness blocks apply
- **WHEN** current-node/context claims rerun but neither accepted normal nor post-final route-bound witness is valid and current
- **THEN** apply SHALL reject before workspace creation and point to the existing lifecycle/recovery owner
- **AND** the Agent SHALL NOT ask the user to approve a mechanical bypass

#### Scenario: New rerun topic materializes before work
- **WHEN** the rationale requires a new topic
- **THEN** the Agent SHALL commit add-topic registry+seed intent and current direction before enqueueing Wave0/Wave1 work

#### Scenario: Existing Topic intent update preserves layout
- **WHEN** the rationale refines an existing Topic without requesting layout change
- **THEN** update-intent SHALL preserve its UID/id/slug and existing artifacts

#### Scenario: Complete layout target preserves historical outputs
- **WHEN** the rationale requests a rename, reorder, or renumber with a
  complete current-layout target accepted by canonical topic-state apply
- **THEN** the canonical layout changes only through that apply operation
- **AND** historical artifact, reference, and output paths remain untouched and
  resolve through their prior layout

#### Scenario: Safe remove is Engine-proven
- **WHEN** the rationale requests removal of a Topic
- **THEN** the Agent SHALL submit the UID through the existing complete layout
  target and proceed only if Engine proves it has no dependency or historical
  work/content facts
- **AND** a failed proof leaves history and layout unchanged without a
  retirement state or direct deletion

#### Scenario: Direction-only focus refinement preserves canonical Topic identity
- **WHEN** the rationale changes only what an existing Topic should investigate
- **THEN** the Agent SHALL use the existing direction form without creating a
  second Topic identity, changing the Topic's canonical intent, or editing
  historical evidence

#### Scenario: First rerun increments count and writes guidance
- **WHEN** rerun_count is absent or 0 and topic-state preparation succeeds
- **THEN** the Agent SHALL write rerun_count 1 through the existing profile path
- **AND** affected UID-bound seeds SHALL contain updated current rerun direction guidance

#### Scenario: Second rerun preserves existing loop protection
- **WHEN** a later legal rerun starts with an existing nonnegative `rerun_count`
- **THEN** the phase SHALL use the existing profile path and rerun-ready Gate
  protection for its next increment
- **AND** it SHALL NOT reset, bypass, or locally reinterpret the active limit

#### Scenario: Existing rerun count mutation does not invalidate entry lineage
- **WHEN** the phase increments the existing rerun count through its accepted
  profile owner after a legal route-bound entry
- **THEN** that profile mutation SHALL NOT invalidate the already-recorded
  current entry witness or allow a separately declared rerun context to create one

#### Scenario: Style projection crash before count increment resumes existing owner
- **WHEN** a registry-length change requires the existing style-projection
  handoff and that handoff fails before the count increment
- **THEN** the Agent SHALL resume through the returned existing style owner or
  the rerun-ready Gate's direct feedback path
- **AND** it SHALL NOT increment count early, construct another style command,
  or ask a new user question

#### Scenario: Style projection cannot hide profile drift
- **WHEN** rerun-ready sees absent, partial, wrong-profile, or stale style
  parameters after the existing legal rerun prerequisites are usable
- **THEN** the existing Gate SHALL expose its one direct style-projection
  freshness root and existing writer
- **AND** the phase SHALL NOT select a style, write profile fields, or create a
  focus-specific style path

#### Scenario: Existing artifacts remain preserved
- **WHEN** rerun add/refine/direction/layout preparation executes
- **THEN** existing `reference/`, `artifacts/`, submitted ledger, work-unit
  history, and previous direction sections SHALL NOT be deleted, renamed,
  rewritten, or relabelled as current incremental evidence

#### Scenario: Remove or layout mutation remains blocked without a complete target
- **WHEN** the rationale requests remove, rename, or renumber
- **THEN** the Agent SHALL use the complete topic-state layout target rather
  than direct edits or a parallel namespace
- **AND** if Engine history, dependency, quiescence, or lifecycle checks reject
  that target, the layout SHALL remain unchanged and the Agent SHALL follow
  the single returned owner/boundary action
