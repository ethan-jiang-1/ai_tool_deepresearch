# Canonical Topic State

> req: CTS-001, CTS-002, CTS-003, CTS-004, CTS-005, CTS-006, CTS-007

## Purpose

Define the canonical topic registry, progress read model, atomic mutation workspace, and scope/authority boundaries. The topic registry in `rb_plan.md` is the bundle's only canonical topic identity owner. Progress is projected from direct runtime facts without persistence. Mutation goes through a single `operate-topic-state.mjs` CLI with exactly `inspect|apply|recover` operations and one `_diagnostics/topic-state/<operation-id>/` workspace.
## Requirements
### Requirement: Topic registry SHALL own stable identity and minimum durable intent

`rb_plan.md` SHALL declare `topic_registry_version: "2"`; its `topic_registry` SHALL be the selected bundle's only canonical topic identity and minimum intent owner. Every canonical entry SHALL contain immutable Engine-generated `topic_uid`, current `id/slug/title`, non-empty `must_answer[]`, closed `scope_role`, and `depends_on_topic_uids[]` resolving within the registry. Seed files, queue/work-unit topic labels and artifact paths SHALL reference or project this owner and SHALL NOT create an independent topic registry.

#### Scenario: New topic survives before research starts
- **WHEN** add-topic commits and the process stops before queue or content work begins
- **THEN** the bundle SHALL retain UID, title, must-answer set, scope role, dependencies, ordinal/slug and matching seed skeleton
- **AND** chat or downstream artifacts SHALL NOT be required to know the topic was intended

#### Scenario: Registry-external topic is blocked
- **WHEN** a seed, queue/work-unit fact or durable artifact names a topic absent from the canonical registry
- **THEN** inspect SHALL report one canonical registration/materialization blocker
- **AND** the framework SHALL NOT bless a parallel addendum identity namespace

### Requirement: Topic progress SHALL be projected from direct runtime facts

The Engine SHALL derive per-topic/per-wave `not_started|in_progress|complete|blocked` from canonical registry/current-seed binding, current UID-bound queue/work-unit facts, submitted ledger rows and accepted required artifact facts. Submitted historical facts that carry a unique previous slug SHALL resolve through registry layout lineage to the same UID and MAY continue to prove completion at their recorded paths. Each row SHALL expose direct `fact_refs[]`, recorded/current slug context when they differ, one reason code and at most one nearest Agent action. The projection SHALL NOT be persisted and SHALL NOT use chat, mtime, run log, trace narration or serialized free-text substring matching as primary progress authority.

#### Scenario: Intended but untouched topic is not started
- **WHEN** a canonical topic and current seed exist with no matching current or historical submitted work/artifact fact for a wave
- **THEN** inspect SHALL report `not_started`

#### Scenario: Submitted facts prove completion
- **WHEN** accepted submitted ledger plus required artifact facts bind a canonical UID through its current slug or one unique previous slug
- **THEN** inspect SHALL report that wave `complete` with exact recorded fact refs and current UID/slug context
- **AND** no mutable progress row, file move or ledger rewrite SHALL be required

#### Scenario: Historical submitted facts survive layout rename
- **WHEN** accepted submitted ledger plus required artifact facts use one unique previous slug for the canonical UID
- **THEN** inspect SHALL report that wave `complete` with exact recorded fact refs and current UID/slug context
- **AND** no file move, ledger rewrite or mutable progress row SHALL be required

#### Scenario: Ambiguous legacy fact blocks without guessing
- **WHEN** a legacy work/ledger fact cannot resolve uniquely through structured UID/current/previous slug binding
- **THEN** inspect SHALL report one ambiguous binding blocker
- **AND** SHALL NOT infer identity from serialized free text

### Requirement: Canonical topic mutation SHALL atomically materialize plan and seed intent

