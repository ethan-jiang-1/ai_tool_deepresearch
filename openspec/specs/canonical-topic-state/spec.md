# Canonical Topic State

> req: CTS-001, CTS-002, CTS-003, CTS-004

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

The Engine SHALL derive per-topic/per-wave `not_started|in_progress|complete|blocked` from canonical registry/seed binding, current-slug queue/work-unit facts, submitted ledger rows and accepted required artifact facts. Each row SHALL expose direct `fact_refs[]`, one reason code and at most one nearest Agent action. The projection SHALL NOT be persisted and SHALL NOT use chat, mtime, run log or trace narration as primary progress authority.

#### Scenario: Intended but untouched topic is not started
- **WHEN** a canonical topic and seed exist with no matching queue/work-unit/submitted artifact fact for a wave
- **THEN** inspect SHALL report `not_started`

#### Scenario: Submitted facts prove completion
- **WHEN** the accepted wave contract has required submitted ledger and artifact facts for a canonical topic
- **THEN** inspect SHALL report that wave `complete` with exact fact refs
- **AND** no mutable progress row SHALL be required

### Requirement: Canonical topic mutation SHALL atomically materialize plan and seed intent

The framework SHALL expose one helper, one `operate-topic-state.mjs` CLI and one `_diagnostics/topic-state/<operation-id>/` workspace for `inspect|apply|recover`. `apply` action `migrate_legacy` SHALL require explicit semantics for every legacy registry entry and SHALL allow an explicit `adopt` entry for a registry-external slug detected by C1; adoption MAY bind one exact existing seed or stage one seed skeleton but SHALL NOT move or authorize historical content files. Apply SHALL prepare complete hash-bound replacements only for `rb_plan.md` and explicitly touched `seed_topics/*.md`, durably publish a prepared manifest, recheck expected hashes/path safety, atomically replace listed files, fsync parent directories and clean the workspace after commit.

Recovery SHALL be explicit: inspect or apply encountering an accepted workspace SHALL return one `recover` action with its operation id. `recover` SHALL use only the prepared manifest to complete exact staged replacements or return blocked without overwrite; it SHALL NOT accept new semantic input.

The caller SHALL retain the explicit apply-input file until commit. Durable prepared publication SHALL be the accepted recovery boundary. A crash before that boundary SHALL NOT be reported as an accepted operation; the retained input SHALL remain available for a fresh apply.

One apply plan SHALL contain either one complete `migrate_legacy` reconciliation or a non-empty ordered list of `add_topic`/`update_intent` actions; migration SHALL NOT be mixed with ordinary actions. The Engine SHALL validate the complete action set, dependencies, duplicate targets and staged replacements before prepared publication. Other actions SHALL be rejected; existing topic UID/id/slug SHALL remain unchanged.

Before workspace creation, `apply` SHALL authorize mutation from existing lifecycle facts rather than a caller-declared context flag. HITL1 apply SHALL require `rb_status.json#/current_node: phases/phase-hitl1.md` with the existing `current_gate: hitl1_recorded` / `next_gate: setup_ready` pre-gate window. Rerun apply SHALL require `current_node: phases/phase-rerun.md`, the latest valid non-superseded route-bound HITL2→rerun load witness, and the incoming `current_gate: hitl2_recorded` / `next_gate: rerun_ready` window. `migrate_legacy` SHALL be authorized only in that sanctioned rerun context. Post-final, stale/missing-witness and arbitrary maintenance invocation SHALL reject without workspace or authority mutation and identify the missing lifecycle/C5 boundary.

The prepared manifest SHALL record the originally proven authorization facts. `recover` MAY finish that exact accepted operation after lifecycle position changes, but SHALL NOT accept new semantics, re-evaluate a new apply request or widen the staged file set.

`migrate_legacy` and `update_intent` SHALL reject before workspace creation when a touched existing topic has queued or claimed/in-flight work. The blocker SHALL identify the existing queue/work-unit owner and one nearest Agent action. Submitted historical work MAY remain and SHALL NOT be rewritten.

#### Scenario: Crash after plan replacement resumes exact seed bytes
- **WHEN** an accepted operation crashes after new plan bytes commit but before every staged seed commits
- **THEN** inspect SHALL return the exact recover command and recover SHALL resume the prepared seed bytes or block on direct drift
- **AND** new topic work SHALL remain blocked while the accepted workspace exists

