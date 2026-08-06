# Command Subagent Environment

> req: CSE-001

## Purpose

The real subagent path requires project-level agent definitions before the native Codex / Claude Code experiments run. A Deep Research Harness command playbook prepares those definitions without running the experiments.
## Requirements
### Requirement: Command playbook prepares real subagent environment
The `DEEP_RESEARCH_HARNESS/command_playbook/setup-real-subagents.md` playbook SHALL instruct an agent to create or update project-local Codex and Claude Code role-agent definitions for the Deep Research Harness real subagent taxonomy.

#### Scenario: Agent follows setup playbook
- **WHEN** an agent reads `DEEP_RESEARCH_HARNESS/command_playbook/setup-real-subagents.md`
- **THEN** it creates `.claude/agents/` and `.codex/agents/` if missing
- **AND** it prepares role-agent definitions for `dpt-source-intake`, `dpt-source-diagnostic`, `dpt-claim-verifier`, `dpt-evidence-extractor`, `dpt-topic-scout`, and `dpt-synthesis-reviewer`

#### Scenario: Command index lists setup playbook
- **WHEN** a developer reads `DEEP_RESEARCH_HARNESS/COMMANDS.md`
- **THEN** `setup-real-subagents` is listed under command playbooks

### Requirement: Setup writes both Claude Code and Codex project agent definitions
The setup command SHALL define each role in both Claude Code and Codex project-agent locations: `.claude/agents/<role>.md` and `.codex/agents/<role>.toml`.

#### Scenario: Claude Code agent files are prepared
- **WHEN** the setup command completes successfully
- **THEN** `.claude/agents/` contains one Markdown file per Deep Research Harness role

#### Scenario: Codex agent files are prepared
- **WHEN** the setup command completes successfully
- **THEN** `.codex/agents/` contains one TOML file per Deep Research Harness role

### Requirement: Setup protects user-managed agent definitions
The setup command SHALL only overwrite files that contain the marker `DPT managed: real-subagent`. If a target file exists without that marker, the command SHALL stop and report the collision.

#### Scenario: Managed file may be updated
- **WHEN** `.claude/agents/dpt-source-intake.md` exists and contains `DPT managed: real-subagent`
- **THEN** the setup command may update it

#### Scenario: Unmanaged file is not overwritten
- **WHEN** `.codex/agents/dpt-source-intake.toml` exists without `DPT managed: real-subagent`
- **THEN** the setup command stops and reports a collision

### Requirement: Setup does not run experiments

The setup command SHALL NOT spawn native sub-agents, run real test playbooks, write work-unit result/status/agent files, or edit deferred experiment directories. It SHALL prepare project-level real sub-agent environment definitions only.

#### Scenario: setup is environment-only

- **WHEN** the setup command runs
- **THEN** no work-unit result, status, or runtime-agent output files are produced by the setup command