The framework SHALL expose one helper, one `operate-topic-state.mjs` CLI and one `_diagnostics/topic-state/<operation-id>/` workspace for `inspect|apply|recover`. `apply` action `migrate_legacy` SHALL require explicit semantics for every legacy registry entry and SHALL allow an explicit `adopt` entry for a registry-external slug detected by C1; adoption MAY bind one exact existing seed or stage one seed skeleton but SHALL NOT move or authorize historical content files. Apply SHALL prepare complete hash-bound replacements only for `rb_plan.md` and explicitly touched `seed_topics/*.md`, durably publish a prepared manifest, recheck expected hashes/path safety, atomically replace listed files, fsync parent directories and clean the workspace after commit.

When an accepted `add_topic` or `migrate_legacy` entry with `seed_binding: new` creates a seed without an existing projection, that staged seed SHALL contain a complete canonical skeleton before registry publication. Its frontmatter SHALL contain the exact UID-bound registry intent plus explicit gap-valued Agent-facing enrichment fields; its body SHALL contain the seed-topics initialization headings, a research-round append area, and exactly the accepted wave-specific placeholders `__BACKFILL_WAVE0_EVIDENCE__`, `__BACKFILL_WAVE1_MECHANISMS__`, `__BACKFILL_WAVE1_TRENDS__`, `__BACKFILL_WAVE2_JUDGMENT__`, and `__BACKFILL_PENDING_QUESTIONS__`. The Engine SHALL NOT use the closed `scope_role` enum value as topic-positioning prose and SHALL NOT introduce a second generic fill/backfill token family.

When an existing UID-bound seed is re-rendered for intent or current-layout mutation, canonical registry fields SHALL overwrite their matching frontmatter keys while non-canonical enrichment fields and the existing body SHALL be preserved. Topic-state mutation SHALL remain the atomic plan+seed writer; it SHALL NOT enqueue future wave work, allocate work units, or write submitted provenance.

For sanctioned rerun only, every `add_topic` or `update_intent` action SHALL carry one Agent-authored rerun-direction candidate with `rerun_count`, `action`, `new_search_dimensions`, `adjusted_depth`, `search_guardrails`, and `rationale_excerpt`. An existing Topic that needs only supplemental search/depth guidance without a canonical intent change SHALL use `set_rerun_direction` in the same ordered action list; that action SHALL carry `topic_uid` plus the same direction candidate and SHALL NOT change registry intent fields. HITL1 add/update inputs SHALL NOT carry rerun direction.

The topic-state input schema SHALL validate direction structure and cross-action mapping before workspace publication: `add_topic` requires direction `action: add`; `update_intent` and `set_rerun_direction` require `action: supplement`; direction count SHALL equal current accepted profile count plus one; and two actions in one plan SHALL NOT target the same existing UID or create two directions for one Topic. The candidate content remains Agent judgment grounded in recorded HITL2 rationale; Engine validation SHALL be limited to closed action/count/field/cardinality structure and SHALL NOT generate or semantically score the guidance.

Rerun apply SHALL render/replace exactly one canonical `## 本轮重跑方向` section in every touched add/update/direction-only seed inside the existing prepared plan+seed workspace. The staged seed, plan change when any, and direction candidate SHALL therefore share the existing durable prepared/recover boundary. A crash after accepted workspace publication SHALL recover the exact staged direction bytes; a crash before publication SHALL leave the retained caller input available for fresh apply. Direction-only plans SHALL stage only the named existing seeds plus an unchanged plan byte contract and SHALL return `unchanged` only when both registry/current seed bytes, including direction, already match.

For `mutate_layout`, the same workspace MAY additionally record hash-bound `cleanup_files[]` limited to superseded or safely removed seed files. Layout commit SHALL write new/current seed replacements, replace `rb_plan.md` last, then delete only listed old seed files whose bytes still match the prepared expected hash. Artifact/reference/final paths, queue/work-unit state, submitted outputs and immutable provenance SHALL remain outside the workspace. Layout-only mutation SHALL preserve existing direction/body guidance and SHALL NOT invent a new direction candidate.

