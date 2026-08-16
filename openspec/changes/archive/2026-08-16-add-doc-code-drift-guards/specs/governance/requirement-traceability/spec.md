> req: RET-001, RET-006

## MODIFIED Requirements

### Requirement: Prefix abbreviation registry as self-documenting source of truth

`openspec/governance/req-registry.yaml` SHALL contain a `prefixes:` mapping
after the file header comments and before the first requirement-ID group. The
mapping is the unique self-documenting source from a **live** prefix to a full
canonical capability path.

The `prefixes:` mapping SHALL satisfy all of the following:

- Every live prefix maps to one unique `domain/capability` path whose segments
  are kebab-case and whose value resolves to
  `openspec/specs/<domain>/<capability>/spec.md`.
- A sub-prefix for the same capability SHALL map to the same complete path and
  identify its ownership relationship.
- A retired capability prefix SHALL retain its historical label and an explicit
  `no spec directory` explanation; it SHALL NOT be invented as a live path.
- A new capability SHALL enter `prefixes:` only when its canonical main spec
  exists. Its requirement-ID entries SHALL be created as part of that same
  live transition after the prefix is checked for reuse.

A not-yet-live capability's identity SHALL be represented only by an optional,
strict `requirement-reservation.yaml` in its active change root. Its top-level
keys are exactly `schema_version`, `change`, and `reservations`, where
`schema_version` is `requirement-reservation/v1`, `change` is the safe
kebab-case active-change directory name, and `reservations` is a non-empty
sequence. Each reservation has exactly `capability_path`, `prefix`, and
`requirements` keys:

- `capability_path` is one two-segment kebab-case `domain/capability` path;
- `prefix` is one three-uppercase-letter abbreviation;
- `requirements` is a non-empty, duplicate-free sequence of requirement IDs
  matching that prefix and the `{PREFIX}-{NNN}` grammar.

Each active reservation SHALL have exactly one complete lifecycle form. A
**pending** reservation describes a new capability: its prefix is absent from
live `prefixes:`, its canonical main-spec file is absent, and its IDs are
unregistered. A **transitioned** reservation has its exact prefix and path in
live `prefixes:`, its canonical main spec present, and every reserved ID
non-retired, registered, and declared by that main spec. The same capability
path, prefix, and requirement IDs are not reserved by any other active change.
The entries within one record are also unique by path, prefix, and requirement
ID. A mixture of pending and transitioned facts SHALL fail rather than become a
third inferred state.

Each reserved ID SHALL be declared exactly once in the `> req:` header of that
change's delta at `specs/<capability_path>/spec.md`. Every unregistered
requirement-ID declaration in an active delta SHALL have precisely such a
same-change pending reservation; an unregistered prose reference is permitted
only in the change that owns the matching pending reservation. A reservation
SHALL NOT be used for a live capability, a live prefix, an existing requirement
ID, or a value marked retired unless it is the complete transitioned form.

`check-project-reqs.mjs` SHALL ignore registry keys that are not requirement
IDs for ID consistency, and SHALL separately report a live prefix whose target
does not resolve to its complete main-spec path. Its default invocation is
plan mode; `--mode plan` is equivalent. In plan mode it SHALL report the
direct malformed reservation, collision, mismatched delta declaration, or
unregistered occurrence rather than accepting a placeholder live prefix.

In `--mode archive --change <active-change>` mode, every selected reservation
SHALL be transitioned. A complete pending or complete transitioned reservation
of another active change SHALL not make that selected archive fail. The command
SHALL reject a missing, unsafe, or non-active `--change` value rather than

`check-project-reqs.mjs` SHALL expose `--check-prefix <PREFIX>`: given one three-letter prefix, it SHALL
print that prefix's live mapping (canonical `domain/capability` path), every requirement ID registered
under it with its current state (alive / pending / retired), and exit `0` when the prefix is registered.
A missing, malformed, or unregistered prefix SHALL exit `2` with a usage message. The prefix-scoped query
SHALL be the supported propose-time registry lookup so a change author does not need to read the full
registry; it SHALL NOT change plan-mode or archive-mode behavior.

#### Scenario: propose-time prefix query returns the registered facts

- **WHEN** a change author runs `node openspec/governance/check-project-reqs.mjs --check-prefix ACR`
- **THEN** the command SHALL print the `ACR` mapping and all `ACR-*` IDs with their states and exit `0`
- **AND** an unknown prefix SHALL exit `2` with a usage message instead of printing an empty result

