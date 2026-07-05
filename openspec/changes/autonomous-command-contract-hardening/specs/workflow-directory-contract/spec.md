## MODIFIED Requirements

> req: WDC-007

### Requirement: Anti-mixing rules

Framework artifact types SHALL NOT be mixed into each other's directories.

The anti-mixing rules SHALL include:

- Gate definition JSON MUST NOT be placed in `DPT_FRAMEWORK/workflows/nodes/` or `dpt_rb_*`.
- Phase/shared node Markdown MUST NOT be placed in `_backlog/workflow/` as a runtime surface.
- Experiment playbooks MUST NOT be treated as production workflow nodes.
- `DPT_FRAMEWORK/command_playbook/` contains Agent-facing command instructions and diagnostic/maintenance playbooks; it MUST NOT contain lifecycle phase nodes and MUST NOT be described as a human or operator co-runner surface for autonomous pipeline execution.
- Runtime state, gate result, trace, and repair attempt data MUST NOT be written back to `DPT_FRAMEWORK/`.
- `_cache/` projections MUST NOT be treated as runtime truth.
- Fake evidence, fake receipts, and fake trace MUST NOT appear in any directory.

#### Scenario: Command playbook is not a lifecycle node

- **WHEN** docs describe `DPT_FRAMEWORK/command_playbook/`
- **THEN** they SHALL describe it as Agent-facing command guidance or diagnostic/maintenance playbooks
- **AND** they SHALL NOT describe it as operator and Agent co-runner instructions for normal autonomous lifecycle execution
- **AND** lifecycle phase nodes SHALL remain under `DPT_FRAMEWORK/workflows/nodes/phases/`

## ADDED Requirements

> req: WDC-011

### Requirement: Command playbooks are Agent-facing command instructions

`DPT_FRAMEWORK/command_playbook/` SHALL be described as containing Agent-facing command instructions and diagnostic/maintenance playbooks, not as instructions for a human or operator co-runner inside the autonomous pipeline.

Framework directory docs SHALL NOT use unqualified `Agent/operator` or equivalent slash wording to describe the command-playbook audience. Operator or maintainer wording MAY appear only when clearly scoped to post-run inspection, diagnostics, repository maintenance, or out-of-band review, and not to running lifecycle commands mid-pipeline.

#### Scenario: Command playbook audience is Agent-facing

- **WHEN** framework docs describe `DPT_FRAMEWORK/command_playbook/`
- **THEN** they SHALL identify the directory as Agent-readable or Agent-facing command guidance
- **AND** they SHALL NOT identify operator as a co-runner audience for autonomous pipeline execution

#### Scenario: Diagnostic operator wording is allowed

- **WHEN** a command playbook describes post-run forensics, diagnostic inspection, or maintainer review
- **THEN** operator wording MAY appear if it is explicitly out-of-band
- **AND** the wording SHALL NOT imply the operator runs normal lifecycle commands during `stop: no` execution
