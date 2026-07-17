# local-deepseek-claude-launcher

> req: LDC-001, LDC-002, LDC-003, LDC-004, LDC-005, LDC-006, LDC-007, LDC-008, LDC-009

## Purpose

Define a repo-owned, deterministic, fail-closed Claude Code launcher for local Anthropic-compatible DeepSeek endpoints. The Node.js ESM launcher lives in `DPT_FRAMEWORK/host_tools/`; supported configuration values live only in the ignored repo-root `.env`, with their tracked contract in the repo-root `.env.example`.

The launcher parses supported `.env` keys as data, isolates inherited provider environment state, validates that the configured endpoint is loopback-only, provides a credential-safe `--check` preflight mode, and launches `claude` with transparent argument, stdio, exit-code, and signal passthrough. Except for the launcher-owned first argument `--check`, callers use normal Claude Code arguments.

The launcher is a pre-trigger host tool — it operates before Claude Code initialization and before any DPT_FRAMEWORK entry point. It does not introduce a research workflow node, Engine API, bundle state, command playbook, background service, provider fallback, retry tree, or new npm dependency. It does not modify global Claude Code settings or append permission-bypass flags.

## ADDED Requirements

### Requirement: Repo-owned launcher and root configuration authority

The launcher SHALL be a single executable Node.js ESM file at `DPT_FRAMEWORK/host_tools/claude-deepseek.mjs`. It SHALL resolve the repository root from its checked-in module location and read the git-ignored repo-root `.env` as the sole source of supported configuration values. No settings JSON, global Claude config, command playbook, runtime artifact, process-inherited `DEEPSEEK_*` value, or second `.env` SHALL carry launcher configuration authority.

#### Scenario: script location
- **WHEN** the launcher is installed
- **THEN** it SHALL exist at `DPT_FRAMEWORK/host_tools/claude-deepseek.mjs` with executable permission
- **AND** it SHALL use Node.js >=20 and repository-approved built-ins only

#### Scenario: .env loading
- **WHEN** the launcher runs
- **THEN** it SHALL locate `.env` at the repository root derived from the module location, independent of invocation CWD
- **AND** it SHALL fail with exit code 2 if `.env` does not exist

#### Scenario: no other config sources
- **WHEN** the launcher runs
- **THEN** it SHALL NOT read settings JSON, global Claude config, a host-tools-local `.env`, runtime-bundle state, or process-inherited `DEEPSEEK_*` values as configuration

### Requirement: Environment isolation

The launcher SHALL parse the root `.env` as data and SHALL NOT source or shell-evaluate it. It SHALL consume only the documented `DEEPSEEK_*` assignments, ignore unrelated root `.env` keys, and fail on malformed or duplicate supported assignments.

The child environment SHALL preserve unrelated inherited process state such as `PATH`, terminal, and locale values, while removing all inherited `ANTHROPIC_*` and `DEEPSEEK_*` keys plus `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, `CLAUDE_CODE_SUBAGENT_MODEL`, `ENABLE_TOOL_SEARCH`, and `API_TIMEOUT_MS`. It SHALL then export Claude-facing values exclusively from the parsed root `.env`: `DEEPSEEK_API_KEY` to `ANTHROPIC_AUTH_TOKEN`, `DEEPSEEK_ANTHROPIC_BASE_URL` to `ANTHROPIC_BASE_URL`, and required `DEEPSEEK_MODEL` as `ANTHROPIC_MODEL` and the fallback for optional opus, sonnet, haiku, and subagent model aliases. It SHALL set `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` and `ENABLE_TOOL_SEARCH=false`.

#### Scenario: inherited ANTHROPIC_* is removed
- **WHEN** the spawning shell or parent process has `ANTHROPIC_BASE_URL=https://evil.com` in its environment
- **AND** the root `.env` sets `DEEPSEEK_ANTHROPIC_BASE_URL=http://localhost:8080`
- **THEN** the launcher SHALL unset the inherited `ANTHROPIC_BASE_URL` before exporting
- **AND** `claude` SHALL receive `ANTHROPIC_BASE_URL=http://localhost:8080`

#### Scenario: inherited DEEPSEEK_* does not override root config
- **WHEN** the parent process has `DEEPSEEK_MODEL=stale-model`
- **AND** the root `.env` sets `DEEPSEEK_MODEL=local-model`
- **THEN** `claude` SHALL receive the root-configured model mapping
- **AND** the inherited `DEEPSEEK_MODEL` SHALL NOT become child configuration

