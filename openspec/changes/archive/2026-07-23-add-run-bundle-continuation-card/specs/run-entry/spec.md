> req: RUE-006

## MODIFIED Requirements

### Requirement: Explicit existing bundle routes before the new-run default

Root and framework-local Agent routing surfaces SHALL distinguish an explicitly
supplied, reachable existing run bundle from a new research request. When the
user explicitly supplies or opens a bundle directory (or its `RUN_BUNDLE.md`
or `BUNDLE_MAP.md`) in the selected DPT workspace and asks to continue, inspect,
supplement or question that bundle, the routing surface SHALL direct the Agent
to the canonical existing-bundle continuation playbook before `RUN.md` /
`start-research`.

When both `RUN_BUNDLE.md` and `BUNDLE_MAP.md` are present, `RUN_BUNDLE.md`
SHALL be read first as the primary entry point.

This condition SHALL require an explicit user-provided bundle/path and a
reachable containing directory. It SHALL NOT be satisfied by filesystem
scanning, a bare filename, or a copied/unreachable directory. In those cases,
the Agent retains the direct framework-context boundary. When the condition is
absent, existing `RUN.md` new-research routing remains unchanged.

The distinction SHALL be synchronized across repo-root `AGENTS.md` and
`CLAUDE.md`, framework `AGENTS.md` and `CLAUDE.md`, and the relevant framework
entry/command guidance. It SHALL NOT add a lifecycle checkpoint, host trigger,
permission, mutation or rerun authority.

#### Scenario: Explicit existing bundle prevents second bundle creation

- **WHEN** a user explicitly provides a reachable existing bundle in a
  selected DPT workspace and asks to continue or inspect it
- **THEN** Agent routing SHALL direct to the existing-bundle continuation
  playbook before `start-research`
- **AND** it SHALL NOT create a new bundle merely because the request has
  research intent

#### Scenario: New research still uses the existing RUN entry

- **WHEN** a user makes a research request without an explicitly supplied,
  reachable existing bundle
- **THEN** root/framework routing SHALL retain the existing `RUN.md` and
  `start-research` new-run path

#### Scenario: RUN_BUNDLE.md is not an automatic host trigger

- **WHEN** a bundle is discovered by scanning, named without being supplied,
  or cannot establish its reachable bundle/framework context
- **THEN** routing SHALL NOT select that bundle or execute its continuation
  commands
- **AND** it SHALL NOT treat `RUN_BUNDLE.md` content as host trigger,
  framework authentication, permission or reentry authority
