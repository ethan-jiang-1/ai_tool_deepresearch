> req: CSE-001

## MODIFIED Requirements

### Requirement: Setup does not run experiments

The setup command SHALL NOT spawn native sub-agents, run real test playbooks, write work-unit result/status/agent files, or edit deferred experiment directories. It SHALL prepare project-level real sub-agent environment definitions only.

#### Scenario: setup is environment-only

- **WHEN** the setup command runs
- **THEN** no work-unit result, status, or runtime-agent output files are produced by the setup command
