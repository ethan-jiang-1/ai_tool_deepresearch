## REMOVED Requirements

### Requirement: Canonical topic mutation SHALL atomically materialize plan and seed intent

The framework SHALL expose one helper, one `operate-topic-state.mjs` CLI and one `_diagnostics/topic-state/<operation-id>/` workspace for `inspect|apply|recover`. All inspect and apply paths SHALL require a schema-valid canonical `rb_plan.md` before topic identity, seed binding, workspace, rerun, or recovery facts are evaluated. Apply SHALL prepare complete hash-bound replacements only for `rb_plan.md` and explicitly touched `seed_topics/*.md`, durably publish a prepared manifest, recheck expected hashes/path safety, atomically replace listed files, fsync parent directories and clean the workspace after commit.

When an accepted `add_topic` entry with `seed_binding: new` creates a seed without an existing projection, that staged seed SHALL contain a complete canonical skeleton before registry publication. Its frontmatter SHALL contain the exact UID-bound registry intent plus explicit gap-valued Agent-facing enrichment fields; its body SHALL contain the non-duplicating seed-topics initialization headings, a research-round append area, and exactly the accepted wave-specific placeholders `__BACKFILL_WAVE0_EVIDENCE__`, `__BACKFILL_WAVE1_MECHANISMS__`, `__BACKFILL_WAVE1_TRENDS__`, `__BACKFILL_WAVE2_JUDGMENT__`, and `__BACKFILL_PENDING_QUESTIONS__`. A new body SHALL NOT copy canonical `must_answer` or repeat structured `in_scope`, `out_of_scope`, or `evidence_route`; the Engine SHALL NOT use the closed `scope_role` enum value as topic-positioning prose and SHALL NOT introduce a second generic fill/backfill token family.

When an existing UID-bound seed is re-rendered for intent or current-layout mutation, canonical registry fields SHALL overwrite their matching frontmatter keys while non-canonical enrichment fields and the existing body SHALL be preserved. Topic-state mutation SHALL remain the atomic plan+seed writer; it SHALL NOT enqueue future wave work, allocate work units, or write submitted provenance.

`apply` SHALL additionally accept one mutually exclusive `enrich_seed` form with `context: seed_topics`, one non-empty `topic_uid` selector and one complete strict `enrichment` object. That object SHALL contain exactly `hypothesis`, `in_scope`, `out_of_scope`, `search_guardrails`, and `evidence_route`; the first three SHALL be non-empty strings, `search_guardrails` SHALL contain exactly non-empty-string arrays `required_terms` and `forbidden_broadening`, and `evidence_route` SHALL contain exactly non-empty-string arrays `preferred_sources` and `noise_to_avoid`. Each array SHALL contain at least one item. Explicit non-empty gap values SHALL be structurally legal and SHALL remain Agent judgment. Canonical fields, path/slug snapshots, unknown keys, partial patches and caller-provided defaults SHALL reject before workspace publication.

For `enrich_seed`, the Engine SHALL resolve `topic_uid` through the current canonical registry and derive the current seed path itself. It SHALL read the existing seed, preserve every non-canonical frontmatter key not replaced by the five accepted enrichment fields, overwrite those five fields from the complete validated input, overwrite the seven canonical binding fields from the resolved registry Topic, serialize frontmatter once through the existing YAML renderer, and preserve the exact lexical body suffix. That suffix begins immediately after the closing frontmatter delimiter's terminating LF (`---\n`); the renderer SHALL emit that delimiter LF followed by the captured suffix verbatim, without trimming, normalization or removal of an initial LF. An EOF closing delimiter has an empty suffix. It SHALL NOT infer identity from filename/body, rewrite a rerun direction or research appendix, generate enrichment semantics, or accept an arbitrary body/path patch.

Canonical binding equality SHALL mean recursive equality of parsed JSON-compatible values, not byte equality of YAML serialization. Value type, exact string code-point sequence and array order SHALL be significant; mapping key order, quoting style, scalar style and presentation whitespace SHALL not be significant. In particular, quoted, colon-bearing, multiline, CJK and other Unicode `must_answer` strings SHALL retain the exact parsed string values and array order after rendering; normalization, trimming, summarization or equivalent prose SHALL fail binding.

Before rendering `enrich_seed`, the existing shared seed authoring evaluator SHALL examine the current parseable seed against the resolved Topic. If it reports canonical drift, apply SHALL retain only its first fixed-order direct failure as a `binding_repair` result, use the existing canonical merge to repair all canonical fields in the same write, and SHALL NOT require or authorize a raw YAML identity edit. After rendering and before prepared publication, apply SHALL run the same evaluator over the staged path/bytes and SHALL publish no workspace if the writer postcondition fails. An invalid input, unknown UID, missing/unsafe seed, unparseable frontmatter or postcondition defect SHALL fail before authority mutation with one direct coordinate/owner and the same apply checkpoint when a legal repair exists. The Engine SHALL NOT add a second evaluator or silently discard a detected pre-render binding root.

For sanctioned rerun only, every `add_topic` or `update_intent` action SHALL carry one Agent-authored rerun-direction candidate with `rerun_count`, `action`, `new_search_dimensions`, `adjusted_depth`, `search_guardrails`, and `rationale_excerpt`. An existing Topic that needs only supplemental search/depth guidance without a canonical intent change SHALL use `set_rerun_direction` in the same ordered action list; that action SHALL carry `topic_uid` plus the same direction candidate and SHALL NOT change registry intent fields. HITL1 add/update inputs SHALL NOT carry rerun direction.

The topic-state input schema SHALL validate direction structure and cross-action mapping before workspace publication: `add_topic` requires direction `action: add`; `update_intent` and `set_rerun_direction` require `action: supplement`; direction count SHALL equal current accepted profile count plus one; and two actions in one plan SHALL NOT target the same existing UID or create two directions for one Topic. The candidate content remains Agent judgment grounded in recorded HITL2 rationale; Engine validation SHALL be limited to closed action/count/field/cardinality structure and SHALL NOT generate or semantically score the guidance.

Rerun apply SHALL render/replace exactly one canonical `## 本轮重跑方向` section in every touched add/update/direction-only seed inside the existing prepared plan+seed workspace. The staged seed, plan change when any, and direction candidate SHALL therefore share the existing durable prepared/recover boundary. A crash after accepted workspace publication SHALL recover the exact staged direction bytes; a crash before publication SHALL leave the retained caller input available for fresh apply. Direction-only plans SHALL stage only the named existing seeds plus an unchanged plan byte contract and SHALL return `unchanged` only when both registry/current seed bytes, including direction, already match.

For `mutate_layout`, the same workspace MAY additionally record hash-bound `cleanup_files[]` limited to superseded or safely removed seed files. Layout commit SHALL write new/current seed replacements, replace `rb_plan.md` last, then delete only listed old seed files whose bytes still match the prepared expected hash. Artifact/reference/final paths, queue/work-unit state, submitted outputs and immutable provenance SHALL remain outside the workspace. Layout-only mutation SHALL preserve existing direction/body guidance and SHALL NOT invent a new direction candidate.

Recovery SHALL be explicit: inspect or apply encountering an accepted workspace SHALL return one `recover` action with its operation id. `recover` SHALL use only the prepared manifest to complete exact staged replacements and seed cleanup or return blocked without overwrite/delete; it SHALL NOT accept new semantic input.

The caller SHALL retain the explicit apply-input file until commit. Durable prepared publication SHALL be the accepted recovery boundary. A crash before that boundary SHALL NOT be reported as an accepted operation; the retained input SHALL remain available for a fresh apply.

One apply input SHALL contain exactly one of: a non-empty ordered list of `add_topic`/`update_intent`/`set_rerun_direction` actions; one complete `mutate_layout` target; or one complete `enrich_seed` target. `migrate_legacy` and any equivalent historical-plan reconciliation or adoption input SHALL reject before workspace creation, authority mutation, or seed/plan write. These forms SHALL NOT be mixed. `set_rerun_direction` SHALL be available only in a sanctioned rerun context; `enrich_seed` SHALL be available only in a legal Seed Topics context. A layout target SHALL carry `expected_plan_sha256`, enumerate every current UID exactly once across ordered retained topics and explicit remove UIDs, and SHALL let Engine derive continuous current ids/slugs. The Engine SHALL validate the complete target, dependencies, duplicate targets, safe-remove facts and staged replacements before prepared publication. Topic UID SHALL remain immutable; existing id/slug MAY change only through `mutate_layout`.

For layout mutation, `affected_topic_uids` SHALL mean only removed UIDs and retained UIDs whose current id, slug or title differs in the final target. For an add/update/direction action plan it SHALL include every topic whose seed bytes are staged, including direction-only targets. For `enrich_seed` it SHALL contain exactly the selected current UID. Quiescence and seed mutation checks SHALL not block unrelated unchanged topics merely because a complete target lists them. If the rendered plan/current-seed bytes already match and no seed cleanup remains, apply SHALL return `unchanged` without workspace or follow-up. An unchanged `enrich_seed` result SHALL still return the selected UID/path and any observed-and-already-canonicalized binding repair shall be null.

