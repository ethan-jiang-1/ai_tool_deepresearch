> req: CTS-004, CTS-006

## MODIFIED Requirements

### Requirement: Sanctioned lifecycle windows SHALL authorize every canonical topic mutation

For sanctioned rerun only, every `add_topic` or `update_intent` action SHALL carry one Agent-authored rerun-direction candidate with `rerun_count`, `action`, `new_search_dimensions`, `adjusted_depth`, `search_guardrails`, and `rationale_excerpt`. An existing Topic that needs only supplemental search/depth guidance without a canonical intent change SHALL use `set_rerun_direction` in the same ordered action list; that action SHALL carry `topic_uid` plus the same direction candidate and SHALL NOT change registry intent fields. HITL1 add/update inputs SHALL NOT carry rerun direction.

The topic-state input schema SHALL validate direction structure and cross-action mapping before workspace publication: `add_topic` requires direction `action: add`; `update_intent` and `set_rerun_direction` require `action: supplement`; direction count SHALL equal current accepted profile count plus one; and two actions in one plan SHALL NOT target the same existing UID or create two directions for one Topic. The candidate content remains Agent judgment grounded in recorded HITL2 rationale; Engine validation SHALL be limited to closed action/count/field/cardinality structure and SHALL NOT generate or semantically score the guidance.

Rerun apply SHALL render/replace exactly one canonical `## 本轮重跑方向` section in every touched add/update/direction-only seed inside the existing prepared plan+seed workspace. The staged seed, plan change when any, and direction candidate SHALL therefore share the existing durable prepared/recover boundary. A crash after accepted workspace publication SHALL recover the exact staged direction bytes; a crash before publication SHALL leave the retained caller input available for fresh apply. Direction-only plans SHALL stage only the named existing seeds plus an unchanged plan byte contract and SHALL return `unchanged` only when both registry/current seed bytes, including direction, already match.

For layout mutation, `affected_topic_uids` SHALL mean only removed UIDs and retained UIDs whose current id, slug or title differs in the final target. For an add/update/direction action plan it SHALL include every topic whose seed bytes are staged, including direction-only targets. For `enrich_seed` it SHALL contain exactly the selected current UID. Quiescence and seed mutation checks SHALL not block unrelated unchanged topics merely because a complete target lists them. If the rendered plan/current-seed bytes already match and no seed cleanup remains, apply SHALL return `unchanged` without workspace or follow-up. An unchanged `enrich_seed` result SHALL still return the selected UID/path and any observed-and-already-canonicalized binding repair shall be null.

Before workspace creation, `apply` SHALL authorize mutation from existing lifecycle facts rather than a caller-declared context flag. HITL1 apply SHALL require `rb_status.json#/current_node: phases/phase-hitl1.md` with the existing `current_gate: hitl1_recorded` / `next_gate: setup_ready` pre-gate window; that same window SHALL additionally authorize one complete `mutate_layout` target under the identical layout requirements. Normal rerun apply SHALL require `current_node: phases/phase-rerun.md`, the latest valid non-superseded route-bound HITL2 gate-to-rerun load witness, and the incoming `current_gate: hitl2_recorded` / `next_gate: rerun_ready` window. Seed enrichment apply SHALL require `current_node: phases/phase-seed-topics.md`, the latest valid non-superseded route-bound setup-to-seed-topics or rerun-to-seed-topics load witness, and respectively the incoming `setup_ready -> seed_topics_ready` or `rerun_ready -> seed_topics_ready` status window.

Post-final rerun apply SHALL be authorized only after the accepted ReopenResearchPass operation has committed a valid non-superseded `post_final_reentry` event, current HITL2 profile semantics/hash still equal the event-bound after-profile, `enter-phase` has written a route-bound rerun `load_complete` referencing that exact recovery event, existing `advance-status --to hitl2_recorded` has written the matching exceptional `phase_transition`, `current_node` is `phases/phase-rerun.md`, and the incoming `hitl2_recorded -> rerun_ready` status window remains intact. A caller-declared `human-directed`, rerun, seed-topics or recovery context SHALL NOT substitute for any required witness class, the accepted profile, or the existing status-sync step.

