> req: CTS-001, CTS-002, CTS-003, CTS-004

## ADDED Requirements

### Requirement: Topic registry SHALL own stable identity and minimum durable intent

`rb_plan.md#/topic_registry` SHALL be the selected bundle's only canonical topic identity and minimum intent owner. Every canonical entry SHALL contain an immutable Engine-generated `topic_uid`, ordered presentation `id`, numeric-prefixed `slug`, non-empty `title`, non-empty `must_answer[]`, closed `scope_role`, and `depends_on_topic_uids[]` referencing existing canonical entries. Seed files, queue topic fields, artifact paths, reference metadata and indexes SHALL be projections or references to this owner and SHALL NOT become independent topic registries.

#### Scenario: New scope survives immediately after registration
- **WHEN** the Agent registers a user-decided topic and the process stops before research work begins
- **THEN** the bundle SHALL retain the topic UID, title, must-answer set, scope role, dependencies, ordinal/slug projection and materialized seed skeleton
- **AND** no chat context or downstream artifact SHALL be required to know the topic was intended

#### Scenario: Registry-external topic is blocked
- **WHEN** a queue task, seed file, artifact path or reference metadata names a topic absent from the canonical registry
- **THEN** topic-state inspection SHALL report one canonical registration/materialization blocker
- **AND** the framework SHALL NOT create or bless a parallel addendum identity namespace

### Requirement: Topic progress SHALL be projected from direct runtime facts

The Engine SHALL derive per-topic/per-wave `not_started|in_progress|complete|deferred|blocked` results from canonical registration/materialization, explicit canonical deferral, queue/work-unit/submitted-ledger facts, and accepted wave artifact facts. The projection SHALL expose direct `fact_refs[]`, one reason code, and at most one nearest Agent action. It SHALL NOT persist a competing progress ledger or use chat, mtime, run log, or trace narration as primary progress authority.

#### Scenario: Never-started topic remains distinguishable
- **WHEN** a canonical topic and seed skeleton exist but no topic-scoped queue, work-unit, submitted ledger or wave artifact fact exists
- **THEN** inspect SHALL report `not_started`
- **AND** it SHALL NOT confuse the topic with missing intent or completed work

#### Scenario: Submitted work proves completion without copied progress state
- **WHEN** the accepted wave contract has submitted work-unit and artifact facts for a canonical topic
- **THEN** inspect SHALL report that wave `complete` with those fact refs
- **AND** no separate mutable progress row SHALL be required

### Requirement: Canonical topic mutations SHALL be hash-bound and crash recoverable

The framework SHALL expose one Engine helper, one `operate-topic-state.mjs` CLI and one `_diagnostics/topic-state/<operation-id>/` workspace for `register|rename|renumber|inspect`. Mutations SHALL publish a Zod-validated prepared manifest binding old/new canonical entries, expected file hashes, staged replacements and allowlisted moves before changing canonical state. Commit SHALL recheck hashes and path safety, use same-filesystem atomic replacements/moves with directory durability barriers, and clean the workspace only after completion. A crash SHALL leave enough accepted evidence to deterministically complete, roll back, or block without a half-migrated second identity.

#### Scenario: Rename crash does not create two identities
- **WHEN** a rename crashes after some staged replacements or path moves
- **THEN** the next mutation preflight SHALL recover the accepted manifest to one old-or-new canonical identity or return blocked with the workspace intact
- **AND** both identities SHALL NOT be accepted simultaneously

#### Scenario: Late drift blocks mutation
- **WHEN** an allowlisted owned file changes after manifest preparation but before its mutation boundary
- **THEN** the operation SHALL block without overwriting the drifted file
- **AND** the result SHALL identify the direct changed path and nearest Agent action

### Requirement: Topic mutations SHALL preserve existing authority boundaries

Register, rename and renumber SHALL mutate only the canonical registry and explicitly allowlisted derived topic surfaces. Active/submitted work-unit transactions, queue completion, status, gate, handoff, trace history, receipts, artifact persistence authority and Final delivery SHALL remain owned by their existing contracts. Unknown refs, active topic-bound attempts, free prose and unsupported paths SHALL block or remain historical; the CLI SHALL provide no force, arbitrary patch, set-progress, set-status, reentry or override operation.

#### Scenario: Active delegated attempt blocks rename
- **WHEN** a canonical topic has a claimed or otherwise active work-unit attempt
- **THEN** rename or renumber SHALL return blocked with the exact attempt ref
- **AND** the Agent SHALL use the existing work-unit owner to submit, repair or terminalize it before retrying

#### Scenario: Human-directed context does not create override
- **WHEN** a user requests a topic mutation from a lifecycle position where the mutation command is not sanctioned
- **THEN** the command SHALL refuse the mutation without modifying status, trace or topic state
- **AND** `human-directed` SHALL NOT be treated as permission or post-final reentry authority
