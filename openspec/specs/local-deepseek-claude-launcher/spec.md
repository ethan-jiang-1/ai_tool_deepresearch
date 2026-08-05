# local-deepseek-claude-launcher

> req: LDC-001, LDC-002, LDC-003, LDC-004, LDC-005, LDC-006, LDC-007, LDC-008, LDC-009

## Purpose

Define a repo-owned, deterministic, fail-closed Claude Code launcher for local Anthropic-compatible DeepSeek endpoints. The Node.js ESM launcher lives in `DEEP_RESEARCH_HARNESS/host_tools/`; supported configuration values live only in the ignored repo-root `.env`, with their tracked contract in the repo-root `.env.example`.

The launcher parses supported `.env` keys as data, isolates inherited provider environment state, validates that the configured endpoint is a well-formed URL, provides a credential-safe `--check` preflight mode, and launches `claude` with transparent argument, stdio, exit-code, and signal passthrough. Except for the launcher-owned first argument `--check`, callers use normal Claude Code arguments.

The launcher is a pre-trigger host tool — it operates before Claude Code initialization and before any DEEP_RESEARCH_HARNESS entry point. It does not introduce a research workflow node, Engine API, bundle state, command playbook, background service, provider fallback, retry tree, or new npm dependency. It does not modify global Claude Code settings or append permission-bypass flags.
## Requirements
### Requirement: Repo-owned launcher and root configuration authority

`DEEP_RESEARCH_HARNESS/host_tools/claude-deepseek.mjs` SHALL remain the single user-executable Agent CLI Launcher entry. A non-executable pure module under `DEEP_RESEARCH_HARNESS/host_tools/lib/` MAY own shared config validation and Claude invocation-plan construction so the direct entry and Autorun Supervisor cannot drift. Both SHALL resolve the same checked-in repository root and SHALL use the ignored repo-root `.env` as the sole supported provider configuration authority.

#### Scenario: Shared builder does not create a second launcher entry

- **WHEN** the direct launcher and Autorun Supervisor need Claude argv/env construction
- **THEN** both use the same pure launcher contract
- **AND** only `claude-deepseek.mjs` remains the user-facing generic launcher executable

#### Scenario: script location

- **WHEN** the launcher is installed
- **THEN** `DEEP_RESEARCH_HARNESS/host_tools/claude-deepseek.mjs` remains executable
- **AND** its shared pure module uses Node.js >=20 and repository-approved built-ins only

#### Scenario: .env loading

- **WHEN** the direct launcher or Autorun Supervisor builds a production Claude invocation
- **THEN** it locates the repo-root `.env` from the checked-in module location, independent of invocation CWD
- **AND** it fails closed with configuration-error semantics when that file does not exist

#### Scenario: no other config sources

- **WHEN** the direct launcher or Autorun Supervisor builds a production Claude invocation
- **THEN** it does not read settings JSON, global Claude config, a host-tools-local `.env`, runtime-bundle state, or inherited `DEEPSEEK_*` values as provider configuration

### Requirement: Environment isolation

The shared launcher contract SHALL preserve the accepted `.env` parsing and provider isolation rules for both direct and supervised launch. Caller extras MAY supply lifecycle-only values such as a test executable or diagnostic path through an explicit test/internal API, but SHALL NOT override the repo-selected endpoint, credential, model aliases, or fixed isolation values. Neither direct nor supervised reports/logs SHALL expose credential material or a complete child environment.

The shared launcher contract SHALL set its owned `ENABLE_TOOL_SEARCH` value to `true` after removing any inherited value. This setting makes the already selected Agent-native research tool-discovery surface requestable; it SHALL NOT establish that `WebSearch` or `WebFetch` is callable, permitted, returned content, or an available `research_access` observation.

#### Scenario: Supervisor cannot override provider routing through inherited or extra env

- **WHEN** the Supervisor process or a fixture supplies conflicting `ANTHROPIC_*`, `DEEPSEEK_*`, model or endpoint values
- **THEN** production child provider routing still comes only from the parsed root `.env`
- **AND** diagnostics contain only redacted routing class, not secret values

#### Scenario: inherited ANTHROPIC_* is removed

- **WHEN** the spawning shell or parent process has `ANTHROPIC_BASE_URL=https://evil.com` and the root `.env` sets `DEEPSEEK_ANTHROPIC_BASE_URL=http://localhost:8080`
- **THEN** the shared launcher contract removes the inherited `ANTHROPIC_BASE_URL` before exporting
- **AND** each production Claude child receives `ANTHROPIC_BASE_URL=http://localhost:8080`

#### Scenario: inherited DEEPSEEK_* does not override root config

- **WHEN** the parent process has `DEEPSEEK_MODEL=stale-model` and the root `.env` sets `DEEPSEEK_MODEL=local-model`
- **THEN** each production Claude child receives the root-configured model mapping
- **AND** the inherited `DEEPSEEK_MODEL` does not become child configuration

