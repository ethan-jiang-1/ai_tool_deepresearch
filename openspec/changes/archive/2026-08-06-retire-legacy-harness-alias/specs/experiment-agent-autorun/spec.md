> req: EXA-002

## MODIFIED Requirements

### Requirement: Canonical Autorun surfaces use unambiguous names

The normal autorun surfaces SHALL be:

- `experiments_playbook/PLAYBOOK_MANIFEST.md` for active playbook path
  registration and order;
- `experiments_playbook/RUN_AGENT_AUTORUN_EXPS.md` for the instruction injected
  into one Headless Playbook Agent;
- `experiments_playbook/RUN_INTERACTIVE_EXPS.md` for single-case manual
  debug/replay and real-human judgment; and
- `DEEP_RESEARCH_HARNESS/host_tools/run-agent-experiment.mjs` for the Autorun
  Supervisor command.

The canonical Harness host-tools location SHALL be the only supported Autorun
source coordinate. No filesystem alias, alternate root path, or source-identity
fallback SHALL resolve to the same normal Autorun command.

`run-agent-experiment.mjs --interactive --case <exact-case>` SHALL be the
bounded Interactive launch path. It SHALL create the same validated run context,
start one TTY/user-present Interactive Playbook Agent with the Interactive
instruction, and perform the same post-completion validation/health/audit
policy. With real TTY stdin/stdout/stderr inherited and no PTY wrapper, the
exact complete instruction/rendered-playbook/identity/digest/context payload
SHALL be delivered as Claude's documented positional initial-prompt argument,
subject to a deterministic conservative 128 KiB UTF-8 limit; oversize input
SHALL fail closed rather than fall back to path discovery or piped stdin.
Interactive invocation SHALL omit `-p`, structured-output, no-session-
persistence, Headless budget and bypass flags. It SHALL reject default, group,
tier, or multi-case selection, SHALL reject `--cleanup-pass`, SHALL preserve
the Interactive run root, and SHALL NOT be described as normal autorun. V1
SHALL NOT add a PTY wrapper or pretend that TTY output satisfies the Headless
structured-transcript contract.

The retired names `RUN_CLI_EXPS.md`, `RUN_TUI_EXPS.md`, and
`run-experiment.mjs` SHALL NOT remain active competing instruction or host-entry
surfaces when the change completes. All repository consumers SHALL migrate in
the same change.

#### Scenario: Only one normal autorun instruction and source root remain

- **WHEN** the change reaches archive readiness
- **THEN** the Headless Playbook Agent receives `RUN_AGENT_AUTORUN_EXPS.md`
- **AND** no active consumer still loads `RUN_CLI_EXPS.md`
- **AND** the Interactive instruction is labeled debug/replay rather than a
  second normal batch mode
- **AND** the Autorun command is reachable only below
  `DEEP_RESEARCH_HARNESS/host_tools/`

#### Scenario: Interactive replay gets the same run context without becoming batch mode

- **WHEN** an operator launches `--interactive --case <exact-case>`
- **THEN** one Interactive Playbook Agent receives one host-created context and
  selected playbook
- **AND** normal TTY permission/user interaction is allowed
- **AND** group, tier, and default-suite selection are rejected
