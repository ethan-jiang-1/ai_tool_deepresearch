> req: ACS-005

## MODIFIED Requirements

### Requirement: Bundle continuation enters through RUN_BUNDLE.md, delegates to BUNDLE_MAP.md and COMMANDS.md

The framework SHALL provide one canonical Agent-facing playbook for continuing
an already existing run bundle: `command_playbook/continue-run-bundle.md`.
`RUN_BUNDLE.md`, `COMMANDS.md`, and relevant entry guidance SHALL point to that
playbook.

The playbook's procedure SHALL be:

1. Read `RUN_BUNDLE.md` from the supplied bundle root. If `RUN_BUNDLE.md` does
   not exist, fallback to reading `BUNDLE_MAP.md`.
2. Resolve the framework relative path from the file. If the framework is not
   reachable in the current workspace, report the boundary and stop.
3. Read `BUNDLE_MAP.md` in the same directory for the full directory layout.
4. Read `DPT_FRAMEWORK/COMMANDS.md`.
5. Select and execute the command matching the user's stated intent.

The playbook SHALL NOT duplicate lifecycle branching logic, reentry diagnostic
procedures, or per-node target selection. Those decisions belong to
`COMMANDS.md` and the individual CLI tools it references. The playbook only
bridges the user's entry point (`RUN_BUNDLE.md`) through the bundle layout
(`BUNDLE_MAP.md`) to the command surface (`COMMANDS.md`).

#### Scenario: Agent enters through RUN_BUNDLE.md

- **WHEN** a user provides a bundle with `RUN_BUNDLE.md` and states an intent
- **THEN** the Agent SHALL read `RUN_BUNDLE.md`, resolve the framework path,
  read `BUNDLE_MAP.md` for layout, read `COMMANDS.md` for operations,
  and execute the matching command
- **AND** it SHALL NOT start a new research bundle

#### Scenario: Old bundle without RUN_BUNDLE.md still works

- **WHEN** a user provides a bundle that has `BUNDLE_MAP.md` but no
  `RUN_BUNDLE.md`
- **THEN** the Agent SHALL fallback to reading `BUNDLE_MAP.md` for framework
  coordinates, then proceed to `COMMANDS.md`
- **AND** it SHALL NOT require the user to understand the difference

#### Scenario: Continuation request preserves existing decision boundaries

- **WHEN** a user asks in ordinary language to continue, inspect, supplement
  or question an existing bundle
- **THEN** the Agent SHALL classify the request against the current bundle's
  verified lifecycle facts and existing legal routes from `COMMANDS.md`
- **AND** the playbook SHALL NOT make the request a third HITL, permission
  token, or automatic rerun
