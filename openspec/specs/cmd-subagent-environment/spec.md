# Command Subagent Environment

> req: CSE-001

## Purpose

The real subagent path requires project-level agent definitions before the native Codex / Claude Code experiments run. A DPT command playbook prepares those definitions without running the experiments.

## Requirements

### Requirement: Command playbook prepares real subagent environment
The `DPT_FRAMEWORK/command_playbook/setup-real-subagents.md` playbook SHALL instruct an agent to create or update project-local Codex and Claude Code role-agent definitions for the DPT real subagent taxonomy.

#### Scenario: Agent follows setup playbook
- **WHEN** an agent reads `DPT_FRAMEWORK/command_playbook/setup-real-subagents.md`
- **THEN** it creates `.claude/agents/` and `.codex/agents/` if missing
- **AND** it prepares role-agent definitions for `dpt-source-intake`, `dpt-source-diagnostic`, `dpt-claim-verifier`, `dpt-evidence-extractor`, `dpt-topic-scout`, and `dpt-synthesis-reviewer`

#### Scenario: Command index lists setup playbook
- **WHEN** a developer reads `DPT_FRAMEWORK/COMMANDS.md`
- **THEN** `setup-real-subagents` is listed under command playbooks

### Requirement: Setup writes both Claude Code and Codex project agent definitions
The setup command SHALL define each role in both Claude Code and Codex project-agent locations: `.claude/agents/<role>.md` and `.codex/agents/<role>.toml`.

#### Scenario: Claude Code agent files are prepared
- **WHEN** the setup command completes successfully
- **THEN** `.claude/agents/` contains one Markdown file per DPT role

#### Scenario: Codex agent files are prepared
- **WHEN** the setup command completes successfully
- **THEN** `.codex/agents/` contains one TOML file per DPT role

### Requirement: Setup protects user-managed agent definitions
The setup command SHALL only overwrite files that contain the marker `DPT managed: real-subagent`. If a target file exists without that marker, the command SHALL stop and report the collision.

#### Scenario: Managed file may be updated
- **WHEN** `.claude/agents/dpt-source-intake.md` exists and contains `DPT managed: real-subagent`
- **THEN** the setup command may update it

#### Scenario: Unmanaged file is not overwritten
- **WHEN** `.codex/agents/dpt-source-intake.toml` exists without `DPT managed: real-subagent`
- **THEN** the setup command stops and reports a collision

### Requirement: Setup does not run experiments
The setup command SHALL NOT spawn native subagents, run real test playbooks, write slot result files, or edit the deferred experiment directories.

#### Scenario: Setup is environment-only
- **WHEN** the setup command completes
- **THEN** no `result.json`, `_status.json`, or `_agent.json` slot files are produced by the setup command
