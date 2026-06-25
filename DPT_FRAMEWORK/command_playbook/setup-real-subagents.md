# setup-real-subagents

Agent command: set up project-local real LLM subagent definitions for the DPT subagent prototype.

## Purpose

Create or update the preset role-agent environment required by the real subagent path:

- Claude Code project agents under `.claude/agents/*.md`
- Codex project agents under `.codex/agents/*.toml`

This command prepares the agent harness only. It does not run subagent experiments and does not write slot results.

## Safety Rules

- Run from the project root, where `DPT_FRAMEWORK/` exists.
- Create `.claude/agents/` and `.codex/agents/` if missing.
- Only overwrite files that contain the marker `DPT managed: real-subagent`.
- If a target file exists without that marker, stop and report the collision. Do not overwrite user-managed agent definitions.
- Do not edit `experiments_playbook/exp_subagent/`.
- Do not edit `experiments_env/prototype-subagent/`.
- Do not run any real subagent playbook.

## Role Set

Install the six stable role agents listed in:

```text
DPT_FRAMEWORK/command_playbook/subagent_templates/roles.md
```

V1.5 agents must be installed as stable definitions but not invoked by the v1 real experiment family unless a later task wires them in.

## Shared Agent Instructions

Every generated agent definition MUST include these constraints:

- You are a bounded DPT subagent role.
- Read the slot's `task.md` and `result.schema.json` when the parent prompt gives paths.
- Return strict JSON to the parent matching `result.schema.json`.
- Do not mutate WorkflowState.
- Do not pass or fail gates.
- Do not repair queues.
- Do not authorize stopping.
- Do not include raw search trails, large page dumps, or private reasoning in the returned JSON.
- Prefer concise evidence summaries and source references.
- Subagents write only their slot-local `runtime-receipt.jsonl`; Parent Relay writes `result.json`, optional `result.md`, `_status.json`, and `_agent.json`; subagents return result JSON to the parent instead of writing durable result or workflow files directly.

## Claude Code Files

For each role, write `.claude/agents/<role>.md` by filling this template:

```text
DPT_FRAMEWORK/command_playbook/subagent_templates/claude-agent.md.tmpl
```

## Codex Files

For each role, write `.codex/agents/<role>.toml` by filling this template:

```text
DPT_FRAMEWORK/command_playbook/subagent_templates/codex-agent.toml.tmpl
```

Codex and Claude Code use the same DPT role-agent taxonomy. If a Codex surface needs an adapter, preserve the role key and per-slot prompt contract; do not replace the role with generic fallback semantics.

## Template Substitution

For each role in `subagent_templates/roles.md`, replace these placeholders:

- `{{role}}`: role key, such as `dpt-source-intake`
- `{{description}}`: role description from the role table
- `{{role_focus}}`: matching role focus section

## Verification

After writing files, verify:

```bash
test -d .claude/agents
test -d .codex/agents
find .claude/agents .codex/agents -maxdepth 1 -type f | sort
rg -n "DPT managed: real-subagent" .claude/agents .codex/agents
```

Expected count: 12 managed files, one Claude Markdown file and one Codex TOML file per role.

## Report

Report:

```text
Real subagent environment prepared.
  Claude agents: 6 managed files under .claude/agents/
  Codex agents:  6 managed files under .codex/agents/
  V1 roles:      4
  V1.5 roles:    2 placeholders installed, not wired into v1 experiments
```