Before workspace creation, `apply` SHALL authorize mutation from existing lifecycle facts rather than a caller-declared context flag. HITL1 apply SHALL require `rb_status.json#/current_node: phases/phase-hitl1.md` with the existing `current_gate: hitl1_recorded` / `next_gate: setup_ready` pre-gate window. Normal rerun apply SHALL require `current_node: phases/phase-rerun.md`, the latest valid non-superseded route-bound HITL2 gate-to-rerun load witness, and the incoming `current_gate: hitl2_recorded` / `next_gate: rerun_ready` window. Seed enrichment apply SHALL require `current_node: phases/phase-seed-topics.md`, the latest valid non-superseded route-bound setup-to-seed-topics or rerun-to-seed-topics load witness, and respectively the incoming `setup_ready -> seed_topics_ready` or `rerun_ready -> seed_topics_ready` status window.

Post-final rerun apply SHALL be authorized only after the accepted ReopenResearchPass operation has committed a valid non-superseded `post_final_reentry` event, current HITL2 profile semantics/hash still equal the event-bound after-profile, `enter-phase` has written a route-bound rerun `load_complete` referencing that exact recovery event, existing `advance-status --to hitl2_recorded` has written the matching exceptional `phase_transition`, `current_node` is `phases/phase-rerun.md`, and the incoming `hitl2_recorded -> rerun_ready` status window remains intact. A caller-declared `human-directed`, rerun, seed-topics or recovery context SHALL NOT substitute for any required witness class, the accepted profile, or the existing status-sync step.

`set_rerun_direction` and `mutate_layout` SHALL be authorized only in a sanctioned normal or post-final rerun context. `enrich_seed` SHALL be authorized only after one accepted setup/rerun source route has entered Seed Topics. Other post-final, stale/missing-witness and arbitrary maintenance invocation SHALL reject without workspace or authority mutation. Only a current `seed_topic_materialize` queue completion and a final `seed-topics-ready` Gate that each establish that same legal Seed Topics window MAY project `enrich_seed` as an executable `engine_operation`; their bounded parse-repair feedback is likewise legal only in that window. Generic topic-state inspect SHALL remain read-only, report a direct mismatch with `repair_kind: missing_contract` that identifies its no-write inspection boundary and the current lifecycle owner (plus an absent authoring window when applicable), and SHALL NOT mint either an `enrich_seed` or raw-YAML repair route.

The prepared manifest SHALL record the complete originally proven authorization facts. For normal rerun this means the gate handoff and bound load identity. For post-final rerun it means recovery event id/index/exact-line SHA256, event-bound after-profile hash, bound rerun load index, exact exceptional `phase_transition` index/binding, and the incoming current-node/status window. For seed enrichment it means the setup/rerun source gate attempt, bound Seed Topics load identity and incoming current-node/status window. `recover` MAY finish that exact accepted operation after lifecycle position changes, but SHALL NOT accept new semantics, re-evaluate a new apply request or widen the staged file set.

`update_intent`, `set_rerun_direction` and `mutate_layout` SHALL reject before workspace creation when a touched existing topic has queued, delegated-in-flight or nonterminal work. The blocker SHALL identify the existing queue/work-unit owner and one nearest Agent action. Submitted historical work MAY remain and SHALL NOT be rewritten. `mutate_layout` removal SHALL additionally reject any UID with queue/work-unit/ledger/artifact/reference history or an inbound dependency. `enrich_seed` SHALL not apply this canonical-intent quiescence blocker because the current non-delegated `seed_topic_materialize` card is its legal caller work; it SHALL remain bounded by Seed Topics lifecycle authorization and SHALL NOT read, claim, complete or mutate queue/work-unit authority.

Existing pre-v0.50 seeds and in-flight queue cards SHALL remain read-compatible. Parseable legacy seeds MAY retain unknown non-canonical frontmatter keys and duplicate body `must_answer`/scope/evidence prose; `enrich_seed` SHALL preserve those body bytes, and deterministic binding/completion SHALL ignore that prose as authority. A legacy frontmatter parse error MAY require only a bounded Agent syntax repair to make the current seed parseable, after which the same `enrich_seed` apply SHALL restore canonical/structured ownership. No bulk seed or queue migration SHALL be required.

The topic-state input/result contract SHALL use schema version `1.1.0` for this additive apply form. A successful or unchanged `enrich_seed` result SHALL include `action: enrich_seed`, selected `topic_uid`, current `slug`, derived seed path, `verdict: committed|unchanged`, and nullable `binding_repair`. Existing `inspect|apply|recover` operations and remaining current apply input forms and their established result fields SHALL remain compatible; the minor version SHALL NOT create a second CLI route or require runtime data migration.

#### Scenario: Historical mutable plan stops at inspect boundary

- **WHEN** `rb_plan.md` omits `topic_registry_version: "2"` or uses only historical mutable topic entries
- **THEN** inspect SHALL return one current plan-contract blocker with no-write semantics
- **AND** it SHALL not expose `legacy` mode, `legacy_migration_required`, migration, adoption, upgrade, or raw-YAML repair

#### Scenario: Legacy migration input has no writer path

- **WHEN** `operate-topic-state apply` receives `migrate_legacy` or an equivalent historical-plan reconciliation input
- **THEN** it SHALL reject before workspace creation, plan replacement, seed write, or authority mutation

#### Scenario: Registry-external topic requires explicit adoption

- **WHEN** a historical registry-external slug is presented as migration or
  adoption input
- **THEN** apply SHALL reject before creating canonical identity or a seed
- **AND** it SHALL not grant authority to historical artifact/cache/reference/final files

#### Scenario: Crash after a partial accepted commit resumes exact bytes

- **WHEN** an accepted operation crashes after some staged seeds or plan bytes commit but before every replacement/seed cleanup completes
- **THEN** inspect SHALL return the exact recover command and recover SHALL resume the prepared bytes/cleanup or block on direct drift
- **AND** new topic work SHALL remain blocked while the accepted workspace exists

#### Scenario: Crash after plan replacement resumes exact seed bytes

> **@deprecated** - This pre-TopicTreeEvolution scenario name is retained for archive compatibility. Current operations publish new/current seeds before replacing the registry.

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
- **AND** the seed SHALL contain all accepted non-duplicating initialization headings and Wave0/Wave1/Wave2 placeholder set before seed-topics or Wave0 work begins
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

#### Scenario: Structured enrichment accepts only Agent-owned fields

- **WHEN** `enrich_seed` carries one complete valid five-field enrichment object for a current UID in a legal Seed Topics window
- **THEN** apply SHALL derive all canonical values/path from the registry, stage exactly that current seed plus the unchanged plan contract, and preserve queue/work-unit authority
- **AND** explicit gap strings SHALL remain legal without Engine semantic scoring

#### Scenario: Canonical or unknown input key fails before write

- **WHEN** `enrich_seed` input contains `must_answer`, another canonical key, an unknown key, a partial nested object or an empty required value
- **THEN** apply SHALL return one `input_invalid` coordinate and same apply rerun before workspace publication
- **AND** plan, seed, queue, status and trace bytes SHALL remain unchanged

#### Scenario: Lexical body suffix survives enrichment

- **WHEN** a current seed contains a deliberate blank line immediately after its closing frontmatter delimiter, Agent-authored Markdown, appendix tokens, a rerun direction or readable duplicate sections and valid structured enrichment is applied
- **THEN** the exact suffix after that delimiter's terminating LF, including its first blank-line LF, SHALL remain identical
- **AND** only the accepted frontmatter fields and YAML presentation MAY change

#### Scenario: Parsed canonical values survive YAML round trip

- **WHEN** registry canonical fields contain quoted, colon-bearing, multiline, CJK or other Unicode strings and ordered arrays
- **THEN** the first new-seed render and every `enrich_seed` render SHALL parse back to exactly the same typed values and array order
- **AND** equivalent YAML quoting or mapping key order SHALL NOT be treated as drift while normalized, trimmed, reordered or summarized strings SHALL be drift

#### Scenario: Must-answer drift is reported and repaired before completion

- **WHEN** the parseable current seed's `must_answer` differs from the current canonical Topic when `enrich_seed` starts
- **THEN** apply SHALL return the evaluator's `must_answer` mismatch as its one `binding_repair`, restore the registry value through the same canonical merge and pass the post-render evaluator before commit
- **AND** the Agent SHALL NOT hand-edit the canonical field or wait for queue completion to first learn of the drift

#### Scenario: Unparseable frontmatter does not trigger guessed salvage

- **WHEN** the current seed frontmatter cannot be parsed before enrichment rendering
- **THEN** apply SHALL fail before workspace publication with the exact parse root and same apply checkpoint
- **AND** it SHALL NOT guess body boundaries, overwrite the seed or reconstruct canonical YAML through a second writer

#### Scenario: Writer postcondition fails closed

- **WHEN** the staged enrichment render does not pass the same canonical authoring evaluator before prepared publication
- **THEN** apply SHALL return a writer-owner missing-contract root without publishing or mutating authority
- **AND** queue completion or Gate SHALL NOT be used as a fallback writer

