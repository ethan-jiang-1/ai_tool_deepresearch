> req: CTS-003

## MODIFIED Requirements

### Requirement: Canonical topic mutation SHALL atomically materialize plan and seed intent

The framework SHALL expose one helper, one `operate-topic-state.mjs` CLI and one `_diagnostics/topic-state/<operation-id>/` workspace for `inspect|apply|recover`. `apply` action `migrate_legacy` SHALL require explicit semantics for every legacy registry entry and SHALL allow an explicit `adopt` entry for a registry-external slug detected by C1; adoption MAY bind one exact existing seed or stage one seed skeleton but SHALL NOT move or authorize historical content files. Apply SHALL prepare complete hash-bound replacements only for `rb_plan.md` and explicitly touched `seed_topics/*.md`, durably publish a prepared manifest, recheck expected hashes/path safety, atomically replace listed files, fsync parent directories and clean the workspace after commit.

When an accepted `add_topic` or `migrate_legacy` entry with `seed_binding: new` creates a seed without an existing projection, that staged seed SHALL contain a complete canonical skeleton before registry publication. Its frontmatter SHALL contain the exact UID-bound registry intent plus explicit gap-valued Agent-facing enrichment fields; its body SHALL contain the non-duplicating seed-topics initialization headings, a research-round append area, and exactly the accepted wave-specific placeholders `__BACKFILL_WAVE0_EVIDENCE__`, `__BACKFILL_WAVE1_MECHANISMS__`, `__BACKFILL_WAVE1_TRENDS__`, `__BACKFILL_WAVE2_JUDGMENT__`, and `__BACKFILL_PENDING_QUESTIONS__`. A new body SHALL NOT copy canonical `must_answer` or repeat structured `in_scope`, `out_of_scope`, or `evidence_route`; the Engine SHALL NOT use the closed `scope_role` enum value as topic-positioning prose and SHALL NOT introduce a second generic fill/backfill token family.

When an existing UID-bound seed is re-rendered for intent or current-layout mutation, canonical registry fields SHALL overwrite their matching frontmatter keys while non-canonical enrichment fields and the existing body SHALL be preserved. Topic-state mutation SHALL remain the atomic plan+seed writer; it SHALL NOT enqueue future wave work, allocate work units, or write submitted provenance.

`apply` SHALL additionally accept one mutually exclusive `enrich_seed` form with `context: seed_topics`, one non-empty `topic_uid` selector and one complete strict `enrichment` object. That object SHALL contain exactly `hypothesis`, `in_scope`, `out_of_scope`, `search_guardrails`, and `evidence_route`; the first three SHALL be non-empty strings, `search_guardrails` SHALL contain exactly non-empty-string arrays `required_terms` and `forbidden_broadening`, and `evidence_route` SHALL contain exactly non-empty-string arrays `preferred_sources` and `noise_to_avoid`. Each array SHALL contain at least one item. Explicit non-empty gap values SHALL be structurally legal and SHALL remain Agent judgment. Canonical fields, path/slug snapshots, unknown keys, partial patches and caller-provided defaults SHALL reject before workspace publication.

For `enrich_seed`, the Engine SHALL resolve `topic_uid` through the current canonical registry and derive the current seed path itself. It SHALL read the existing seed, preserve every non-canonical frontmatter key not replaced by the five accepted enrichment fields, overwrite those five fields from the complete validated input, overwrite the seven canonical binding fields from the resolved registry Topic, serialize frontmatter once through the existing YAML renderer, and preserve exactly every body byte after the closing frontmatter delimiter. It SHALL NOT infer identity from filename/body, rewrite a rerun direction or research appendix, generate enrichment semantics, or accept an arbitrary body/path patch.

Canonical binding equality SHALL mean recursive equality of parsed JSON-compatible values, not byte equality of YAML serialization. Value type, exact string code-point sequence and array order SHALL be significant; mapping key order, quoting style, scalar style and presentation whitespace SHALL not be significant. In particular, quoted, colon-bearing, multiline, CJK and other Unicode `must_answer` strings SHALL retain the exact parsed string values and array order after rendering; normalization, trimming, summarization or equivalent prose SHALL fail binding.

Before rendering `enrich_seed`, the existing shared seed authoring evaluator SHALL examine the current parseable seed against the resolved Topic. If it reports canonical drift, apply SHALL retain only its first fixed-order direct failure as a `binding_repair` result, use the existing canonical merge to repair all canonical fields in the same write, and SHALL NOT require or authorize a raw YAML identity edit. After rendering and before prepared publication, apply SHALL run the same evaluator over the staged path/bytes and SHALL publish no workspace if the writer postcondition fails. An invalid input, unknown UID, missing/unsafe seed, unparseable frontmatter or postcondition defect SHALL fail before authority mutation with one direct coordinate/owner and the same apply checkpoint when a legal repair exists. The Engine SHALL NOT add a second evaluator or silently discard a detected pre-render binding root.