#### Scenario: one explicit model supplies alias defaults

- **WHEN** the root `.env` sets `DEEPSEEK_MODEL=local-model` and omits optional alias keys
- **THEN** the shared launcher contract exports `local-model` for `ANTHROPIC_MODEL` and each default model alias

#### Scenario: root .env not readable

- **WHEN** the repo-root `.env` exists but is not readable
- **THEN** direct and supervised production launch fail with configuration-error semantics
- **AND** diagnostics identify the unreadable file without exposing credential material

#### Scenario: root .env is not shell-evaluated or bulk-exported

- **WHEN** the root `.env` contains an unrelated key and shell command-substitution text
- **THEN** the shared launcher contract does not execute the text
- **AND** the unrelated key is not added to any Claude child environment from `.env`

#### Scenario: inherited tool-discovery setting is replaced by launcher-owned enablement

- **WHEN** a direct launcher, Supervisor, or fixture inherits `ENABLE_TOOL_SEARCH=false`
- **THEN** the resulting production Claude child receives launcher-owned `ENABLE_TOOL_SEARCH=true`
- **AND** the inherited value does not alter provider routing, permission mode, or the separate runtime evidence requirement for research access

#### Scenario: caller extra cannot select tool discovery

- **WHEN** a direct launcher, Supervisor, or fixture supplies `ENABLE_TOOL_SEARCH` through caller extras
- **THEN** invocation-plan construction fails before a production Claude child is started
- **AND** the rejected value does not alter provider routing, permission mode, or the separate runtime evidence requirement for research access

### Requirement: Endpoint URL validation

The launcher SHALL validate `DEEPSEEK_ANTHROPIC_BASE_URL` with the platform URL parser. It SHALL accept any `http:` or `https:` URL with a non-empty host. It SHALL reject URL-embedded username/password, malformed URLs, and empty values with exit code 2. The user chooses their endpoint.

#### Scenario: remote endpoint accepted
- **WHEN** `DEEPSEEK_ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic`
- **THEN** endpoint validation SHALL pass
- **AND** the launcher SHALL proceed to launch claude or report ready in `--check` mode

#### Scenario: valid http endpoint accepted
- **WHEN** `DEEPSEEK_ANTHROPIC_BASE_URL=http://localhost:8080/v1`
- **THEN** endpoint validation SHALL pass

#### Scenario: missing scheme rejected
- **WHEN** `DEEPSEEK_ANTHROPIC_BASE_URL=api.deepseek.com/anthropic`
- **THEN** the launcher SHALL exit with code 2
- **AND** stderr SHALL indicate the endpoint URL is invalid

#### Scenario: unset endpoint rejected
- **WHEN** `DEEPSEEK_ANTHROPIC_BASE_URL` is not set in `.env`
- **THEN** the launcher SHALL exit with code 2
- **AND** stderr SHALL indicate the variable must be set

#### Scenario: embedded URL credentials rejected
- **WHEN** the endpoint URL contains username/password
- **THEN** the launcher SHALL exit with code 2 without printing embedded credential material

### Requirement: Credential-safe preflight mode

The launcher SHALL support a `--check` flag as its first argument. In `--check` mode, the launcher SHALL perform all validation checks (claude on PATH, root `.env` exists and is readable, required key/model values are non-empty, and endpoint URL is valid) and report every result without launching `claude`.

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

Direct `claude-deepseek.mjs` invocation SHALL continue to forward caller arguments, inherited stdio, exit code and signal without injecting flags. The shared pure contract SHALL additionally let the Autorun Supervisor construct the same direct `claude` executable/isolated env while owning Headless prompt stdin, structured stdout/stderr streaming, caller-authorized `--max-budget-usd`, timeout and process-group termination itself. For bounded Interactive replay it SHALL support the exact initial payload as Claude's documented positional prompt argument with inherited TTY stdio, without adding Headless-only flags or a wrapper child. The Supervisor SHALL NOT spawn the generic launcher as an orphanable intermediate child. Budget values SHALL come from validated Autorun CLI policy, not `.env`, inherited env or launcher defaults.

#### Scenario: Direct launch remains transparent

- **WHEN** a user invokes `claude-deepseek.mjs` with ordinary Claude arguments
- **THEN** the existing argument/stdio/outcome passthrough remains unchanged

#### Scenario: arguments forwarded

- **WHEN** the launcher is invoked as `node DEEP_RESEARCH_HARNESS/host_tools/claude-deepseek.mjs -p "hello" --verbose`
- **THEN** direct `claude` invocation receives the arguments `-p`, `hello`, `--verbose`

#### Scenario: exit code preserved

- **WHEN** direct `claude` exits with code 42
- **THEN** `claude-deepseek.mjs` exits with code 42

#### Scenario: inherited stdio is preserved

- **WHEN** a direct Claude child reads stdin or writes stdout/stderr
- **THEN** those streams remain connected to the launcher's caller without capture or rewriting

#### Scenario: no flag injection

