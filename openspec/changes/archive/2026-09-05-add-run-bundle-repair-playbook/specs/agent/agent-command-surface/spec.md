> req: ACS-005, ACS-007, ACS-008

## MODIFIED Requirements

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

Maintenance and repair intent on a supplied reachable existing bundle candidate
is a defined entry intent family: the candidate SHALL pass the SAME same-root
`BUNDLE_ENTRY.md` + `BUNDLE_MAP.md` preflight and SHALL stop at the SAME
unsupported-current-entry-contract boundary, then route to
`command_playbook/repair-run-bundle.md` instead of the continuation or research
flow. The canonical entry selection SHALL NOT introduce a new stop name, a
second continuation route, a third HITL, a permission token, or arbitrary
mutation authority for repair requests. Classification wording (for example
修好 / 恢复 / 卡住了 / 残留 / 为什么 gate 不过 versus 继续 / 深挖 / 补研究) is navigation
guidance only: the Agent owns semantic classification, and mixed or ambiguous
intent SHALL trigger the smallest clarification instead of automatic routing.

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

#### Scenario: Maintenance or repair intent routes to the repair playbook

- **WHEN** a user supplies a reachable existing bundle candidate that passes the
  same-root preflight and states maintenance or repair intent (for example 修好 /
  恢复 / 卡住了 / 清残留 / 为什么 gate 不过)
- **THEN** the canonical entry selection SHALL classify the request in the
  maintenance-repair intent family and route to
  `command_playbook/repair-run-bundle.md`
- **AND** it SHALL apply the same preflight and unsupported-current-entry-contract
  boundary as continuation, without adding a new stop or a second continuation
  route

#### Scenario: Repair entry adds no mutation authority

- **WHEN** a maintenance-repair request routes to the repair playbook
- **THEN** the routing SHALL NOT create permission, a checkpoint, an Engine
  verdict override, or arbitrary state-mutation authority
- **AND** legal repair operations remain existing accepted Engine paths
  (supersede / recover-* / apply / persist / inspect / audit), with missing
  paths reported as missing contract

#### Scenario: Ambiguous repair versus research wording asks the smallest clarification

- **WHEN** user wording mixes maintenance intent with research or continuation
  intent, or its repair-versus-research boundary is materially ambiguous
- **THEN** the Agent SHALL ask the smallest clarification before routing
- **AND** it SHALL NOT auto-route on keywords or create a classification enum

## ADDED Requirements

### Requirement: The repair playbook is a diagnosis-first maintenance surface

The Harness SHALL provide one Agent-facing maintenance playbook for an existing
run bundle: `DEEP_RESEARCH_HARNESS/command_playbook/repair-run-bundle.md`.

The playbook SHALL be diagnosis-first: locate the supplied bundle, run the
baseline checks (`audit-phase-status`, `validate-bundle`, `inspect-bundle`),
consume Engine structured verdicts (audit closed outcomes,
`check-reentry.root_findings[]`, wave inspect `hints[]`), perform the legal
repair operation the verdict names, and rerun the same checkpoint. A legal
diagnosis outcome SHALL include "no repair needed", which falls through to the
existing continuation flow without crossing a new boundary.

The playbook SHALL be navigation-self-contained: it SHALL carry bundle
coordinates, exact command strings with the full
`node DEEP_RESEARCH_HARNESS/cli/<tool>.mjs <verb> ...` prefix, flow order, and
boundary rules, and SHALL reference contract templates and canonical file name
rules from `COMMANDS.md` Copyable Contract Templates and the owning specs
instead of restating them, so no second source of truth is introduced.

The playbook SHALL be generic across production run bundles: it applies to any
`dpt_rb_*` bundle, any wave, and any breakage class, and SHALL key scenario
mapping to Engine structured verdicts (`rule_id` / `repair_kind` / `write_to` /
`near_matches`) rather than to coordinates of any specific bundle. Concrete
coordinates in examples SHALL be placeholders only.

