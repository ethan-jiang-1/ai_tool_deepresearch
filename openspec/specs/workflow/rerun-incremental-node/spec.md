# Rerun Incremental Node

> req: REI-001, REI-002, REI-003, REI-004, REI-005, REI-006, REI-007

> delta-synced: strengthen-user-intent-carry-through (REI-007)

## Purpose

定义 `phase-rerun` node：HITL2 `user_decision: rerun` 后的专职 rerun-prep phase。把 rerun decision + rationale 翻译为增量重跑上下文（profile 更新、rerun 计数），让下游 phase 能以 delta 模式运行。
## Requirements
### Requirement: Phase-rerun node frontmatter and identity

`phase-rerun.md` SHALL 是 `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/` 下的 phase node，frontmatter 包含：

| Field | Value |
|-------|-------|
| `node_type` | `phase` |
| `id` | `phase-rerun` |
| `phase` | `rerun` |
| `gate` | `rerun-ready` |
| `stop` | `no` |
| `requires` | `["shared/shared-profile"]` |
| `suggested_context` | `["shared/shared-anti-cheating-rules"]` |

Routing identity SHALL 为 node fileRef `phases/phase-rerun.md`。

#### Scenario: Agent resolves rerun path via chain

- **WHEN** Agent 在 HITL2 gate pass 后读到 `user_decision: rerun`
- **THEN** Agent SHALL query chain with outcome `rerun` to resolve next node
- **AND** chain SHALL return `phases/phase-rerun.md`
- **AND** Agent SHALL load the resolved node rather than restarting from seed-topics directly

#### Scenario: Rerun node is self-describing

- **WHEN** Agent reads phase-rerun.md frontmatter
- **THEN** it SHALL identify `phase: rerun`, `gate: rerun-ready`, `stop: no`

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
   explicit remove UIDs.

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
- **THEN** rerun topic-state apply MAY add/refine canonical intent, set current direction, or apply one complete layout target
- **AND** a noncanonical historical plan SHALL stop at the current schema/topic-state boundary without a migration or upgrade route

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


#### Scenario: Rerun does not prepare historical migration
- **WHEN** inspect reports a noncanonical historical mutable plan
- **THEN** phase-rerun SHALL preserve it as human-readable history and stop at the returned current plan-contract boundary
- **AND** it SHALL not prepare, describe, or authorize migration, adoption, upgrade, or direct multi-file conversion

### Requirement: Rerun-ready gate validates legal rerun state

`phase-rerun.md` remains `stop: "no"` and the `rerun-ready` gate remains the deterministic checkpoint for legal rerun state. Gate failure SHALL NOT create a failed chain transition or allow the Agent to load another phase without `check.next`. After the existing legal rerun/profile/topic-state prerequisites are usable, the Gate SHALL call the shared side-effect-free style-projection freshness evaluator over `research_style_params`, the current selected profile, and committed canonical registry length. Absent, partial, wrong-profile, or stale parameters SHALL produce one direct `style_projection_freshness` root that names the existing `apply-research-style.mjs` command and rerun of this same Gate. An earlier rerun legality, profile, or canonical topic-state root SHALL mask this dependent freshness result. The Gate SHALL not select a style, write profile fields, change `rerun_count`, mutate topic state, or introduce a second rerun controller.

After a committed rerun topic-state operation changes canonical registry length,
the phase body SHALL consume the returned `style_projection` handoff before the
existing rerun-count increment and `rerun-ready` Gate. It SHALL invoke the
handoff's exact existing style CLI command; it SHALL not reread/parse the
profile to construct a second command, compute style parameters locally, or run
the style writer when the operation reports no length change. If a prior handoff
was not completed, the same Gate's direct freshness root remains the sole
feedback path to that existing writer and same-Gate rerun.

Rerun preparation is not a reporting checkpoint. If rerun analysis or materialization appears locally complete, the Agent SHALL run the `rerun-ready` gate, repair from inspect/advice, or record a legal silent holding event. It SHALL NOT initiate a "rerun prep is done so far" report, wait for confirmation, or route forward without `check.next`.

