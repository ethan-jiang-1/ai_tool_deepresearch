> req: RUE-006

## ADDED Requirements

### Requirement: Explicit existing bundle card routes before the new-run default

Root and framework-local Agent routing surfaces SHALL distinguish an explicitly
supplied, reachable existing `BUNDLE_MAP.md` from a new research request. When
the user explicitly supplies or opens that map in the selected DPT workspace
and asks to continue, inspect, supplement or question that bundle, the routing
surface SHALL direct the Agent to the canonical existing-bundle continuation
playbook before `RUN.md` / `start-research`.

This condition SHALL require an explicit user-provided map/bundle and a
reachable containing directory. It SHALL NOT be satisfied by filesystem
scanning, a bare filename, a copied/unreachable map, or a card coordinate that
selects an untrusted framework. In those cases, the Agent retains the direct
framework-context boundary. When the condition is absent, existing `RUN.md`
new-research routing remains unchanged.

The distinction SHALL be synchronized across repo-root `AGENTS.md` and
`CLAUDE.md`, framework `AGENTS.md` and `CLAUDE.md`, and the relevant framework
entry/command guidance. It SHALL not add a lifecycle checkpoint, host trigger,
permission, mutation or rerun authority.

#### Scenario: Explicit existing map prevents second bundle creation

- **WHEN** a user explicitly provides a reachable existing bundle's
  `BUNDLE_MAP.md` in a selected DPT workspace and asks to continue or inspect it
- **THEN** Agent routing SHALL direct to the existing-bundle continuation
  playbook before `start-research`
- **AND** it SHALL not create a new bundle merely because the request has
  research intent

#### Scenario: New research still uses the existing RUN entry

- **WHEN** a user makes a research request without an explicitly supplied,
  reachable existing bundle map
- **THEN** root/framework routing SHALL retain the existing `RUN.md` and
  `start-research` new-run path

#### Scenario: Card is not an automatic host trigger

- **WHEN** a map is discovered by scanning, named without being supplied, or
  cannot establish its reachable bundle/framework context
- **THEN** routing SHALL not select that bundle or execute its continuation
  commands
- **AND** it SHALL not treat attachment wording or map coordinates as host
  trigger, framework authentication, permission or reentry authority
