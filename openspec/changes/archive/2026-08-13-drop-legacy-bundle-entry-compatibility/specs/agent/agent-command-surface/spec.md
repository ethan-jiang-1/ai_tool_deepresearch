> req: ACS-004, ACS-005

## MODIFIED Requirements

### Requirement: Phase-boundary terminology is discoverable

Guidance and Agent-facing docs SHALL make the conceptual distinction between
phase transition, phase handoff, work completion, and witnessing discoverable
without renaming existing machine-level fields, trace events, or CLI names.

The terminology canon SHALL define:

- `phase transition`: synchronization of runtime status such as
  `rb_status.json` current/next gate state;
- `phase handoff`: the Phase Agent consuming gate CLI `check.next` through the
  accepted loader/check path and entering the next Markdown control surface;
- `work completion`: target-phase artifacts and gate/content rules proving the
  target phase's work is done; and
- `witnessing`: Engine-written evidence that binds a deterministic gate output
  to the subsequent handoff, such as the ordered
  `gate_attempt(passed=true,next=<target>)` and route-bound
  `load_complete(entry=<target>)` pair; and
- `current_node`: when non-null, the durable `rb_status.json` coordinate for
  the lifecycle Markdown control surface most recently loaded by successful
  route-bound `enter-phase`.

The docs SHALL state that `enter-phase` / `load_complete` proves entry into the
target node, not target-phase work completion. Existing machine names such as
`phase_transition`, `advance-status`, `enter-phase`, `load_complete`, `stop:
no`, and capability names SHALL remain stable unless a separate migration
changes them.

Agent-facing resume guidance, including command playbooks for an already-existing
current run bundle, SHALL prefer non-null `rb_status.json.current_node` as the
phase Markdown coordinate. It SHALL NOT tell the Agent to infer the active
phase from `current_gate` alone. If `current_node` is `null` or absent, guidance
SHALL direct the Agent to existing `BUNDLE_MAP.md`, trace, and reentry
diagnostics rather than guessing the phase from the gate window. This diagnostic
guidance applies only after the current-entry pair has been admitted; a root
without the pair fails earlier at the unsupported-current-entry-contract
boundary, and `START_FROM_HERE.md` SHALL NOT be named as a fallback.

#### Scenario: Terminology canon names the boundary layers

- **WHEN** an Agent or maintainer reads the guidance glossary or execution-model
  terminology canon
- **THEN** it SHALL distinguish phase transition, phase handoff, work
  completion, and witnessing
- **AND** it SHALL preserve existing machine-level names as stable
  implementation vocabulary

#### Scenario: Command docs do not overclaim handoff witness

- **WHEN** command docs describe `enter-phase`
- **THEN** they SHALL describe it as consuming `check.next` and witnessing
  entry/loading of the next control surface
- **AND** they SHALL NOT describe it as completing the target phase's work

#### Scenario: Existing current run bundle guidance uses current node

- **WHEN** an Agent-facing command playbook describes resuming an already-existing
  bundle that has passed current-entry admission
- **THEN** it SHALL tell the Agent to use non-null `rb_status.json.current_node`
  as the preferred phase Markdown coordinate
- **AND** it SHALL distinguish `current_node` from `current_gate` and `next_gate`
- **AND** it SHALL NOT tell the Agent to judge the current phase from
  `current_gate` alone

#### Scenario: Missing current node falls back to diagnostics

- **WHEN** a current-pair bundle has `rb_status.json.current_node: null` or no
  `current_node`
- **THEN** resume guidance SHALL direct the Agent to existing `BUNDLE_MAP.md`,
  trace, and reentry diagnostics
- **AND** it SHALL NOT guess the phase from `current_gate` alone
- **AND** it SHALL NOT name `START_FROM_HERE.md` as a legacy fallback

### Requirement: Bundle continuation enters through BUNDLE_ENTRY.md, delegates to BUNDLE_MAP.md and COMMANDS.md

The Harness SHALL provide one canonical Agent-facing playbook for continuing an
already existing run bundle: `command_playbook/continue-run-bundle.md`.
`BUNDLE_ENTRY.md`, `COMMANDS.md`, and relevant entry guidance SHALL point to
that playbook.

The playbook's procedure SHALL be: accept the supplied bundle root; resolve it
to the current run bundle root's canonical absolute path; verify that the same
root contains both `BUNDLE_ENTRY.md` and `BUNDLE_MAP.md`; read
`BUNDLE_ENTRY.md`; resolve the Harness relative path from that entry (if not
reachable, report the boundary and stop); read `BUNDLE_MAP.md` for the full
directory layout; read `DEEP_RESEARCH_HARNESS/COMMANDS.md`; and select and
execute the command matching the user's stated intent.

A supplied directory missing either member of that pair SHALL stop at the
unsupported-current-entry-contract boundary. The playbook SHALL NOT read
`RUN_BUNDLE.md`, `START_FROM_HERE.md`, or a map-only root as an operational
entry, fall back to `RUN.md`, create a new bundle, select another bundle, or
offer migration, upgrade, compatibility, or a human-only Harness inspection
route. A human may directly read historical Markdown outside this operational
contract.

The playbook SHALL NOT duplicate lifecycle branching logic, reentry diagnostic
procedures, or per-node target selection. Those decisions belong to
`COMMANDS.md` and the individual CLI tools it references. The playbook only
bridges the user-supplied current run bundle root through the verified pair to
the command surface. It SHALL NOT scan for a bundle, infer one from chat or
chronology, or turn either entry file into runtime authority.

#### Scenario: Agent enters through BUNDLE_ENTRY.md

- **WHEN** a user provides a bundle containing both `BUNDLE_ENTRY.md` and
  `BUNDLE_MAP.md` and states an intent
- **THEN** the Agent SHALL read `BUNDLE_ENTRY.md`, resolve the current run
  bundle root and Harness path, read `BUNDLE_MAP.md` for layout, read
  `COMMANDS.md` for operations, and execute the matching command
- **AND** it SHALL NOT start a new research bundle

#### Scenario: Legacy bundle entry still works

> **@deprecated scenario name** — Retained solely as the established Scenario
> anchor. The current behavior rejects the former legacy route.

- **WHEN** a user provides a directory missing `BUNDLE_ENTRY.md` or
  `BUNDLE_MAP.md`, including a directory containing only `RUN_BUNDLE.md`, only
  `START_FROM_HERE.md`, or only `BUNDLE_MAP.md`
- **THEN** the Agent SHALL report the unsupported current-entry contract and
  stop before reading `COMMANDS.md` or executing a bundle command
- **AND** it SHALL NOT fall back to a legacy entry, `RUN.md`, new-bundle
  creation, migration, or another selected bundle

#### Scenario: Continuation request preserves existing decision boundaries

- **WHEN** a user asks in ordinary language to continue, inspect, supplement,
  or question an existing bundle that passes the current-entry preflight
- **THEN** the Agent SHALL classify the request against the current bundle's
  verified lifecycle facts and existing legal routes from `COMMANDS.md`
- **AND** the playbook SHALL NOT make the request a third HITL, permission
  token, or automatic rerun
