> req: RUE-006

## MODIFIED Requirements

### Requirement: Explicit existing bundle routes before the new-run default

Root and Harness-local Agent routing surfaces SHALL distinguish an explicitly
supplied, reachable existing run bundle from a new research request. When the
user explicitly supplies or opens a bundle directory (or a file within it) in
the selected Deep Research Harness workspace and asks to continue, inspect,
supplement, or question that bundle, routing SHALL first verify that the
candidate directory contains both `BUNDLE_ENTRY.md` and `BUNDLE_MAP.md`.

Only a verified pair directs the Agent to the canonical existing-bundle
continuation playbook before `RUN.md`, `start-research`, generic research
shortcuts, direct request-specific search/fetch, or manual synthesis. The
selected bundle directory, resolved to its canonical absolute form, is the
current run bundle root for that continuation operation.

An explicitly supplied reachable candidate missing either current file SHALL
stop at the unsupported-current-entry-contract boundary. It SHALL NOT fall back
to legacy `RUN_BUNDLE.md`, `START_FROM_HERE.md`, map-only entry, `RUN.md`, new
bundle creation, scanning, a different bundle, migration, upgrade, or a
human-only Harness command. Direct human reading of historical Markdown remains
outside this routing contract.

This condition SHALL require an explicit user-provided bundle/path and a
reachable containing directory. It SHALL NOT be satisfied by filesystem
scanning, a bare filename, or a copied/unreachable directory. In those cases,
the Agent retains the direct Harness-context boundary. When no existing
candidate is supplied, selected new-research routing SHALL use `RUN.md` before
later workflow instructions or research work.

The complete entry-selection rule — including both the verified-pair branch and
the no-candidate `RUN.md` branch — SHALL have exactly one canonical statement
under the heading `Entry Selection (canonical)` in
`DEEP_RESEARCH_HARNESS/command_playbook/continue-run-bundle.md`. That section
SHALL state both branches, the unsupported-current-entry-contract stop, the
scan/bare/unreachable non-selection, the current-run-bundle-root resolution,
and the pre-entry research-surface prohibition.

Repo-root `AGENTS.md` and `CLAUDE.md`, Harness `AGENTS.md` and `CLAUDE.md`, and
relevant Harness entry/command guidance (README, RUN, COMMANDS, start-research)
SHALL carry a short pointer to that canonical statement instead of restating
the complete rule. A pointer SHALL name the playbook path, the heading
`Entry Selection (canonical)`, and the `unsupported_current_entry_contract`
boundary. A pointer SHALL NOT reproduce the selection procedure: same-root
pair preflight steps, the no-candidate `RUN.md` branch essay, scan/bare/
unreachable non-selection as a restated tree, or the pre-entry research-surface
prohibition as part of that tree. Naming which file to open next (the
canonical section versus `RUN.md`) is not restating the complete rule. A
pointer SHALL NOT weaken, reorder, or paraphrase the canonical rule's
outcomes. This single-source arrangement SHALL NOT add a lifecycle checkpoint,
host trigger, permission, mutation, or rerun authority.

Documentation regressions that protect this requirement SHALL lock the
complete rule only on that canonical section. They SHALL fail when a
pointer or routing block reproduces the selection procedure. They SHALL
scope that failure to the named pointer or routing block, not to later
operational pair-verification or directory-map sentences on the same file.
They SHALL NOT treat presence of procedure tokens on every pointer surface
as the safety proof. They SHALL NOT claim that an Agent followed the pointer.

#### Scenario: Explicit existing bundle prevents a second bundle and pre-entry research

- **WHEN** a user explicitly provides a reachable bundle with the current pair
  in a selected Harness workspace and asks to continue or inspect it
- **THEN** Agent routing SHALL direct to the existing-bundle continuation
  playbook before `RUN.md` or `start-research`
- **AND** it SHALL NOT create a new bundle, invoke a generic research shortcut,
  or perform request-specific direct research before that playbook is read

#### Scenario: Supplied incomplete candidate stops rather than selecting another route

- **WHEN** a user explicitly provides a reachable directory missing either
  member of the current pair
- **THEN** routing SHALL report the unsupported current-entry contract and stop
- **AND** it SHALL not route the request to `RUN.md`, `start-research`, a
  legacy entry, map-only entry, or another bundle

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

#### Scenario: Entry surfaces point instead of restating

- **WHEN** an Agent reads a root or Harness routing surface before selecting an
  entry
- **THEN** the surface SHALL point to
  `DEEP_RESEARCH_HARNESS/command_playbook/continue-run-bundle.md` heading
  `Entry Selection (canonical)` as the one canonical statement of the complete
  selection rule
- **AND** it SHALL name `unsupported_current_entry_contract`
- **AND** it SHALL NOT reproduce the full selection procedure or rephrase its
  branches
- **AND** the canonical playbook SHALL state both the verified-pair branch and
  the no-candidate `RUN.md` branch

#### Scenario: Documentation regressions lock the canonical section not pointer restatement

- **WHEN** a documentation regression inspects entry-selection safety
- **THEN** it SHALL assert the complete rule on
  `command_playbook/continue-run-bundle.md` `Entry Selection (canonical)`
- **AND** it SHALL assert that listed pointer surfaces name the playbook,
  that heading, and `unsupported_current_entry_contract`
- **AND** it SHALL fail when a named pointer or routing block reproduces the
  selection procedure
- **AND** it SHALL NOT treat a later operational pair-verification or
  directory-map sentence on the same file as restatement
- **AND** it SHALL NOT require those procedure tokens on every pointer surface
  as the pass condition