#### Scenario: Setup and rerun entries authorize seed enrichment

- **WHEN** a valid setup-to-seed-topics or rerun-to-seed-topics source attempt has a bound non-superseded load witness, current node is Seed Topics and its incoming status window is intact
- **THEN** `enrich_seed` MAY update one selected current seed subject to its strict schema and binding checks
- **AND** a caller-declared `context: seed_topics` without those facts SHALL reject without writes

#### Scenario: Current seed task does not block its enrichment writer

- **WHEN** the selected UID has the current non-delegated `seed_topic_materialize` queue demand during a legal Seed Topics window
- **THEN** `enrich_seed` SHALL remain available and SHALL NOT fail solely on the canonical-intent active-work quiescence rule
- **AND** it SHALL neither terminalize nor otherwise mutate that queue demand

#### Scenario: Generic inspect does not mint a Seed Topics writer

- **WHEN** generic topic-state inspect detects a canonical binding mismatch, including after the Seed Topics lifecycle window has closed
- **THEN** it SHALL retain the evaluator's direct diagnostic but SHALL NOT expose `enrich_seed` as an executable `engine_operation` or name a raw YAML coordinate as a repair surface
- **AND** it SHALL report `missing_contract` with the current lifecycle owner or the absent legal Seed Topics authoring window rather than implying a callable repair

#### Scenario: Legacy duplicate body remains non-authoritative

- **WHEN** a parseable pre-v0.50 seed retains body copies of must-answer, scope or evidence-route prose
- **THEN** enrichment SHALL preserve those bytes while registry/frontmatter remain the only canonical/structured comparison surfaces
- **AND** no body-to-frontmatter inference or bulk migration SHALL be required

#### Scenario: Topic-state minor contract remains additive

- **WHEN** a caller uses an existing inspect, apply or recover form after the topic-state schema version becomes `1.1.0`
- **THEN** its established input semantics and result fields SHALL remain compatible
- **AND** only `enrich_seed` SHALL require the new action-specific UID/path/binding-repair result shape

### Requirement: Topic-state operations SHALL preserve scope and authority boundaries

Topic-state operations SHALL NOT mutate queue state/schema, work-unit attempts,
submitted ledger, status, trace, gates, handoffs, receipts, artifact/cache/
reference/final paths, artifact persistence state, profile fields or delivery
authority. New topic work SHALL require committed registry+current-seed
materialization. The CLI SHALL provide no force, generic delete, retire,
arbitrary patch, set-progress, set-status, reentry, override,
artifact/reference path move or historical-content rewrite operation.

The only layout operation SHALL be `apply` action `mutate_layout`: one complete
sanctioned-rerun target that may rename/reorder current registry coordinates,
update current seed projections and safely remove a never-worked topic.
Historical paths SHALL remain in place and previous slugs SHALL be provenance/
read compatibility only.

The existing `apply` seam SHALL additionally admit exactly one projection
operation shape: `context: wave_projection`,
`action: apply_seed_projection`, one current `topic_uid`, one closed
`wave0|wave1|wave2` value, and one or more owned slot updates. The input SHALL
be strict and SHALL NOT accept file paths, headings, token text, line numbers,
raw Markdown, arbitrary patch/append instructions, or a request to mutate any
surface other than the selected current seed document. Each Wave0 entry SHALL
bind to a retained submitted contribution identity that owns its exact entry in
the current direct source array; each Wave1 entry SHALL bind to one current
submitted work identity; and each Wave2 entry SHALL bind to one exact
current-round W2F finding identity whose accepted `affected_topics` resolution
includes the packet `topic_uid`. Each entry SHALL render the slot descriptor's
stable `entry_id`, and SHALL contain the accepted return-map fields or an
explicit deferred disposition. A Wave0 entry ID SHALL equal the exact
submission-owned global source ordinal returned by the shared contribution
reader; a Wave1 entry ID SHALL bind its exact submitted work ID plus positive
ordinal; and a Wave2 entry ID SHALL equal its exact source `W2F-*` finding ID.
The writer SHALL reject a mismatch before workspace creation and SHALL NOT
require the W2F ID to be duplicated in navigation `refs`.

Projection apply SHALL be authorized only inside the existing route-bound,
loaded current Wave phase and normal pre-completion window: Wave0 requires
`phases/phase-wave0.md` plus `seed_topics_ready` -> `wave0_complete`; Wave1
requires `phases/phase-wave1.md` plus `wave0_complete` -> `wave1_complete`; and
Wave2 requires `phases/phase-wave2.md` plus `wave1_complete` ->
`wave2_complete`. Each row SHALL also require its existing route-bound handoff
load witness. Projection apply SHALL verify current canonical UID/slug binding,
selected Wave-to-slot ownership, direct submitted-contribution/row/finding
eligibility, one unique recognized target for every selected slot, entry
identity, and the shared concrete-navigation rule before workspace creation.
An evidence-bearing entry has no forward-reference success path: it SHALL name
an existing safe concrete `reference/*.md` navigation target or use the
existing explicit deferred form. A missing target SHALL return one writer-owned
root with exact near-match candidates when the active reference namespace has
them; it SHALL not write the packet and SHALL not ask the Agent to alter ledger
or source authority.

Every slot selected by a packet SHALL have exactly one recognized target: its
canonical heading/card or a declared legacy heading base under the accepted
bounded suffix grammar. A partial or mixed layout from earlier legal upgrades
is valid. A valid operation SHALL stage and atomically replace only that seed
through the existing `_diagnostics/topic-state/<operation-id>/` workspace and
existing `recover`; it SHALL NOT stage or replace `rb_plan.md`.

Before prepared publication, the staged selected slot family SHALL be read by
the same structural entry parser used by readiness evaluation. Every preserved
and newly written entry boundary in that family SHALL remain independently
parseable; every selected `entry_id` SHALL occur exactly once; cards and
unrelated entries SHALL remain present; and token consumption SHALL be exact.
The writer SHALL preserve an explicit block separator on replacement or append.
A parser/postcondition failure SHALL reject before workspace publication with
one writer root rather than return `committed` and leave a later inspect to
discover concatenated neighboring entries. Token consumption, identity upsert,
card preservation, allowed targeted legacy heading/card upgrade, navigation
validation, and this whole-slot postcondition SHALL be part of the same
transaction. Projection apply SHALL NOT create submitted coverage, reference
files, source claims, findings, receipt rows, completion trace, or profile
projection.

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

`operate-topic-state` SHALL expose a read-only `schema --context <context>`
operation derived from the same accepted Zod input contracts used by `apply`.
For every supported context it SHALL return a bounded authoring projection of
the available action form(s), required and optional field paths, closed enum
vocabulary, nested value shapes, and a parseable illustrative template. The
projection visitor MAY unwrap an existing `ZodEffects` wrapper only to discover
its inner structural branch; it SHALL NOT serialize, restate, or reimplement a
refinement, transform, or cross-field rule. Every emitted illustrative template
SHALL pass the actual top-level `TopicApplyPlanSchema`. If an unsupported or
effect-dependent form cannot be structurally discovered and verified that way,
the schema operation SHALL fail closed with one structured framework-
configuration root and code `2`, rather than emit a partial or plausible
template. It SHALL NOT create a second validator, infer a context from bundle
state, claim that the selected lifecycle window is legal, or authorize an
`apply` mutation.

The only non-help topic-state forms SHALL be `inspect --bundle <bundle-path>`,
`schema --context <context>`, `apply --bundle <bundle-path> --input
<input-path>`, and `recover --bundle <bundle-path> --operation-id
<operation-id>`. Required options occur exactly once; no positional arguments
after the operation and no other option are accepted. An unknown context or
invalid operation/invocation shape SHALL return one direct code-`2` invocation
root before a bundle or workspace is read. A standalone `--help` or `-h` SHALL
list `inspect`, `schema`, `apply`, and `recover` with their accepted arguments,
exit `0`, and leave every bundle surface unchanged.

When `apply` reaches the existing Zod input validator and input is invalid, its
blocked result SHALL preserve the validator as the sole authority while adding
bounded safe `validation_errors[]`. Each item SHALL include a stable field path,
issue code/message, and only contract-safe expectation detail such as required
shape, closed allowed values, or received value type; it SHALL not echo arbitrary
input values, raw file bytes, or a stack trace. For a rejected recognized
`source_identity.kind` discriminator in `context: wave_projection`, its item
SHALL additionally expose an RFC 6901 `json_pointer` and `allowed_values` that
contain exactly the discriminator values legal for the supplied valid Wave:
`submitted_work` for Wave0/Wave1 and `finding` for Wave2. When the same
underlying Zod union declares a broader raw discriminator vocabulary, the item
MAY expose that fact separately as `schema_allowed_values`; it SHALL NOT present
that broader vocabulary as legal for the selected Wave. If the Wave itself is
absent or invalid, the result SHALL retain the ordinary validator feedback and
SHALL NOT invent a context-narrowed expectation. The result SHALL identify one
primary validation path, `repair_kind: agent_action`,
`repair_surface: retained_input`, and the same `apply` checkpoint. It SHALL
distinguish input repair from lifecycle/owner rejection: field-level input
detail does not turn a missing reentry witness, forbidden writer, or unavailable
mutation form into an Agent-writable path.

