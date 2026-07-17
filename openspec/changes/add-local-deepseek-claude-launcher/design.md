# Design: `add-local-deepseek-claude-launcher`

> Target version: v0.33

## Core Principle: Self-Contained, Zero External Dependencies

`DPT_FRAMEWORK/host_tools/` is a **fully self-contained** launcher directory. It depends on exactly two things:

1. **The global `claude` command** on PATH (the official Claude Code CLI)
2. **Its own `.env` file** in the same directory (`DPT_FRAMEWORK/host_tools/.env`)

That's it. No repo root. No settings JSON. No global Claude config mutation. No other files, directories, or environment assumptions. The launcher figures everything else out from its own location.

The launcher's CLI surface is **identical to `claude`** — same arguments, same exit codes. A coding agent invoking `./deepseek-claude-launcher.sh -p "hello"` experiences exactly what it expects from `claude -p "hello"`. No new concepts, no new flag vocabulary, no new interaction patterns.

## Direct Source of Record

```
DPT_FRAMEWORK/host_tools/                  ←  self-contained directory
  .env                                     ←  sole config source (git-ignored, never committed)
  .env.example                             ←  committable variable contract & defaults
  README.md                                ←  human/Agent: what this is, setup, usage
  deepseek-claude-launcher.sh              ←  sole execution path (CLI surface ≡ claude)
```

The only thing outside this directory that the launcher touches is the `claude` binary on PATH. Full stop.

## Shortest Legal Loop

```
user copies .env.example → .env, fills in credentials + local endpoint (one-time)
  → user or Agent runs ./DPT_FRAMEWORK/host_tools/deepseek-claude-launcher.sh [--check]
  → launcher checks: claude on PATH, .env exists and is readable
  → three-phase env isolation: clean inherited → source .env → clean again → export Anthropic vars
  → launcher validates: DEEPSEEK_API_KEY set, endpoint URL is valid (non-empty, http/https scheme, host present)
  → --check: report all results with credential values redacted, exit 0/1/2
  → normal mode: exec claude "$@" — transparent argument/exit-code passthrough
```

No intermediate process, no state file, no daemon, no retry loop, no dependency on anything outside `host_tools/` except the `claude` binary.

## Bash vs Node.js Rationale

The launcher is a process wrapper that needs to:

1. Manipulate environment variables for the current process
2. Clean inherited state before applying new values
3. `exec` into another binary (claude), replacing itself in the process tree

Bash is the correct tool for this specific concern. `exec claude "$@"` in bash is a true process replacement — the shell process _becomes_ claude. In Node.js, `child_process.spawn` keeps Node as a parent process, adding a layer of indirection with no benefit for a pass-through launcher.

The project's "use Node.js for everything" rule applies to **application logic**: CLI tools, schema validation, gate evaluation, state management. The launcher has zero application logic — it is OS-level process management. This is the same category as a shebang line or a package.json `"scripts"` entry.

## Self-Contained Path Resolution

The launcher derives ALL paths from its own filesystem location:

```bash
# Resolve script directory robustly. Handles:
#   ./deepseek-claude-launcher.sh        (relative, with dir)
#   ../host_tools/deepseek-claude-launcher.sh (relative)
#   /absolute/path/to/deepseek-claude-launcher.sh (absolute)
# Does NOT handle bare-name PATH lookup (deepseek-claude-launcher.sh
# found via PATH with no directory component) — in that case SCRIPT_DIR
# would be CWD. Invoke with a path, or cd to the directory first.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
ENV_FILE="$SCRIPT_DIR/.env"
```

No `$REPO_ROOT`, no `../..`, no traversal outside the directory. `pwd -P` resolves directory symlinks in the path but the script itself is NOT symlink-resolved — `BASH_SOURCE[0]` is the invocation path. This is deliberate: it allows tests to symlink the launcher into a temp directory with a test `.env` next to the symlink.

**Supported invocation patterns:**
- `./deepseek-claude-launcher.sh` from within `host_tools/` ✓
- `./DPT_FRAMEWORK/host_tools/deepseek-claude-launcher.sh` from repo root ✓
- `/absolute/path/to/host_tools/deepseek-claude-launcher.sh` ✓
- `bash DPT_FRAMEWORK/host_tools/deepseek-claude-launcher.sh` ✓

**Not supported:** bare-name PATH lookup (`deepseek-claude-launcher.sh` with no directory component), or symlinks placed in a different directory without a companion `.env`.

## Environment Isolation Design (LDC-002)

The isolation uses a three-phase approach:

**Phase 1 — Clean inherited**: Iterate over all currently-set environment variables via `env`. Unset every variable whose name matches `ANTHROPIC_*` or the specific `CLAUDE_CODE_*` keys (`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, `CLAUDE_CODE_SUBAGENT_MODEL`), plus `ENABLE_TOOL_SEARCH` and `API_TIMEOUT_MS`. This prevents inherited provider state — from a previous Claude session, another project's `.env`, or shell profile — from contaminating the local endpoint.

**Phase 2 — Load**: Source `.env` with `set -a` (auto-export). Before sourcing, verify the file is a readable regular file (`[[ -f "$ENV_FILE" && -r "$ENV_FILE" ]]`). `.env` MUST use the `DEEPSEEK_` prefix for all launcher variables; direct `ANTHROPIC_*` or `CLAUDE_CODE_*` assignments in `.env` are unsupported and will be caught by Phase 3.

**Phase 3 — Clean again, then export**: After sourcing, unset any `ANTHROPIC_*` or `CLAUDE_CODE_*` variables that `.env` may have inadvertently set (defense in depth). Then export each `ANTHROPIC_*` / `CLAUDE_CODE_*` variable exclusively from its `DEEPSEEK_*` counterpart, with hardcoded defaults for optional vars.

The `DEEPSEEK_` namespace plus the post-source clean guarantees that only the intended mapping takes effect, regardless of what the inherited environment or `.env` file contains.

## Endpoint Validation (LDC-003)

The launcher validates `DEEPSEEK_ANTHROPIC_BASE_URL` is non-empty and has a valid URL scheme (`http://` or `https://`) with a non-empty host. This prevents typos and empty configs from reaching claude. Any well-formed HTTP/HTTPS URL is accepted — the user chooses their endpoint.

If `DEEPSEEK_ANTHROPIC_BASE_URL` is unset, empty, or missing a valid scheme+host, exit 2.

## `--check` Preflight Mode (LDC-004)

When the first argument is `--check`, the launcher runs **all** validations (not fail-fast) and reports readiness without launching claude. Key design choices:

- **All checks run to completion.** Unlike normal mode which exits on the first error, `--check` accumulates and reports every failure so the user can fix everything in one pass.
- **Exit code reflects worst severity.** 0 = all pass; 1 = at least one check failed but only non-config errors (claude missing); 2 = at least one configuration error (.env missing, key unset, endpoint invalid). If both a code-1 and code-2 failure exist, exit 2.
- **Credential values are never printed.** The API key is reported as `set (value redacted)` when present, or `not set` when missing/empty.
- **Endpoint URL is printed** (it is not a secret — it's the local proxy address).
- **Output uses `[OK]` / `[FAIL]` prefix** for mechanical parseability without requiring structured JSON.

Example output (all passing):
```
[OK] claude: /usr/local/bin/claude
[OK] .env: /path/to/DPT_FRAMEWORK/host_tools/.env
[OK] DEEPSEEK_API_KEY: set (value redacted)
[OK] DEEPSEEK_ANTHROPIC_BASE_URL: https://api.deepseek.com/anthropic (valid)
[OK] Ready — all preflight checks passed.
```

No token, no key material — nothing that would leak credentials into terminal history, logs, or subagent transcripts.

## Argument and Exit Code Passthrough (LDC-005, LDC-008)

The launcher uses `exec claude "$@"` to replace itself with claude. All arguments after the script name are forwarded verbatim. Claude Code's exit code becomes the launcher's exit code.

The launcher does NOT inject:
- `--settings <path>` — no separate settings file
- `--allow-dangerously-skip-permissions` — no permission bypass
- Any other Claude Code flag

The user may pass any Claude-supported flag explicitly (including `--allow-dangerously-skip-permissions` if they choose). The launcher itself adds nothing.

**`--check` edge case**: If the first argument is `--check`, it is consumed by the launcher for preflight mode. It cannot be forwarded to claude. This is a known limitation — `--check` is not a Claude Code flag, so forward compatibility is not affected.

## Exit Code Mapping

The launcher follows the project's exit code convention: 0 = success, 1 = external dependency missing, 2 = configuration error.

**Pre-launch exit codes** (before `exec claude`; used by both `--check` and normal mode validation):

| Code | Condition |
|---|---|
| `0` | All validations passed (`--check` reports ready, or normal mode proceeds to exec) |
| `1` | `claude` command not found on PATH |
| `2` | Configuration error: `.env` missing/not a regular file/not readable, `DEEPSEEK_API_KEY` unset/empty, `DEEPSEEK_ANTHROPIC_BASE_URL` unset/empty or invalid |

In `--check` mode: all checks run to completion. Exit code is the worst severity found (2 if any config error present; 1 if only non-config failures; 0 if all pass).

**Post-exec exit codes** (normal mode only): once `exec claude "$@"` succeeds, the launcher process _is_ the claude process. Claude's exit code becomes the launcher's exit code — whatever claude returns (0, 1, 2, 42, etc.). The launcher itself no longer controls the exit code at this point.

## Env Var Mapping Table

All variables use the `DEEPSEEK_` prefix in `.env` to avoid collision with `ANTHROPIC_*` vars that get cleaned during env isolation.

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

Each test case creates a temp directory under `tests/.test-tmp/` with the launcher's self-contained structure:
```
tests/.test-tmp/deepseek-launcher-XXXXX/
  DPT_FRAMEWORK/host_tools/
    .env                                    # test .env
    deepseek-claude-launcher.sh             # symlink → real launcher
  fake_bin/
    claude                                   # fake executable
```

The temp dir is the CWD for `spawnSync`, and `fake_bin/` is prepended to `PATH`. The launcher resolves `.env` from `$SCRIPT_DIR/.env` (its own directory), so no repo-root mirroring is needed.

**12 test cases** covering:
- --check passes with valid config → exit 0
- --check fails on: missing .env → exit 2, empty key → exit 2, invalid endpoint URL → exit 2
- --check with multiple failures (claude missing + config error) → exit 2, both reported
- Valid endpoint URL accepted → launches fake claude
- Argument passthrough verification
- Exit code preservation (fake claude exit 42 → launcher exit 42)
- Three-phase ANTHROPIC_* env isolation from inherited values
- No --allow-dangerously-skip-permissions injection
- --check does not exec claude
- Fails when claude missing from PATH → exit 1

Tests never use real credentials or call real Claude/DeepSeek.

## Net Simplification

**Removed** (vs personal script at `/Users/bowhead/scripts/deepseek_claude.sh`):
- Hardcoded API key in script source
- `--settings` flag loading a separate JSON file
- `--allow-dangerously-skip-permissions` as default behavior
- Banner echoing endpoint/model info to stdout (could leak to logs)
- Credential-bearing file outside the repo
- Global Claude settings mutation
- Dependency on repo root path structure (`../..` traversal)

**Added** (net-new, justified):
- Endpoint URL validation (catches typos and empty configs)
- `--check` preflight with credential redaction
- `.env.example` as committable contract
- `host_tools/README.md` as self-contained documentation
- Integration test coverage (14 cases)

**Avoided** (explicitly NOT produced):
- Research workflow node, Engine API, bundle state, command playbook
- Background service, daemon, provider fallback, auto-retry tree
- New npm dependency
- Second CLI controller, configuration generator, or permission bypass
- Any dependency on files or directories outside `host_tools/` except the global `claude` binary

## Simplicity Admission Test

**1. 最短合法闭环和直接 Source of Record 是什么？**

`.env` (in host_tools/) → launcher → env isolation → endpoint validate → exec claude. Source of Record: `host_tools/.env` (config), `host_tools/.env.example` (contract), `host_tools/deepseek-claude-launcher.sh` (execution). One directory, one script, zero external file dependencies except the global `claude` binary.

**2. 这个 change 删除、合并或避免了哪份复杂度？**

Deletes: personal script outside repo, hardcoded credentials, settings JSON file, default permission bypass flag, repo-root path dependency. Avoids: new controller, daemon, workflow node, Engine API, bundle state, provider abstraction, retry tree.

The only added complexity is the endpoint URL check — a non-empty + scheme + host validation that catches typos and empty configs before they reach claude.

## Helper Direction Review

**1. 哪个决定确实需要用户？**

用户决定：端点地址、API key、模型别名、是否传递权限相关 Claude Code flag。这些是新的语义/风险/权限决定。

**2. 用户决定后，哪些步骤应立即回到 Agent 执行？**

配置好 `host_tools/.env` 后，Agent 机械执行 `./deepseek-claude-launcher.sh --check`（验证）和 `./deepseek-claude-launcher.sh <args...>`（启动）。launcher 不创造新决策点，不询问用户，不改变权限模型。Agent 在现有权限内执行，Engine 不参与。

## Boundary

The launcher is a **pre-trigger host tool**. It runs before Claude Code's initialization and before any DPT_FRAMEWORK entry point. It does not:

- Read or write bundle state (`rb_status.json`, `rb_queue.json`, `rb_trace.jsonl`)
- Interact with Engine modules, gates, or workflows
- Create runtime artifacts, receipts, or trace events
- Influence research phase routing or HITL checkpoints
- Establish a new lifecycle, permission model, or controller surface
- Depend on any file or directory outside `DPT_FRAMEWORK/host_tools/` except the `claude` binary

The launcher owns only: finding `claude`, loading its own `.env`, cleaning env, validating local endpoint, and exec'ing `claude`. Claude Code and DPT_FRAMEWORK operate exactly as they do today after the exec.
