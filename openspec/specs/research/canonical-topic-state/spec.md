# Canonical Topic State

> req: CTS-001, CTS-002, CTS-003, CTS-004, CTS-005, CTS-006, CTS-007, CTS-008, CTS-009, CTS-010, CTS-011, CTS-012

> delta-synced: extend-mutate-layout-to-hitl1 (CTS-004, CTS-006)

## Purpose

Define the canonical topic registry, progress read model, atomic mutation workspace, and scope/authority boundaries. The topic registry in `rb_plan.md` is the bundle's only canonical topic identity owner. Progress is projected from direct runtime facts without persistence. Mutation goes through a single `operate-topic-state.mjs` CLI with exactly `inspect|apply|recover` mutations plus the read-only `schema` authoring projection, and one `_diagnostics/topic-state/<operation-id>/` workspace.
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
### Requirement: Wave0 deferred-contribution packets SHALL atomically expand exact retained source identities in the current direct source array

The existing `context: wave_projection`, `action: apply_seed_projection` input SHALL additionally accept one strict Wave0 contribution-scoped deferred-disposition form: its sole `wave0_evidence` update SHALL contain `deferred_contribution` with `source_identity: { kind: submitted_work, work_id }`, one `evidence_meaning`, and one `next_hop`. The existing `submitted_work` value is a source-identity wire discriminator, not aggregate coverage. In this form it is a contribution selector, not a complete individual source identity: only the writer may pair the work ID with derived `<work_id>/<ordinal>` entry IDs. The form SHALL not accept a bare aggregate acknowledgement, a caller-selected ordinal range, file paths, raw Markdown, another Wave's identity form, or caller-selected relationship/status/refs values.

Before workspace creation, the existing topic-state writer SHALL resolve the retained authenticated submitted contribution and derive every still-unprojected source identity it owns in the current direct source array. It SHALL expand that one input atomically into individual persisted return-map entries whose identities are exact `<work_id>/<ordinal>` values and whose deferred disposition preserves the submitted contribution's supplied meaning and next hop. For each derived entry, the writer SHALL use the existing explicit-limitation values `relationship: defers`, `refs: [none]`, and `status: deferred`; `next_hop` SHALL satisfy the existing limitation rule. The expansion SHALL not create submitted authority, reference files, cache facts, a source catalog, a new status, or a second transaction mechanism.

The writer SHALL reject an unsubmitted, ambiguous, superseded, cross-topic, or non-retained contribution that owns no identity in the current direct source array; a conflicting already materialized/deferred source identity; and any packet that would overwrite a different disposition. Exact replay of an already committed equivalent contribution form SHALL remain idempotent. Existing explicit Wave0 entry packets SHALL remain valid and retain their existing validation and navigation requirements. A later submitted append contribution SHALL own only its own source identities and SHALL not be implicitly deferred by an earlier contribution packet.

#### Scenario: one deferred intent expands only its contribution interval

- **WHEN** a current submitted Wave0 contribution owns identities `work-a/1` through `work-a/19` and a later contribution owns `work-b/20`
- **THEN** one valid deferred-contribution packet for `work-a` SHALL persist deferred entries only for `work-a/1` through `work-a/19`
- **AND** `work-b/20` SHALL remain available for its own projection or deferred disposition

#### Scenario: deferred expansion is atomic and collision-safe

- **WHEN** a contribution-scoped deferred packet would collide with an already materialized entry or a different persisted deferred disposition
- **THEN** topic-state apply SHALL reject before workspace publication
- **AND** it SHALL not persist a partial subset of the contribution identities

#### Scenario: equivalent deferred replay is idempotent

- **WHEN** the same accepted contribution-scoped deferred packet is replayed after its successful commit
- **THEN** the writer SHALL leave the seed projection unchanged without duplicating identity-bound entries or consuming another token
- **AND** the result SHALL preserve the same apply/recover ownership boundary

#### Scenario: explicit entry packets remain supported

- **WHEN** a Wave0 Phase Agent supplies valid explicit entries for exact retained source identities in the current direct source array
- **THEN** the writer SHALL continue to validate and commit them through the existing packet path
- **AND** it SHALL not require conversion to the deferred-contribution form

### Requirement: Wave0 deferred-contribution guidance and feedback SHALL state the disposition-compatibility precondition and explicit-entry recovery

The existing contribution-wide `deferred_contribution` selector SHALL be
documented as all-or-nothing with respect to disposition compatibility: it is
legal only while every identity of the selected submitted contribution is
unprojected, or already holds the same equivalent deferred disposition. When
any selected identity already has a different persisted projection (for example
an explicit materialized entry), the existing writer SHALL reject the whole
packet atomically before any workspace or seed mutation, and the collision
feedback SHALL name the direct legal recovery: apply explicit `wave0_evidence`
entries for each remaining authoritative ordinal, then rerun the same inspect.
The documented contract and the writer behavior SHALL NOT permit overwriting a
different disposition, silently converting the selector into a subset
operation, or a raw-edit repair path.

#### Scenario: Playbook states the precondition

- **WHEN** a reader loads the contribution-wide deferred form in the operate-topic-state command playbook
- **THEN** the text SHALL state that every selected identity must be unprojected or already an equivalent deferred entry
- **AND** it SHALL direct a mixed contribution to explicit remaining-ordinal packets and the same inspect rerun

#### Scenario: Collision feedback names the recovery

- **WHEN** the writer rejects a contribution-wide deferred packet because a selected identity has a different persisted disposition
- **THEN** the feedback SHALL name the direct legal recovery of explicit `wave0_evidence` entries for the remaining ordinals
- **AND** the existing atomic non-overwrite rejection SHALL remain unchanged

#### Scenario: Writer behavior is not changed

