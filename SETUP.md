# SETUP.md

Human preflight for running `DPT_FRAMEWORK`.

This file is for the human before selecting the framework entry path. After you drag or paste `DPT_FRAMEWORK/RUN.md` into an Agent conversation, the framework flow is Agent-run. Do not use this setup guide as a mid-pipeline instruction sheet.

## 1. Install

Use Node 20 and install the locked dependencies:

```bash
nvm use 20
npm install
```

Quick local checks:

```bash
node --version
node -e "await import('zod'); await import('yaml'); console.log('dependencies ok')"
node DPT_FRAMEWORK/cli/validate-workflow-package.mjs
```

The repository uses only the approved npm dependencies `zod` and `yaml`; everything else should come from Node.js built-ins.

## 2. Choose A Permission Posture

Deep Research runs are long and include non-terminal `stop: no` phases. If the host Coding Agent keeps asking for shell, file-write, fetch, or network approval during those phases, the run can stall even though the DPT framework itself is ready.

Choose one posture before the trigger:

| Posture | Use when | Trade-off |
|---|---|---|
| reviewed / interactive | First setup, development, or a run where you want to approve actions manually | Safer, but approvals may appear during long autonomous phases |
| autonomous research opt-in | Disposable or trusted workspace where you accept the host-tool risk for a full DPT run | Less interruption, but broader local authority if configured too widely |

Autonomous research is opt-in. Do not treat unrestricted file access, broad shell allowlists, network access, or approval bypass as risk-free defaults.

## 3. Claude Code

Use the current Claude Code settings and permissions documentation when configuring a real environment:

- https://code.claude.com/docs/en/settings
- https://code.claude.com/docs/en/permissions

Stable setup principles for this repo:

- Project or local settings may define permission rules, but personal local history is not a reusable template.
- Do not copy this machine's ignored `.claude/settings.local.json` into a committed project allowlist.
- If you opt into autonomous research, grant only the capability categories needed for this workspace, such as Node-based framework CLIs, npm install/test commands, file reads/writes inside this repository and active `dpt_rb_*` bundles, and any host-supported web fetch/search surface needed for research.
- Keep denials or asks for destructive, out-of-workspace, credential, global config, and unrelated shell operations.
- Organization policy, workspace trust, and user-level settings can override project intent.

## 4. Codex

Use the current Codex configuration, sandboxing, approvals, and security documentation when configuring a real environment:

- https://developers.openai.com/codex/config-basic
- https://developers.openai.com/codex/config-reference
- https://developers.openai.com/codex/concepts/sandboxing
- https://developers.openai.com/codex/agent-approvals-security

This repo currently commits `.codex/config.toml` with:

```toml
approval_policy = "on-request"
sandbox_mode = "danger-full-access"
```

That project config does not promise prompt-free execution. The approval policy, sandbox mode, workspace trust, organization policy, and user overrides still define what the host will allow.

For reviewed runs, keep approval prompts enabled and be present before triggering the framework. For autonomous research opt-in, configure Codex explicitly for the chosen workspace and risk level before the trigger; do not silently widen the committed project config just to avoid prompts.

## 5. What Verification Can And Cannot Prove

Useful pre-trigger checks:

```bash
npm install
node -e "await import('zod'); await import('yaml'); console.log('dependencies ok')"
node DPT_FRAMEWORK/cli/validate-workflow-package.mjs
```

`operate-work-unit dry-submit` is only a work-unit submit contract preflight. It checks a claimed work unit's candidate result before formal submit; it does not validate network access, shell access, file-write permission, web fetch permission, approval policy, or host sandbox settings.

There is no gate `--non-interactive` flag. If a setup guide or memory suggests one, ignore it.

## 6. Trigger The Framework

After install and permission preflight are complete, select the framework by dragging or pasting:

```text
DPT_FRAMEWORK/RUN.md
```

At that point, `RUN.md` is the entry path and command execution belongs to the Agent. HITL1 and HITL2 are the only interactive in-run checkpoints; non-terminal `stop: no` phases should not become permission-setup conversations.