silently broadening the selected archive scope.

#### Scenario: New capability has a valid plan-stage identity

- **WHEN** an active change declares its new-capability IDs in
  `specs/governance/example-capability/spec.md`
- **AND** its change root contains a matching valid
  `requirement-reservation.yaml`
- **AND** its three-letter prefix is absent from live `prefixes:` and the
  canonical main spec is not yet present
- **THEN** default plan-mode `check-project-reqs.mjs` SHALL accept those four
  pending IDs
- **AND** it SHALL not require a fake `SEF` live-prefix entry or an early main
  spec

#### Scenario: Pending identities cannot collide

- **WHEN** two active changes reserve the same requirement ID, prefix, or
  capability path, or one reservation conflicts with a live prefix or ID
- **THEN** plan-mode `check-project-reqs.mjs` SHALL exit non-zero
- **AND** it SHALL identify the conflicting reservation coordinate and owner
- **AND** neither change obtains a valid pending identity until the collision is
  repaired

#### Scenario: A reservation must own its declared delta identity

- **WHEN** a reservation lists a `NEW-<NNN>` ID for
  `governance/new-capability`
- **BUT** the selected change declares it under a different delta path, omits
  it from that path's `> req:` header, or declares another unreserved
  `NEW-<NNN>` ID
- **THEN** plan-mode `check-project-reqs.mjs` SHALL exit non-zero
- **AND** it SHALL identify the reservation or delta declaration that must be
  repaired

#### Scenario: A live prefix remains a live path

- **WHEN** a live prefix maps to a flat, malformed, or missing spec path
- **THEN** `check-project-reqs.mjs` exits non-zero and identifies that prefix
- **AND** a reservation SHALL NOT make the broken live mapping valid

#### Scenario: Selected archive requires the live transition

- **WHEN** an active selected change has a valid plan reservation but its
  prefix, requirement IDs, or canonical main-spec declarations have not yet
  been synchronized
- **THEN** `check-project-reqs.mjs --mode archive --change <change>` SHALL exit
  non-zero and identify the missing live fact
- **AND** the selected change SHALL not archive until its registry and main
  spec own the matching identity

#### Scenario: Other active lifecycle forms do not block a selected archive

- **WHEN** the selected change has completed its reservation-to-live transition
- **AND** another active change retains either a complete pending reservation
  or a complete transitioned reservation
- **THEN** `check-project-reqs.mjs --mode archive --change <selected-change>`
  SHALL accept the other change at its own complete lifecycle form
- **AND** it SHALL continue to enforce the selected change's live transition


### Requirement: Check script compliance as hard gate

Every change SHALL run the project governance checks before archive:

1. `node openspec/governance/check-project-reqs.mjs --mode archive --change <change>` -- 0 duplicate, 0 unregistered, 0 orphan, 0 reusedRetired, and every selected reservation transitioned to live identity
2. `node openspec/governance/check-project-specs.mjs` -- 0 deltaHeaderInMain, 0 missingPurpose, 0 missingRequirements, 0 missingReqHeader
3. `node openspec/governance/check-capability-taxonomy.mjs` -- no invalid live path, catalog inventory, project-local relation, or control-boundary result
4. `node openspec/governance/check-capability-discovery.mjs --change <change>` -- a structurally valid discovery record for the selected active change


5. `node openspec/governance/check-content-drift.mjs` -- 0 broken prose path references, 0 unknown CLI
   tool references, and full gate-summary coverage against `schema/gate_definitions/`

The content-drift check SHALL scan guidance, accepted-spec prose, and Harness documentation for
repository-relative path references that do not exist (excluding bundle-runtime paths such as `rb_*`,
`_work_units/`, `_cache/`, `_logs/`, `final/`, `reference/`, `artifacts/`, and `dpt_*` roots, template
placeholders, and explicitly deprecated/historical anchors). It SHALL skip glob patterns,
capability-path-shaped references, and `#fragment` anchors (after stripping the anchor). A reference
that the contract deliberately requires to be ABSENT (a negative reference such as a path that SHALL
NOT be created) SHALL be registered in an explicit allowlist entry naming the file, the reference, and
the reason; any other missing path SHALL fail and name the file and reference. It SHALL verify that
prose references to
`cli/<tool>.mjs` resolve to an existing tool, that documented invocation verbs appear in the tool source,
and that every gate in `schema/gate_definitions/gate-*.definition.json` has a summary row in the shared
gate-rules surface and vice versa. The governed finalizer SHALL run the content-drift check alongside the
other hard gates before the native archive transition.

