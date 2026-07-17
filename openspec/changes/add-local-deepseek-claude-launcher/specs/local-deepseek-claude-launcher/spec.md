# local-deepseek-claude-launcher

> req: LDC-001, LDC-002, LDC-003, LDC-004, LDC-005, LDC-006, LDC-007, LDC-008, LDC-009

## Purpose

Define a repo-owned, deterministic, fail-closed Claude Code launcher for local Anthropic-compatible DeepSeek endpoints. The launcher reads a git-ignored root `.env` as its sole configuration source, isolates inherited provider environment state, validates that the configured endpoint is loopback/local, provides a credential-safe `--check` preflight mode, and execs `claude` with transparent argument and exit-code passthrough.

The launcher is a pre-trigger host tool — it operates before Claude Code initialization and before any DPT_FRAMEWORK entry point. It does not introduce a research workflow node, Engine API, bundle state, command playbook, background service, provider fallback, retry tree, or new npm dependency. It does not modify global Claude Code settings or append permission-bypass flags.

## ADDED Requirements

### Requirement: Single launcher script entry point

The launcher SHALL be a single executable bash script at `DPT_FRAMEWORK/host_tools/deepseek-claude-launcher.sh`. It SHALL resolve the repo root from its own filesystem location (`$SCRIPT_DIR/../..`) and read the git-ignored `.env` at that root as its sole configuration source. No other configuration file, settings JSON, command playbook, or runtime artifact SHALL carry launcher configuration authority.

#### Scenario: script location
- **WHEN** the launcher is installed
- **THEN** it SHALL exist at `DPT_FRAMEWORK/host_tools/deepseek-claude-launcher.sh` with executable permission
- **AND** it SHALL NOT depend on any file outside the repo other than the `claude` binary and the root `.env`

#### Scenario: .env loading
- **WHEN** the launcher runs
- **THEN** it SHALL locate `.env` at `$REPO_ROOT/.env` derived from `$SCRIPT_DIR/../..`
- **AND** it SHALL fail with exit code 2 if `.env` does not exist

#### Scenario: no other config sources
- **WHEN** the launcher runs
- **THEN** it SHALL NOT read any settings JSON, global Claude config, or environment variable other than those in `.env` and the process-inherited environment (which is cleaned before application)

### Requirement: Environment isolation

Before applying configured values, the launcher SHALL enumerate all currently-set environment variables and unset every variable whose name starts with `ANTHROPIC_` or matches `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, `CLAUDE_CODE_SUBAGENT_MODEL`, `ENABLE_TOOL_SEARCH`, or `API_TIMEOUT_MS`. After cleaning, it SHALL export `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_MODEL`, `ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`, `ANTHROPIC_DEFAULT_HAIKU_MODEL`, `CLAUDE_CODE_SUBAGENT_MODEL`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, `ENABLE_TOOL_SEARCH`, and `API_TIMEOUT_MS` from their `DEEPSEEK_*` counterparts in `.env`.

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

### Requirement: Local-only endpoint validation

The launcher SHALL parse the host portion of `DEEPSEEK_ANTHROPIC_BASE_URL` and validate that it matches one of `localhost`, `127.0.0.1`, `::1`, or `[::1]`. If the host does not match any loopback pattern, the launcher SHALL exit with code 2 and SHALL NOT launch `claude`. If `DEEPSEEK_ANTHROPIC_BASE_URL` is unset or empty, the launcher SHALL exit with code 2.

#### Scenario: localhost accepted
- **WHEN** `DEEPSEEK_ANTHROPIC_BASE_URL=http://localhost:8080`
- **THEN** the endpoint validation SHALL pass
- **AND** the launcher SHALL proceed to launch claude (or report ready in --check mode)

#### Scenario: 127.0.0.1 accepted
- **WHEN** `DEEPSEEK_ANTHROPIC_BASE_URL=http://127.0.0.1:11434/v1`
- **THEN** the endpoint validation SHALL pass

#### Scenario: IPv6 loopback accepted
- **WHEN** `DEEPSEEK_ANTHROPIC_BASE_URL=http://[::1]:8080`
- **THEN** the endpoint validation SHALL pass

#### Scenario: remote endpoint rejected
- **WHEN** `DEEPSEEK_ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic`
- **THEN** the launcher SHALL exit with code 2
- **AND** stderr SHALL indicate the endpoint is not local

#### Scenario: unset endpoint rejected
- **WHEN** `DEEPSEEK_ANTHROPIC_BASE_URL` is not set in `.env`
- **THEN** the launcher SHALL exit with code 2
- **AND** stderr SHALL indicate the variable must be set to a local endpoint

### Requirement: Credential-safe preflight mode