Recovery SHALL be explicit: inspect or apply encountering an accepted workspace SHALL return one `recover` action with its operation id. `recover` SHALL use only the prepared manifest to complete exact staged replacements and seed cleanup or return blocked without overwrite/delete; it SHALL NOT accept new semantic input.

The caller SHALL retain the explicit apply-input file until commit. Durable prepared publication SHALL be the accepted recovery boundary. A crash before that boundary SHALL NOT be reported as an accepted operation; the retained input SHALL remain available for a fresh apply.

One apply plan SHALL contain exactly one of: one complete `migrate_legacy` reconciliation; a non-empty ordered list of `add_topic`/`update_intent`/`set_rerun_direction` actions; or one complete `mutate_layout` target. These forms SHALL NOT be mixed. `set_rerun_direction` SHALL be available only in a sanctioned rerun context. A layout target SHALL carry `expected_plan_sha256`, enumerate every current UID exactly once across ordered retained topics and explicit remove UIDs, and SHALL let Engine derive continuous current ids/slugs. The Engine SHALL validate the complete target, dependencies, duplicate targets, safe-remove facts and staged replacements before prepared publication. Topic UID SHALL remain immutable; existing id/slug MAY change only through `mutate_layout`.

For layout mutation, `affected_topic_uids` SHALL mean only removed UIDs and retained UIDs whose current id, slug or title differs in the final target. For an add/update/direction action plan it SHALL include every topic whose seed bytes are staged, including direction-only targets. Quiescence and seed mutation checks SHALL not block unrelated unchanged topics merely because a complete target lists them. If the rendered plan/current-seed bytes already match and no seed cleanup remains, apply SHALL return `unchanged` without workspace or follow-up.

Before workspace creation, `apply` SHALL authorize mutation from existing lifecycle facts rather than a caller-declared context flag. HITL1 apply SHALL require `rb_status.json#/current_node: phases/phase-hitl1.md` with the existing `current_gate: hitl1_recorded` / `next_gate: setup_ready` pre-gate window. Normal rerun apply SHALL require `current_node: phases/phase-rerun.md`, the latest valid non-superseded route-bound HITL2 gate-to-rerun load witness, and the incoming `current_gate: hitl2_recorded` / `next_gate: rerun_ready` window.

Post-final rerun apply SHALL be authorized only after the accepted C5 operation has committed a valid non-superseded `post_final_reentry` event, current HITL2 profile semantics/hash still equal the event-bound after-profile, `enter-phase` has written a route-bound rerun `load_complete` referencing that exact recovery event, existing `advance-status --to hitl2_recorded` has written the matching exceptional `phase_transition`, `current_node` is `phases/phase-rerun.md`, and the incoming `hitl2_recorded -> rerun_ready` status window remains intact. A caller-declared `human-directed`, rerun or recovery context SHALL NOT substitute for either witness class, the accepted profile, or the existing status-sync step.

`migrate_legacy`, `set_rerun_direction`, and `mutate_layout` SHALL be authorized only in a sanctioned normal or post-final rerun context. Other post-final, stale/missing-witness and arbitrary maintenance invocation SHALL reject without workspace or authority mutation.

The prepared manifest SHALL record the complete originally proven authorization facts. For normal rerun this means the gate handoff and bound load identity. For post-final rerun it means recovery event id/index/exact-line SHA256, event-bound after-profile hash, bound rerun load index, exact exceptional `phase_transition` index/binding, and the incoming current-node/status window. `recover` MAY finish that exact accepted operation after lifecycle position changes, but SHALL NOT accept new semantics, re-evaluate a new apply request or widen the staged file set.

`migrate_legacy`, `update_intent`, `set_rerun_direction` and `mutate_layout` SHALL reject before workspace creation when a touched existing topic has queued, delegated-in-flight or nonterminal work. The blocker SHALL identify the existing queue/work-unit owner and one nearest Agent action. Submitted historical work MAY remain and SHALL NOT be rewritten. `mutate_layout` removal SHALL additionally reject any UID with queue/work-unit/ledger/artifact/reference history or an inbound dependency.