For fixable rerun preparation failures, such as missing derived seed topic materialization when the HITL2 rerun decision is otherwise valid, the phase body SHALL instruct the Agent to repair or take a silent degradation path without initiating a user request. In the specific case where `seed_topics/` is empty, the default silent degradation path SHALL be a full rerun seed regeneration, with the decision recorded through an accepted trace/log surface.

Hard non-repairable legality failures, such as an exhausted active max-rerun rule or missing HITL2 rerun rationale, remain gate failures. Because no failed chain edge exists, the Agent SHALL NOT route to another phase. The Agent SHALL record `silent_unpassable` through an accepted trace/log surface, keep the run in the current non-blocked/in-progress holding state, and SHALL NOT initiate a user question from mid-rerun.

The active `rerun_count` rule in `DEEP_RESEARCH_HARNESS/schema/gate_definitions/gate-rerun-ready.definition.json`, as parsed by the production Gate-definition contract, SHALL be the sole numeric Source of Record for the current max-rerun boundary. One side-effect-free `evaluateRerunAvailability({ definition, profile, includeNextIncrement })` SHALL be the sole semantic interpretation used by the formal rerun-ready Gate, HITL2 advice and accepted post-final recovery. It SHALL validate the exact active gate/rule/check/target/operator/value shape; require `profile`, `human_decision_checkpoints` and `hitl2` to be non-array objects; normalize only an absent nested `rerun_count` to `0`; require any present count to be a nonnegative integer; and require `includeNextIncrement` to be an explicitly supplied boolean. Missing or non-boolean mode, `null`, string, negative, fractional or non-finite count, or a missing/malformed parent SHALL return one unsupported reason rather than select a mode through JavaScript truthiness. It SHALL compute `evaluatedCount = currentCount + (includeNextIncrement ? 1 : 0)` and `available = evaluatedCount < exclusiveLimit` without I/O, finding construction, routing or persistence. Existing Gate-local and post-final-local comparisons SHALL be replaced rather than retained. Phase/shared Markdown, registry descriptions, tests and Agent-facing docs SHALL NOT maintain another concrete numeric limit or comparison.

HITL2 and fresh/pre-commit post-final eligibility SHALL call `includeNextIncrement: true` for the rerun phase's required next increment. The formal rerun-ready Gate SHALL call `false` over its already-incremented profile and retain verdict/trace/routing ownership. Accepted post-final lineage after its event-bound increment SHALL verify the recorded one-field `currentCount -> evaluatedCount` delta and definition binding, then defer formal availability to that same `false` Gate call; it SHALL NOT evaluate a second future increment. Consumer-specific C5 stage semantics remain owned by `post-final-recovery`.

#### Scenario: Rerun-ready reports stale style projection through the existing writer

- **WHEN** legal rerun preparation changes the committed registry length but the recorded style parameters still reflect the prior count
- **THEN** `check-gate-rerun-ready.mjs` SHALL report one `style_projection_freshness` root
- **AND** feedback SHALL name the selected profile, current count, existing style CLI command, and rerun of that same Gate

#### Scenario: Rerun consumes the committed style handoff before its gate

- **WHEN** a legal rerun topic-state commit changes registry length and returns
  `style_projection`
- **THEN** phase-rerun SHALL invoke that handoff's exact style command before
  incrementing `rerun_count` and running `rerun-ready`
- **AND** a no-length-change result SHALL not trigger a profile parse or
  unconditional style command

#### Scenario: Rerun topic-state prerequisite masks freshness

- **WHEN** rerun legality, profile, or canonical topic-state preparation is
  unusable and style parameters are also stale or absent
- **THEN** rerun-ready SHALL return the earlier prerequisite root and mask
  `style_projection_freshness`
- **AND** feedback SHALL not direct an out-of-order profile write

#### Scenario: Empty seed topics defaults to full rerun silently

- **WHEN** the rerun phase finds `seed_topics/` empty while preparing rerun inputs
- **THEN** the Agent SHALL default to full rerun seed regeneration
- **AND** the Agent SHALL record `silent_degradation` through an accepted trace/log surface
- **AND** the Agent SHALL NOT ask the user to confirm full rerun

#### Scenario: Non-repairable rerun legality failure does not route forward

