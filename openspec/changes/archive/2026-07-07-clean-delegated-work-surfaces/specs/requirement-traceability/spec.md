> req: RET-006

## MODIFIED Requirements

### Requirement: Check script compliance as hard gate

Every change SHALL run the project governance checks before archive:

1. `node openspec/governance/check-project-reqs.mjs` -- 0 duplicate, 0 unregistered, 0 orphan, 0 reusedRetired
2. `node openspec/governance/check-project-specs.mjs` -- 0 deltaHeaderInMain, 0 missingPurpose, 0 missingRequirements, 0 missingReqHeader

For delegated-work cleanup changes, the hard gate SHALL also include the work-unit hygiene check over current production-facing surfaces. The hygiene check SHALL scan active main specs, active deltas, framework surfaces, shared experiment infrastructure, tests, guidelines, governance metadata, top-level docs, current `_backlog` planning/bug/todo notes, `experiments_env/shared`, and `experiments_playbook`. It SHALL exclude `openspec/changes/archive/` as historical OpenSpec record and SHALL NOT read `_original_*` archives.

The hygiene check SHALL fail stale positive production wording for retired relay/slot mechanisms, old delegated ledger fixtures, and old queue slot shapes unless the occurrence is explicitly negative, deprecated, checker/test self-reference, cleanup-control for this active cleanup change, current work-unit context for context-sensitive tokens, past-failure-history for current backlog/bug/planning notes, or minimized release-history wording that cannot be interpreted as command guidance. Allowed contexts SHALL NOT be interpreted as production authority. A legacy/backlog table or label SHALL NOT be an archive-ready allowlist context.

The hygiene check SHALL distinguish retired-only tokens from context-sensitive work-unit fields. Retired-only tokens include old relay commands, modules, helper APIs, slot identity fields, relay event names, old provenance check names, old relay directory or dispatch surfaces, old delegated ledger fields, and old queue slot control fields such as `slot_1_current`, `slot_2_next`, `slot_5_tail`, and `slot_*_pending`. Stale queue wording also includes fixed five-slot active-window prose or task-card examples that use `work_id` as queue demand identity. Current queue v2 may describe an ordered `active_window` array, `QUEUE_ACTIVE_WINDOW_LIMIT`, capacity of 20, or a case that stages at least five items, but it SHALL NOT imply named slots, fixed five-slot state shape, or `work_id` demand identity. Context-sensitive fields such as `runtime_receipt_ref`, `receipt_nonce`, `_beacon.json`, lifecycle event wording, and code-local `receiptNonce` SHALL remain allowed in current work-unit contexts, but SHALL fail when paired with old relay/slot examples, old relay trace/log identity, old delegated ledger fixtures, old queue slot shape, or production instructions for retired paths.

Cleanup-control allowance is narrow. It MAY apply to active change artifacts whose purpose is to define the retired-token vocabulary, inventory current hits, or state negative delta requirements for this cleanup. It SHALL NOT apply to active main specs, framework docs, current runner tables, runnable playbooks, production command guidance, or tests that present the old surface as success behavior.

Historical/planning wording outside `openspec/changes/archive/` SHALL be treated by readability risk, not folder name. A current backlog, bug, TODO, or planning note may keep old relay/slot terms only when the note clearly frames them as past failure analysis, removed design, or non-authoritative history; it SHALL NOT present retired commands, slot paths, old queue shape, or old ledger fields as actionable current implementation guidance. If that distinction cannot be made clear cheaply, the note SHALL be removed from current surfaces or moved under an excluded archive path by an OpenSpec-governed cleanup.

Checks SHALL be hard gates. Any failure SHALL block archive until resolved.

`check-project-reqs.mjs` SHALL remain compatible with registry organization rules. It SHALL filter YAML keys through the `[A-Z]{3}-\d{3}` requirement ID pattern so `prefixes:` keys and group-header comments do not affect consistency checks.

#### Scenario: Change ready for archive

- **WHEN** change tasks are complete
- **THEN** `check-project-reqs.mjs` SHALL pass
- **AND** `check-project-specs.mjs` SHALL pass
- **AND** delegated-work hygiene SHALL pass when the change touches delegated production surfaces

#### Scenario: Check script fails on registry inconsistency

- **WHEN** a developer references an unregistered ID in an active delta spec
- **THEN** `check-project-reqs.mjs` SHALL report `unregistered: <ID>`
- **AND** SHALL exit non-zero
- **AND** the change SHALL NOT archive until registration is corrected

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
- **AND** it SHALL still fail the occurrence if it is paired with retired relay/slot paths, fields, helpers, or events

#### Scenario: Old queue slot shape is not valid current queue proof

- **WHEN** a current runner, playbook, framework surface, or fixture presents `slot_1_current`, `slot_2_next`, `slot_*_pending`, fixed five-slot active-window wording, or top-level queue `work_id` demand identity as a runnable queue path
- **THEN** delegated-work hygiene SHALL fail or the surface SHALL be removed from current runner guidance
- **AND** negative schema tests MAY name the shape only to prove rejection

#### Scenario: Queue v2 capacity wording is allowed

- **WHEN** a current queue spec, implementation, test, or playbook describes `active_window` as an ordered array with a current capacity limit or stages five or more items to exercise refill/preemption
- **THEN** delegated-work hygiene SHALL NOT fail solely because the case mentions `active_window` capacity, `QUEUE_ACTIVE_WINDOW_LIMIT`, a maximum of 20 entries, or at least five items
- **AND** it SHALL still fail if the same surface presents named slot fields, fixed five-slot state shape, or queue demand `work_id` as current proof

#### Scenario: Active cleanup-control artifacts can name retired terms

- **WHEN** this active cleanup change names retired relay, slot, ledger, or old queue terms in its proposal, design, task list, inventory, or negative delta requirements
- **THEN** delegated-work hygiene MAY classify those occurrences as cleanup-control
- **AND** that allowance SHALL NOT permit the same wording in current production guidance, current runner surfaces, or runnable playbooks