#### Scenario: Crash after a partial accepted commit resumes exact bytes

- **WHEN** an accepted operation crashes after some staged seeds or plan bytes commit but before every replacement/seed cleanup completes
- **THEN** inspect SHALL return the exact recover command and recover SHALL resume the prepared bytes/cleanup or block on direct drift
- **AND** new topic work SHALL remain blocked while the accepted workspace exists

#### Scenario: Crash after plan replacement resumes exact seed bytes

> **@deprecated** - This pre-C3B scenario name is retained for archive compatibility. Current operations publish new/current seeds before replacing the registry.

- **WHEN** a current accepted operation reaches `rb_plan.md` replacement and then crashes before seed cleanup or workspace cleanup
- **THEN** every staged current seed replacement SHALL already match its prepared bytes
- **AND** recovery SHALL complete only remaining hash-bound seed cleanup/workspace cleanup or block on direct drift

#### Scenario: Multi-topic approval is one accepted change set

- **WHEN** HITL1/rerun apply contains multiple add-topic/update-intent/direction-only actions or one complete multi-topic layout target
- **THEN** the Engine SHALL validate and stage the final registry plus every touched current seed before prepared publication
- **AND** failure in any item SHALL leave the complete change set unaccepted and authority bytes unchanged

#### Scenario: Unchanged listed topic does not widen quiescence

- **WHEN** a complete target changes one UID while another listed UID retains identical id/slug/title and has active work
- **THEN** the unchanged UID SHALL NOT block layout apply
- **AND** the changed UID SHALL still satisfy its own quiescence checks

#### Scenario: Byte-identical target is workspace-free

- **WHEN** final rendered plan/current seeds equal current bytes and no cleanup seed remains
- **THEN** apply SHALL return `unchanged` without workspace creation, style follow-up or authority mutation

#### Scenario: Crash before prepared publication is not overclaimed

- **WHEN** apply stops before durable prepared manifest publication
- **THEN** the Engine SHALL NOT report an accepted recoverable operation
- **AND** the caller-owned input SHALL remain available for fresh apply

#### Scenario: Late drift is not overwritten or deleted

- **WHEN** a touched plan/seed or listed cleanup seed matches neither accepted expected-old nor staged-new/absent form
- **THEN** recovery/apply SHALL return blocked with that path and leave its bytes untouched

#### Scenario: Late drift is not overwritten

- **WHEN** a replacement target or listed cleanup seed no longer matches its prepared expected-old/staged-new contract
- **THEN** recovery/apply SHALL block on that direct path without overwriting replacement bytes
- **AND** SHALL NOT delete a drifted cleanup seed

#### Scenario: Registry-external topic requires explicit adoption

- **WHEN** C1 reports a registry-external topic slug and migration input explicitly supplies its title, intent, scope role, dependencies and seed binding choice
- **THEN** `apply` action `migrate_legacy` MAY add one canonical UID-bound registry/seed identity for that slug
- **AND** it SHALL NOT grant authority to historical artifact/cache/reference/final files merely because the topic was adopted

#### Scenario: Active work blocks semantic, direction, or layout mutation

- **WHEN** migrate-legacy, update-intent, set-rerun-direction or mutate-layout touches a UID with queued, delegated-in-flight or nonterminal work
- **THEN** apply SHALL reject without changing plan, seed, queue or work-unit state
- **AND** the Agent SHALL drain, submit, repair or terminalize through the existing owner and rerun apply

#### Scenario: Active work blocks semantic mutation

- **WHEN** migrate-legacy or update-intent touches a UID with queued, delegated-in-flight or nonterminal work
- **THEN** apply SHALL reject without changing plan, seed, queue or work-unit state
- **AND** the same quiescence owner SHALL also govern a direction-only or affected layout UID

#### Scenario: Legal HITL1 window authorizes initial materialization