For sanctioned rerun only, every `add_topic` or `update_intent` action SHALL carry one Agent-authored rerun-direction candidate with `rerun_count`, `action`, `new_search_dimensions`, `adjusted_depth`, `search_guardrails`, and `rationale_excerpt`. An existing Topic that needs only supplemental search/depth guidance without a canonical intent change SHALL use `set_rerun_direction` in the same ordered action list; that action SHALL carry `topic_uid` plus the same direction candidate and SHALL NOT change registry intent fields. HITL1 add/update inputs SHALL NOT carry rerun direction.

The topic-state input schema SHALL validate direction structure and cross-action mapping before workspace publication: `add_topic` requires direction `action: add`; `update_intent` and `set_rerun_direction` require `action: supplement`; direction count SHALL equal current accepted profile count plus one; and two actions in one plan SHALL NOT target the same existing UID or create two directions for one Topic. The candidate content remains Agent judgment grounded in recorded HITL2 rationale; Engine validation SHALL be limited to closed action/count/field/cardinality structure and SHALL NOT generate or semantically score the guidance.

Rerun apply SHALL render/replace exactly one canonical `## 本轮重跑方向` section in every touched add/update/direction-only seed inside the existing prepared plan+seed workspace. The staged seed, plan change when any, and direction candidate SHALL therefore share the existing durable prepared/recover boundary. A crash after accepted workspace publication SHALL recover the exact staged direction bytes; a crash before publication SHALL leave the retained caller input available for fresh apply. Direction-only plans SHALL stage only the named existing seeds plus an unchanged plan byte contract and SHALL return `unchanged` only when both registry/current seed bytes, including direction, already match.

For `mutate_layout`, the same workspace MAY additionally record hash-bound `cleanup_files[]` limited to superseded or safely removed seed files. Layout commit SHALL write new/current seed replacements, replace `rb_plan.md` last, then delete only listed old seed files whose bytes still match the prepared expected hash. Artifact/reference/final paths, queue/work-unit state, submitted outputs and immutable provenance SHALL remain outside the workspace. Layout-only mutation SHALL preserve existing direction/body guidance and SHALL NOT invent a new direction candidate.

Recovery SHALL be explicit: inspect or apply encountering an accepted workspace SHALL return one `recover` action with its operation id. `recover` SHALL use only the prepared manifest to complete exact staged replacements and seed cleanup or return blocked without overwrite/delete; it SHALL NOT accept new semantic input.

The caller SHALL retain the explicit apply-input file until commit. Durable prepared publication SHALL be the accepted recovery boundary. A crash before that boundary SHALL NOT be reported as an accepted operation; the retained input SHALL remain available for a fresh apply.

One apply input SHALL contain exactly one of: one complete `migrate_legacy` reconciliation; a non-empty ordered list of `add_topic`/`update_intent`/`set_rerun_direction` actions; one complete `mutate_layout` target; or one complete `enrich_seed` target. These forms SHALL NOT be mixed. `set_rerun_direction` SHALL be available only in a sanctioned rerun context; `enrich_seed` SHALL be available only in a legal Seed Topics context. A layout target SHALL carry `expected_plan_sha256`, enumerate every current UID exactly once across ordered retained topics and explicit remove UIDs, and SHALL let Engine derive continuous current ids/slugs. The Engine SHALL validate the complete target, dependencies, duplicate targets, safe-remove facts and staged replacements before prepared publication. Topic UID SHALL remain immutable; existing id/slug MAY change only through `mutate_layout`.

For layout mutation, `affected_topic_uids` SHALL mean only removed UIDs and retained UIDs whose current id, slug or title differs in the final target. For an add/update/direction action plan it SHALL include every topic whose seed bytes are staged, including direction-only targets. For `enrich_seed` it SHALL contain exactly the selected current UID. Quiescence and seed mutation checks SHALL not block unrelated unchanged topics merely because a complete target lists them. If the rendered plan/current-seed bytes already match and no seed cleanup remains, apply SHALL return `unchanged` without workspace or follow-up. An unchanged `enrich_seed` result SHALL still return the selected UID/path and any observed-and-already-canonicalized binding repair shall be null.

Before workspace creation, `apply` SHALL authorize mutation from existing lifecycle facts rather than a caller-declared context flag. HITL1 apply SHALL require `rb_status.json#/current_node: phases/phase-hitl1.md` with the existing `current_gate: hitl1_recorded` / `next_gate: setup_ready` pre-gate window. Normal rerun apply SHALL require `current_node: phases/phase-rerun.md`, the latest valid non-superseded route-bound HITL2 gate-to-rerun load witness, and the incoming `current_gate: hitl2_recorded` / `next_gate: rerun_ready` window. Seed enrichment apply SHALL require `current_node: phases/phase-seed-topics.md`, the latest valid non-superseded route-bound setup-to-seed-topics or rerun-to-seed-topics load witness, and respectively the incoming `setup_ready -> seed_topics_ready` or `rerun_ready -> seed_topics_ready` status window.