The playbook SHALL preserve the out-of-band maintenance boundary: the user's
repair request is the human-directed decision source (per ACS-001), the Agent
executes legal mechanical repair and reruns the same checkpoint, a missing
Engine path is reported as `missing_contract` without hand-written authority or
an Engine-invisible parallel path, and research-semantic correction is routed
to rerun, not to repair. The playbook SHALL NOT target disposable `dpt_disp_*`
bundles (recreate, do not repair).

Playbook wording SHALL satisfy the ACS-003 static documentation regression
scanned over `command_playbook/*.md`.

#### Scenario: Repair flow starts with baseline diagnosis

- **WHEN** the Agent enters the repair playbook for a supplied bundle
- **THEN** the first actions SHALL be the baseline checks and reading Engine
  structured verdicts
- **AND** legal repair SHALL rerun the same checkpoint that produced the verdict

#### Scenario: Diagnosis finds nothing broken

- **WHEN** baseline checks and Engine verdicts show a healthy bundle
- **THEN** the repair flow SHALL fall through to the existing continuation flow
- **AND** it SHALL NOT invent repair work or mutate state

#### Scenario: Missing engine path stops at the boundary

- **WHEN** a repair step has no accepted Engine path
- **THEN** the playbook SHALL report `missing_contract` and stop
- **AND** it SHALL NOT hand-write authority or create an Engine-invisible
  parallel path

#### Scenario: Playbook is bundle-agnostic

- **WHEN** scenario examples appear in the playbook
- **THEN** concrete bundle coordinates SHALL be placeholders or illustrative
  only, with the authoritative mapping keyed to Engine structured verdicts

#### Scenario: Playbook wording passes static regression

- **WHEN** the repair playbook exists under `command_playbook/`
- **THEN** the command-contract documentation regression SHALL scan and pass it
- **AND** no allowlist entry SHALL be added except with file, phrase class,
  allowed context, and reason

### Requirement: The command index discoverably routes repair intents

The Agent-facing command index (`DEEP_RESEARCH_HARNESS/COMMANDS.md`) SHALL
register `command_playbook/repair-run-bundle.md` and provide a repair-intent
routing aid (navigation only, sibling of the post-final iteration routing aid)
that maps repair-family wording (for example 修好 / 恢复 / 卡住了 / 残留 / 为什么不过) to
the repair playbook and its legal repair operations.

The routing aid SHALL be navigation only: it SHALL NOT redefine the ACS-001
audience statement or responsibility boundaries, create a second route for the
research or continuation families, or hand classification to the Engine. For
wording that mixes repair with research or continuation, or is otherwise
materially ambiguous, the aid SHALL direct the Agent to the existing
Agent-owned semantic classification boundary and its smallest-clarification
rule instead of automatic selection. Any executable command string appearing in
the aid SHALL keep the full `node DEEP_RESEARCH_HARNESS/cli/<tool>.mjs ...`
prefix required by the index copyability contract.

#### Scenario: Repair wording reaches the repair playbook

- **WHEN** the Agent reads `DEEP_RESEARCH_HARNESS/COMMANDS.md` while handling an
  explicit repair request
- **THEN** the routing aid SHALL lead from that request family to
  `command_playbook/repair-run-bundle.md`
- **AND** it SHALL NOT route that family to the continuation or research flow

#### Scenario: Mixed wording does not auto-route

- **WHEN** repair wording mixes with research or continuation wording, or its
  repair-versus-research boundary is materially ambiguous
- **THEN** the routing aid SHALL direct the Agent to the existing Agent-owned
  semantic classification boundary with the smallest clarification
- **AND** it SHALL NOT select a route automatically or create a new
  classification authority

#### Scenario: The repair routing aid adds no authority

- **WHEN** the repair routing aid is present in the command index
- **THEN** it SHALL NOT create permission, a checkpoint, a lifecycle route, or
  an Engine verdict
- **AND** the ACS-001 audience statement, marker, and responsibility contracts
  SHALL remain intact