- **WHEN** add-topic is invoked with current node `phases/phase-hitl1.md` and the existing `hitl1_recorded -> setup_ready` status window
- **THEN** apply MAY prepare the approved initial canonical registry and seeds
- **AND** a caller-declared context value SHALL NOT substitute for those lifecycle facts
- **AND** HITL1 input SHALL NOT write rerun direction

#### Scenario: Sanctioned rerun authorizes canonical mutation forms

- **WHEN** current node is `phases/phase-rerun.md`, either the latest normal route-bound HITL2 gate-to-rerun witness or latest accepted route-bound post-final recovery-to-rerun witness is valid and non-superseded, and the incoming rerun status window is intact
- **THEN** apply MAY accept migrate-legacy, add-topic/update-intent/set-rerun-direction or one complete mutate-layout target subject to their semantic, history and active-work checks

#### Scenario: Sanctioned rerun authorizes migration and refinement

- **WHEN** current node is `phases/phase-rerun.md`, one accepted rerun witness class is valid and non-superseded, and the incoming rerun status window is intact
- **THEN** apply MAY accept migrate-legacy, add-topic, update-intent or direction-only supplement subject to their semantic and active-work checks
- **AND** the same sanctioned window MAY accept one complete mutate-layout target subject to its layout, history and quiescence checks

#### Scenario: Post-final recovery witness authorizes existing topic operations

- **WHEN** C5 has committed a valid Final-lineage-bound `post_final_reentry`, current profile still matches its event-bound after-profile, `enter-phase` has route-bound the existing rerun node to that event, existing `advance-status --to hitl2_recorded` has written the matching exceptional `phase_transition`, and the HITL2 rerun window remains current
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

#### Scenario: Accepted recovery survives lifecycle drift

- **WHEN** a prepared manifest records valid original authorization and the bundle later moves to another lifecycle position before commit completes
- **THEN** exact recover MAY finish only the recorded staged replacements and seed cleanup
- **AND** it SHALL NOT authorize a fresh topic mutation in the new lifecycle position

#### Scenario: Post-final topic recovery retains complete original witness

- **WHEN** post-final topic-state apply publishes a prepared manifest and later lifecycle/profile position changes
- **THEN** recover SHALL rely on the recorded event/profile/load/transition/status authorization snapshot rather than current fresh-apply eligibility
- **AND** a manifest missing any complete exceptional-witness component SHALL block instead of inferring authorization from current prose or files

#### Scenario: Rerun add commits complete seed skeleton and direction before descendant work

- **WHEN** a sanctioned normal or post-final rerun applies `add_topic` for a new canonical Topic
- **THEN** the prepared change set SHALL contain the registry entry, matching complete UID-bound seed skeleton, and structurally valid target-round add direction
- **AND** the seed SHALL contain all initialization headings and accepted Wave0/Wave1/Wave2 placeholder set before seed-topics or Wave0 work begins
- **AND** queue, work-unit and submitted-ledger authority SHALL remain unchanged by topic-state apply

#### Scenario: New seed uses accepted wave-specific placeholders only

- **WHEN** topic-state renders a seed with no existing projection
- **THEN** the body SHALL contain each accepted wave-specific placeholder exactly once in its owned section
- **AND** it SHALL NOT contain `__BACKFILL_EVIDENCE__`, `__BACKFILL_MECHANISM__`, `__BACKFILL_TRENDS__`, `__BACKFILL_JUDGMENT__`, `__BACKFILL_QUESTIONS__`, or a new `__FILL_*__` protocol

#### Scenario: Existing seed enrichment survives canonical mutation

- **WHEN** update-intent, set-rerun-direction or current-layout mutation re-renders an existing UID-bound seed
- **THEN** registry-owned frontmatter fields SHALL reflect the committed canonical Topic
- **AND** existing Agent-facing enrichment/body sections SHALL remain byte-preserved except for explicit canonical field/title/path changes and the one sanctioned direction-section replacement

#### Scenario: Direction-only supplement does not fake intent mutation