The launcher SHALL support a `--check` flag as its first argument. In `--check` mode, the launcher SHALL perform all validation checks (claude on PATH, `.env` exists, `DEEPSEEK_API_KEY` non-empty, endpoint is local) and report results without launching `claude`. The output SHALL indicate whether each check passed or failed. The value of `DEEPSEEK_API_KEY` SHALL be reported as `set (value redacted)` when present and non-empty, or `not set` when missing/empty — the actual key material SHALL NOT appear in any output.

#### Scenario: all checks pass
- **WHEN** `claude` is on PATH, `.env` exists with `DEEPSEEK_API_KEY=sk-abc` and `DEEPSEEK_ANTHROPIC_BASE_URL=http://localhost:8080`
- **AND** the launcher is invoked with `--check`
- **THEN** output SHALL contain `[OK]` for each check
- **AND** `DEEPSEEK_API_KEY` value SHALL appear as `set (value redacted)`
- **AND** the actual key `sk-abc` SHALL NOT appear in stdout or stderr
- **AND** exit code SHALL be 0

#### Scenario: check fails without launching claude
- **WHEN** `.env` is missing
- **AND** the launcher is invoked with `--check`
- **THEN** exit code SHALL be 1
- **AND** `claude` SHALL NOT be launched

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

The launcher SHALL fail closed for every detectable pre-launch error. Missing `claude` binary SHALL exit with code 1. Missing `.env`, missing/empty `DEEPSEEK_API_KEY`, missing/empty `DEEPSEEK_ANTHROPIC_BASE_URL`, and non-local endpoint SHALL exit with code 2. The launcher SHALL NOT silently fall back to a remote endpoint, built-in credentials, global Claude settings, or any other default provider.

#### Scenario: claude missing
- **WHEN** `claude` is not found on PATH
- **THEN** the launcher SHALL exit with code 1
- **AND** stderr SHALL indicate `claude` is not installed

#### Scenario: .env missing
- **WHEN** `.env` does not exist at the resolved repo root
- **THEN** the launcher SHALL exit with code 2
- **AND** stderr SHALL reference `.env.example` as the template to copy

#### Scenario: API key missing
- **WHEN** `.env` exists but `DEEPSEEK_API_KEY` is empty or unset
- **THEN** the launcher SHALL exit with code 2

### Requirement: Committable .env.example template

A `.env.example` file SHALL exist at the repo root. It SHALL document every `DEEPSEEK_*` variable the launcher reads, with placeholder values for required variables and commented-out defaults for optional variables. The real `.env` SHALL remain git-ignored. The launcher SHALL NOT read `.env.example` — it exists only as human-facing documentation.

#### Scenario: .env.example is committable
- **WHEN** a fresh clone of the repo is made
- **THEN** `.env.example` SHALL be present at the repo root
- **AND** it SHALL contain no real credentials or API keys

#### Scenario: .env is git-ignored
- **WHEN** `.env` exists at the repo root
- **THEN** git SHALL ignore it (per existing `.gitignore` rules)

### Requirement: No default permission bypass

The launcher SHALL NOT append `--allow-dangerously-skip-permissions` or any equivalent permission-bypass flag to the `claude` invocation. The user MAY pass permission-related flags explicitly as part of `"$@"`; the launcher itself SHALL add none. Claude Code's normal permission model SHALL remain intact.

#### Scenario: permission bypass not injected
- **WHEN** the launcher is invoked without permission flags
- **THEN** the `claude` arguments SHALL NOT contain `--allow-dangerously-skip-permissions`

#### Scenario: user can pass own permission flags
- **WHEN** the launcher is invoked as `./deepseek-claude-launcher.sh --allow-dangerously-skip-permissions`
- **THEN** `claude` SHALL receive `--allow-dangerously-skip-permissions` as a user-supplied argument

### Requirement: Self-contained directory with README

The launcher SHALL reside in a self-contained `DPT_FRAMEWORK/host_tools/` directory. That directory SHALL contain a `README.md` that documents: what the launcher is, how to configure `.env`, how to run `--check`, how to launch, and how the launcher relates to the root `.env` as its sole external dependency. The README SHALL make clear that the launcher's CLI surface is identical to `claude` — same arguments, same exit codes, no new concepts for a coding agent to learn.

#### Scenario: README is present
- **WHEN** a user or Agent navigates to `DPT_FRAMEWORK/host_tools/`
- **THEN** `README.md` SHALL exist and explain setup in three steps: copy `.env.example`, configure, run `--check`

#### Scenario: README documents agent transparency
- **WHEN** a coding Agent reads the README
- **THEN** it SHALL understand that `./deepseek-claude-launcher.sh <args>` behaves identically to `claude <args>`
- **AND** it SHALL NOT need to learn new flags, exit codes, or interaction patterns