- **WHEN** the direct launcher is invoked without `--allow-dangerously-skip-permissions`
- **THEN** direct `claude` does not receive `--allow-dangerously-skip-permissions` in its arguments

#### Scenario: Supervisor owns one Claude child lifecycle

- **WHEN** Agent Experiment Autorun launches a Headless Playbook Agent
- **THEN** the shared contract returns the validated executable/argv/env plan and the Supervisor spawns Claude without a shell
- **AND** timeout or cancellation terminates the owned process group rather than only a wrapper process

#### Scenario: Launcher plan does not invent a spending limit

- **WHEN** Autorun requests a validated current per-case USD cap
- **THEN** the shared invocation plan passes that exact cap to Claude without reading or overriding it from provider env
- **AND** generic direct launcher behavior remains transparent rather than gaining an implicit budget policy

### Requirement: Fail-closed behavior

The launcher SHALL fail closed for every detectable pre-launch error. It SHALL NOT silently fall back to a remote endpoint, inherited provider state, built-in credentials, global Claude settings, or another provider. Exit codes SHALL be 1 for missing/unlaunchable external `claude` and 2 for launcher configuration errors, including missing root `.env`, missing required key/model, unsafe supported assignment, or invalid endpoint URL.

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

A tracked `.env.example` SHALL exist at the repository root. It SHALL document every supported `DEEPSEEK_*` variable with placeholders for required values and commented optional alias/traffic/timeout values. The real repo-root `.env` and all real credentials SHALL remain git-ignored. The launcher SHALL NOT read `.env.example`; it is documentation only.

#### Scenario: .env.example is committable
- **WHEN** a fresh clone of the repo is made
- **THEN** repo-root `.env.example` SHALL be present
- **AND** it SHALL contain no real credentials or API keys

#### Scenario: .env is git-ignored
- **WHEN** `.env` exists at repo root
- **THEN** git SHALL ignore it (per existing `.gitignore` rule `.env` which matches at any directory level)

### Requirement: No default permission bypass

Generic direct launcher invocation SHALL still inject no permission bypass. Invoking the explicit `run-agent-experiment.mjs` Autorun surface SHALL be the user's authorization for the Supervisor to add a currently supported, actually enabled headless bypass mode to that case's Claude invocation; the ineffective allow-only flag SHALL NOT satisfy this requirement. Interactive replay SHALL retain user-present permission handling and SHALL NOT silently inherit Autorun bypass.

#### Scenario: Generic launch remains non-bypass

- **WHEN** the generic launcher is invoked without a permission flag
- **THEN** it does not add one

#### Scenario: permission bypass not injected

- **WHEN** the generic launcher is invoked without `--allow-dangerously-skip-permissions`
- **THEN** direct `claude` arguments do not contain `--allow-dangerously-skip-permissions`

#### Scenario: user can pass own permission flags

- **WHEN** the generic launcher is invoked with `--allow-dangerously-skip-permissions` after its module path
- **THEN** direct `claude` receives that flag as a user-supplied argument

#### Scenario: Explicit Autorun command enables real headless permission mode

- **WHEN** the user invokes Agent Experiment Autorun for a headless case
- **THEN** the Supervisor uses a supported effective bypass mode and records only its non-secret mode class
- **AND** the same policy is not silently applied to Interactive replay

### Requirement: Pre-trigger host-tool documentation and boundary

Host-tool documentation SHALL retain the generic launcher's setup/check/transparent-launch contract and SHALL additionally distinguish Agent CLI Launcher, Autorun Supervisor, Headless Playbook Agent and Interactive Playbook Agent. It SHALL explain that `.env` is host provider configuration, not cross-tool-call experiment state; run context uses explicit files/arguments. It SHALL warn that Autorun's effective bypass operates trusted playbooks and that run-root containment is cleanup/authority isolation rather than an OS hostile-code sandbox.

#### Scenario: Reader can distinguish generic launch from Agent Autorun

- **WHEN** a user reads host-tool documentation
- **THEN** generic launcher usage, Headless Autorun and Interactive replay have separate shortest legal commands and permission expectations
- **AND** none is described as research Engine, ordinary CI, or Subject Agent verdict authority

#### Scenario: README is present

- **WHEN** a user or Agent navigates to `DEEP_RESEARCH_HARNESS/host_tools/`
- **THEN** `README.md` explains copying root `.env.example` to root `.env`, configuring the three required values, running `--check`, then passing normal Claude arguments

#### Scenario: README documents agent transparency

- **WHEN** a coding Agent reads the README
- **THEN** it understands that normal direct-launch arguments and process I/O/outcomes are passed through
- **AND** it understands that first-argument `--check` belongs to the launcher

#### Scenario: README documents authority boundary

- **WHEN** a user or Agent reads the README
- **THEN** it assigns endpoint, credential, model, and explicit permission-flag decisions to the user and mechanical check/launch execution to the Agent
- **AND** it states that the research Engine neither reads this configuration nor gains a verdict or permission role