- **WHEN** recorded rationale requests new search/depth guidance for an existing Topic without changing its canonical title, must-answer set, scope role, or dependencies
- **THEN** the Agent SHALL use `set_rerun_direction` with the exact current UID and a supplement direction candidate
- **AND** topic-state SHALL stage only that seed direction replacement while preserving registry intent bytes

#### Scenario: Rerun direction mapping fails before workspace publication

- **WHEN** an add action carries `supplement`, an update/direction-only action carries `add`, or direction count differs from accepted current profile count plus one
- **THEN** apply SHALL reject before creating an accepted workspace
- **AND** plan, seed, profile, queue and work-unit authority SHALL remain unchanged

### Requirement: Topic-state operations SHALL preserve scope and authority boundaries

Topic-state operations SHALL NOT mutate queue state/schema, work-unit attempts, submitted ledger, status, trace, gates, handoffs, receipts, artifact/cache/reference/final paths, artifact persistence state, profile fields or delivery authority. New topic work SHALL require committed registry+current-seed materialization. The CLI SHALL provide no force, generic delete, retire, arbitrary patch, set-progress, set-status, reentry, override, artifact/reference path move or historical-content rewrite operation.

The only layout operation SHALL be `apply` action `mutate_layout`: one complete sanctioned-rerun target that may rename/reorder current registry coordinates, update current seed projections and safely remove a never-worked topic. Historical paths SHALL remain in place and previous slugs SHALL be provenance/read compatibility only.

C5 SHALL widen only the accepted rerun witness class consumed by topic-state authorization. The post-final recovery helper SHALL own profile/reentry event mutation; existing `enter-phase`/`advance-status` SHALL retain node/status ownership; topic-state SHALL continue to own only plan/current seeds. Historical addendum adoption, when requested after successful C5 reentry, SHALL use existing explicit `migrate_legacy` semantics and SHALL NOT be performed by C5 or inferred from files.

#### Scenario: Bounded layout mutation uses the existing authority path
- **WHEN** a sanctioned normal or post-final rerun submits a valid complete mutate-layout target
- **THEN** the existing topic-state apply/recover path SHALL own registry/current-seed mutation
- **AND** it SHALL NOT create a second CLI, workspace, filesystem migration service or direct multi-file Agent edit path

#### Scenario: Layout mutation reports missing C3B capability
> **@deprecated** — C3B is implemented by one complete `mutate_layout` target; only legacy imperative action shapes remain unsupported.

- **WHEN** apply input uses an imperative remove, rename or renumber action instead of one complete target
- **THEN** the command SHALL reject that shape before workspace creation and point to the sanctioned `inspect` → `mutate_layout` path
- **AND** path-move requests SHALL remain outside C3B without claiming that bounded layout mutation itself is missing

#### Scenario: Historical topic removal remains blocked
- **WHEN** remove targets a UID with dependency, queue, work-unit, ledger, artifact or reference history
- **THEN** apply SHALL reject before workspace creation
- **AND** SHALL NOT invent retired state, delete history or reinterpret user insistence as permission

#### Scenario: Human-directed request does not bypass reentry
- **WHEN** a user requests new scope or layout mutation from a lifecycle position without an accepted normal or post-final rerun entry witness
- **THEN** topic-state mutation SHALL remain unavailable without changing topic/status/trace state
- **AND** `human-directed` SHALL NOT create permission or handoff authority

#### Scenario: Post-final apply requires committed C5 reentry
- **WHEN** topic-state apply is invoked after terminal Final without an accepted C5 event plus route-bound rerun load witness
- **THEN** it SHALL reject before workspace creation and identify the exact post-final recovery boundary
- **AND** it SHALL NOT treat user insistence, declared context or existing legacy data as permission

#### Scenario: Post-final apply remains unavailable
> **@deprecated** — The pre-C5 wording is retained for archive compatibility. Fresh topic apply remains unavailable from terminal Final alone; only a committed C5 event plus route-bound rerun load opens the existing C3 window.