Local git pre-commit hook wiring SHALL NOT be part of this change: the hook decision is closed as
checker-only delivery, and remote CI remains outside the governed boundary.

#### Scenario: prose drift blocks archive

- **WHEN** an accepted spec or guidance document references a path that does not exist in the current tree
- **THEN** `check-content-drift.mjs` SHALL fail and name the file and reference
- **AND** the governed finalizer SHALL block archive until the reference is repaired or the rule is
  corrected for a genuinely non-repository path

When a supported project Apply entry receives the current
`requirement-reservation/apply` operation guidance, it SHALL run default
plan-mode `check-project-reqs.mjs` before target edits and stop on a non-zero
result with that command as its rerun coordinate. The check retains duplicate,
unregistered, orphan, and retired reuse protection; it does not claim that a
pending identity has completed its live transition or grant target-edit or
archive permission.

#### Scenario: Supported Apply entry checks a planned reservation before edits

- **WHEN** current Apply operation guidance contains
  `requirement-reservation/apply` for an active change
- **THEN** the supported project Apply entry SHALL run
  `node openspec/governance/check-project-reqs.mjs --mode plan` before target
  edits
- **AND** it SHALL stop at a failed result instead of treating the guidance as
  a suggestion or creating a live registry fact

For delegated-work cleanup changes, the hard gate SHALL also include the work-unit hygiene check over current production-facing surfaces. The hygiene check SHALL scan active main specs, active deltas, framework surfaces, shared experiment infrastructure, tests, guidelines, governance metadata, top-level docs, current `_backlog` planning/bug/todo notes, `experiments_env/shared`, and `experiments_playbook`. It SHALL exclude `openspec/changes/archive/` as historical OpenSpec record and SHALL NOT read `_original_*` archives.

The hygiene check SHALL fail stale positive production wording for retired delegated transport mechanisms, old delegated ledger fixtures, and old queue position shapes unless the occurrence is explicitly negative, deprecated, checker/test self-reference, cleanup-control for an active cleanup change, current work-unit context for context-sensitive tokens, past-failure-history for current backlog/bug/planning notes, or minimized release-history wording that cannot be interpreted as command guidance. Allowed contexts SHALL NOT be interpreted as production authority. A legacy/backlog table or label SHALL NOT be an archive-ready allowlist context.

The hygiene check SHALL distinguish retired-only tokens from context-sensitive work-unit fields. Retired-only tokens include old delegated commands, modules, helper APIs, identity fields, event names, provenance check names, dispatch surfaces, old delegated ledger fields, and old queue position fields. Stale queue wording also includes fixed small active-window prose or task-card examples that use `work_id` as queue demand identity. Current queue v2 may describe an ordered `active_window` array, `QUEUE_ACTIVE_WINDOW_LIMIT`, capacity of 20, or a case that stages at least five items, but it SHALL NOT imply named positions, fixed small state shape, or `work_id` demand identity. Context-sensitive fields such as `runtime_receipt_ref`, `receipt_nonce`, `_beacon.json`, lifecycle event wording, and code-local `receiptNonce` SHALL remain allowed in current work-unit contexts, but SHALL fail when paired with old delegated examples, old trace/log identity, old delegated ledger fixtures, old queue position shape, or production instructions for retired paths.

Cleanup-control allowance is narrow. It MAY apply to active change artifacts whose purpose is to define the retired-token vocabulary, inventory current hits, or state negative delta requirements for this cleanup. It SHALL NOT apply to active main specs, framework docs, current runner tables, runnable playbooks, production command guidance, or tests that present the old surface as success behavior.

Historical/planning wording outside `openspec/changes/archive/` SHALL be treated by readability risk, not folder name. A current backlog, bug, TODO, or planning note may keep old delegated-transport terms only when the note clearly frames them as past failure analysis, removed design, or non-authoritative history; it SHALL NOT present retired commands, non-work-unit paths, old queue shape, or old ledger fields as actionable current implementation guidance. If that distinction cannot be made clear cheaply, the note SHALL be removed from current surfaces or moved under an excluded archive path by an OpenSpec-governed cleanup.