`set_rerun_direction` SHALL be authorized only in a sanctioned normal or post-final rerun context. `mutate_layout` SHALL be authorized in that sanctioned rerun context and additionally in the legal HITL1 pre-gate window defined above; its complete-target semantics, safe-remove facts, quiescence checks, hash binding and atomic workspace requirements SHALL be identical in both windows. `enrich_seed` SHALL be authorized only after one accepted setup/rerun source route has entered Seed Topics. Other post-final, stale/missing-witness and arbitrary maintenance invocation SHALL reject without workspace or authority mutation. Only a current `seed_topic_materialize` queue completion and a final `seed-topics-ready` Gate that each establish that same legal Seed Topics window MAY project `enrich_seed` as an executable `engine_operation`; their bounded parse-repair feedback is likewise legal only in that window. Generic topic-state inspect SHALL remain read-only, report a direct mismatch with `repair_kind: missing_contract` that identifies its no-write inspection boundary and the current lifecycle owner (plus an absent authoring window when applicable), and SHALL NOT mint either an `enrich_seed` or raw-YAML repair route.

`update_intent`, `set_rerun_direction` and `mutate_layout` SHALL reject before workspace creation when a touched existing topic has queued, delegated-in-flight or nonterminal work. The blocker SHALL identify the existing queue/work-unit owner and one nearest Agent action. Submitted historical work MAY remain and SHALL NOT be rewritten. `mutate_layout` removal SHALL additionally reject any UID with queue/work-unit/ledger/artifact/reference history or an inbound dependency. `enrich_seed` SHALL not apply this canonical-intent quiescence blocker because the current non-delegated `seed_topic_materialize` card is its legal caller work; it SHALL remain bounded by Seed Topics lifecycle authorization and SHALL NOT read, claim, complete or mutate queue/work-unit authority.

#### Scenario: Active work blocks semantic, direction, or layout mutation
- **WHEN** update-intent, set-rerun-direction or mutate-layout touches a UID with queued, delegated-in-flight or nonterminal work
- **THEN** apply SHALL reject without changing plan, seed, queue or work-unit state
- **AND** the Agent SHALL drain, submit, repair or terminalize through the existing owner and rerun apply

#### Scenario: Active work blocks semantic mutation
- **WHEN** update-intent touches a UID with queued, delegated-in-flight or
  nonterminal work
- **THEN** apply SHALL reject without changing plan, seed, queue or work-unit state
- **AND** the same quiescence owner SHALL also govern direction-only or affected layout UID

#### Scenario: Legal HITL1 window authorizes initial materialization
- **WHEN** add-topic is invoked with current node `phases/phase-hitl1.md` and the existing `hitl1_recorded -> setup_ready` status window
- **THEN** apply MAY prepare the approved initial canonical registry and seeds
- **AND** a caller-declared context value SHALL NOT substitute for those lifecycle facts
- **AND** HITL1 input SHALL NOT write rerun direction

#### Scenario: Legal HITL1 window authorizes one complete layout target
- **WHEN** one complete mutate-layout target is submitted with current node `phases/phase-hitl1.md` and the existing `hitl1_recorded -> setup_ready` status window
- **THEN** apply MAY accept it subject to the same safe-remove, dependency, quiescence, `expected_plan_sha256` and atomic prepared/recover requirements as sanctioned rerun
- **AND** the target SHALL NOT carry rerun direction and a caller-declared context value SHALL NOT substitute for those lifecycle facts

#### Scenario: HITL1 layout request outside the window is unavailable
- **WHEN** a complete mutate-layout target names context `hitl1` but the bundle is not in the `phases/phase-hitl1.md` `hitl1_recorded -> setup_ready` window
- **THEN** apply SHALL reject before workspace creation with one lifecycle repair/boundary action
- **AND** plan, seeds, status, trace and other authority surfaces SHALL remain byte-unchanged

#### Scenario: Sanctioned rerun authorizes canonical mutation forms
- **WHEN** current node is `phases/phase-rerun.md`, either the latest normal route-bound HITL2 gate-to-rerun witness or latest accepted route-bound post-final recovery-to-rerun witness is valid and non-superseded, and the incoming rerun status window is intact
- **THEN** apply MAY accept add-topic/update-intent/set-rerun-direction or one complete mutate-layout target subject to their semantic, history and active-work checks

#### Scenario: Sanctioned rerun authorizes migration and refinement
- **WHEN** current node is `phases/phase-rerun.md`, one accepted rerun witness
  class is valid and non-superseded, and the incoming rerun status window is intact
- **THEN** apply MAY accept add-topic, update-intent or direction-only supplement
  subject to their semantic and active-work checks