- **WHEN** apply is invoked after terminal Final without an accepted topic-state workspace and without the complete C5 rerun witness
- **THEN** it SHALL reject before workspace creation and identify the exact C5 reentry boundary
- **AND** it SHALL NOT treat user insistence, declared context or existing legacy data as permission

#### Scenario: Post-final reentry does not adopt topics by itself
- **WHEN** C5 establishes the sanctioned rerun window for a bundle with registry-external historical content
- **THEN** topic identity SHALL remain unchanged until an explicit existing `migrate_legacy` apply succeeds
- **AND** no addendum file SHALL gain authority from reentry alone

### Requirement: Topic registry SHALL own current and previous layout coordinates

Every canonical topic SHALL retain immutable `topic_uid`, one current `id/slug`, and a unique ordered `previous_layouts[]` containing only superseded `{id,slug}` coordinates. Current and previous slugs across the complete registry SHALL resolve to exactly one UID. Previous layouts SHALL NOT create enqueue eligibility, progress state, path aliases, symlinks or a second registry.

When a valid layout target restores one UID to its own previous slug, the Engine SHALL promote that coordinate to current, remove it from `previous_layouts[]`, and append the superseded current coordinate once. A target slug present under another UID's current/history lineage SHALL remain a collision.

Remove SHALL be accepted only for a UID with no queue/work-unit/ledger/artifact/reference facts and no inbound topic dependency. A topic with historical facts SHALL remain canonical and removal SHALL fail before workspace creation; C3B SHALL NOT add retired state or erase provenance.

An explicitly topic-scoped historical record that cannot be uniquely resolved through structured UID/current/previous slug binding SHALL block safe remove; unknown ownership SHALL NOT be treated as evidence that history is absent.

#### Scenario: Rename preserves stable identity
- **WHEN** a canonical topic receives a new title or slug stem in a valid layout target
- **THEN** its UID SHALL remain unchanged and its superseded id/slug SHALL be appended once to `previous_layouts[]`
- **AND** the old slug SHALL resolve only as historical identity, not as a current work target

#### Scenario: Topic may restore its own previous coordinate
- **WHEN** a complete target selects a slug already present in the same UID's previous layouts
- **THEN** that slug SHALL become current and the superseded current coordinate SHALL become historical
- **AND** the final current/history sets SHALL remain disjoint and uniquely resolvable

#### Scenario: Historical topic removal is rejected
- **WHEN** remove targets a UID with submitted work, durable topic content or an inbound dependency
- **THEN** apply SHALL reject before workspace creation with one direct owner/history blocker
- **AND** it SHALL NOT delete files, create retirement state or rewrite historical records

#### Scenario: Unresolved topic history blocks removal
- **WHEN** a topic-scoped queue/work-unit/ledger record lacks a uniquely resolvable structured UID/slug binding
- **THEN** safe remove SHALL fail closed with the unresolved record as direct fact
- **AND** SHALL NOT infer absence from missing identity detail

### Requirement: Complete layout target SHALL commit through the existing topic-state workspace

`operate-topic-state apply` SHALL accept one `mutate_layout` target only in the sanctioned rerun authority window. The input SHALL carry `expected_plan_sha256` from inspect and enumerate every current UID exactly once across ordered `topics[]` and `remove_topic_uids[]`; ordered topics SHALL carry explicit title and slug stem, and Engine SHALL derive continuous current ids/slugs. Layout mutation SHALL NOT mix with migrate/add/update actions.

`inspect` SHALL return current complete `rb_plan.md` SHA256 and a copy-ready ordered layout baseline containing current UID, title and a losslessly derived slug stem when available. For an accepted pre-C3B coordinate that cannot be losslessly represented by the target stem grammar, inspect SHALL mark `slug_stem_required` rather than silently normalize it. This is a read-only projection, not persisted state, so the Agent can mechanically edit a complete target without reconstructing identifiers from multiple files or inventing a second registry hash rule.

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

