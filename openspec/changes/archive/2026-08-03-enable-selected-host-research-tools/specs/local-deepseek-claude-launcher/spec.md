> req: LDC-002

## MODIFIED Requirements

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