- **AND** a migration input SHALL remain rejected without a write or workspace

#### Scenario: Post-final recovery witness authorizes existing topic operations
- **WHEN** ReopenResearchPass has committed a valid Final-lineage-bound `post_final_reentry`, current profile still matches its event-bound after-profile, `enter-phase` has route-bound the existing rerun node to that event, existing `advance-status --to hitl2_recorded` has written the matching exceptional `phase_transition`, and the HITL2 rerun window remains current
- **THEN** topic-state apply SHALL use the same existing action/workspace contracts as a normal rerun
- **AND** SHALL NOT create a post-final-specific topic mutation path or addendum namespace

#### Scenario: Layout mutation preserves historical content coordinates
- **WHEN** rename or renumber changes current id/slug for a UID with submitted historical outputs
- **THEN** apply SHALL update only registry/current seed projections and previous-layout lineage
- **AND** SHALL leave historical artifact/reference/output paths and immutable provenance bytes unchanged

#### Scenario: Forged or stale rerun context cannot mutate
- **WHEN** the caller declares rerun context but the accepted normal/recovery route witness is missing, stale, superseded or mismatched to the status/profile window
- **THEN** apply SHALL reject before workspace creation with one lifecycle repair/boundary action
- **AND** plan, seeds, status, trace and other authority surfaces SHALL remain byte-unchanged

#### Scenario: Post-final topic recovery retains complete original witness
- **WHEN** post-final topic-state apply publishes a prepared manifest and later lifecycle/profile position changes
- **THEN** recover SHALL rely on the recorded event/profile/load/transition/status authorization snapshot rather than current fresh-apply eligibility
- **AND** a manifest missing any complete exceptional-witness component SHALL block instead of inferring authorization from current prose or files

#### Scenario: Direction-only supplement does not fake intent mutation
- **WHEN** recorded rationale requests new search/depth guidance for an existing Topic without changing its canonical title, must-answer set, scope role, or dependencies
- **THEN** the Agent SHALL use `set_rerun_direction` with the exact current UID and a supplement direction candidate
- **AND** topic-state SHALL stage only that seed direction replacement while preserving registry intent bytes

#### Scenario: Rerun direction mapping fails before workspace publication
- **WHEN** an add action carries `supplement`, an update/direction-only action carries `add`, or direction count differs from accepted current profile count plus one
- **THEN** apply SHALL reject before creating an accepted workspace
- **AND** plan, seed, profile, queue and work-unit authority SHALL remain unchanged

#### Scenario: Setup and rerun entries authorize seed enrichment
- **WHEN** a valid setup-to-seed-topics or rerun-to-seed-topics source attempt has a bound non-superseded load witness, current node is Seed Topics and its incoming status window is intact
- **THEN** `enrich_seed` MAY update one selected current seed subject to its strict schema and binding checks
- **AND** a caller-declared `context: seed_topics` without those facts SHALL reject without writes

#### Scenario: Generic inspect does not mint a Seed Topics writer
- **WHEN** generic topic-state inspect detects a canonical binding mismatch, including after the Seed Topics lifecycle window has closed
- **THEN** it SHALL retain the evaluator's direct diagnostic but SHALL NOT expose `enrich_seed` as an executable `engine_operation` or name a raw YAML coordinate as a repair surface
- **AND** it SHALL report `missing_contract` with the current lifecycle owner or the absent legal Seed Topics authoring window rather than implying a callable repair

### Requirement: Layout mutation and post-final reentry SHALL stay bounded sanctioned operations

The only layout operation SHALL be `apply` action `mutate_layout`: one complete
sanctioned-rerun or legal-HITL1-window target that may rename/reorder current
registry coordinates, update current seed projections and safely remove a
never-worked topic. Historical paths SHALL remain in place and previous slugs
SHALL be provenance/read compatibility only.

When a committed topic-state operation changes canonical registry length, its
result SHALL expose one structured style-projection handoff identifying the
existing `apply-research-style.mjs` owner, selected profile, committed topic
count, exact legal command, and same readiness checkpoint. The handoff is
direct feedback, not a profile write, new lifecycle state, or substitute for
the style freshness verdict. No length change SHALL report a refresh
obligation. ReopenResearchPass SHALL widen only the accepted rerun witness class consumed by
topic-state authorization; the post-final recovery helper owns profile/reentry
event mutation and `enter-phase`/`advance-status` retain node/status ownership;
topic-state SHALL continue to own only plan/current seeds. Historical addendum content SHALL remain outside canonical topic authority after successful ReopenResearchPass reentry. It SHALL NOT be adopted, migrated, upgraded, or inferred from files by the current Engine.

