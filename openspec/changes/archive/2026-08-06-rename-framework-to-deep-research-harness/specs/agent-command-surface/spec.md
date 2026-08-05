> req: ACS-005

## RENAMED Requirements

- FROM: `### Requirement: Bundle continuation enters through RUN_BUNDLE.md, delegates to BUNDLE_MAP.md and COMMANDS.md`
- TO: `### Requirement: Bundle continuation enters through BUNDLE_ENTRY.md, delegates to BUNDLE_MAP.md and COMMANDS.md`

## MODIFIED Requirements

### Requirement: Bundle continuation enters through BUNDLE_ENTRY.md, delegates to BUNDLE_MAP.md and COMMANDS.md

The Harness SHALL provide one canonical Agent-facing playbook for continuing an
already existing run bundle: `command_playbook/continue-run-bundle.md`.
`BUNDLE_ENTRY.md`, `COMMANDS.md`, and relevant entry guidance SHALL point to
that playbook.

The playbook's procedure SHALL be: accept the supplied bundle root; resolve it
to the current run bundle root's canonical absolute path; read
`BUNDLE_ENTRY.md` when it exists, otherwise legacy `RUN_BUNDLE.md`, otherwise
`BUNDLE_MAP.md`; resolve the Harness relative path from the selected entry (if
not reachable, report the boundary and stop); read `BUNDLE_MAP.md` for the full
directory layout when the selected entry is an entry card; read
`DEEP_RESEARCH_HARNESS/COMMANDS.md`; and select and execute the command
matching the user's stated intent.

The playbook SHALL NOT duplicate lifecycle branching logic, reentry diagnostic
procedures, or per-node target selection. Those decisions belong to
`COMMANDS.md` and the individual CLI tools it references. The playbook only
bridges the user-supplied current run bundle root through the bundle layout to
the command surface. It SHALL NOT scan for a bundle, infer one from chat or
chronology, or turn the entry card into runtime authority.

#### Scenario: Agent enters through BUNDLE_ENTRY.md

- **WHEN** a user provides a bundle with `BUNDLE_ENTRY.md` and states an intent
- **THEN** the Agent SHALL read `BUNDLE_ENTRY.md`, resolve the current run
  bundle root and Harness path, read `BUNDLE_MAP.md` for layout, read
  `COMMANDS.md` for operations, and execute the matching command
- **AND** it SHALL NOT start a new research bundle

#### Scenario: Legacy bundle entry still works

- **WHEN** a user provides a bundle without `BUNDLE_ENTRY.md`
- **THEN** the Agent SHALL read legacy `RUN_BUNDLE.md` when present, otherwise
  fall back to `BUNDLE_MAP.md` for Harness coordinates, then proceed to
  `COMMANDS.md`
- **AND** it SHALL NOT require the user to understand the difference

#### Scenario: Continuation request preserves existing decision boundaries

- **WHEN** a user asks in ordinary language to continue, inspect, supplement,
  or question an existing bundle
- **THEN** the Agent SHALL classify the request against the current bundle's
  verified lifecycle facts and existing legal routes from `COMMANDS.md`
- **AND** the playbook SHALL NOT make the request a third HITL, permission
  token, or automatic rerun
