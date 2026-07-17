# local-deepseek-claude-launcher

> req: LDC-001, LDC-002, LDC-003, LDC-004, LDC-005, LDC-006, LDC-007, LDC-008, LDC-009

## Purpose

Define a repo-owned, deterministic, fail-closed, **self-contained** Claude Code launcher for local Anthropic-compatible DeepSeek endpoints. The launcher and all its configuration live entirely within `DPT_FRAMEWORK/host_tools/`. The only external dependency is the global `claude` binary on PATH.

The launcher reads its own directory's git-ignored `.env` as its sole configuration source, isolates inherited provider environment state, validates that the configured endpoint is a well-formed URL, provides a credential-safe `--check` preflight mode, and execs `claude` with transparent argument and exit-code passthrough. Its CLI surface is identical to `claude` — same arguments, same exit codes, no new concepts for a coding agent to learn.

The launcher is a pre-trigger host tool — it operates before Claude Code initialization and before any DPT_FRAMEWORK entry point. It does not introduce a research workflow node, Engine API, bundle state, command playbook, background service, provider fallback, retry tree, or new npm dependency. It does not modify global Claude Code settings or append permission-bypass flags.

## ADDED Requirements

### Requirement: Self-contained single launcher script

The launcher SHALL be a single executable bash script at `DPT_FRAMEWORK/host_tools/deepseek-claude-launcher.sh`. It SHALL resolve all paths from its own filesystem location (`$SCRIPT_DIR`) and read the git-ignored `.env` in the same directory (`$SCRIPT_DIR/.env`) as its sole configuration source. It SHALL NOT depend on any file or directory outside `DPT_FRAMEWORK/host_tools/` except the global `claude` binary. No other configuration file, settings JSON, command playbook, or runtime artifact SHALL carry launcher configuration authority.

#### Scenario: script location
- **WHEN** the launcher is installed
- **THEN** it SHALL exist at `DPT_FRAMEWORK/host_tools/deepseek-claude-launcher.sh` with executable permission
- **AND** it SHALL NOT depend on repo root, any parent directory, or any file outside its own directory other than the `claude` binary

#### Scenario: .env loading
- **WHEN** the launcher runs
- **THEN** it SHALL locate `.env` at `$SCRIPT_DIR/.env` (same directory as the script)
- **AND** it SHALL fail with exit code 2 if `.env` does not exist

#### Scenario: no other config sources
- **WHEN** the launcher runs
- **THEN** it SHALL NOT read any settings JSON, global Claude config, repo-root file, or environment variable other than those in its own `.env` and the process-inherited environment (which is cleaned before application)

### Requirement: Environment isolation

The launcher SHALL perform a three-phase environment isolation:

**Phase 1** — Enumerate all currently-set environment variables and unset every variable whose name starts with `ANTHROPIC_` or matches `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, `CLAUDE_CODE_SUBAGENT_MODEL`, `ENABLE_TOOL_SEARCH`, or `API_TIMEOUT_MS`. This removes inherited provider state.

**Phase 2** — Verify `.env` is a readable regular file (`[[ -f "$ENV_FILE" && -r "$ENV_FILE" ]]`), then source it with `set -a` for auto-export. `.env` SHALL use the `DEEPSEEK_` prefix for all launcher variables.

**Phase 3** — Unset any `ANTHROPIC_*` or `CLAUDE_CODE_*` variables again (defense in depth: `.env` may have inadvertently set them). Then export `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_MODEL`, `ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`, `ANTHROPIC_DEFAULT_HAIKU_MODEL`, `CLAUDE_CODE_SUBAGENT_MODEL`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, `ENABLE_TOOL_SEARCH`, and `API_TIMEOUT_MS` exclusively from their `DEEPSEEK_*` counterparts in `.env`, with hardcoded defaults for optional variables.

#### Scenario: inherited ANTHROPIC_* is removed
- **WHEN** the spawning shell or parent process has `ANTHROPIC_BASE_URL=https://evil.com` in its environment
- **AND** `.env` sets `DEEPSEEK_ANTHROPIC_BASE_URL=http://localhost:8080`
- **THEN** the launcher SHALL unset the inherited `ANTHROPIC_BASE_URL` before exporting
- **AND** `claude` SHALL receive `ANTHROPIC_BASE_URL=http://localhost:8080`

#### Scenario: DEEPSEEK_* vars survive cleaning
- **WHEN** `.env` sets `DEEPSEEK_API_KEY=sk-abc`
- **THEN** the env cleaning phase SHALL NOT unset `DEEPSEEK_API_KEY`
- **AND** `DEEPSEEK_API_KEY` SHALL be available for export as `ANTHROPIC_AUTH_TOKEN`

#### Scenario: default values for optional vars
- **WHEN** `.env` does not set `DEEPSEEK_ANTHROPIC_MODEL`
- **THEN** the launcher SHALL export `ANTHROPIC_MODEL=opus` (the hardcoded default)