- **WHEN** an explicit materialization is followed by a deferred selector for the same contribution
- **THEN** the existing writer SHALL keep rejecting the whole packet before publication
- **AND** the existing regression test for that rejection SHALL remain green

### Requirement: Topic registry SHALL own current and previous layout coordinates

Every canonical topic SHALL retain immutable `topic_uid`, one current `id/slug`, and a unique ordered `previous_layouts[]` containing only superseded `{id,slug}` coordinates. Current and previous slugs across the complete registry SHALL resolve to exactly one UID. Previous layouts SHALL NOT create enqueue eligibility, progress state, path aliases, symlinks or a second registry.

When a valid layout target restores one UID to its own previous slug, the Engine SHALL promote that coordinate to current, remove it from `previous_layouts[]`, and append the superseded current coordinate once. A target slug present under another UID's current/history lineage SHALL remain a collision.

Remove SHALL be accepted only for a UID with no queue/work-unit/ledger/artifact/reference facts and no inbound topic dependency. A topic with historical facts SHALL remain canonical and removal SHALL fail before workspace creation; TopicTreeEvolution SHALL NOT add retired state or erase provenance.

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

### Requirement: Canonical reference binding SHALL resolve exact UID subsets

The shared Reference Markdown binding adapter SHALL resolve one scalar current
UID, the `all` sentinel, or a non-empty duplicate-free `related_topic_uids`
array of current registered UIDs into one canonical Topic-set conclusion. UID
array members SHALL be exact registered UIDs; unknown, duplicate, empty,
non-array, and conflicting simultaneous current binding forms SHALL fail with
one direct binding diagnostic.

`related_topic` is a retired historical reader form. Metadata containing that
key, whether alone or beside an otherwise valid current UID form, SHALL return
one `reference_topic_binding_legacy_unsupported` result. The adapter SHALL NOT
parse current/previous ids or slugs from that field, prefer a UID field, infer
a replacement binding, or create an alias path. A legacy-only rejection is a
current Engine boundary, not a request or permission to alter historical bytes.

#### Scenario: Exact UID subset resolves through the common adapter

- **WHEN** reference metadata contains `related_topic_uids` with two distinct
  registered current UIDs and no `related_topic`
- **THEN** the adapter SHALL resolve exactly those two canonical Topics
- **AND** it SHALL not require a slug, id, `all`, or legacy field

#### Scenario: Duplicate UID subset fails at one direct boundary

- **WHEN** `related_topic_uids` repeats a registered UID
- **THEN** the adapter SHALL reject the reference binding with one duplicate
  binding result
- **AND** it SHALL not broaden or silently deduplicate the declared scope

#### Scenario: Legacy-only binding is unsupported by the current reader

- **WHEN** a historical reference contains `related_topic` but no current UID
  binding form
- **THEN** the adapter SHALL return one
  `reference_topic_binding_legacy_unsupported` result at the metadata boundary
- **AND** it SHALL not resolve its id, slug, sentinel, or comma-separated list

#### Scenario: Dual binding does not preserve the retired reader branch

- **WHEN** a reference contains a valid current UID form and `related_topic`
- **THEN** the adapter SHALL return the same
  `reference_topic_binding_legacy_unsupported` result
- **AND** it SHALL not select either field by precedence

### Requirement: Wave1 review selection SHALL bind canonical topic identity and current intent

Before a Wave1 carried-target declaration can be normalized, the Engine SHALL select the existing `artifacts/wave1/{layout}/depth-review.yaml` through accepted topic-layout facts and resolve it to exactly one current canonical `topic_uid`. It SHALL derive an intent binding from the current registry title, must-answer set, scope role, and dependencies. A current/previous-layout filename fallback alone SHALL NOT establish this binding.

An identifier-only layout change MAY reuse one unambiguous UID-bound review only while the derived intent binding remains equal. A changed binding SHALL require the existing Wave1 Phase owner to refresh the review before the next Wave1 receipt; the selector SHALL NOT fuzzy-match question prose or create a slug alias map.

#### Scenario: layout-only reuse remains bounded
- **WHEN** one prior layout path resolves to the current topic UID and current intent binding
- **THEN** Wave1 MAY normalize that one review for a new Gate receipt
- **AND** it SHALL not copy the review into a second declaration path

#### Scenario: changed intent blocks stale review reuse
- **WHEN** the review resolves to the same UID but its current registry intent binding differs
- **THEN** the Wave1 declaration is not current and the Gate directs repair to that depth review
- **AND** Wave2 SHALL not consume an old receipt as coverage for the changed intent

### Requirement: `operate-topic-state schema --context wave_projection` SHALL expose wave-dependent source-identity forms

The read-only `operate-topic-state schema --context wave_projection` authoring
projection SHALL expose the allowed `source_identity` form per wave: Wave0/Wave1
entries use `{ kind: "submitted_work", work_id }`, and Wave2 `wave2_judgment`
entries use `{ kind: "finding", finding_id }` with `entry_id` equal to the
finding id. An author SHALL be able to construct a valid `apply_seed_projection`
packet from the schema output alone, without reading Engine source.

#### Scenario: schema output shows the wave2 finding identity form

- **WHEN** an Agent requests the `wave_projection` schema context
- **THEN** the output shows both allowed `source_identity` forms and the slot or
  wave to which each applies
- **AND** the Wave2 `entry_id === finding_id` rule is visible

#### Scenario: a packet built from schema output is accepted

- **WHEN** an Agent builds a `wave2_judgment` entry using
  `{ kind: "finding", finding_id: "W2F-001" }` with `entry_id: "W2F-001"` per the
  schema projection
- **THEN** the apply is not rejected for a hidden `source_identity` constraint