#### Scenario: Packet uses the existing atomic writer

- **WHEN** a loaded Wave1 phase submits a valid packet for mechanisms, trends
  and pending-question slots of one current topic
- **THEN** topic-state SHALL stage all three slot changes in one existing
  workspace transaction
- **AND** an invalid slot, identity, navigation target, or entry SHALL prevent
  any partial seed replacement

#### Scenario: Schema projection is discoverable but cannot authorize mutation

- **WHEN** an Agent invokes `operate-topic-state schema --context seed_topics`
  or another supported declared context
- **THEN** the command SHALL return the context's Zod-derived authoring
  projection without reading or writing a runtime bundle
- **AND** the response SHALL not claim that an apply window, topic identity, or
  writer authorization exists

#### Scenario: Refined form is not advertised without real-schema verification

- **WHEN** schema discovery reaches an existing effect-wrapped TopicApplyPlanSchema
  form
- **THEN** it MAY use the wrapped inner shape only for structural field discovery
- **AND** it SHALL emit a template only after the actual top-level schema accepts
  it, without reproducing the effect's cross-field rule
- **AND** an unsupported or unverifiable form SHALL instead return one bounded
  framework-configuration root with exit `2` and no bundle/workspace access

#### Scenario: Invalid apply gives safe field-level feedback before workspace creation

- **WHEN** a retained topic-state apply input supplies a scalar where a required
  list is expected or an unsupported closed enum value
- **THEN** the blocked result SHALL expose bounded `validation_errors[]` and a
  primary field path from the existing validator
- **AND** no workspace, plan/seed replacement, status, trace, ledger, or
  profile mutation SHALL occur
- **AND** the only repair loop SHALL remain correction of the retained input and
  rerun of the same `apply` checkpoint

#### Scenario: Wave projection discriminator feedback is context-precise

- **WHEN** a retained Wave0 projection packet reaches the existing
  `TopicApplyPlanSchema` with `source_identity.kind: "work_unit"`
- **THEN** its blocked result SHALL name
  `/updates/0/entries/0/source_identity/kind` as the `json_pointer`, expose
  `allowed_values: ["submitted_work"]`, identify the retained input as the
  Agent repair surface, and name the same `apply` rerun
- **AND** it MAY distinguish the raw
  `["submitted_work", "finding"]` union vocabulary from the Wave0-legal value
  without accepting, aliasing, or relabeling `work_unit`
- **AND** it SHALL create no workspace or mutation of plan, seed, queue,
  work-unit, ledger, status, trace, or profile authority

#### Scenario: A multi-Wave slot does not broaden a selected Wave's value

- **WHEN** a retained Wave1 projection packet selects `pending_questions` and
  reaches the existing validator with `source_identity.kind: "work_unit"`
- **THEN** its context-precise feedback SHALL retain
  `allowed_values: ["submitted_work"]` for Wave1 rather than treating the
  multi-Wave slot as permission for `finding`
- **AND** it SHALL preserve the same direct kind coordinate, retained-input
  repair surface, and no-mutation boundary

#### Scenario: Help never evaluates topic state

- **WHEN** `operate-topic-state.mjs --help` or `-h` is invoked
- **THEN** it SHALL exit `0` after static operation help
- **AND** it SHALL not parse an input file, inspect a bundle, create a workspace,
  or mutate canonical state
#### Scenario: Packet transaction does not rewrite plan authority

- **WHEN** a valid Wave packet materializes a projection for one current topic
- **THEN** its topic-state workspace manifest SHALL stage only that selected
  `seed_topics/<current-slug>.md` replacement
- **AND** it SHALL NOT stage or replace `rb_plan.md`

#### Scenario: Packet transaction does not rewrite profile authority

- **WHEN** a valid Wave packet materializes a projection for one current topic
- **THEN** its topic-state workspace manifest SHALL stage only that selected
  `seed_topics/<current-slug>.md` replacement
- **AND** it SHALL NOT stage or replace `rb_profile.yaml`
#### Scenario: Wave0 entry uses its contribution-owned ordinal

- **WHEN** an earlier accepted Wave0 source contribution owns global ordinals
  `1..19` and a later accepted append contribution owns ordinal `20`
- **THEN** a Wave0 packet SHALL accept `earlier-work-id/1..19` and
  `later-work-id/20` only at their exact source identities
- **AND** it SHALL reject a packet that assigns ordinal `20` to the earlier
  work ID

#### Scenario: Packet cannot select another Wave's slot

- **WHEN** a Wave0 packet selects `wave1_mechanisms` or `pending_questions`
- **THEN** apply SHALL reject before workspace creation with the exact
  Wave-to-slot ownership coordinate
- **AND** it SHALL NOT write a token, entry or generic status prose

#### Scenario: Current authority identity is required

- **WHEN** a Wave0/1 packet names a non-current or unsubmitted identity, or a
  Wave2 packet names an absent, legacy-round, unusable, or other-topic W2F
  finding
- **THEN** apply SHALL reject before workspace creation with that direct
  identity/authority root
- **AND** it SHALL NOT treat a seed entry as evidence authority
#### Scenario: Missing reference reports one actionable writer root

- **WHEN** an evidence-bearing packet entry names
  `reference/01-topic-source-01.md` that is absent while
  `reference/01-topic-source-1.md` exists
- **THEN** apply SHALL reject before workspace publication with the missing path
  and the near-match candidate
- **AND** it SHALL direct the Agent to the existing reference
  materialization/selection surface and the same apply checkpoint

#### Scenario: Existing malformed neighbor blocks publication

- **WHEN** a selected slot contains an entry whose boundary cannot be
  independently parsed after the proposed replacement
- **THEN** apply SHALL reject before workspace publication with one writer
  postcondition root
- **AND** it SHALL not claim a committed packet or require an unrelated Wave
  slot to be repaired

#### Scenario: Projection authorization does not create a new lifecycle

- **WHEN** a caller invokes a valid-looking projection packet outside the
  loaded corresponding Wave window, after Final without accepted reentry, or
  for an orphan/historical seed
- **THEN** apply SHALL reject before workspace creation with the existing
  lifecycle or canonical-binding owner boundary
- **AND** user direction, generic inspect, or existing result files SHALL NOT
  create permission

#### Scenario: Rerun is idempotent and Wave2 preserves Wave1 questions

- **WHEN** the same accepted packet is replayed, or Wave2 upserts a W2F entry
  in `pending_questions` after Wave1 entries exist
- **THEN** replay SHALL leave the seed unchanged without duplicating entries,
  concatenating the next entry, or re-injecting a consumed token
- **AND** Wave2 SHALL preserve Wave1 entries and modify only the matching W2F
  identity
#### Scenario: Legal packet atomically upgrades its declared legacy heading

- **WHEN** an otherwise legal packet targets one or more owned slots represented
  by their declared legacy heading bases under the accepted bounded suffix
  grammar
- **THEN** the same topic-state transaction SHALL replace only those targeted
  heading bases with their canonical bases, preserve any accepted suffix, insert
  their immutable `回填卡` blocks, and materialize the entries
- **AND** ordinary read/inspect, unrelated legacy headings, and a rejected
  packet SHALL leave legacy bytes unchanged

#### Scenario: Repeated readable headings are not a writable target

- **WHEN** a packet's target slot has multiple canonical/legacy heading matches
  under the accepted suffix grammar
- **THEN** apply SHALL reject with one `seed_projection_layout_ambiguous` root
  before workspace creation
- **AND** it SHALL not choose, rename or insert a card into any occurrence

#### Scenario: Structured style handoff retains the existing writer

- **WHEN** a committed topic-state mutation changes canonical registry length
  in a legal HITL1 or rerun window
- **THEN** its result SHALL expose the existing style CLI as the next owner with
  the committed topic count and exact rerun checkpoint
- **AND** topic-state SHALL not write, normalize, or infer
  `research_style_params`

#### Scenario: No length change does not invent style work

- **WHEN** a projection packet, enrichment write, rename, or reorder leaves
  registry length unchanged
- **THEN** topic-state SHALL not emit a style refresh obligation
- **AND** it SHALL not create a second lifecycle state or profile mutation

#### Scenario: Unrecognized layout remains read-compatible but is not guessed

- **WHEN** a packet selects a slot with no recognized canonical/card or
  declared legacy-heading target
- **THEN** projection apply SHALL reject with one
  `seed_projection_layout_missing` root before workspace creation
- **AND** it SHALL NOT infer headings, directly migrate bytes, or create a
  parallel success path

#### Scenario: Bounded layout mutation uses the existing authority path

- **WHEN** a sanctioned normal or post-final rerun submits a valid complete
  mutate-layout target
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
  from a lifecycle position without an accepted normal or post-final entry
  witness
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

## ADDED Requirements