- **WHEN** the `rerun-ready` gate fails because the active max-rerun rule is exhausted or HITL2 rerun rationale is absent
- **THEN** `resolveNodeTransitionDetailed` SHALL return `kind: "no_transition"`
- **AND** the Agent SHALL NOT load another phase without `check.next`
- **AND** the Agent SHALL NOT initiate a user question from inside the `stop: "no"` rerun phase
- **AND** the Agent SHALL record `silent_unpassable` with the gate failure reason through an accepted trace/log surface

#### Scenario: Rerun local completion does not become progress reporting

- **WHEN** rerun preparation has no obvious local work remaining
- **THEN** the Agent SHALL run the `rerun-ready` gate or follow gate fail repair guidance
- **AND** it SHALL NOT initiate a progress summary or idle report
- **AND** it SHALL NOT load `seed-topics` without gate CLI `check.next`

#### Scenario: Boundary verification reads the active definition

- **WHEN** the rerun-ready boundary integration test determines the current max-rerun rule
- **THEN** it SHALL read the production-parsed operator/value from the active Gate definition
- **AND** it SHALL prove the value immediately below the exclusive limit passes while the limit and a value above it fail
- **AND** it SHALL NOT copy the current numeric limit into a separate test constant

#### Scenario: One evaluator owns rerun availability semantics

- **WHEN** formal rerun-ready Gate, HITL2 advice or accepted post-final recovery interprets the active rerun-count rule
- **THEN** each consumer SHALL call the same side-effect-free evaluator
- **AND** the evaluator SHALL receive the full parsed profile and reject a missing/unparseable profile or missing HITL2 parent
- **AND** `includeNextIncrement` SHALL be an explicit boolean, and omission or any non-boolean value SHALL fail closed rather than silently select current-count mode
- **AND** formal Gate SHALL use `includeNextIncrement: false` for the already-incremented count while HITL2 and fresh/pre-commit post-final eligibility SHALL use `true` for the required next increment
- **AND** the evaluator SHALL compute `evaluatedCount = currentCount + (includeNextIncrement ? 1 : 0)` and `available = evaluatedCount < exclusiveLimit`
- **AND** only a parsed profile with object-shaped checkpoint/HITL2 parents present and nested count absent SHALL default to `0`; null, string, negative, fractional or non-finite counts SHALL be unsupported
- **AND** accepted post-final replay after the bound increment SHALL verify the recorded delta and defer to the formal Gate rather than check a next-next count
- **AND** formal Gate SHALL retain verdict/trace/routing while advisory consumers persist no eligibility
- **AND** no consumer SHALL retain a separate operator/value/count comparison

### Requirement: Chain routes HITL2 rerun as a deterministic outcome

The chain routing rules for the `rerun` outcome SHALL remain defined in the `transition-table` spec. An explicit HITL2 rerun decision SHALL resolve one fixed next node, while context-dependent revision/repair outcomes SHALL remain outside deterministic chain routing unless another accepted contract defines a fixed route.

#### Scenario: Deterministic rerun decision resolves one fixed node
- **WHEN** HITL2 records `user_decision: rerun` and the chain resolves outcome `rerun`
- **THEN** the resolved next node SHALL be `phases/phase-rerun.md`
- **AND** context-dependent `request_view_revision`, `repair`, and `stop_blocked` outcomes SHALL remain `no_transition` unless another accepted contract defines a deterministic route

### Requirement: Rerun loop protection with max iterations

Rerun loop protection remains mandatory. The distinction between framework-initiated surfacing and a user-initiated reply SHALL NOT weaken the active rerun-count Gate rule. When the active max-rerun boundary is exhausted, the Agent SHALL treat the current rerun path as unpassable rather than bypassing the Gate, resetting the counter, inventing a new route, or treating a user message as override authority.

The concrete boundary SHALL be owned only by the active `gate-rerun-ready.definition.json` rule, interpreted solely by the existing side-effect-free `evaluateRerunAvailability` evaluator. Specs and governance descriptions SHALL state stable max-iteration semantics without duplicating a rule count on another surface. This change raises the active boundary from 10 to 32 rerun cycles by changing the `rerun_count_valid` rule from `operator: less_than, value: 11` to `operator: less_than, value: 33`, and its `failure_message` SHALL describe a maximum of 32 rerun cycles. Any future change to the active boundary value SHALL require a separate accepted behavior change.

#### Scenario: Max reruns exhausted remains unpassable