These checks are hard gates. Any failure SHALL block archive until its direct
source is repaired. The taxonomy and discovery checks SHALL validate only
declared structural facts; they SHALL NOT claim that semantic candidate choice
or optional environment skill availability has been decided by the Engine.

`check-project-reqs.mjs` SHALL remain compatible with registry organization rules. It SHALL filter YAML keys through the `[A-Z]{3}-\d{3}` requirement ID pattern so `prefixes:` keys and group-header comments do not affect consistency checks.

#### Scenario: Change ready for archive

- **WHEN** change tasks are complete
- **THEN** `check-project-reqs.mjs --mode archive --change <change>` SHALL pass
- **AND** `check-project-specs.mjs` SHALL pass
- **AND** `check-capability-taxonomy.mjs` SHALL pass
- **AND** `check-capability-discovery.mjs --change <change>` SHALL pass
- **AND** delegated-work hygiene SHALL pass when the change touches delegated production surfaces

#### Scenario: Discovery structure is not semantic approval

- **WHEN** a proposal has a syntactically valid capability-discovery record
- **THEN** its structural checker reports only the record's direct facts
- **AND** the result does not claim that the Agent's reuse or New decision is
  semantically correct

#### Scenario: Check script fails on unowned registry inconsistency

- **WHEN** a developer references an unregistered ID in an active delta spec
- **AND** no valid reservation in that same active change owns the ID
- **THEN** plan-mode `check-project-reqs.mjs` SHALL report the unregistered ID
- **AND** SHALL exit non-zero
- **AND** the change SHALL NOT archive until its registry or reservation state
  is corrected through the legal lifecycle path

#### Scenario: Archived OpenSpec changes are excluded from stale-token hygiene

- **WHEN** stale relay/slot production terms appear under `openspec/changes/archive/`
- **THEN** delegated-work hygiene SHALL ignore those occurrences
- **AND** it SHALL continue scanning current surfaces outside the archive directory

#### Scenario: Original archives are not read

- **WHEN** stale relay/slot terms appear under an `_original_*` archive path
- **THEN** delegated-work hygiene SHALL not read or scan that path
- **AND** this exclusion SHALL NOT exempt any copied current-surface wording outside `_original_*`

#### Scenario: Current backlog cannot teach old production paths

- **WHEN** a current backlog, bug, TODO, or planning note outside excluded archives describes retired relay/slot production behavior
- **THEN** hygiene SHALL allow it only if the wording is explicit past-tense failure analysis or removed-design context
- **AND** it SHALL fail or require cleanup if the note can be read as current implementation guidance for delegated work

#### Scenario: Current work-unit field is not falsely rejected

- **WHEN** current work-unit guidance names `runtime_receipt_ref` or `receipt_nonce` in a work-unit manifest, beacon, result, or ledger context
- **THEN** delegated-work hygiene SHALL NOT fail that occurrence solely because the token also appeared in old relay examples
- **AND** it SHALL still fail the occurrence if it is paired with retired delegated paths, fields, helpers, or events

#### Scenario: Old queue position shape is not valid current queue proof

- **WHEN** a current runner, playbook, framework surface, or fixture presents legacy named queue-position fields, fixed small active-window wording, or top-level queue `work_id` demand identity as a runnable queue path
- **THEN** delegated-work hygiene SHALL fail or the surface SHALL be removed from current runner guidance
- **AND** negative schema tests MAY name the shape only to prove rejection

#### Scenario: Queue v2 capacity wording is allowed

- **WHEN** a current queue spec, implementation, test, or playbook describes `active_window` as an ordered array with a current capacity limit or stages five or more items to exercise refill/preemption
- **THEN** delegated-work hygiene SHALL NOT fail solely because the case mentions `active_window` capacity, `QUEUE_ACTIVE_WINDOW_LIMIT`, a maximum of 20 entries, or at least five items
- **AND** it SHALL still fail if the same surface presents named queue-position fields, fixed small state shape, or queue demand `work_id` as current proof

#### Scenario: Active cleanup-control artifacts can name retired terms

- **WHEN** an active cleanup change names retired delegated, ledger, or old queue terms in its proposal, design, task list, inventory, or negative delta requirements
- **THEN** delegated-work hygiene MAY classify those occurrences as cleanup-control
- **AND** that allowance SHALL NOT permit the same wording in current production guidance, current runner surfaces, or runnable playbooks
