# local-deepseek-claude-launcher

> req: LDC-001, LDC-002, LDC-005, LDC-008, LDC-009

## MODIFIED Requirements

### Requirement: Repo-owned launcher and root configuration authority

`DPT_FRAMEWORK/host_tools/claude-deepseek.mjs` SHALL remain the single user-executable Agent CLI Launcher entry. A non-executable pure module under `DPT_FRAMEWORK/host_tools/lib/` MAY own shared config validation and Claude invocation-plan construction so the direct entry and Autorun Supervisor cannot drift. Both SHALL resolve the same checked-in repository root and SHALL use the ignored repo-root `.env` as the sole supported provider configuration authority.

#### Scenario: Shared builder does not create a second launcher entry

- **WHEN** the direct launcher and Autorun Supervisor need Claude argv/env construction
- **THEN** both use the same pure launcher contract
- **AND** only `claude-deepseek.mjs` remains the user-facing generic launcher executable

#### Scenario: script location

- **WHEN** the launcher is installed
- **THEN** `DPT_FRAMEWORK/host_tools/claude-deepseek.mjs` remains executable
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

### Requirement: Transparent argument and exit code passthrough

Direct `claude-deepseek.mjs` invocation SHALL continue to forward caller arguments, inherited stdio, exit code and signal without injecting flags. The shared pure contract SHALL additionally let the Autorun Supervisor construct the same direct `claude` executable/isolated env while owning Headless prompt stdin, structured stdout/stderr streaming, caller-authorized `--max-budget-usd`, timeout and process-group termination itself. For bounded Interactive replay it SHALL support the exact initial payload as Claude's documented positional prompt argument with inherited TTY stdio, without adding Headless-only flags or a wrapper child. The Supervisor SHALL NOT spawn the generic launcher as an orphanable intermediate child. Budget values SHALL come from validated Autorun CLI policy, not `.env`, inherited env or launcher defaults.

#### Scenario: Direct launch remains transparent

- **WHEN** a user invokes `claude-deepseek.mjs` with ordinary Claude arguments
- **THEN** the existing argument/stdio/outcome passthrough remains unchanged

#### Scenario: arguments forwarded

- **WHEN** the launcher is invoked as `node DPT_FRAMEWORK/host_tools/claude-deepseek.mjs -p "hello" --verbose`
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

- **WHEN** a user or Agent navigates to `DPT_FRAMEWORK/host_tools/`
- **THEN** `README.md` explains copying root `.env.example` to root `.env`, configuring the three required values, running `--check`, then passing normal Claude arguments

#### Scenario: README documents agent transparency

- **WHEN** a coding Agent reads the README
- **THEN** it understands that normal direct-launch arguments and process I/O/outcomes are passed through
- **AND** it understands that first-argument `--check` belongs to the launcher

#### Scenario: README documents authority boundary

- **WHEN** a user or Agent reads the README
- **THEN** it assigns endpoint, credential, model, and explicit permission-flag decisions to the user and mechanical check/launch execution to the Agent
- **AND** it states that the research Engine neither reads this configuration nor gains a verdict or permission role
