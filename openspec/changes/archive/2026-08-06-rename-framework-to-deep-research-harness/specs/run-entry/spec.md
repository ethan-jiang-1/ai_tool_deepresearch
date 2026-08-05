> req: RUE-006

## MODIFIED Requirements

### Requirement: Explicit existing bundle routes before the new-run default

Root and Harness-local Agent routing surfaces SHALL distinguish an explicitly
supplied, reachable existing run bundle from a new research request. When the
user explicitly supplies or opens a bundle directory (or its `BUNDLE_ENTRY.md`,
legacy `RUN_BUNDLE.md`, or `BUNDLE_MAP.md`) in the selected Deep Research
Harness workspace and asks to continue, inspect, supplement, or question that
bundle, the routing surface SHALL direct the Agent to the canonical
existing-bundle continuation playbook before `RUN.md`, `start-research`,
generic research shortcuts, direct request-specific search/fetch, or manual
synthesis.

For an explicitly supplied existing bundle, the entry resolution order SHALL be
`BUNDLE_ENTRY.md`, legacy `RUN_BUNDLE.md`, then legacy map-only
`BUNDLE_MAP.md`. The selected bundle directory, resolved to its canonical
absolute form, is the current run bundle root for that continuation operation.

This condition SHALL require an explicit user-provided bundle/path and a
reachable containing directory. It SHALL NOT be satisfied by filesystem
scanning, a bare filename, or a copied/unreachable directory. In those cases,
the Agent retains the direct Harness-context boundary. When the condition is
absent, selected new-research routing SHALL use `RUN.md` before later workflow
instructions or research work.

The distinction SHALL be synchronized across repo-root `AGENTS.md` and
`CLAUDE.md`, Harness `AGENTS.md` and `CLAUDE.md`, and relevant Harness
entry/command guidance. It SHALL NOT add a lifecycle checkpoint, host trigger,
permission, mutation, or rerun authority.

#### Scenario: Explicit existing bundle prevents a second bundle and pre-entry research

- **WHEN** a user explicitly provides a reachable existing bundle in a selected
  Harness workspace and asks to continue or inspect it
- **THEN** Agent routing SHALL direct to the existing-bundle continuation
  playbook before `RUN.md` or `start-research`
- **AND** it SHALL NOT create a new bundle, invoke a generic research shortcut,
  or perform request-specific direct research before that playbook is read

#### Scenario: Selected new research starts at RUN.md

- **WHEN** a user makes a selected Harness research request without an
  explicitly supplied, reachable existing bundle
- **THEN** root/Harness routing SHALL direct the Agent to read `RUN.md` before
  `start-research`, a generic shortcut, or request-specific direct research work
- **AND** `RUN.md` SHALL remain free to delegate to its existing workflow
  instructions

#### Scenario: Discovered bundle does not select a route

- **WHEN** a bundle is discovered by scanning, named without being supplied, or
  cannot establish its reachable bundle/Harness context
- **THEN** routing SHALL NOT select that bundle or execute its continuation
  commands
- **AND** it SHALL NOT treat entry-card content as host trigger, Harness
  authentication, permission, or reentry authority