- **WHEN** `rerun_count` no longer satisfies the active max-rerun Gate rule
- **THEN** the rerun-ready gate SHALL fail
- **AND** the Agent SHALL NOT reset `rerun_count`
- **AND** the Agent SHALL NOT bypass the gate through Markdown prose or a user message

#### Scenario: This change preserves the active boundary

- **WHEN** this change is applied
- **THEN** the active boundary SHALL remain owned solely by the `rerun_count_valid` rule in `gate-rerun-ready.definition.json`, with its `operator: less_than` preserved
- **AND** its `value` SHALL be raised from 11 to 33 (a maximum of 32 rerun cycles)
- **AND** its `failure_message` SHALL describe a maximum of 32 rerun cycles
- **AND** no other spec, governance description, Markdown, registry description, or test SHALL duplicate a concrete numeric limit

### Requirement: Rerun preparation SHALL materialize one target-round intent revision before topic-state planning

For every legal rerun, `phase-rerun` SHALL first run the existing read-only
topic-state inspect and resolve any accepted workspace through its exact recover
owner. Once no accepted workspace remains, the phase SHALL compute the existing
`target_rerun_count = profile.rerun_count + 1`, read the accepted route-bound
rationale and current host file, and write or reuse exactly one complete
target-round revision under `rb_plan.md## Decisions`. It SHALL then rerun
topic-state inspect and only from that fresh post-revision baseline construct
the retained topic-state candidate. The revision SHALL use PHS-009's complete
shape and SHALL be the newest accepted entry. Topic adjustment and direction
candidates SHALL be derived from the same accepted rationale and current
revision.

A complete revision for the same target and accepted rationale SHALL be reused
after interruption rather than duplicated. A target-round draft is accepted
history only after every required part is present and the Phase Agent has
re-read the host file. An interrupted incomplete target-round draft MAY be
repaired before topic-state candidate creation; a conflicting or duplicate
complete target-round revision SHALL be preserved and exposed as a plan
ambiguity rather than overwritten or arbitrarily selected. Complete older
revisions SHALL never be edited.

After the revision is durable, the phase SHALL run the existing topic-state
inspect, build the current retained candidate against those plan bytes, and use
the existing topic-state apply/recover path. Each affected Topic's
`rationale_excerpt` SHALL be a bounded topic-local explanation of why that
Topic is affected by the current revision. It SHALL NOT copy the complete user
wording or require identical text across Topics. Profile count increment,
matching-direction resolution, Gate, lineage, and topic-state transaction
authority SHALL remain unchanged.

#### Scenario: Crash after revision write reuses the same target entry

- **WHEN** phase-rerun writes and re-reads a complete target-round revision but stops before topic-state apply
- **THEN** resumed phase-rerun SHALL reuse that revision and continue with topic-state inspect
- **AND** it SHALL not append a second revision for the same accepted target and rationale

#### Scenario: Revision precedes the plan hash used by topic-state

- **WHEN** phase-rerun prepares an add, intent update, or direction-only candidate
- **THEN** its post-revision topic-state inspect/candidate SHALL observe the plan bytes that already contain the current revision
- **AND** successful apply/recovery SHALL preserve that revision while publishing existing Topic/direction changes

#### Scenario: Existing workspace keeps recovery ownership before revision write

- **WHEN** the initial read-only topic-state inspect reports an accepted workspace
- **THEN** phase-rerun SHALL run only its exact recover operation before writing or repairing a Decisions revision
- **AND** it SHALL not mutate plan bytes, submit new semantics, or create a competing recovery path while that workspace owns recovery

#### Scenario: Topic excerpts remain bounded and distinct

- **WHEN** one accepted revision affects two Topics for different reasons
- **THEN** each matching direction SHALL contain its own topic-local rationale excerpt
- **AND** neither excerpt SHALL be required to reproduce the complete user wording or match the other Topic's text

#### Scenario: Conflicting complete target revisions fail without destructive repair

- **WHEN** Decisions contains two conflicting complete entries for the same target count
- **THEN** phase-rerun SHALL not overwrite either entry, choose one by file order, apply topic state, or increment the profile
- **AND** it SHALL expose the host-file ambiguity as the current plan repair boundary without creating a new Gate or recovery controller