#### Scenario: Unrecognized layout remains read-compatible but is not guessed
- **WHEN** a packet selects a slot with no recognized canonical/card or
  declared legacy-heading target
- **THEN** projection apply SHALL reject with one
  `seed_projection_layout_missing` root before workspace creation
- **AND** it SHALL NOT infer headings, directly migrate bytes, or create a
  parallel success path

#### Scenario: Bounded layout mutation uses the existing authority path
- **WHEN** a sanctioned normal or post-final rerun, or the legal HITL1
  pre-gate window, submits a valid complete mutate-layout target
- **THEN** the existing topic-state apply/recover path SHALL own
  registry/current-seed mutation
- **AND** it SHALL NOT create a second CLI, workspace, filesystem migration
  service or direct multi-file Agent edit path

#### Scenario: Layout mutation reports missing TopicTreeEvolution layout mutation capability
- **WHEN** apply input uses an imperative remove, rename or renumber action
  instead of one complete target
- **THEN** the command SHALL reject that shape before workspace creation and
  point to the sanctioned `inspect` -> `mutate_layout` path
- **AND** path-move requests SHALL remain outside TopicTreeEvolution without claiming that
  bounded layout mutation itself is missing

#### Scenario: Historical topic removal remains blocked
- **WHEN** remove targets a UID with dependency, queue, work-unit, ledger,
  artifact or reference history
- **THEN** apply SHALL reject before workspace creation
- **AND** SHALL NOT invent retired state, delete history or reinterpret user
  insistence as permission

#### Scenario: Human-directed request does not bypass reentry
- **WHEN** a user requests new scope, layout mutation, or projection mutation
  from a lifecycle position outside every legal mutation window (the legal
  HITL1 pre-gate window or an accepted normal or post-final rerun entry)
- **THEN** topic-state mutation SHALL remain unavailable without changing
  topic/status/trace state
- **AND** `human-directed` SHALL NOT create permission or handoff authority

#### Scenario: Post-final apply requires committed ReopenResearchPass reentry
- **WHEN** topic-state apply is invoked after terminal Final without an
  accepted ReopenResearchPass event plus route-bound rerun load witness
- **THEN** it SHALL reject before workspace creation and identify the exact
  post-final recovery boundary
- **AND** it SHALL NOT treat user insistence, declared context or existing
  legacy data as permission

#### Scenario: Post-final apply remains unavailable
> **@deprecated** - The pre-ReopenResearchPass wording is retained for archive compatibility.
> Fresh topic apply remains unavailable from terminal Final alone; only a
> committed ReopenResearchPass event plus route-bound rerun load opens the existing TopicTreeEvolution window.
- **WHEN** apply is invoked after terminal Final without an accepted topic-state
  workspace and without the complete ReopenResearchPass rerun witness
- **THEN** it SHALL reject before workspace creation and identify the exact ReopenResearchPass
  reentry boundary
- **AND** it SHALL NOT treat user insistence, declared context or existing
  legacy data as permission

#### Scenario: Post-final reentry does not adopt topics by itself
- **WHEN** ReopenResearchPass establishes the sanctioned rerun window for a bundle with
  registry-external historical content
- **THEN** topic identity SHALL remain unchanged; the current Engine SHALL not offer a
  migration, adoption, or upgrade apply
- **AND** no addendum file SHALL gain authority from reentry alone

#### Scenario: No length change does not invent style work
- **WHEN** a projection packet, enrichment write, rename, or reorder leaves
  registry length unchanged
- **THEN** topic-state SHALL not emit a style refresh obligation
- **AND** it SHALL not create a second lifecycle state or profile mutation

#### Scenario: Structured style handoff retains the existing writer
- **WHEN** a committed topic-state mutation changes canonical registry length
  in a legal HITL1 or rerun window
- **THEN** its result SHALL expose the existing style CLI as the next owner with
  the committed topic count and exact rerun checkpoint
- **AND** topic-state SHALL not write, normalize, or infer
  `research_style_params`

### Requirement: Complete layout target SHALL commit through the existing topic-state workspace

