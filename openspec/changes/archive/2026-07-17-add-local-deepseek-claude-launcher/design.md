# Design: `add-local-deepseek-claude-launcher`

> Target version: v0.33

## Core Principle: One Repo-Owned Entry And One Explicit Config Source

The launcher is a pre-trigger host tool with exactly three prerequisites:

1. **The global `claude` command** on PATH (the official Claude Code CLI)
2. **Node.js >=20**, matching the repository runtime rule
3. **The ignored repo-root `.env`**, as requested by the user

There is no settings JSON, global Claude config mutation, runtime-bundle config, or second credential store. The launcher resolves the repository root from its own checked-in location and reads only the supported `DEEPSEEK_*` keys from the root `.env`.

Except for the launcher-owned first argument `--check`, the launcher's CLI surface mirrors `claude`: caller arguments and inherited stdio pass through unchanged, and the child exit or signal outcome is propagated. A coding Agent invokes `node DPT_FRAMEWORK/host_tools/claude-deepseek.mjs -p "hello"` with the same Claude arguments it already knows.

## Direct Source of Record

```
.env                                       ←  sole secret/config value source (git-ignored)
.env.example                               ←  committable variable contract and safe examples
DPT_FRAMEWORK/host_tools/
  README.md                                ←  human/Agent setup and usage
  claude-deepseek.mjs                      ←  sole execution path
```

The README is explanatory only. The launcher code owns parsing, validation, environment projection, and child launch; the root `.env` owns configured values.

## Shortest Legal Loop

```
user copies repo-root .env.example → .env, fills in credential + endpoint + model (one-time)
  → user or Agent runs node DPT_FRAMEWORK/host_tools/claude-deepseek.mjs [--check]
  → launcher checks: claude on PATH, root .env exists and is readable
  → launcher parses only supported DEEPSEEK_* assignments as data, never as shell
  → launcher builds a clean child env and validates required values plus well-formed URL
  → --check: report all results with credential values redacted, exit 0/1/2
  → normal mode: spawn claude with inherited stdio and exact caller arguments, then propagate its outcome
```

No state file, daemon, retry loop, settings mutation, provider fallback, or runtime-bundle dependency is introduced.

## Node.js ESM And Path Resolution

`AGENTS.md` requires Node.js >=20 and pure JavaScript ESM for repository code. The launcher therefore uses one `.mjs` file and Node built-ins (`node:fs`, `node:path`, `node:url`, `node:child_process`) rather than creating a Bash exception inside a change artifact.

The module resolves the repository root as two parents above its checked-in location:

```text
DPT_FRAMEWORK/host_tools/claude-deepseek.mjs
                 ../..  -> repo root -> .env
```

Invocation CWD does not select configuration. Copying or symlinking the launcher outside this layout is unsupported because it would change the direct Source of Record. Tests copy the production module into a temporary repository-shaped directory and place the fixture `.env` at that temporary root.

The Node parent remains present while Claude Code runs. It uses inherited stdio and forwards normal termination signals; it then preserves the numeric exit code or re-emits the child signal. Exact PID identity is not part of the contract.

## Environment Isolation Design (LDC-002)

The root `.env` is parsed as data; it is never sourced and cannot execute command substitution or shell syntax. The parser supports the assignment form documented in `.env.example`, consumes only the supported `DEEPSEEK_*` keys, ignores unrelated root `.env` keys, and rejects malformed or duplicate supported assignments.