#### Scenario: Historical content remains outside mutation authority
- **WHEN** rename or renumber targets a UID with accepted artifact, reference or submitted output paths under a previous slug
- **THEN** layout apply SHALL leave those historical paths and immutable provenance bytes unchanged
- **AND** SHALL stage only current seed and plan changes

#### Scenario: Existing unexplained seed target blocks
- **WHEN** a generated new current seed path already exists but is not the same UID's current seed projection
- **THEN** apply SHALL reject before prepared publication with that path
- **AND** SHALL NOT overwrite, adopt or delete the existing file

#### Scenario: Post-final request remains unavailable
- **WHEN** a caller submits `mutate_layout` outside the route-bound sanctioned rerun window
- **THEN** apply SHALL reject before workspace creation and identify the missing C5 authority boundary
- **AND** caller context or `human-directed` wording SHALL NOT grant permission

### Requirement: Historical bindings SHALL resolve through one pure layout resolver

The Engine SHALL expose one pure canonical resolver from registry UID/current/previous layout facts. Topic-state progress, queue/work-unit readers, submitted provenance, gates, file observability and reentry SHALL reuse it rather than maintain independent slug, id, or reference-metadata inference. New structured queue/work-unit topic records SHALL write UID plus current slug; immutable legacy slug-only records MAY resolve through unique previous layout. Historical ledger, receipt, trace and work-unit files SHALL remain byte-unchanged.

Reference Markdown SHALL use one thin adapter over that same resolver rather than a second identity map. The adapter SHALL accept `related_topic_uid` containing one exact registered UID or `all`, and SHALL continue to accept legacy `related_topic` values containing `all` or comma-separated exact current/previous ids or slugs. A legacy unpadded numeric ordinal MAY normalize only to the unique equivalent zero-padded canonical id. If both metadata keys are present, they SHALL resolve to the same UID set or the same `all` sentinel; conflict or ambiguity SHALL fail closed with one binding diagnostic. Neither form SHALL create topic authority, enqueue eligibility, or permission to rewrite historical references.

Accepted historical topic-bearing paths and reference metadata SHALL resolve to their UID and recorded coordinates without being translated, copied, moved, or mass-rewritten to the current format. A rerun-added topic SHALL enter the normal current-topic execution path; existing covered topics SHALL reuse resolved historical facts. Free-text substring matching, symlink aliases, duplicate content authority and arbitrary string replacement SHALL NOT establish binding.

#### Scenario: Submitted old slug resolves after rename
- **WHEN** an immutable work-unit snapshot records a unique previous slug for a UID whose historical output remains at its recorded path
- **THEN** provenance inspection SHALL show recorded and current coordinates and continue to bind the same UID
- **AND** it SHALL NOT rewrite the submitted row

#### Scenario: UID-only reference metadata resolves canonically
- **WHEN** a historical or rerun-time reference declares `related_topic_uid` with one exact registered UID and omits legacy `related_topic`
- **THEN** Wave gates, inspect and file observability SHALL bind it through the shared canonical resolver
- **AND** the reference SHALL NOT be rejected solely because the legacy field is absent

#### Scenario: Legacy reference metadata remains compatible
- **WHEN** a normal-path reference declares only `related_topic` using `all`, one exact current/previous id or slug, or a comma-separated exact list
- **THEN** the adapter SHALL resolve the same canonical UID set without requiring a file rewrite
- **AND** normal first-run reference behavior SHALL remain valid

#### Scenario: Duplicate metadata forms must agree
- **WHEN** one reference contains both `related_topic_uid` and `related_topic`
- **AND** the two values resolve to different UID sets or sentinel meanings
- **THEN** resolver consumers SHALL return one `reference_topic_binding_conflict` or equivalent blocker
- **AND** SHALL NOT select one field by precedence or guess from the filename

#### Scenario: Ambiguous legacy binding fails closed
- **WHEN** an old record or reference value cannot be uniquely mapped by structured UID/current/previous id or slug fields
- **THEN** resolver consumers SHALL return one ambiguous-binding blocker
- **AND** SHALL NOT guess from serialized free text