#### Scenario: .env not readable
- **WHEN** `.env` exists but is not readable (permission denied)
- **THEN** the launcher SHALL exit with code 2
- **AND** stderr SHALL indicate the file is not readable

#### Scenario: ANTHROPIC_* in .env is cleaned
- **WHEN** `.env` sets `ANTHROPIC_BASE_URL=https://evil.com` (wrong prefix, should be `DEEPSEEK_ANTHROPIC_BASE_URL`)
- **AND** `.env` also sets `DEEPSEEK_ANTHROPIC_BASE_URL=http://localhost:8080`
- **THEN** the Phase 3 clean SHALL unset the incorrectly-prefixed `ANTHROPIC_BASE_URL`
- **AND** the launcher SHALL export `ANTHROPIC_BASE_URL=http://localhost:8080` from the DEEPSEEK_* counterpart

### Requirement: Endpoint URL validation

The launcher SHALL validate that `DEEPSEEK_ANTHROPIC_BASE_URL` is non-empty and is a well-formed URL with an `http://` or `https://` scheme and a non-empty host component. If the endpoint is unset, empty, or lacks a valid scheme+host, the launcher SHALL exit with code 2.

#### Scenario: valid https endpoint accepted
- **WHEN** `DEEPSEEK_ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic`
- **THEN** the endpoint validation SHALL pass
- **AND** the launcher SHALL proceed to launch claude (or report ready in --check mode)

#### Scenario: valid http endpoint accepted
- **WHEN** `DEEPSEEK_ANTHROPIC_BASE_URL=http://localhost:8080/v1`
- **THEN** the endpoint validation SHALL pass

#### Scenario: missing scheme rejected
- **WHEN** `DEEPSEEK_ANTHROPIC_BASE_URL=api.deepseek.com/anthropic`
- **THEN** the launcher SHALL exit with code 2
- **AND** stderr SHALL indicate the endpoint URL is invalid

#### Scenario: unset endpoint rejected
- **WHEN** `DEEPSEEK_ANTHROPIC_BASE_URL` is not set in `.env`
- **THEN** the launcher SHALL exit with code 2
- **AND** stderr SHALL indicate the variable must be set

### Requirement: Credential-safe preflight mode

The launcher SHALL support a `--check` flag as its first argument. In `--check` mode, the launcher SHALL perform **all** validation checks (claude on PATH, `.env` exists and is readable, `DEEPSEEK_API_KEY` non-empty, endpoint URL is valid) and report **every** result without launching `claude`. Unlike normal mode which exits on the first error, `--check` accumulates all failures so the user can fix everything in one pass.

The output SHALL indicate whether each check passed or failed using `[OK]` / `[FAIL]` prefix. The value of `DEEPSEEK_API_KEY` SHALL be reported as `set (value redacted)` when present and non-empty, or `not set` when missing/empty — the actual key material SHALL NOT appear in any output.

Exit code SHALL reflect the worst severity found: 0 if all checks pass, 1 if at least one check fails but only non-config errors (claude missing), 2 if any configuration error is present (`.env` missing/unreadable, key unset, endpoint invalid). When both a code-1 and code-2 failure coexist, exit 2.

#### Scenario: all checks pass
- **WHEN** `claude` is on PATH, `.env` exists with `DEEPSEEK_API_KEY=sk-abc` and `DEEPSEEK_ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic`
- **AND** the launcher is invoked with `--check`
- **THEN** output SHALL contain `[OK]` for each check
- **AND** `DEEPSEEK_API_KEY` value SHALL appear as `set (value redacted)`
- **AND** the actual key `sk-abc` SHALL NOT appear in stdout or stderr
- **AND** exit code SHALL be 0

#### Scenario: check fails on config error
- **WHEN** `.env` is missing
- **AND** the launcher is invoked with `--check`
- **THEN** exit code SHALL be 2 (configuration error, same as normal mode)
- **AND** `claude` SHALL NOT be launched

#### Scenario: check fails on missing claude
- **WHEN** `claude` is not on PATH
- **AND** the launcher is invoked with `--check`
- **THEN** exit code SHALL be 1 (external dependency missing, same as normal mode)

#### Scenario: multiple failures report all, exit worst
- **WHEN** `claude` is not on PATH AND `.env` is also missing
- **AND** the launcher is invoked with `--check`
- **THEN** output SHALL report both failures (`[FAIL]` for claude, `[FAIL]` for .env)
- **AND** exit code SHALL be 2 (config error dominates external dependency error)

### Requirement: Transparent argument and exit code passthrough

In normal (non-`--check`) mode, the launcher SHALL use `exec claude "$@"` to replace itself with the `claude` process. All arguments after the script name SHALL be forwarded to `claude` verbatim. Claude Code's exit code SHALL become the launcher's exit code. The launcher SHALL NOT inject any additional flags or arguments.

#### Scenario: arguments forwarded
- **WHEN** the launcher is invoked as `./deepseek-claude-launcher.sh -p "hello" --verbose`
- **THEN** `claude` SHALL be invoked with arguments `-p`, `hello`, `--verbose`