The child environment begins as a copy of the inherited process environment so normal `PATH`, terminal, locale, and Claude behavior remain available. Before launch it removes every inherited `ANTHROPIC_*` and `DEEPSEEK_*` key plus the explicitly owned routing keys `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, `CLAUDE_CODE_SUBAGENT_MODEL`, `ENABLE_TOOL_SEARCH`, and `API_TIMEOUT_MS`. It then maps only parsed root `.env` values into the Claude-facing variables. Root `.env` keys are not bulk-exported to the child.

## Endpoint Validation (LDC-003)

The launcher validates `DEEPSEEK_ANTHROPIC_BASE_URL` with the platform URL parser. It accepts any `http:` or `https:` URL with a non-empty host. It rejects URL-embedded username/password, malformed URLs, and empty values with exit 2. The user chooses their endpoint — local proxy, remote service, or otherwise.

## `--check` Preflight Mode (LDC-004)

When the first argument is `--check`, the launcher runs **all** validations (not fail-fast) and reports readiness without launching claude. Key design choices:

- **All checks run to completion.** Unlike normal mode which exits on the first error, `--check` accumulates and reports every failure so the user can fix everything in one pass.
- **Exit code reflects worst severity.** 0 = all pass; 1 = at least one check failed but only non-config errors (claude missing); 2 = at least one configuration error (.env missing, key unset, endpoint invalid). If both a code-1 and code-2 failure exist, exit 2.
- **Credential values are never printed.** The API key is reported as `set (value redacted)` when present, or `not set` when missing/empty.
- **Endpoint URL is printed** (it is not a secret — it's the user's configured endpoint).
- **Output uses `[OK]` / `[FAIL]` prefix** for mechanical parseability without requiring structured JSON.

Example output (all passing):
```
[OK] claude: /usr/local/bin/claude
[OK] .env: /path/to/repo/.env
[OK] DEEPSEEK_API_KEY: set (value redacted)
[OK] DEEPSEEK_ANTHROPIC_BASE_URL: https://api.deepseek.com/anthropic (valid)
[OK] DEEPSEEK_MODEL: deepseek-v4-pro (set)
[OK] Ready — all preflight checks passed.
```

No token, no key material — nothing that would leak credentials into terminal history, logs, or subagent transcripts.

## Argument and Exit Code Passthrough (LDC-005, LDC-008)

The launcher spawns `claude` without a shell, forwards all normal-mode arguments verbatim, inherits stdin/stdout/stderr, and propagates Claude Code's exit or signal outcome.

The launcher does NOT inject:
- `--settings <path>` — no separate settings file
- `--allow-dangerously-skip-permissions` — no permission bypass
- Any other Claude Code flag

The user may pass any Claude-supported flag explicitly (including `--allow-dangerously-skip-permissions` if they choose). The launcher itself adds nothing.

**`--check` edge case**: If the first argument is `--check`, it is consumed by the launcher for preflight mode. It cannot be forwarded to claude. This is a known limitation — `--check` is not a Claude Code flag, so forward compatibility is not affected.

## Exit Code Mapping

The launcher follows the project's exit code convention: 0 = success, 1 = external dependency missing, 2 = configuration error.

**Pre-launch exit codes** (before spawning `claude`; used by both `--check` and normal mode validation):

| Code | Condition |
|---|---|
| `0` | All validations passed (`--check` reports ready, or normal mode proceeds to child launch) |
| `1` | `claude` command not found on PATH |
| `2` | Configuration error: root `.env` missing/unreadable, supported assignment invalid, required key/model missing, or endpoint malformed/invalid |

In `--check` mode: all checks run to completion. Exit code is the worst severity found (2 if any config error present; 1 if only non-config failures; 0 if all pass).

**Post-launch outcomes** (normal mode only): Claude's numeric exit code becomes the launcher's exit code; signal termination is propagated as the same signal. A child-spawn failure is a repairable external dependency failure and exits 1.

## Env Var Mapping Table

All variables use the `DEEPSEEK_` prefix in `.env` to avoid collision with `ANTHROPIC_*` vars that get cleaned during env isolation.

| .env variable | Claude env var | Required | Default |
|---|---|---|---|
| `DEEPSEEK_API_KEY` | `ANTHROPIC_AUTH_TOKEN` | **Yes** | — |
| `DEEPSEEK_ANTHROPIC_BASE_URL` | `ANTHROPIC_BASE_URL` | **Yes** | — |
| `DEEPSEEK_MODEL` | `ANTHROPIC_MODEL` and alias fallback | **Yes** | — |

All model aliases (`ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`, `ANTHROPIC_DEFAULT_HAIKU_MODEL`, `CLAUDE_CODE_SUBAGENT_MODEL`) default to `DEEPSEEK_MODEL`. Launcher-owned fixed values: `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`, `ENABLE_TOOL_SEARCH=false`, `API_TIMEOUT_MS=3000000`.

The user only needs to configure three values. Everything else has a sensible default.

## Test Strategy

Integration tests use `node:test` + `node:assert/strict` + `spawnSync`. A test-owned executable Node fixture named `claude` records its invocation environment and arguments to JSON, mirrors test input/output, and exits with a configurable code. It proves only the launcher boundary, not Claude Code or model behavior.

Each test case creates a temporary repository-shaped directory under `tests/.test-tmp/`:
```
tests/.test-tmp/deepseek-launcher-XXXXX/
  .env                                      # non-secret test config at temp repo root
  DPT_FRAMEWORK/host_tools/
    claude-deepseek.mjs                     # copy of production launcher
  fake_bin/
    claude                                   # fake executable