### Requirement: Topic-state apply SHALL run one atomic prepared workspace with exact recovery

The framework SHALL expose one helper, one `operate-topic-state.mjs` CLI and one `_diagnostics/topic-state/<operation-id>/` workspace for `inspect|apply|recover`. All inspect and apply paths SHALL require a schema-valid canonical `rb_plan.md` before topic identity, seed binding, workspace, rerun, or recovery facts are evaluated. Apply SHALL prepare complete hash-bound replacements only for `rb_plan.md` and explicitly touched `seed_topics/*.md`, durably publish a prepared manifest, recheck expected hashes/path safety, atomically replace listed files, fsync parent directories and clean the workspace after commit.

For `mutate_layout`, the same workspace MAY additionally record hash-bound `cleanup_files[]` limited to superseded or safely removed seed files. Layout commit SHALL write new/current seed replacements, replace `rb_plan.md` last, then delete only listed old seed files whose bytes still match the prepared expected hash. Artifact/reference/final paths, queue/work-unit state, submitted outputs and immutable provenance SHALL remain outside the workspace. Layout-only mutation SHALL preserve existing direction/body guidance and SHALL NOT invent a new direction candidate.

Recovery SHALL be explicit: inspect or apply encountering an accepted workspace SHALL return one `recover` action with its operation id. `recover` SHALL use only the prepared manifest to complete exact staged replacements and seed cleanup or return blocked without overwrite/delete; it SHALL NOT accept new semantic input.

The caller SHALL retain the explicit apply-input file until commit. Durable prepared publication SHALL be the accepted recovery boundary. A crash before that boundary SHALL NOT be reported as an accepted operation; the retained input SHALL remain available for a fresh apply.

The prepared manifest SHALL record the complete originally proven authorization facts. For normal rerun this means the gate handoff and bound load identity. For post-final rerun it means recovery event id/index/exact-line SHA256, event-bound after-profile hash, bound rerun load index, exact exceptional `phase_transition` index/binding, and the incoming current-node/status window. For seed enrichment it means the setup/rerun source gate attempt, bound Seed Topics load identity and incoming current-node/status window. `recover` MAY finish that exact accepted operation after lifecycle position changes, but SHALL NOT accept new semantics, re-evaluate a new apply request or widen the staged file set.

#### Scenario: Crash after a partial accepted commit resumes exact bytes
- **WHEN** an accepted operation crashes after some staged seeds or plan bytes commit but before every replacement/seed cleanup completes
- **THEN** inspect SHALL return the exact recover command and recover SHALL resume the prepared bytes/cleanup or block on direct drift
- **AND** new topic work SHALL remain blocked while the accepted workspace exists

#### Scenario: Crash after plan replacement resumes exact seed bytes
> **@deprecated** - This pre-TopicTreeEvolution scenario name is retained for archive compatibility. Current operations publish new/current seeds before replacing the registry.
- **WHEN** a current accepted operation reaches `rb_plan.md` replacement and then crashes before seed cleanup or workspace cleanup
- **THEN** every staged current seed replacement SHALL already match its prepared bytes
- **AND** recovery SHALL complete only remaining hash-bound seed cleanup/workspace cleanup or block on direct drift

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

#### Scenario: Accepted recovery survives lifecycle drift
- **WHEN** a prepared manifest records valid original authorization and the bundle later moves to another lifecycle position before commit completes
- **THEN** exact recover MAY finish only the recorded staged replacements and seed cleanup
- **AND** it SHALL NOT authorize a fresh topic mutation in the new lifecycle position

#### Scenario: Writer postcondition fails closed
- **WHEN** the staged enrichment render does not pass the same canonical authoring evaluator before prepared publication
- **THEN** apply SHALL return a writer-owner missing-contract root without publishing or mutating authority
- **AND** queue completion or Gate SHALL NOT be used as a fallback writer

### Requirement: Topic-state input SHALL bind canonical identity and materialize plan, seed, and enrichment intent

When an accepted `add_topic` entry with `seed_binding: new` creates a seed without an existing projection, that staged seed SHALL contain a complete canonical skeleton before registry publication. Its frontmatter SHALL contain the exact UID-bound registry intent plus explicit gap-valued Agent-facing enrichment fields; its body SHALL contain the non-duplicating seed-topics initialization headings, a research-round append area, and exactly the accepted wave-specific placeholders `__BACKFILL_WAVE0_EVIDENCE__`, `__BACKFILL_WAVE1_MECHANISMS__`, `__BACKFILL_WAVE1_TRENDS__`, `__BACKFILL_WAVE2_JUDGMENT__`, and `__BACKFILL_PENDING_QUESTIONS__`. A new body SHALL NOT copy canonical `must_answer` or repeat structured `in_scope`, `out_of_scope`, or `evidence_route`; the Engine SHALL NOT use the closed `scope_role` enum value as topic-positioning prose and SHALL NOT introduce a second generic fill/backfill token family.

When an existing UID-bound seed is re-rendered for intent or current-layout mutation, canonical registry fields SHALL overwrite their matching frontmatter keys while non-canonical enrichment fields and the existing body SHALL be preserved. Topic-state mutation SHALL remain the atomic plan+seed writer; it SHALL NOT enqueue future wave work, allocate work units, or write submitted provenance.

`apply` SHALL additionally accept one mutually exclusive `enrich_seed` form with `context: seed_topics`, one non-empty `topic_uid` selector and one complete strict `enrichment` object. That object SHALL contain exactly `hypothesis`, `in_scope`, `out_of_scope`, `search_guardrails`, and `evidence_route`; the first three SHALL be non-empty strings, `search_guardrails` SHALL contain exactly non-empty-string arrays `required_terms` and `forbidden_broadening`, and `evidence_route` SHALL contain exactly non-empty-string arrays `preferred_sources` and `noise_to_avoid`. Each array SHALL contain at least one item. Explicit non-empty gap values SHALL be structurally legal and SHALL remain Agent judgment. Canonical fields, path/slug snapshots, unknown keys, partial patches and caller-provided defaults SHALL reject before workspace publication.

For `enrich_seed`, the Engine SHALL resolve `topic_uid` through the current canonical registry and derive the current seed path itself. It SHALL read the existing seed, preserve every non-canonical frontmatter key not replaced by the five accepted enrichment fields, overwrite those five fields from the complete validated input, overwrite the seven canonical binding fields from the resolved registry Topic, serialize frontmatter once through the existing YAML renderer, and preserve the exact lexical body suffix. That suffix begins immediately after the closing frontmatter delimiter's terminating LF (`---\n`); the renderer SHALL emit that delimiter LF followed by the captured suffix verbatim, without trimming, normalization or removal of an initial LF. An EOF closing delimiter has an empty suffix. It SHALL NOT infer identity from filename/body, rewrite a rerun direction or research appendix, generate enrichment semantics, or accept an arbitrary body/path patch.

Canonical binding equality SHALL mean recursive equality of parsed JSON-compatible values, not byte equality of YAML serialization. Value type, exact string code-point sequence and array order SHALL be significant; mapping key order, quoting style, scalar style and presentation whitespace SHALL not be significant. In particular, quoted, colon-bearing, multiline, CJK and other Unicode `must_answer` strings SHALL retain the exact parsed string values and array order after rendering; normalization, trimming, summarization or equivalent prose SHALL fail binding.

Before rendering `enrich_seed`, the existing shared seed authoring evaluator SHALL examine the current parseable seed against the resolved Topic. If it reports canonical drift, apply SHALL retain only its first fixed-order direct failure as a `binding_repair` result, use the existing canonical merge to repair all canonical fields in the same write, and SHALL NOT require or authorize a raw YAML identity edit. After rendering and before prepared publication, apply SHALL run the same evaluator over the staged path/bytes and SHALL publish no workspace if the writer postcondition fails. An invalid input, unknown UID, missing/unsafe seed, unparseable frontmatter or postcondition defect SHALL fail before authority mutation with one direct coordinate/owner and the same apply checkpoint when a legal repair exists. The Engine SHALL NOT add a second evaluator or silently discard a detected pre-render binding root.

One apply input SHALL contain exactly one of: a non-empty ordered list of `add_topic`/`update_intent`/`set_rerun_direction` actions; one complete `mutate_layout` target; or one complete `enrich_seed` target. `migrate_legacy` and any equivalent historical-plan reconciliation or adoption input SHALL reject before workspace creation, authority mutation, or seed/plan write. These forms SHALL NOT be mixed. `set_rerun_direction` SHALL be available only in a sanctioned rerun context; `enrich_seed` SHALL be available only in a legal Seed Topics context. A layout target SHALL carry `expected_plan_sha256`, enumerate every current UID exactly once across ordered retained topics and explicit remove UIDs, and SHALL let Engine derive continuous current ids/slugs. The Engine SHALL validate the complete target, dependencies, duplicate targets, safe-remove facts and staged replacements before prepared publication. Topic UID SHALL remain immutable; existing id/slug MAY change only through `mutate_layout`.

