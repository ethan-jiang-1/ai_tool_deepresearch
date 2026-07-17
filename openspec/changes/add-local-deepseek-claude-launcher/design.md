# Design: `add-local-deepseek-claude-launcher`

> Target version: v0.33

## Direct Source of Record

```
DPT_FRAMEWORK/host_tools/              →  self-contained launcher directory
  README.md                            →  human/Agent: what this is, how to set up, how to use
  deepseek-claude-launcher.sh          →  sole execution path (CLI surface ≡ claude)
repo-root .env (git-ignored)           →  sole config source (one external dependency)
repo-root .env.example (committed)     →  variable contract & defaults
```

`host_tools/` is self-contained: its README explains everything needed to configure and run the launcher. The only external dependency is the git-ignored root `.env`, which the README documents clearly. The launcher's CLI surface is **identical to `claude`** — same arguments, same exit codes. A coding agent invoking `./deepseek-claude-launcher.sh -p "hello"` experiences exactly what it expects from `claude -p "hello"`. No new concepts, no new flag vocabulary.

## Shortest Legal Loop

```
user configures root .env (one-time)
  → Agent or user runs ./DPT_FRAMEWORK/host_tools/deepseek-claude-launcher.sh [--check]
  → launcher cleans inherited ANTHROPIC_*/CLAUDE_CODE_* env vars
  → launcher validates: claude on PATH, .env exists, DEEPSEEK_API_KEY set, endpoint is loopback/local
  → --check: report readiness with credential values redacted, exit 0 or 1
  → normal mode: export Anthropic-compatible env vars from DEEPSEEK_* counterparts
  → exec claude "$@" — transparent argument/exit-code passthrough
```

No intermediate process, no state file, no daemon, no retry loop.

## Bash vs Node.js Rationale

The launcher is a process wrapper that needs to:

1. Manipulate environment variables for the current process
2. Clean inherited state before applying new values
3. `exec` into another binary (claude), replacing itself in the process tree

Bash is the correct tool for this specific concern. `exec claude "$@"` in bash is a true process replacement — the shell process _becomes_ claude. In Node.js, `child_process.spawn` keeps Node as a parent process, adding a layer of indirection with no benefit for a pass-through launcher.

The project's "use Node.js for everything" rule applies to **application logic**: CLI tools, schema validation, gate evaluation, state management. The launcher has zero application logic — it is OS-level process management. This is the same category as a shebang line or a package.json `"scripts"` entry.

## Environment Isolation Design (LDC-002)

The isolation uses a two-phase approach:

**Phase 1 — Clean**: Iterate over all currently-set environment variables via `env`. Unset every variable whose name matches `ANTHROPIC_*` or the specific `CLAUDE_CODE_*` keys (`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, `CLAUDE_CODE_SUBAGENT_MODEL`), plus `ENABLE_TOOL_SEARCH` and `API_TIMEOUT_MS`. This prevents inherited provider state — from a previous Claude session, another project's `.env`, or shell profile — from contaminating the local endpoint.

**Phase 2 — Apply**: Source `.env` with `set -a` (auto-export). Then export each `ANTHROPIC_*` / `CLAUDE_CODE_*` variable from its `DEEPSEEK_*` counterpart in `.env`.

The `DEEPSEEK_` namespace prevents the user's `.env` values from being caught by the Phase 1 clean — only `ANTHROPIC_*` and `CLAUDE_CODE_*` are stripped, not `DEEPSEEK_*`.

## Local-Only Endpoint Validation (LDC-003)

The launcher parses `DEEPSEEK_ANTHROPIC_BASE_URL`, extracts the host portion (stripping scheme, path, query, and port), and matches against a fixed allowlist:

```
localhost | 127.0.0.1 | ::1 | [::1]
```

A hostname that starts with any of these followed by `:` (port) also matches, since the port is stripped before matching.

Non-local endpoints exit with code 2 (configuration error). There is no flag to bypass this check. This is deliberate: the launcher is for local Anthropic-protocol proxies. Remote DeepSeek endpoints are outside its scope.

If `DEEPSEEK_ANTHROPIC_BASE_URL` is unset or empty, exit 2 with a message asking the user to set a local endpoint.

The reference script used `https://api.deepseek.com/anthropic` (remote) as a default. This launcher intentionally does not — the proposal requires local-only enforcement.

## `--check` Preflight Mode (LDC-004)

When the first argument is `--check`, the launcher runs all validations and reports readiness without launching claude. Key design choices:

- **Credential values are never printed.** The API key is reported as `set (value redacted)` when present, or `not set` when missing/empty.
- **Endpoint URL is printed** (it is not a secret — it's the local proxy address).
- **Output uses `[OK]` / `[FAIL]` prefix** for mechanical parseability without requiring structured JSON.
- **Exit code 0** = all checks passed, ready to launch. **Exit code 1** = one or more checks failed.

Example output (all passing):
```
[OK] claude: /usr/local/bin/claude
[OK] .env: /Users/.../ai_tool_deepresearch/.env
[OK] DEEPSEEK_API_KEY: set (value redacted)
[OK] DEEPSEEK_ANTHROPIC_BASE_URL: http://localhost:8080 (local)
[OK] Ready — all preflight checks passed.
```

No token, no key material, no settings path — nothing that would leak credentials into terminal history, logs, or subagent transcripts.

## Argument and Exit Code Passthrough (LDC-005, LDC-008)

The launcher uses `exec claude "$@"` to replace itself with claude. All arguments after the script name are forwarded verbatim. Claude Code's exit code becomes the launcher's exit code.

The launcher does NOT inject:
- `--settings <path>` — no separate settings file
- `--allow-dangerously-skip-permissions` — no permission bypass
- Any other Claude Code flag

The user may pass any Claude-supported flag explicitly (including `--allow-dangerously-skip-permissions` if they choose). The launcher itself adds nothing.

**`--check` edge case**: If the first argument is `--check`, it is consumed by the launcher for preflight mode. It cannot be forwarded to claude. This is a known limitation — `--check` is not a Claude Code flag, so forward compatibility is not affected.

## Env Var Mapping Table

| .env variable | Claude env var | Required | Default |
|---|---|---|---|
| `DEEPSEEK_API_KEY` | `ANTHROPIC_AUTH_TOKEN` | **Yes** | — |
| `DEEPSEEK_ANTHROPIC_BASE_URL` | `ANTHROPIC_BASE_URL` | **Yes** | — |
| `DEEPSEEK_ANTHROPIC_MODEL` | `ANTHROPIC_MODEL` | No | `opus` |
| `DEEPSEEK_ANTHROPIC_DEFAULT_OPUS_MODEL` | `ANTHROPIC_DEFAULT_OPUS_MODEL` | No | `deepseek-v4-pro` |
| `DEEPSEEK_ANTHROPIC_DEFAULT_SONNET_MODEL` | `ANTHROPIC_DEFAULT_SONNET_MODEL` | No | `deepseek-v4-pro` |
| `DEEPSEEK_ANTHROPIC_DEFAULT_HAIKU_MODEL` | `ANTHROPIC_DEFAULT_HAIKU_MODEL` | No | `deepseek-v4-flash` |
| `DEEPSEEK_CLAUDE_CODE_SUBAGENT_MODEL` | `CLAUDE_CODE_SUBAGENT_MODEL` | No | `deepseek-v4-pro` |
| `DEEPSEEK_CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | No | `1` |
| `DEEPSEEK_ENABLE_TOOL_SEARCH` | `ENABLE_TOOL_SEARCH` | No | `false` |
| `DEEPSEEK_API_TIMEOUT_MS` | `API_TIMEOUT_MS` | No | `3000000` |

## Test Strategy

Integration tests use `node:test` + `node:assert/strict` + `spawnSync`. A fake `claude` executable (small bash script) records its invocation environment and arguments to a JSON file, then exits with a configurable code.

Each test case creates a temp directory under `tests/.test-tmp/` that mirrors the repo structure:
```
tests/.test-tmp/deepseek-launcher-XXXXX/
  .env                                    # test .env
  DPT_FRAMEWORK/host_tools/
    deepseek-claude-launcher.sh           # symlink → real launcher
  fake_bin/
    claude                                 # fake executable
```

The temp dir is the CWD for `spawnSync`, and `fake_bin/` is prepended to `PATH`. This lets the launcher resolve `$SCRIPT_DIR/../..` to find `.env` naturally.

**13 test cases** covering:
- --check passes with valid config
- --check fails on: missing .env, empty key, non-local endpoint
- Accepts: localhost, 127.0.0.1, [::1] endpoints
- Argument passthrough verification
- Exit code preservation
- ANTHROPIC_* env isolation from inherited values
- No --allow-dangerously-skip-permissions injection
- --check does not exec claude
- Fails when claude missing from PATH

Tests never use real credentials or call real Claude/DeepSeek.

## Net Simplification

**Removed** (vs personal script at `/Users/bowhead/scripts/deepseek_claude.sh`):
- Hardcoded API key in script source
- `--settings` flag loading a separate JSON file
- `--allow-dangerously-skip-permissions` as default behavior
- Banner echoing endpoint/model info to stdout (could leak to logs)
- Credential-bearing file outside the repo
- Global Claude settings mutation

**Added** (net-new, justified):
- Local-only endpoint enforcement (deterministic safety check)
- `--check` preflight with credential redaction
- `.env.example` as committable contract
- Integration test coverage (13 cases)

**Avoided** (explicitly NOT produced):
- Research workflow node, Engine API, bundle state, command playbook
- Background service, daemon, provider fallback, auto-retry tree
- New npm dependency
- Second CLI controller, configuration generator, or permission bypass

## Simplicity Admission Test

**1. 最短合法闭环和直接 Source of Record 是什么？**

`.env` → launcher → env isolation → local-only validate → exec claude. Source of Record: `.env` (config), `.env.example` (contract), launcher script (execution). Five steps, one script, zero intermediate state.

**2. 这个 change 删除、合并或避免了哪份复杂度？**

Deletes: personal script outside repo, hardcoded credentials, settings JSON file, default permission bypass flag. Avoids: new controller, daemon, workflow node, Engine API, bundle state, provider abstraction, retry tree.

The only added complexity is the local-only endpoint check — a single `case` statement that is the deterministic safety guarantee the proposal requires.

## Helper Direction Review

**1. 哪个决定确实需要用户？**

用户决定使用哪个本地端点、持有哪个 API key、选择哪个模型别名，以及是否传递 Claude Code 权限相关 flag。这些是新的语义/风险/权限决定，属于用户。

**2. 用户决定后，哪些步骤应立即回到 Agent 执行？**

配置好 `.env` 后，Agent 可以机械执行 `./DPT_FRAMEWORK/host_tools/deepseek-claude-launcher.sh --check`（验证就绪）和 `./DPT_FRAMEWORK/host_tools/deepseek-claude-launcher.sh <args...>`（启动 Claude Code）。launcher 不创造新决策点，不询问用户，不改变权限模型。Agent 在现有权限内执行，Engine 不参与。

## Boundary

The launcher is a **pre-trigger host tool**. It runs before Claude Code's initialization and before any DPT_FRAMEWORK entry point. It does not:

- Read or write bundle state (`rb_status.json`, `rb_queue.json`, `rb_trace.jsonl`)
- Interact with Engine modules, gates, or workflows
- Create runtime artifacts, receipts, or trace events
- Influence research phase routing or HITL checkpoints
- Establish a new lifecycle, permission model, or controller surface

The launcher owns only: finding `claude`, loading `.env`, cleaning env, validating local endpoint, and exec'ing `claude`. Claude Code and DPT_FRAMEWORK operate exactly as they do today after the exec.

## Exit Code Mapping

| Code | Meaning |
|---|---|
| `0` | Preflight passed (--check), or claude launched successfully (normal mode; exit code from claude) |
| `1` | `claude` command not found (external dependency missing) |
| `2` | Configuration error: `.env` missing, `DEEPSEEK_API_KEY` unset/empty, `DEEPSEEK_ANTHROPIC_BASE_URL` unset/empty or non-local |

This follows the project's documented exit code convention: 1 = repairable/external failure, 2 = config/invocation error.