#### Scenario: Multi-topic approval is one accepted change set
- **WHEN** HITL1 or rerun apply contains multiple add-topic/update-intent actions
- **THEN** the Engine SHALL validate and stage the final registry plus every touched seed before prepared publication
- **AND** failure in any action SHALL leave the complete change set unaccepted and authority bytes unchanged

#### Scenario: Crash before prepared publication is not overclaimed
- **WHEN** apply stops before durable prepared manifest publication
- **THEN** the Engine SHALL NOT report an accepted recoverable operation
- **AND** the caller-owned input SHALL remain available for fresh apply

#### Scenario: Late drift is not overwritten
- **WHEN** a touched plan or seed matches neither expected-old nor staged-new digest
- **THEN** recovery/apply SHALL return blocked with that path and leave its bytes untouched

#### Scenario: Registry-external topic requires explicit adoption
- **WHEN** C1 reports a registry-external topic slug and migration input explicitly supplies its title, intent, scope role, dependencies and seed binding choice
- **THEN** `apply` action `migrate_legacy` MAY add one canonical UID-bound registry/seed identity for that slug
- **AND** it SHALL NOT grant authority to historical artifact/cache/reference/final files merely because the topic was adopted

#### Scenario: Active work blocks semantic mutation
- **WHEN** migrate-legacy or update-intent touches a slug with queued or claimed work
- **THEN** apply SHALL reject without changing plan, seed, queue or work-unit state
- **AND** the Agent SHALL drain, submit, repair or terminalize through the existing owner and rerun apply

#### Scenario: Legal HITL1 window authorizes initial materialization
- **WHEN** add-topic is invoked with current node `phases/phase-hitl1.md` and the existing `hitl1_recorded` → `setup_ready` status window
- **THEN** apply MAY prepare the approved initial canonical registry and seeds
- **AND** a caller-declared context value SHALL NOT substitute for those lifecycle facts

#### Scenario: Sanctioned rerun authorizes migration and refinement
- **WHEN** current node is `phases/phase-rerun.md`, the latest route-bound HITL2→rerun witness is valid and non-superseded, and the incoming rerun status window is intact
- **THEN** apply MAY accept migrate-legacy, add-topic or update-intent subject to their semantic and active-work checks

#### Scenario: Forged or stale rerun context cannot mutate
- **WHEN** the caller declares rerun context but the route witness is missing, stale or superseded, or the status window does not match
- **THEN** apply SHALL reject before workspace creation with one lifecycle repair/boundary action
- **AND** plan, seeds, status, trace and other authority surfaces SHALL remain byte-unchanged

#### Scenario: Accepted recovery survives lifecycle drift
- **WHEN** a prepared manifest records valid original authorization and the bundle later moves to another lifecycle position before commit completes
- **THEN** exact recover MAY finish only the recorded staged replacements
- **AND** it SHALL NOT authorize a fresh topic mutation in the new lifecycle position

### Requirement: Topic-state operations SHALL preserve scope and authority boundaries

Topic-state operations SHALL NOT mutate queue state/schema, work-unit attempts, submitted ledger, status, trace, gates, handoffs, receipts, artifact/cache/reference/final paths, artifact persistence state, profile fields or delivery authority. New topic work SHALL require committed registry+seed materialization. The CLI SHALL provide no force, delete/remove, retire, rename, renumber, arbitrary patch, set-progress, set-status, reentry or override operation.

#### Scenario: Layout mutation reports missing C3B capability
- **WHEN** apply input requests remove, rename, renumber or path move
- **THEN** the command SHALL reject before workspace creation and identify the deferred C3B boundary

#### Scenario: Human-directed request does not bypass reentry
- **WHEN** a user requests new scope from a lifecycle position without sanctioned rerun entry
- **THEN** topic-state mutation SHALL remain unavailable without changing topic/status/trace state
- **AND** `human-directed` SHALL NOT create permission or post-final capability

#### Scenario: Post-final apply remains unavailable
- **WHEN** apply is invoked after terminal final entry without an already accepted topic-state workspace
- **THEN** it SHALL reject before workspace creation and identify the missing C5 reentry authority
- **AND** it SHALL NOT treat user insistence, declared context or existing legacy data as permission