Existing pre-v0.50 seeds and in-flight queue cards SHALL remain read-compatible. Parseable legacy seeds MAY retain unknown non-canonical frontmatter keys and duplicate body `must_answer`/scope/evidence prose; `enrich_seed` SHALL preserve those body bytes, and deterministic binding/completion SHALL ignore that prose as authority. A legacy frontmatter parse error MAY require only a bounded Agent syntax repair to make the current seed parseable, after which the same `enrich_seed` apply SHALL restore canonical/structured ownership. No bulk seed or queue migration SHALL be required.

The topic-state input/result contract SHALL use schema version `1.1.0` for this additive apply form. A successful or unchanged `enrich_seed` result SHALL include `action: enrich_seed`, selected `topic_uid`, current `slug`, derived seed path, `verdict: committed|unchanged`, and nullable `binding_repair`. Existing `inspect|apply|recover` operations and remaining current apply input forms and their established result fields SHALL remain compatible; the minor version SHALL NOT create a second CLI route or require runtime data migration.

#### Scenario: Historical mutable plan stops at inspect boundary
- **WHEN** `rb_plan.md` omits `topic_registry_version: "2"` or uses only historical mutable topic entries
- **THEN** inspect SHALL return one current plan-contract blocker with no-write semantics
- **AND** it SHALL not expose `legacy` mode, `legacy_migration_required`, migration, adoption, upgrade, or raw-YAML repair

#### Scenario: Legacy migration input has no writer path
- **WHEN** `operate-topic-state apply` receives `migrate_legacy` or an equivalent historical-plan reconciliation input
- **THEN** it SHALL reject before workspace creation, plan replacement, seed write, or authority mutation

#### Scenario: Registry-external topic requires explicit adoption
- **WHEN** a historical registry-external slug is presented as migration or
  adoption input
- **THEN** apply SHALL reject before creating canonical identity or a seed
- **AND** it SHALL not grant authority to historical artifact/cache/reference/final files

#### Scenario: Multi-topic approval is one accepted change set
- **WHEN** HITL1/rerun apply contains multiple add-topic/update-intent/direction-only actions or one complete multi-topic layout target
- **THEN** the Engine SHALL validate and stage the final registry plus every touched current seed before prepared publication
- **AND** failure in any item SHALL leave the complete change set unaccepted and authority bytes unchanged

#### Scenario: Rerun add commits complete seed skeleton and direction before descendant work
- **WHEN** a sanctioned normal or post-final rerun applies `add_topic` for a new canonical Topic
- **THEN** the prepared change set SHALL contain the registry entry, matching complete UID-bound seed skeleton, and structurally valid target-round add direction
- **AND** the seed SHALL contain all accepted non-duplicating initialization headings and Wave0/Wave1/Wave2 placeholder set before seed-topics or Wave0 work begins
- **AND** queue, work-unit and submitted-ledger authority SHALL remain unchanged by topic-state apply

#### Scenario: New seed uses accepted wave-specific placeholders only
- **WHEN** topic-state renders a seed with no existing projection
- **THEN** the body SHALL contain each accepted wave-specific placeholder exactly once in its owned section
- **AND** it SHALL NOT contain `__BACKFILL_EVIDENCE__`, `__BACKFILL_MECHANISM__`, `__BACKFILL_TRENDS__`, `__BACKFILL_JUDGMENT__`, `__BACKFILL_QUESTIONS__`, or a new `__FILL_*__` protocol

#### Scenario: Existing seed enrichment survives canonical mutation
- **WHEN** update-intent, set-rerun-direction or current-layout mutation re-renders an existing UID-bound seed
- **THEN** registry-owned frontmatter fields SHALL reflect the committed canonical Topic
- **AND** existing Agent-facing enrichment/body sections SHALL remain byte-preserved except for explicit canonical field/title/path changes and the one sanctioned direction-section replacement

#### Scenario: Structured enrichment accepts only Agent-owned fields
- **WHEN** `enrich_seed` carries one complete valid five-field enrichment object for a current UID in a legal Seed Topics window
- **THEN** apply SHALL derive all canonical values/path from the registry, stage exactly that current seed plus the unchanged plan contract, and preserve queue/work-unit authority
- **AND** explicit gap strings SHALL remain legal without Engine semantic scoring

#### Scenario: Canonical or unknown input key fails before write
- **WHEN** `enrich_seed` input contains `must_answer`, another canonical key, an unknown key, a partial nested object or an empty required value
- **THEN** apply SHALL return one `input_invalid` coordinate and same apply rerun before workspace publication
- **AND** plan, seed, queue, status and trace bytes SHALL remain unchanged

#### Scenario: Lexical body suffix survives enrichment
- **WHEN** a current seed contains a deliberate blank line immediately after its closing frontmatter delimiter, Agent-authored Markdown, appendix tokens, a rerun direction or readable duplicate sections and valid structured enrichment is applied
- **THEN** the exact suffix after that delimiter's terminating LF, including its first blank-line LF, SHALL remain identical
- **AND** only the accepted frontmatter fields and YAML presentation MAY change

#### Scenario: Parsed canonical values survive YAML round trip
- **WHEN** registry canonical fields contain quoted, colon-bearing, multiline, CJK or other Unicode strings and ordered arrays
- **THEN** the first new-seed render and every `enrich_seed` render SHALL parse back to exactly the same typed values and array order
- **AND** equivalent YAML quoting or mapping key order SHALL NOT be treated as drift while normalized, trimmed, reordered or summarized strings SHALL be drift

#### Scenario: Must-answer drift is reported and repaired before completion
- **WHEN** the parseable current seed's `must_answer` differs from the current canonical Topic when `enrich_seed` starts
- **THEN** apply SHALL return the evaluator's `must_answer` mismatch as its one `binding_repair`, restore the registry value through the same canonical merge and pass the post-render evaluator before commit
- **AND** the Agent SHALL NOT hand-edit the canonical field or wait for queue completion to first learn of the drift

#### Scenario: Unparseable frontmatter does not trigger guessed salvage
- **WHEN** the current seed frontmatter cannot be parsed before enrichment rendering
- **THEN** apply SHALL fail before workspace publication with the exact parse root and same apply checkpoint
- **AND** it SHALL NOT guess body boundaries, overwrite the seed or reconstruct canonical YAML through a second writer

#### Scenario: Current seed task does not block its enrichment writer
- **WHEN** the selected UID has the current non-delegated `seed_topic_materialize` queue demand during a legal Seed Topics window
- **THEN** `enrich_seed` SHALL remain available and SHALL NOT fail solely on the canonical-intent active-work quiescence rule
- **AND** it SHALL neither terminalize nor otherwise mutate that queue demand

#### Scenario: Legacy duplicate body remains non-authoritative
- **WHEN** a parseable pre-v0.50 seed retains body copies of must-answer, scope or evidence-route prose
- **THEN** enrichment SHALL preserve those bytes while registry/frontmatter remain the only canonical/structured comparison surfaces
- **AND** no body-to-frontmatter inference or bulk migration SHALL be required

#### Scenario: Topic-state minor contract remains additive
- **WHEN** a caller uses an existing inspect, apply or recover form after the topic-state schema version becomes `1.1.0`
- **THEN** its established input semantics and result fields SHALL remain compatible
- **AND** only `enrich_seed` SHALL require the new action-specific UID/path/binding-repair result shape

### Requirement: Sanctioned lifecycle windows SHALL authorize every canonical topic mutation

For sanctioned rerun only, every `add_topic` or `update_intent` action SHALL carry one Agent-authored rerun-direction candidate with `rerun_count`, `action`, `new_search_dimensions`, `adjusted_depth`, `search_guardrails`, and `rationale_excerpt`. An existing Topic that needs only supplemental search/depth guidance without a canonical intent change SHALL use `set_rerun_direction` in the same ordered action list; that action SHALL carry `topic_uid` plus the same direction candidate and SHALL NOT change registry intent fields. HITL1 add/update inputs SHALL NOT carry rerun direction.

The topic-state input schema SHALL validate direction structure and cross-action mapping before workspace publication: `add_topic` requires direction `action: add`; `update_intent` and `set_rerun_direction` require `action: supplement`; direction count SHALL equal current accepted profile count plus one; and two actions in one plan SHALL NOT target the same existing UID or create two directions for one Topic. The candidate content remains Agent judgment grounded in recorded HITL2 rationale; Engine validation SHALL be limited to closed action/count/field/cardinality structure and SHALL NOT generate or semantically score the guidance.

Rerun apply SHALL render/replace exactly one canonical `## 本轮重跑方向` section in every touched add/update/direction-only seed inside the existing prepared plan+seed workspace. The staged seed, plan change when any, and direction candidate SHALL therefore share the existing durable prepared/recover boundary. A crash after accepted workspace publication SHALL recover the exact staged direction bytes; a crash before publication SHALL leave the retained caller input available for fresh apply. Direction-only plans SHALL stage only the named existing seeds plus an unchanged plan byte contract and SHALL return `unchanged` only when both registry/current seed bytes, including direction, already match.