#### Scenario: exit code preserved
- **WHEN** `claude` exits with code 42
- **THEN** the launcher SHALL exit with code 42

#### Scenario: no flag injection
- **WHEN** the launcher is invoked without `--allow-dangerously-skip-permissions`
- **THEN** `claude` SHALL NOT receive `--allow-dangerously-skip-permissions` in its arguments

### Requirement: Fail-closed behavior

The launcher SHALL fail closed for every detectable pre-launch error. It SHALL NOT silently fall back to a remote endpoint, built-in credentials, global Claude settings, or any other default provider. Exit codes SHALL follow the project convention: 1 for missing external dependency (`claude` not on PATH), 2 for configuration errors (missing `.env`, missing/empty `DEEPSEEK_API_KEY`, missing/empty or invalid `DEEPSEEK_ANTHROPIC_BASE_URL`). Specific error conditions are owned by LDC-001 (`.env` missing), LDC-003 (endpoint validation), and LDC-004 (--check mode); this requirement owns the umbrella "never silently fall back" guarantee and the exit code taxonomy.

#### Scenario: claude missing
- **WHEN** `claude` is not found on PATH
- **THEN** the launcher SHALL exit with code 1
- **AND** stderr SHALL indicate `claude` is not installed

#### Scenario: .env missing
- **WHEN** `.env` does not exist in the launcher's own directory
- **THEN** the launcher SHALL exit with code 2
- **AND** stderr SHALL reference `.env.example` as the template to copy

#### Scenario: API key missing
- **WHEN** `.env` exists but `DEEPSEEK_API_KEY` is empty or unset
- **THEN** the launcher SHALL exit with code 2

#### Scenario: invalid endpoint
- **WHEN** `.env` sets `DEEPSEEK_ANTHROPIC_BASE_URL` to an invalid URL (missing scheme, empty host)
- **THEN** the launcher SHALL exit with code 2
- **AND** SHALL NOT fall back to any default endpoint (per LDC-003)

### Requirement: Committable .env.example template

A `.env.example` file SHALL exist at `DPT_FRAMEWORK/host_tools/.env.example`. It SHALL document every `DEEPSEEK_*` variable the launcher reads, with placeholder values for required variables and commented-out defaults for optional variables. The real `.env` SHALL remain git-ignored (the `.gitignore` pattern `.env` matches at any directory level). The launcher SHALL NOT read `.env.example` — it exists only as human-facing documentation.

#### Scenario: .env.example is committable
- **WHEN** a fresh clone of the repo is made
- **THEN** `DPT_FRAMEWORK/host_tools/.env.example` SHALL be present
- **AND** it SHALL contain no real credentials or API keys

#### Scenario: .env is git-ignored
- **WHEN** `.env` exists in `DPT_FRAMEWORK/host_tools/`
- **THEN** git SHALL ignore it (per existing `.gitignore` rule `.env` which matches at any directory level)

### Requirement: No default permission bypass

The launcher SHALL NOT append `--allow-dangerously-skip-permissions` or any equivalent permission-bypass flag to the `claude` invocation. The user MAY pass permission-related flags explicitly as part of `"$@"`; the launcher itself SHALL add none. Claude Code's normal permission model SHALL remain intact.

#### Scenario: permission bypass not injected
- **WHEN** the launcher is invoked without permission flags
- **THEN** the `claude` arguments SHALL NOT contain `--allow-dangerously-skip-permissions`

#### Scenario: user can pass own permission flags
- **WHEN** the launcher is invoked as `./deepseek-claude-launcher.sh --allow-dangerously-skip-permissions`
- **THEN** `claude` SHALL receive `--allow-dangerously-skip-permissions` as a user-supplied argument

### Requirement: Self-contained directory with README

The launcher SHALL reside in a self-contained `DPT_FRAMEWORK/host_tools/` directory that depends on nothing outside itself except the global `claude` binary. That directory SHALL contain a `README.md` that documents: what the launcher is, that it is fully self-contained (only needs `claude` on PATH), how to copy `.env.example` to `.env` and configure it, how to run `--check`, how to launch, and that the launcher's CLI surface is identical to `claude` — same arguments, same exit codes, no new concepts for a coding agent to learn.

#### Scenario: README is present
- **WHEN** a user or Agent navigates to `DPT_FRAMEWORK/host_tools/`
- **THEN** `README.md` SHALL exist and explain setup in three steps: copy `.env.example` → `.env`, configure the two required vars, run `--check`

#### Scenario: README documents agent transparency
- **WHEN** a coding Agent reads the README
- **THEN** it SHALL understand that `./deepseek-claude-launcher.sh <args>` behaves identically to `claude <args>`
- **AND** it SHALL NOT need to learn new flags, exit codes, or interaction patterns

#### Scenario: README documents zero external dependencies
- **WHEN** a user or Agent reads the README
- **THEN** it SHALL state clearly: the launcher depends only on the global `claude` command and its own `.env` file
- **AND** it SHALL NOT instruct the user to create or modify any file outside `DPT_FRAMEWORK/host_tools/`
