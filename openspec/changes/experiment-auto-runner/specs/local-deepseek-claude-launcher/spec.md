# local-deepseek-claude-launcher

> req: LDC-001, LDC-002, LDC-005, LDC-008, LDC-009

## MODIFIED Requirements

### Requirement: Repo-owned launcher and root configuration authority

`DPT_FRAMEWORK/host_tools/claude-deepseek.mjs` SHALL remain the single user-executable Agent CLI Launcher entry. A non-executable pure module under `DPT_FRAMEWORK/host_tools/lib/` MAY own shared config validation and Claude invocation-plan construction so the direct entry and Autorun Supervisor cannot drift. Both SHALL resolve the same checked-in repository root and SHALL use the ignored repo-root `.env` as the sole supported provider configuration authority.

#### Scenario: Shared builder does not create a second launcher entry

- **WHEN** the direct launcher and Autorun Supervisor need Claude argv/env construction
- **THEN** both use the same pure launcher contract
- **AND** only `claude-deepseek.mjs` remains the user-facing generic launcher executable

### Requirement: Environment isolation

The shared launcher contract SHALL preserve the accepted `.env` parsing and provider isolation rules for both direct and supervised launch. Caller extras MAY supply lifecycle-only values such as a test executable or diagnostic path through an explicit test/internal API, but SHALL NOT override the repo-selected endpoint, credential, model aliases, or fixed isolation values. Neither direct nor supervised reports/logs SHALL expose credential material or a complete child environment.

#### Scenario: Supervisor cannot override provider routing through inherited or extra env

- **WHEN** the Supervisor process or a fixture supplies conflicting `ANTHROPIC_*`, `DEEPSEEK_*`, model or endpoint values
- **THEN** production child provider routing still comes only from the parsed root `.env`
- **AND** diagnostics contain only redacted routing class, not secret values

### Requirement: Transparent argument and exit code passthrough

Direct `claude-deepseek.mjs` invocation SHALL continue to forward caller arguments, inherited stdio, exit code and signal without injecting flags. The shared pure contract SHALL additionally let the Autorun Supervisor construct the same direct `claude` executable/isolated env while owning Headless prompt stdin, structured stdout/stderr streaming, caller-authorized `--max-budget-usd`, timeout and process-group termination itself. For bounded Interactive replay it SHALL support the exact initial payload as Claude's documented positional prompt argument with inherited TTY stdio, without adding Headless-only flags or a wrapper child. The Supervisor SHALL NOT spawn the generic launcher as an orphanable intermediate child. Budget values SHALL come from validated Autorun CLI policy, not `.env`, inherited env or launcher defaults.

#### Scenario: Direct launch remains transparent

- **WHEN** a user invokes `claude-deepseek.mjs` with ordinary Claude arguments
- **THEN** the existing argument/stdio/outcome passthrough remains unchanged

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