For layout mutation, `affected_topic_uids` SHALL mean only removed UIDs and retained UIDs whose current id, slug or title differs in the final target. For an add/update/direction action plan it SHALL include every topic whose seed bytes are staged, including direction-only targets. For `enrich_seed` it SHALL contain exactly the selected current UID. Quiescence and seed mutation checks SHALL not block unrelated unchanged topics merely because a complete target lists them. If the rendered plan/current-seed bytes already match and no seed cleanup remains, apply SHALL return `unchanged` without workspace or follow-up. An unchanged `enrich_seed` result SHALL still return the selected UID/path and any observed-and-already-canonicalized binding repair shall be null.

Before workspace creation, `apply` SHALL authorize mutation from existing lifecycle facts rather than a caller-declared context flag. HITL1 apply SHALL require `rb_status.json#/current_node: phases/phase-hitl1.md` with the existing `current_gate: hitl1_recorded` / `next_gate: setup_ready` pre-gate window. Normal rerun apply SHALL require `current_node: phases/phase-rerun.md`, the latest valid non-superseded route-bound HITL2 gate-to-rerun load witness, and the incoming `current_gate: hitl2_recorded` / `next_gate: rerun_ready` window. Seed enrichment apply SHALL require `current_node: phases/phase-seed-topics.md`, the latest valid non-superseded route-bound setup-to-seed-topics or rerun-to-seed-topics load witness, and respectively the incoming `setup_ready -> seed_topics_ready` or `rerun_ready -> seed_topics_ready` status window.

Post-final rerun apply SHALL be authorized only after the accepted ReopenResearchPass operation has committed a valid non-superseded `post_final_reentry` event, current HITL2 profile semantics/hash still equal the event-bound after-profile, `enter-phase` has written a route-bound rerun `load_complete` referencing that exact recovery event, existing `advance-status --to hitl2_recorded` has written the matching exceptional `phase_transition`, `current_node` is `phases/phase-rerun.md`, and the incoming `hitl2_recorded -> rerun_ready` status window remains intact. A caller-declared `human-directed`, rerun, seed-topics or recovery context SHALL NOT substitute for any required witness class, the accepted profile, or the existing status-sync step.

`set_rerun_direction` and `mutate_layout` SHALL be authorized only in a sanctioned normal or post-final rerun context. `enrich_seed` SHALL be authorized only after one accepted setup/rerun source route has entered Seed Topics. Other post-final, stale/missing-witness and arbitrary maintenance invocation SHALL reject without workspace or authority mutation. Only a current `seed_topic_materialize` queue completion and a final `seed-topics-ready` Gate that each establish that same legal Seed Topics window MAY project `enrich_seed` as an executable `engine_operation`; their bounded parse-repair feedback is likewise legal only in that window. Generic topic-state inspect SHALL remain read-only, report a direct mismatch with `repair_kind: missing_contract` that identifies its no-write inspection boundary and the current lifecycle owner (plus an absent authoring window when applicable), and SHALL NOT mint either an `enrich_seed` or raw-YAML repair route.

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

### Requirement: Topic-state operations SHALL NOT touch non-topic authority surfaces

Topic-state operations SHALL NOT mutate queue state/schema, work-unit attempts,
submitted ledger, status, trace, gates, handoffs, receipts, artifact/cache/
reference/final paths, artifact persistence state, profile fields or delivery
authority. New topic work SHALL require committed registry+current-seed
materialization. The CLI SHALL provide no force, generic delete, retire,
arbitrary patch, set-progress, set-status, reentry, override,
artifact/reference path move or historical-content rewrite operation.

`operate-topic-state` SHALL expose a read-only `schema --context <context>`
operation derived from the same accepted Zod input contracts used by `apply`.
For every supported context it SHALL return a bounded authoring projection of
the available action form(s), required and optional field paths, closed enum
vocabulary, nested value shapes, and a parseable illustrative template. The
projection visitor MAY unwrap an existing `ZodEffects` wrapper only to discover
its inner structural branch; it SHALL NOT serialize, restate, or reimplement a
refinement, transform, or cross-field rule. Every emitted illustrative template
SHALL pass the actual top-level `TopicApplyPlanSchema`. If an unsupported or
effect-dependent form cannot be structurally discovered and verified that way,
the schema operation SHALL fail closed with one structured framework-
configuration root and code `2`, rather than emit a partial or plausible
template. It SHALL NOT create a second validator, infer a context from bundle
state, claim that the selected lifecycle window is legal, or authorize an
`apply` mutation.

The only non-help topic-state forms SHALL be `inspect --bundle <bundle-path>`,
`schema --context <context>`, `apply --bundle <bundle-path> --input
<input-path>`, and `recover --bundle <bundle-path> --operation-id
<operation-id>`. Required options occur exactly once; no positional arguments
after the operation and no other option are accepted. An unknown context or
invalid operation/invocation shape SHALL return one direct code-`2` invocation
root before a bundle or workspace is read. A standalone `--help` or `-h` SHALL
list `inspect`, `schema`, `apply`, and `recover` with their accepted arguments,
exit `0`, and leave every bundle surface unchanged.

#### Scenario: Schema projection is discoverable but cannot authorize mutation
- **WHEN** an Agent invokes `operate-topic-state schema --context seed_topics`
  or another supported declared context
- **THEN** the command SHALL return the context's Zod-derived authoring
  projection without reading or writing a runtime bundle
- **AND** the response SHALL not claim that an apply window, topic identity, or
  writer authorization exists

#### Scenario: Refined form is not advertised without real-schema verification
- **WHEN** schema discovery reaches an existing effect-wrapped TopicApplyPlanSchema
  form
- **THEN** it MAY use the wrapped inner shape only for structural field discovery
- **AND** it SHALL emit a template only after the actual top-level schema accepts
  it, without reproducing the effect's cross-field rule
- **AND** an unsupported or unverifiable form SHALL instead return one bounded
  framework-configuration root with exit `2` and no bundle/workspace access

#### Scenario: Help never evaluates topic state
- **WHEN** `operate-topic-state.mjs --help` or `-h` is invoked
- **THEN** it SHALL exit `0` after static operation help
- **AND** it SHALL not parse an input file, inspect a bundle, create a workspace,
  or mutate canonical state

#### Scenario: Packet transaction does not rewrite plan authority
- **WHEN** a valid Wave packet materializes a projection for one current topic
- **THEN** its topic-state workspace manifest SHALL stage only that selected
  `seed_topics/<current-slug>.md` replacement
- **AND** it SHALL NOT stage or replace `rb_plan.md`

#### Scenario: Packet transaction does not rewrite profile authority
- **WHEN** a valid Wave packet materializes a projection for one current topic
- **THEN** its topic-state workspace manifest SHALL stage only that selected
  `seed_topics/<current-slug>.md` replacement
- **AND** it SHALL NOT stage or replace `rb_profile.yaml`

### Requirement: Wave projection packets SHALL be the one strict seed-projection write seam

The existing `apply` seam SHALL additionally admit exactly one projection
operation shape: `context: wave_projection`,
`action: apply_seed_projection`, one current `topic_uid`, one closed
`wave0|wave1|wave2` value, and one or more owned slot updates. The input SHALL
be strict and SHALL NOT accept file paths, headings, token text, line numbers,
raw Markdown, arbitrary patch/append instructions, or a request to mutate any
surface other than the selected current seed document. Each Wave0 entry SHALL
bind to a retained submitted contribution identity that owns its exact entry in
the current direct source array; each Wave1 entry SHALL bind to one current
submitted work identity; and each Wave2 entry SHALL bind to one exact
current-round W2F finding identity whose accepted `affected_topics` resolution
includes the packet `topic_uid`. Each entry SHALL render the slot descriptor's
stable `entry_id`, and SHALL contain the accepted return-map fields or an
explicit deferred disposition. A Wave0 entry ID SHALL equal the exact
submission-owned global source ordinal returned by the shared contribution
reader; a Wave1 entry ID SHALL bind its exact submitted work ID plus positive
ordinal; and a Wave2 entry ID SHALL equal its exact source `W2F-*` finding ID.
The writer SHALL reject a mismatch before workspace creation and SHALL NOT
require the W2F ID to be duplicated in navigation `refs`.

When `apply` reaches the existing Zod input validator and input is invalid, its
blocked result SHALL preserve the validator as the sole authority while adding
bounded safe `validation_errors[]`. Each item SHALL include a stable field path,
issue code/message, and only contract-safe expectation detail such as required
shape, closed allowed values, or received value type; it SHALL not echo arbitrary
input values, raw file bytes, or a stack trace. For a rejected recognized
`source_identity.kind` discriminator in `context: wave_projection`, its item
SHALL additionally expose an RFC 6901 `json_pointer` and `allowed_values` that
contain exactly the discriminator values legal for the supplied valid Wave:
`submitted_work` for Wave0/Wave1 and `finding` for Wave2. When the same
underlying Zod union declares a broader raw discriminator vocabulary, the item
MAY expose that fact separately as `schema_allowed_values`; it SHALL NOT present
that broader vocabulary as legal for the selected Wave. If the Wave itself is
absent or invalid, the result SHALL retain the ordinary validator feedback and
SHALL NOT invent a context-narrowed expectation. The result SHALL identify one
primary validation path, `repair_kind: agent_action`,
`repair_surface: retained_input`, and the same `apply` checkpoint. It SHALL
distinguish input repair from lifecycle/owner rejection: field-level input
detail does not turn a missing reentry witness, forbidden writer, or unavailable
mutation form into an Agent-writable path.