```

The temp tree is repository-shaped, and `fake_bin/` is prepended to `PATH`. No real credential, network call, Claude binary, or model is used.

Focused cases cover:
- --check passes with valid config (remote endpoint) → exit 0
- --check fails on missing root `.env`, empty key/model, malformed URL, or URL-embedded credentials → exit 2
- --check with multiple failures (claude missing + config error) → exit 2, both reported
- Valid endpoint URL accepted → launches fake claude
- Argument and inherited stdio passthrough
- Exit code and signal outcome preservation
- Inherited `ANTHROPIC_*`/`DEEPSEEK_*` routing contamination is removed and root `.env` wins
- Root `.env` is not shell-evaluated and unrelated keys are not bulk-exported
- No --allow-dangerously-skip-permissions injection
- --check does not launch claude
- Fails when claude missing from PATH → exit 1

Tests never use real credentials or call real Claude/DeepSeek.

## Net Simplification

**Removed** (vs personal script at `/Users/bowhead/scripts/deepseek_claude.sh`):
- Hardcoded API key in script source
- `--settings` flag loading a separate JSON file
- `--allow-dangerously-skip-permissions` as default behavior
- Banner echoing endpoint/model info to stdout (could leak to logs)
- Global Claude settings mutation

**Added** (net-new, justified):
- Endpoint URL validation (catches typos and empty configs before reaching claude)
- `--check` preflight with credential redaction
- `.env.example` as committable contract
- `host_tools/README.md` as the focused usage and boundary document
- Focused integration coverage of the launcher boundary

**Avoided** (explicitly NOT produced):
- Research workflow node, Engine API, bundle state, command playbook
- Background service, daemon, provider fallback, auto-retry tree
- New npm dependency
- Second CLI controller, configuration generator, or permission bypass
- Any runtime-bundle, workflow, Engine, global settings, or remote provider dependency

## Simplicity Admission Test

**1. 最短合法闭环和直接 Source of Record 是什么？**

repo-root `.env` → launcher → isolated child env → endpoint URL validation → Claude Code child. Source of Record: root `.env` (values), root `.env.example` (contract), and `host_tools/claude-deepseek.mjs` (execution). No settings JSON or second credential store.

**2. 这个 change 删除、合并或避免了哪份复杂度？**

Deletes: reliance on a personal script, hardcoded credentials, settings JSON file, and default permission bypass flag. Avoids: new controller, daemon, workflow node, Engine API, bundle state, provider abstraction, retry tree, or remote fallback.

The added control is bounded to one data-only config parser, one URL format check, and one child-process boundary. Together they replace shell evaluation, credential/settings duplication, and inherited provider ambiguity rather than layering on another runtime controller.

## Helper Direction Review

**1. 哪个决定确实需要用户？**

用户决定：端点地址、API key、模型别名、是否传递权限相关 Claude Code flag。这些是新的语义/风险/权限决定。

**2. 用户决定后，哪些步骤应立即回到 Agent 执行？**

配置好 repo-root `.env` 后，Agent 机械执行 `node DPT_FRAMEWORK/host_tools/claude-deepseek.mjs --check`（验证）和同一 launcher 加 Claude 参数（启动）。launcher 不创造新决策点，不询问用户，不改变权限模型。Agent 在现有权限内执行，Engine 不参与。

## Boundary

The launcher is a **pre-trigger host tool**. It runs before Claude Code's initialization and before any DPT_FRAMEWORK entry point. It does not:

- Read or write bundle state (`rb_status.json`, `rb_queue.json`, `rb_trace.jsonl`)
- Interact with Engine modules, gates, or workflows
- Create runtime artifacts, receipts, or trace events
- Influence research phase routing or HITL checkpoints
- Establish a new lifecycle, permission model, or controller surface
- Read any repo-root value source other than the ignored `.env`

The launcher owns only: finding `claude`, parsing supported root `.env` keys as data, constructing the child environment, validating the endpoint URL, and launching Claude Code. Claude Code and DPT_FRAMEWORK otherwise operate as they do today.

## Risks / Trade-offs

- **Node remains the parent process** → inherit stdio, forward normal signals, and test exit/signal propagation; exact PID replacement is explicitly out of scope.
- **A root `.env` may contain unrelated or richer syntax** → consume only documented `DEEPSEEK_*` assignments and never evaluate the file as shell; malformed supported assignments fail with one direct correction path.
- **Claude Code is an external binary** → the launcher can enforce the configured model endpoint and traffic preferences, but does not claim to prove every unrelated network behavior of future Claude versions.
- **Model names vary by provider** → require one explicit `DEEPSEEK_MODEL` and let optional aliases fall back to it instead of hardcoding speculative version names.
