## MODIFIED Requirements

### Requirement: Check script compliance as hard gate

Every change SHALL pass the project governance checks before archive. The complete hard-gate set,
its member commands, and its ordering SHALL be defined by exactly one machine surface: the governed
finalizer's `CheckSchema` in `openspec/governance/finalize-change-archive.mjs`. This spec SHALL NOT
hand-copy a check list; any observed divergence SHALL be resolved by correcting the finalizer
surface (the machine is the owner), never by maintaining a second list in prose. A reader needing
the current list SHALL read the finalizer surface or run the aggregated read-only governance health
entry defined by the "Aggregated read-only governance health entry" requirement. The historical
five-check enumeration formerly written here is retired prose and SHALL NOT be restored as a
parallel authority.

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
- **THEN** the governed finalizer SHALL run its complete `CheckSchema` sequence
- **AND** any hard-gate failure SHALL block the archive transition

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

## ADDED Requirements

### Requirement: Aggregated read-only governance health entry

The project SHALL provide one aggregated read-only governance health entry: `node openspec/governance/check-all.mjs [--change <name>]`. It SHALL run every current `check-*.mjs` script in `openspec/governance/` that takes no per-change domain work by default, pass the optional `--change` through to the checks that accept it, and print one line per check with its result plus an aggregate exit code (0 all pass, non-zero otherwise). It SHALL be strictly read-only: no archive transition, no repair, no target edits, and no authority grant. It SHALL NOT replace the governed finalizer, whose `CheckSchema` remains the sole archive authority.

#### Scenario: Health entry aggregates every checker

- **WHEN** a developer runs `node openspec/governance/check-all.mjs`
- **THEN** it SHALL print one result line per current `check-*.mjs` script and exit 0 only when every check passes
- **AND** a failing check SHALL be named with its own repair coordinate rather than collapsed into a single aggregate message

#### Scenario: Health entry is not an archive transition

- **WHEN** a developer runs the aggregated entry
- **THEN** it SHALL NOT perform the native archive transition or any target edit
- **AND** its exit code SHALL NOT be treated as archive permission

### Requirement: Capability catalog declares current-accepted scope

`openspec/specs/README.md`（Capability Catalog）SHALL state near its head that the rows it lists are the current accepted capabilities, that historical or deprecated capabilities are not listed here, and that historical change records live under `openspec/changes/archive/` while deprecated requirement IDs remain visible in `openspec/governance/req-registry.yaml` `[DEPRECATED]` groups. The statement SHALL be prose navigation context only; it SHALL NOT change catalog row authority or introduce a second behavior definition.

#### Scenario: Reader can tell accepted from historical

- **WHEN** an Agent reads the catalog to decide which capability owns a behavior
- **THEN** it SHALL see the current-accepted scope statement near the head
- **AND** it SHALL be directed to the change archive and registry deprecated groups for historical identity rather than guessing whether a row is current

### Requirement: Main spec files carry a level-one title

Every main spec file under `openspec/specs/<domain>/<capability>/spec.md` SHALL begin with a single level-one title line (`# <Capability Title>`), SHALL NOT begin directly with the `> req:` header line, and SHALL NOT carry more than one level-one title. `check-project-specs.mjs` SHALL fail a main spec whose file does not begin with exactly one `# ` line, reporting a `missingH1` (or `duplicateH1`) result. This requirement SHALL NOT constrain the capability title wording beyond the single-H1 structural fact.

#### Scenario: Missing level-one title blocks the spec check

- **WHEN** a main spec file begins with a `> req:` line or otherwise lacks its `# ` title
- **THEN** `check-project-specs.mjs` SHALL fail with `missingH1` naming the file
- **AND** the governed finalizer SHALL block archive until the title is present

### Requirement: Requirement IDs in guidance prose resolve against the registry

The project SHALL retain deterministic coverage that scans the current guidance prose surfaces (`openspec/guidance/`, `openspec/operations/`, `openspec/constitution/`) for requirement-ID tokens matching `[A-Z]{3}-\d{3}` and fails any token that does not resolve to a registered ID in `openspec/governance/req-registry.yaml` (alive or `[DEPRECATED]`). Registry key lines, self-referential checker/test prose, and `openspec/changes/` artifacts SHALL NOT be scanned by this coverage. The coverage SHALL be exposed as a governance check usable before archive.

#### Scenario: Guidance cites an unregistered ID

- **WHEN** a guidance, operation, or constitution document references a requirement ID absent from the registry
- **THEN** the deterministic coverage SHALL fail and name the file, the token, and the nearest repair (register the ID through the legal lifecycle path or correct the reference)
- **AND** the failure SHALL NOT be silently ignored by other governance checks

#### Scenario: Deprecated IDs remain resolvable

- **WHEN** a guidance document references a registered but `[DEPRECATED]` requirement ID as historical context
- **THEN** the coverage SHALL accept the reference as resolvable
- **AND** it SHALL NOT grant the deprecated ID any live authority
