> req: ACS-003

## MODIFIED Requirements

### Requirement: Command-surface wording drift is statically validated

The project SHALL include regression coverage or a static validator that checks Agent-facing command surfaces for the command audience and HITL-boundary contract.

The validator SHALL scan at least:

- `DEEP_RESEARCH_HARNESS/COMMANDS.md`
- `DEEP_RESEARCH_HARNESS/RUN.md`
- `DEEP_RESEARCH_HARNESS/README.md`
- `DEEP_RESEARCH_HARNESS/cli/README.md`
- `DEEP_RESEARCH_HARNESS/command_playbook/*.md`
- lifecycle and shared workflow Markdown touched by this change

For `DEEP_RESEARCH_HARNESS/COMMANDS.md`, it SHALL keep the existing audience/HITL/Final/trigger markers and add only three stable helper-oriented marker groups:

- ordinary authorized command execution and reversible mechanical repair remain Agent-owned;
- human-directed identifies the decision source without transferring the command-runner role or creating host permission/Engine capability; and
- in-run HITL decisions are distinct from out-of-band maintenance/debug collaboration and from any accepted mutation/reentry capability.

Across all scanned surfaces, the validator SHALL continue to reject known drift phrases unless allowlisted with an explicit diagnostic/post-run meaning. The positive-marker contract SHALL NOT require every command playbook to repeat the top-level audience statement or encode every ACS-001 sentence as an exact substring assertion.

Allowlist entries SHALL be explicit and reviewable: file or glob, phrase class, allowed context, and reason. Operator wording MAY be allowlisted only for post-run diagnostics, maintenance, or out-of-band review, never for command co-runner audience during autonomous lifecycle execution.

The validator SHALL reuse the existing command-contract documentation regression surface, remain deterministic, and use Node.js built-ins only. It SHALL NOT add a prose-quality classifier or attempt to judge wording beyond the defined phrase classes and required stable markers.

The command-index regression SHALL additionally verify command-index completeness and copyability for the surfaces this change touches:

- `persist-final-report` SHALL appear in `COMMANDS.md` as an Agent-facing operation of `operate-artifact-persistence.mjs`;
- an executable command string presented in prose or in a command playbook copy context SHALL carry the full executable prefix `node DEEP_RESEARCH_HARNESS/cli/<tool>.mjs <verb> ...` so a copied command string executes without reconstruction; and
- the compact operation tables in `COMMANDS.md` MAY keep their bare non-help form when the same table row names the exact `cli/` file coordinate for the operation, because the coordinate is resolvable from the row.

The regression SHALL be deterministic, name the missing or non-copyable entry, and SHALL NOT invent requirements for commands that are not Agent-facing operation surfaces.

#### Scenario: Static validation catches implicit human presence

- **WHEN** an Agent-facing command doc says a user/operator should run a pipeline command or decide whether to continue during a non-HITL phase
- **THEN** the static validation SHALL fail
- **AND** the failure SHALL name the file and phrase class

#### Scenario: Static validation requires a small stable helper contract

- **WHEN** `DEEP_RESEARCH_HARNESS/COMMANDS.md` omits one of the three helper-oriented marker groups
- **THEN** the existing command-contract documentation regression SHALL fail
- **AND** the failure SHALL name the missing stable marker
- **AND** individual command playbooks SHALL NOT be required to duplicate the full top-level audience statement
- **AND** the regression SHALL NOT grow a phrase class or exact marker for every normative sentence in ACS-001

#### Scenario: Static validation accepts diagnostic operator inspection

- **WHEN** a framework doc mentions operator inspection as post-run or diagnostic review
- **THEN** static validation SHALL NOT fail solely for that phrase
- **AND** the wording SHALL NOT describe the operator as a command co-runner during the autonomous pipeline

#### Scenario: Implemented command is missing from the index

- **WHEN** `persist-final-report` is absent from `COMMANDS.md` even though it is implemented and required by an accepted spec
- **THEN** the command-index regression SHALL fail
- **AND** the failure SHALL name the missing command

#### Scenario: Prose command string is not directly executable

- **WHEN** `COMMANDS.md` prose or a command playbook presents an executable command string without the full `node DEEP_RESEARCH_HARNESS/cli/<tool>.mjs` prefix
- **THEN** the command-index regression SHALL fail
- **AND** the failure SHALL name the entry and its expected prefix
