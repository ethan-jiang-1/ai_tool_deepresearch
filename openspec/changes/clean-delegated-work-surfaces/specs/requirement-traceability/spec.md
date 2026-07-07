> req: RET-006

## MODIFIED Requirements

### Requirement: Check script compliance as hard gate

Every change SHALL run the project governance checks before archive:

1. `node openspec/governance/check-project-reqs.mjs` -- 0 duplicate, 0 unregistered, 0 orphan, 0 reusedRetired
2. `node openspec/governance/check-project-specs.mjs` -- 0 deltaHeaderInMain, 0 missingPurpose, 0 missingRequirements, 0 missingReqHeader

For delegated-work cleanup changes, the hard gate SHALL also include the work-unit hygiene check over current production-facing surfaces. The hygiene check SHALL scan active main specs, active deltas, framework surfaces, tests, guidelines, and `experiments_playbook`, and SHALL exclude `openspec/changes/archive/` as historical OpenSpec record.

The hygiene check SHALL fail stale positive production wording for retired relay/slot mechanisms unless the occurrence is explicitly negative, deprecated, legacy/backlog, or historical. Allowed contexts SHALL NOT be interpreted as production authority.

Checks SHALL be hard gates. Any failure SHALL block archive until resolved.

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