#### Scenario: one explicit model supplies alias defaults
- **WHEN** the root `.env` sets `DEEPSEEK_MODEL=local-model` and omits optional alias keys
- **THEN** the launcher SHALL export `local-model` for `ANTHROPIC_MODEL` and each default model alias

#### Scenario: root .env not readable
- **WHEN** the repo-root `.env` exists but is not readable
- **THEN** the launcher SHALL exit with code 2
- **AND** stderr SHALL indicate the file is not readable

#### Scenario: root .env is not shell-evaluated or bulk-exported
- **WHEN** the root `.env` contains an unrelated key and shell command-substitution text
- **THEN** the launcher SHALL NOT execute the text
- **AND** the unrelated key SHALL NOT be added to the child environment from `.env`

### Requirement: Endpoint URL validation

The launcher SHALL validate `DEEPSEEK_ANTHROPIC_BASE_URL` with the platform URL parser. It SHALL accept only `http:` or `https:` URLs whose hostname is `localhost`, ends in `.localhost`, belongs to `127.0.0.0/8`, or is IPv6 `::1`. It SHALL reject URL-embedded username/password, wildcard bind addresses, non-loopback hosts, malformed URLs, and empty values with exit code 2. It SHALL provide no remote override or fallback.

#### Scenario: loopback endpoints accepted
- **WHEN** `DEEPSEEK_ANTHROPIC_BASE_URL` uses `localhost`, `127.0.0.1`, another `127/8` address, or IPv6 `::1` with an HTTP/HTTPS scheme
- **THEN** endpoint validation SHALL pass
- **AND** the launcher SHALL proceed to launch claude or report ready in `--check` mode

#### Scenario: remote endpoint rejected
- **WHEN** `DEEPSEEK_ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic`
- **THEN** the launcher SHALL exit with code 2
- **AND** it SHALL NOT launch `claude`

#### Scenario: missing scheme rejected
- **WHEN** `DEEPSEEK_ANTHROPIC_BASE_URL=api.deepseek.com/anthropic`
- **THEN** the launcher SHALL exit with code 2
- **AND** stderr SHALL indicate the endpoint URL is invalid

#### Scenario: unset endpoint rejected
- **WHEN** `DEEPSEEK_ANTHROPIC_BASE_URL` is not set in `.env`
- **THEN** the launcher SHALL exit with code 2
- **AND** stderr SHALL indicate the variable must be set

#### Scenario: embedded URL credentials and wildcard hosts rejected
- **WHEN** the endpoint contains username/password or uses `0.0.0.0`
- **THEN** the launcher SHALL exit with code 2 without printing embedded credential material

### Requirement: Credential-safe preflight mode

The launcher SHALL support a `--check` flag as its first argument. In `--check` mode, the launcher SHALL perform all validation checks (claude on PATH, root `.env` exists and is readable, required key/model values are non-empty, and endpoint is local-only) and report every result without launching `claude`.

The output SHALL indicate whether each check passed or failed using `[OK]` / `[FAIL]` prefix. The value of `DEEPSEEK_API_KEY` SHALL be reported as `set (value redacted)` when present and non-empty, or `not set` when missing/empty — the actual key material SHALL NOT appear in any output.

Exit code SHALL reflect the worst severity found: 0 if all checks pass, 1 if at least one check fails but only non-config errors (claude missing), 2 if any configuration error is present (`.env` missing/unreadable, key unset, endpoint invalid). When both a code-1 and code-2 failure coexist, exit 2.

#### Scenario: all checks pass
- **WHEN** `claude` is on PATH and root `.env` contains `DEEPSEEK_API_KEY=sk-abc`, `DEEPSEEK_MODEL=local-model`, and `DEEPSEEK_ANTHROPIC_BASE_URL=http://127.0.0.1:8080/anthropic`
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

In normal mode, the launcher SHALL spawn `claude` without a shell, forward all arguments after the launcher path verbatim, inherit stdin/stdout/stderr, and propagate Claude Code's numeric exit code or termination signal. The launcher SHALL NOT inject additional Claude Code flags or arguments.

#### Scenario: arguments forwarded
- **WHEN** the launcher is invoked as `node DPT_FRAMEWORK/host_tools/claude-deepseek.mjs -p "hello" --verbose`
- **THEN** `claude` SHALL be invoked with arguments `-p`, `hello`, `--verbose`

#### Scenario: exit code preserved
- **WHEN** `claude` exits with code 42
- **THEN** the launcher SHALL exit with code 42

#### Scenario: inherited stdio is preserved
- **WHEN** the child reads stdin or writes stdout/stderr
- **THEN** those streams SHALL remain connected to the launcher's caller without capture or rewriting