Post-final rerun apply SHALL be authorized only after the accepted C5 operation has committed a valid non-superseded `post_final_reentry` event, current HITL2 profile semantics/hash still equal the event-bound after-profile, `enter-phase` has written a route-bound rerun `load_complete` referencing that exact recovery event, existing `advance-status --to hitl2_recorded` has written the matching exceptional `phase_transition`, `current_node` is `phases/phase-rerun.md`, and the incoming `hitl2_recorded -> rerun_ready` status window remains intact. A caller-declared `human-directed`, rerun, seed-topics or recovery context SHALL NOT substitute for any required witness class, the accepted profile, or the existing status-sync step.

`migrate_legacy`, `set_rerun_direction`, and `mutate_layout` SHALL be authorized only in a sanctioned normal or post-final rerun context. `enrich_seed` SHALL be authorized only after one accepted setup/rerun source route has entered Seed Topics. Other post-final, stale/missing-witness and arbitrary maintenance invocation SHALL reject without workspace or authority mutation.

The prepared manifest SHALL record the complete originally proven authorization facts. For normal rerun this means the gate handoff and bound load identity. For post-final rerun it means recovery event id/index/exact-line SHA256, event-bound after-profile hash, bound rerun load index, exact exceptional `phase_transition` index/binding, and the incoming current-node/status window. For seed enrichment it means the setup/rerun source gate attempt, bound Seed Topics load identity and incoming current-node/status window. `recover` MAY finish that exact accepted operation after lifecycle position changes, but SHALL NOT accept new semantics, re-evaluate a new apply request or widen the staged file set.

`migrate_legacy`, `update_intent`, `set_rerun_direction` and `mutate_layout` SHALL reject before workspace creation when a touched existing topic has queued, delegated-in-flight or nonterminal work. The blocker SHALL identify the existing queue/work-unit owner and one nearest Agent action. Submitted historical work MAY remain and SHALL NOT be rewritten. `mutate_layout` removal SHALL additionally reject any UID with queue/work-unit/ledger/artifact/reference history or an inbound dependency. `enrich_seed` SHALL not apply this canonical-intent quiescence blocker because the current non-delegated `seed_topic_materialize` card is its legal caller work; it SHALL remain bounded by Seed Topics lifecycle authorization and SHALL NOT read, claim, complete or mutate queue/work-unit authority.

Existing pre-v0.50 seeds and in-flight queue cards SHALL remain read-compatible. Parseable legacy seeds MAY retain unknown non-canonical frontmatter keys and duplicate body `must_answer`/scope/evidence prose; `enrich_seed` SHALL preserve those body bytes, and deterministic binding/completion SHALL ignore that prose as authority. A legacy frontmatter parse error MAY require only a bounded Agent syntax repair to make the current seed parseable, after which the same `enrich_seed` apply SHALL restore canonical/structured ownership. No bulk seed or queue migration SHALL be required.

The topic-state input/result contract SHALL use schema version `1.1.0` for this additive apply form. A successful or unchanged `enrich_seed` result SHALL include `action: enrich_seed`, selected `topic_uid`, current `slug`, derived seed path, `verdict: committed|unchanged`, and nullable `binding_repair`. Existing `inspect|apply|recover` operations, pre-existing apply input forms and their established result fields SHALL remain compatible; the minor version SHALL NOT create a second CLI route or require runtime data migration.

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

#### Scenario: Body bytes survive enrichment

- **WHEN** a current seed contains Agent-authored Markdown, appendix tokens, a rerun direction or legacy duplicate sections and valid structured enrichment is applied
- **THEN** every byte after the closing frontmatter delimiter SHALL remain identical
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

#### Scenario: Legacy duplicate body remains non-authoritative

- **WHEN** a parseable pre-v0.50 seed retains body copies of must-answer, scope or evidence-route prose
- **THEN** enrichment SHALL preserve those bytes while registry/frontmatter remain the only canonical/structured comparison surfaces
- **AND** no body-to-frontmatter inference or bulk migration SHALL be required

#### Scenario: Topic-state minor contract remains additive

- **WHEN** a caller uses an existing inspect, apply or recover form after the topic-state schema version becomes `1.1.0`
- **THEN** its established input semantics and result fields SHALL remain compatible
- **AND** only `enrich_seed` SHALL require the new action-specific UID/path/binding-repair result shape
