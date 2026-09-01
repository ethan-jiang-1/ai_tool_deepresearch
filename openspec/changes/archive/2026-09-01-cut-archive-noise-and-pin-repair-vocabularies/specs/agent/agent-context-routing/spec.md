## ADDED Requirements

### Requirement: Glossary triages the three repair vocabularies by field name

> req: ACR-005

Root `CONTEXT.md` SHALL present the three intentionally distinct repair-vocabulary surfaces as a field-name triage so a reader classifies any `repair*` field by its field name before reasoning about semantics. The triage SHALL distinguish:

- `repair_kind` carried in gate/phase `hints[]` / finding `repair.kind` — the gate/phase checkpoint surface that answers who is responsible for handling a failed checkpoint, with `DEEP_RESEARCH_HARNESS/schema/contracts/gate-definition.mjs` `GATE_REPAIR_KINDS` as the executable enum source;
- `next.recovery_action` carried in work-unit feedback surfaces — the work-unit recovery surface that answers which concrete recovery verb to run, with `DEEP_RESEARCH_HARNESS/engine/work-unit-repair-vocabulary.mjs` as the executable enum source;
- `repair_directive` carried in file-observability findings — the file-observability surface that answers how a file observation heals, with `DEEP_RESEARCH_HARNESS/engine/helpers/file-observability.mjs` as its owner.

The triage SHALL state that the field names differ by design (physical isolation of the three surfaces) and that mixing one surface's field or value set into another is a defect. The triage SHALL remain a compressed alignment row set that defers the complete contracts to their owning specs and executable enums; it SHALL NOT copy the full value sets as a competing authority, and it SHALL stay machine-aligned with the code-derived enum sets so silent drift fails governance.

#### Scenario: Agent classifies a repair field before acting

- **WHEN** a Coding Agent encounters a `repair*` field in framework feedback and reads root `CONTEXT.md`
- **THEN** the glossary SHALL let it classify the surface by field name alone (`repair_kind` vs `next.recovery_action` vs `repair_directive`) without guessing from prose semantics
- **AND** the triage row SHALL name each surface's owner or executable enum source rather than restating the complete contract

#### Scenario: Mixing surfaces is declared a defect

- **WHEN** the glossary triage is read alongside the three feedback surfaces
- **THEN** it SHALL state that the three field names are intentionally distinct and that emitting or interpreting one surface's field/value set as another is a defect
- **AND** it SHALL NOT collapse the three surfaces into one unified vocabulary

#### Scenario: Triage rows cannot silently drift from executable enums

- **WHEN** a code-derived repair-vocabulary enum set changes while glossary or spec prose still restates the old set
- **THEN** the deterministic enum-restatement governance check SHALL fail naming the drifted restatement
- **AND** the repair SHALL update the restating prose in the same change as the enum change

### Requirement: Archived change artifacts stay outside default task context

> req: ACR-006

Root `AGENTS.md` and root `README.md` SHALL name `openspec/changes/archive/` in their Do-Not-Read scope as historical record: archived OpenSpec change artifacts are not current behavior, not task context, and not authority. The Agent SHALL open an archived artifact only when the user explicitly asks for archive or history lookup, or when a governed procedure names a concrete archived path. Search hits under `openspec/changes/archive/` SHALL NOT be treated as task context solely because they matched a query.

The archive boundary SHALL NOT restrict the OpenSpec lifecycle itself: a change's own apply/archive steps and the governed finalizer retain their existing access to archived material. The focused deterministic routing regression SHALL fail when either root entry document drops the archived-artifact boundary.

#### Scenario: Agent ignores archive hits during ordinary search

- **WHEN** a repository-wide text search returns matches under `openspec/changes/archive/` during a task that did not explicitly request archive or history lookup
- **THEN** the Agent SHALL treat those matches as historical record outside default task context
- **AND** it SHALL select current authority from main specs, executable contracts, or the selected run bundle instead

#### Scenario: Explicit archive request unlocks reading

- **WHEN** the user explicitly asks to inspect archive or change history
- **THEN** the Agent MAY open the named archived artifact
- **AND** it SHALL still treat archived content as historical rather than as current accepted behavior

#### Scenario: Dropping the archive boundary fails the routing regression

- **WHEN** root `AGENTS.md` or root `README.md` no longer names `openspec/changes/archive/` in its Do-Not-Read scope
- **THEN** the focused deterministic routing regression SHALL fail and identify the missing archived-artifact boundary