`operate-topic-state apply` SHALL accept one `mutate_layout` target only in the sanctioned rerun authority window or the legal HITL1 pre-gate window (`rb_status.json#/current_node: phases/phase-hitl1.md` with `hitl1_recorded -> setup_ready`). The input SHALL carry `expected_plan_sha256` from inspect and enumerate every current UID exactly once across ordered `topics[]` and `remove_topic_uids[]`; ordered topics SHALL carry explicit title and slug stem, and Engine SHALL derive continuous current ids/slugs. Layout mutation SHALL NOT mix with migrate/add/update actions.

`inspect` SHALL return current complete `rb_plan.md` SHA256 and a copy-ready ordered layout baseline containing current UID, title and a losslessly derived slug stem when available. For an accepted pre-TopicTreeEvolution coordinate that cannot be losslessly represented by the target stem grammar, inspect SHALL mark `slug_stem_required` rather than silently normalize it. The baseline SHALL name in its `context` field the caller's currently legal layout window — `hitl1` in the legal HITL1 pre-gate window and `rerun` otherwise, falling back to `rerun` when lifecycle status is unreadable — so the template is directly submittable in the caller's own window. This field remains a read-only template fact and SHALL NOT constitute authorization; inspect SHALL NOT write a layout draft file. The Agent can mechanically edit a complete target without reconstructing identifiers from multiple files or inventing a second registry hash rule.

The existing topic-state workspace SHALL remain bounded to complete `rb_plan.md` and affected current seed replacements. For layout targets its prepared manifest MAY additionally list hash-bound superseded/removed seed files for cleanup after the registry replacement; it SHALL NOT own artifact/reference/final paths, directory moves, link rewrites or generic delete operations. An accepted workspace SHALL block topic work and expose only exact `recover --operation-id`. Recovery SHALL roll forward the recorded seed/plan bytes and exact seed cleanup or block on direct drift; it SHALL NOT accept new semantics, auto-rollback, widen paths or invoke a hidden retry tree.

Before prepared publication, a new current seed target path SHALL be absent unless it is the same UID's existing current seed path being replaced. A pre-existing orphan, cross-UID seed, symlink, directory or unexplained file at a new target SHALL block without overwrite. Each cleanup seed SHALL be proven as the affected UID's old current projection and bound to its expected hash.

#### Scenario: Complete target renumbers atomically
- **WHEN** ordered target UIDs imply new continuous ordinals and every owned path is collision-free
- **THEN** apply SHALL prepare the final registry and every exact affected projection as one accepted operation
- **AND** successful recovery SHALL produce no half-renumbered current layout

#### Scenario: Inspect supplies a complete mechanical baseline
- **WHEN** canonical topic state is clean
- **THEN** inspect SHALL return complete plan hash and ordered current layout fields, or one explicit `slug_stem_required` field where semantic input is genuinely missing
- **AND** SHALL NOT write a layout draft file or ask the user to calculate UID/hash

#### Scenario: Inspect baseline context reflects the legal window
- **WHEN** inspect runs in the legal HITL1 pre-gate window
- **THEN** the copy-ready baseline's `context` field SHALL be `hitl1`
- **AND** it SHALL fall back to `rerun` in every other window and when lifecycle status is unreadable, without granting or implying mutation authority

#### Scenario: Historical content remains outside mutation authority
- **WHEN** rename or renumber targets a UID with accepted artifact, reference or submitted output paths under a previous slug
- **THEN** layout apply SHALL leave those historical paths and immutable provenance bytes unchanged
- **AND** SHALL stage only current seed and plan changes

#### Scenario: Existing unexplained seed target blocks
- **WHEN** a generated new current seed path already exists but is not the same UID's current seed projection
- **THEN** apply SHALL reject before prepared publication with that path
- **AND** SHALL NOT overwrite, adopt or delete the existing file

#### Scenario: Layout request outside every legal window remains unavailable
- **WHEN** a caller submits `mutate_layout` outside the legal HITL1 pre-gate window and outside the route-bound sanctioned rerun window
- **THEN** apply SHALL reject before workspace creation and identify the missing legal layout authority boundary
- **AND** caller context or `human-directed` wording SHALL NOT grant permission

#### Scenario: Post-final request remains unavailable
- **WHEN** a caller submits `mutate_layout` outside the route-bound sanctioned rerun window
- **THEN** apply SHALL reject before workspace creation and identify the missing ReopenResearchPass authority boundary
- **AND** caller context or `human-directed` wording SHALL NOT grant permission