#### Scenario: Packet uses the existing atomic writer
- **WHEN** a loaded Wave1 phase submits a valid packet for mechanisms, trends
  and pending-question slots of one current topic
- **THEN** topic-state SHALL stage all three slot changes in one existing
  workspace transaction
- **AND** an invalid slot, identity, navigation target, or entry SHALL prevent
  any partial seed replacement

#### Scenario: Invalid apply gives safe field-level feedback before workspace creation
- **WHEN** a retained topic-state apply input supplies a scalar where a required
  list is expected or an unsupported closed enum value
- **THEN** the blocked result SHALL expose bounded `validation_errors[]` and a
  primary field path from the existing validator
- **AND** no workspace, plan/seed replacement, status, trace, ledger, or
  profile mutation SHALL occur
- **AND** the only repair loop SHALL remain correction of the retained input and
  rerun of the same `apply` checkpoint

#### Scenario: Wave projection discriminator feedback is context-precise
- **WHEN** a retained Wave0 projection packet reaches the existing
  `TopicApplyPlanSchema` with `source_identity.kind: "work_unit"`
- **THEN** its blocked result SHALL name
  `/updates/0/entries/0/source_identity/kind` as the `json_pointer`, expose
  `allowed_values: ["submitted_work"]`, identify the retained input as the
  Agent repair surface, and name the same `apply` rerun
- **AND** it MAY distinguish the raw
  `["submitted_work", "finding"]` union vocabulary from the Wave0-legal value
  without accepting, aliasing, or relabeling `work_unit`
- **AND** it SHALL create no workspace or mutation of plan, seed, queue,
  work-unit, ledger, status, trace, or profile authority

#### Scenario: A multi-Wave slot does not broaden a selected Wave's value
- **WHEN** a retained Wave1 projection packet selects `pending_questions` and
  reaches the existing validator with `source_identity.kind: "work_unit"`
- **THEN** its context-precise feedback SHALL retain
  `allowed_values: ["submitted_work"]` for Wave1 rather than treating the
  multi-Wave slot as permission for `finding`
- **AND** it SHALL preserve the same direct kind coordinate, retained-input
  repair surface, and no-mutation boundary

#### Scenario: Wave0 entry uses its contribution-owned ordinal
- **WHEN** an earlier accepted Wave0 source contribution owns global ordinals
  `1..19` and a later accepted append contribution owns ordinal `20`
- **THEN** a Wave0 packet SHALL accept `earlier-work-id/1..19` and
  `later-work-id/20` only at their exact source identities
- **AND** it SHALL reject a packet that assigns ordinal `20` to the earlier
  work ID

#### Scenario: Packet cannot select another Wave's slot
- **WHEN** a Wave0 packet selects `wave1_mechanisms` or `pending_questions`
- **THEN** apply SHALL reject before workspace creation with the exact
  Wave-to-slot ownership coordinate
- **AND** it SHALL NOT write a token, entry or generic status prose

#### Scenario: Current authority identity is required
- **WHEN** a Wave0/1 packet names a non-current or unsubmitted identity, or a
  Wave2 packet names an absent, legacy-round, unusable, or other-topic W2F
  finding
- **THEN** apply SHALL reject before workspace creation with that direct
  identity/authority root
- **AND** it SHALL NOT treat a seed entry as evidence authority

#### Scenario: Missing reference reports one actionable writer root
- **WHEN** an evidence-bearing packet entry names
  `reference/01-topic-source-01.md` that is absent while
  `reference/01-topic-source-1.md` exists
- **THEN** apply SHALL reject before workspace publication with the missing path
  and the near-match candidate
- **AND** it SHALL direct the Agent to the existing reference
  materialization/selection surface and the same apply checkpoint

#### Scenario: Existing malformed neighbor blocks publication
- **WHEN** a selected slot contains an entry whose boundary cannot be
  independently parsed after the proposed replacement
- **THEN** apply SHALL reject before workspace publication with one writer
  postcondition root
- **AND** it SHALL not claim a committed packet or require an unrelated Wave
  slot to be repaired

#### Scenario: Rerun is idempotent and Wave2 preserves Wave1 questions
- **WHEN** the same accepted packet is replayed, or Wave2 upserts a W2F entry
  in `pending_questions` after Wave1 entries exist
- **THEN** replay SHALL leave the seed unchanged without duplicating entries,
  concatenating the next entry, or re-injecting a consumed token
- **AND** Wave2 SHALL preserve Wave1 entries and modify only the matching W2F
  identity

#### Scenario: Legal packet atomically upgrades its declared legacy heading
- **WHEN** an otherwise legal packet targets one or more owned slots represented
  by their declared legacy heading bases under the accepted bounded suffix
  grammar
- **THEN** the same topic-state transaction SHALL replace only those targeted
  heading bases with their canonical bases, preserve any accepted suffix, insert
  their immutable `回填卡` blocks, and materialize the entries
- **AND** ordinary read/inspect, unrelated legacy headings, and a rejected
  packet SHALL leave legacy bytes unchanged

#### Scenario: Repeated readable headings are not a writable target
- **WHEN** a packet's target slot has multiple canonical/legacy heading matches
  under the accepted suffix grammar
- **THEN** apply SHALL reject with one `seed_projection_layout_ambiguous` root
  before workspace creation
- **AND** it SHALL not choose, rename or insert a card into any occurrence

### Requirement: Projection apply SHALL be authorized inside the route-bound loaded Wave phase with exact slot postconditions

Projection apply SHALL be authorized only inside the existing route-bound,
loaded current Wave phase and normal pre-completion window: Wave0 requires
`phases/phase-wave0.md` plus `seed_topics_ready` -> `wave0_complete`; Wave1
requires `phases/phase-wave1.md` plus `wave0_complete` -> `wave1_complete`; and
Wave2 requires `phases/phase-wave2.md` plus `wave1_complete` ->
`wave2_complete`. Each row SHALL also require its existing route-bound handoff
load witness. Projection apply SHALL verify current canonical UID/slug binding,
selected Wave-to-slot ownership, direct submitted-contribution/row/finding
eligibility, one unique recognized target for every selected slot, entry
identity, and the shared concrete-navigation rule before workspace creation.
An evidence-bearing entry has no forward-reference success path: it SHALL name
an existing safe concrete `reference/*.md` navigation target or use the
existing explicit deferred form. A missing target SHALL return one writer-owned
root with exact near-match candidates when the active reference namespace has
them; it SHALL not write the packet and SHALL not ask the Agent to alter ledger
or source authority.

Every slot selected by a packet SHALL have exactly one recognized target: its
canonical heading/card or a declared legacy heading base under the accepted
bounded suffix grammar. A partial or mixed layout from earlier legal upgrades
is valid. A valid operation SHALL stage and atomically replace only that seed
through the existing `_diagnostics/topic-state/<operation-id>/` workspace and
existing `recover`; it SHALL NOT stage or replace `rb_plan.md`.

Before prepared publication, the staged selected slot family SHALL be read by
the same structural entry parser used by readiness evaluation. Every preserved
and newly written entry boundary in that family SHALL remain independently
parseable; every selected `entry_id` SHALL occur exactly once; cards and
unrelated entries SHALL remain present; and token consumption SHALL be exact.
The writer SHALL preserve an explicit block separator on replacement or append.
A parser/postcondition failure SHALL reject before workspace publication with
one writer root rather than return `committed` and leave a later inspect to
discover concatenated neighboring entries. Token consumption, identity upsert,
card preservation, allowed targeted legacy heading/card upgrade, navigation
validation, and this whole-slot postcondition SHALL be part of the same
transaction. Projection apply SHALL NOT create submitted coverage, reference
files, source claims, findings, receipt rows, completion trace, or profile
projection.

#### Scenario: Projection authorization does not create a new lifecycle
- **WHEN** a caller invokes a valid-looking projection packet outside the
  loaded corresponding Wave window, after Final without accepted reentry, or
  for an orphan/historical seed
- **THEN** apply SHALL reject before workspace creation with the existing
  lifecycle or canonical-binding owner boundary
- **AND** user direction, generic inspect, or existing result files SHALL NOT
  create permission

### Requirement: Layout mutation and post-final reentry SHALL stay bounded sanctioned operations

The only layout operation SHALL be `apply` action `mutate_layout`: one complete
sanctioned-rerun target that may rename/reorder current registry coordinates,
update current seed projections and safely remove a never-worked topic.
Historical paths SHALL remain in place and previous slugs SHALL be provenance/
read compatibility only.

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
- **WHEN** a sanctioned normal or post-final rerun submits a valid complete
  mutate-layout target
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
  from a lifecycle position without an accepted normal or post-final entry
  witness
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