#### Scenario: no flag injection
- **WHEN** the launcher is invoked without `--allow-dangerously-skip-permissions`
- **THEN** `claude` SHALL NOT receive `--allow-dangerously-skip-permissions` in its arguments

### Requirement: Fail-closed behavior

The launcher SHALL fail closed for every detectable pre-launch error. It SHALL NOT silently fall back to a remote endpoint, inherited provider state, built-in credentials, global Claude settings, or another provider. Exit codes SHALL be 1 for missing/unlaunchable external `claude` and 2 for launcher configuration errors, including missing root `.env`, missing required key/model, unsafe supported assignment, or invalid/non-loopback endpoint.

#### Scenario: claude missing
- **WHEN** `claude` is not found on PATH
- **THEN** the launcher SHALL exit with code 1
- **AND** stderr SHALL indicate `claude` is not installed

#### Scenario: .env missing
- **WHEN** `.env` does not exist at the repository root
- **THEN** the launcher SHALL exit with code 2
- **AND** stderr SHALL reference `.env.example` as the template to copy

#### Scenario: API key missing
- **WHEN** `.env` exists but `DEEPSEEK_API_KEY` is empty or unset
- **THEN** the launcher SHALL exit with code 2

#### Scenario: model missing
- **WHEN** root `.env` omits or empties `DEEPSEEK_MODEL`
- **THEN** the launcher SHALL exit with code 2 without inventing a model name

#### Scenario: invalid endpoint
- **WHEN** `.env` sets `DEEPSEEK_ANTHROPIC_BASE_URL` to an invalid URL (missing scheme, empty host)
- **THEN** the launcher SHALL exit with code 2
- **AND** SHALL NOT fall back to any default endpoint (per LDC-003)

### Requirement: Committable .env.example template

A tracked `.env.example` SHALL exist at the repository root. It SHALL document every supported `DEEPSEEK_*` variable with loopback-only placeholders for required values and commented optional alias/timeout values. The real repo-root `.env` and all real credentials SHALL remain git-ignored. The launcher SHALL NOT read `.env.example`; it is documentation only.

#### Scenario: .env.example is committable
- **WHEN** a fresh clone of the repo is made
- **THEN** repo-root `.env.example` SHALL be present
- **AND** it SHALL contain no real credentials or API keys

#### Scenario: .env is git-ignored
- **WHEN** `.env` exists at repo root
- **THEN** git SHALL ignore it (per existing `.gitignore` rule `.env` which matches at any directory level)

### Requirement: No default permission bypass

The launcher SHALL NOT append `--allow-dangerously-skip-permissions` or any equivalent permission-bypass flag to the `claude` invocation. The user MAY pass permission-related flags explicitly as part of `"$@"`; the launcher itself SHALL add none. Claude Code's normal permission model SHALL remain intact.

#### Scenario: permission bypass not injected
- **WHEN** the launcher is invoked without permission flags
- **THEN** the `claude` arguments SHALL NOT contain `--allow-dangerously-skip-permissions`

#### Scenario: user can pass own permission flags
- **WHEN** the launcher is invoked with `--allow-dangerously-skip-permissions` after its module path
- **THEN** `claude` SHALL receive `--allow-dangerously-skip-permissions` as a user-supplied argument

### Requirement: Pre-trigger host-tool documentation and boundary

`DPT_FRAMEWORK/host_tools/README.md` and a concise `SETUP.md` pointer SHALL document the launcher as a pre-trigger host tool requiring Node.js >=20, `claude` on PATH, and the repo-root `.env`. They SHALL show the shortest setup/check/launch loop, state that only loopback model endpoints are accepted, and state that the launcher does not create Engine, workflow, Runtime Bundle, permission, or provider-selection authority.

#### Scenario: README is present
- **WHEN** a user or Agent navigates to `DPT_FRAMEWORK/host_tools/`
- **THEN** `README.md` SHALL explain: copy root `.env.example` to root `.env`, configure the three required values, run `--check`, then pass normal Claude arguments

#### Scenario: README documents agent transparency
- **WHEN** a coding Agent reads the README
- **THEN** it SHALL understand that normal arguments and process I/O/outcomes are passed through
- **AND** it SHALL understand that first-argument `--check` belongs to the launcher

#### Scenario: README documents authority boundary
- **WHEN** a user or Agent reads the README
- **THEN** it SHALL assign endpoint, credential, model, and explicit permission-flag decisions to the user and mechanical check/launch execution to the Agent
- **AND** it SHALL state that the research Engine neither reads this config nor gains a verdict or permission role
