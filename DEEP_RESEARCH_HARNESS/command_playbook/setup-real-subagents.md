# setup-real-subagents

Agent command: set up project-local real LLM sub-agent definitions for Deep Research Harness work-unit execution.

## Purpose

Create or update the preset role-agent environment required by the real work-unit sub-agent path:

- Claude Code project agents under `.claude/agents/*.md`
- Codex project agents under `.codex/agents/*.toml`

This command prepares the agent harness only. It does not run sub-agent experiments and does not write work-unit results.

## Safety Rules

- Run from the project root, where `DEEP_RESEARCH_HARNESS/` exists.
- Create `.claude/agents/` and `.codex/agents/` if missing.
- Only overwrite files that contain the marker `DPT managed: real-subagent`.
- If a target file exists without that marker, stop and report the collision. Do not overwrite user-managed agent definitions.
- Do not edit `experiments_playbook/exp_subagent/`.
- Do not edit `experiments_env/prototype-subagent/`.
- Do not run any real subagent playbook.

## Role Set

Install the six stable role agents listed in:

```text
DEEP_RESEARCH_HARNESS/command_playbook/subagent_templates/roles.md
```

V1.5 agents must be installed as stable definitions but not invoked by the v1 real experiment family unless a later task wires them in.

## Shared Agent Instructions

Every generated agent definition MUST include these constraints:

- You are a bounded Deep Research Harness subagent role.
- Read the work-unit `task.md`, `_beacon.json`, and `result.schema.json` when the parent prompt gives paths.
- Treat the Engine-written `actor_execution` route plus exact `work_id` and `receipt_nonce` as the logical attempt binding. A delegated role authors only its assigned candidate/result and receipt coordinates; a Phase Agent may submit the returned candidate but must not author substitute content under that same delegated binding.
- Treat this binding as Agent Flow guidance only. It does not authenticate a physical writer, prove host/sub-agent liveness, or authorize a same-ID retry.
- Preserve `work_id`, `queue_item_id`, `kind`, and `receipt_nonce` exactly in receipt events and returned JSON.
- Return strict JSON matching `result.schema.json` for the parent to submit through `operate-work-unit submit`.
- Do not mutate WorkflowState.
- Do not pass or fail gates.
- Do not repair queues.
- Do not append `rb_output_declarations.jsonl` or mark queue demand complete.
- Do not authorize stopping.
- Do not include raw search trails, large page dumps, or private reasoning in the returned JSON.
- Prefer concise evidence summaries and source references.
- Sub-agents write only the assigned `runtime-receipt.jsonl`, declared output files, and declared cache leaves. The Engine accepts durable result/status/ledger state only through `operate-work-unit submit`.
- Return `busy`, `suspect_transaction`, declaration-recovery, or supersession feedback to the Phase Agent. A role agent never edits ledger, index, status, queue, lock, journal, or hash authority and never creates a successor itself.

## Claude Code Files

For each role, write `.claude/agents/<role>.md` by filling this template:

```text
DEEP_RESEARCH_HARNESS/command_playbook/subagent_templates/claude-agent.md.tmpl
```

## Codex Files

For each role, write `.codex/agents/<role>.toml` by filling this template:

```text
DEEP_RESEARCH_HARNESS/command_playbook/subagent_templates/codex-agent.toml.tmpl
```

Codex and Claude Code use the same Deep Research Harness role-agent taxonomy. If a Codex surface needs an adapter, preserve the role key and work-unit prompt contract; do not replace the role with generic fallback semantics.

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
