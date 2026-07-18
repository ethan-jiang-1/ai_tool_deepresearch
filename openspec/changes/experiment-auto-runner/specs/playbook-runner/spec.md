# playbook-runner

> req: PLR-001, PLR-003

## RENAMED Requirements

- FROM: `### Requirement: RUN.md as unified runner entry with playbook manifest (PLR-001)`
- TO: `### Requirement: Manifest and Agent instructions form one Agent-driven runner entry`

- FROM: `### Requirement: Runner execution contract and report (PLR-003)`
- TO: `### Requirement: Agent-driven execution ends in native completion and separate health reporting`

## MODIFIED Requirements

### Requirement: Manifest and Agent instructions form one Agent-driven runner entry

`experiments_playbook/PLAYBOOK_MANIFEST.md` SHALL be the single active case registration and ordering surface consumed by Agent Experiment Autorun. Each current runnable case SHALL have exactly one path entry. Case/group identity and native execution policy SHALL be read from that selected playbook's frontmatter, cost SHALL be read from its filename, and manifest/filesystem/frontmatter drift SHALL fail deterministic validation before execution; the manifest SHALL NOT duplicate those derived facts.

`experiments_playbook/RUN_AGENT_AUTORUN_EXPS.md` SHALL be the normal instruction loaded into one Headless Playbook Agent. It SHALL state that the Agent reads and executes the complete selected Markdown playbook, including Agent/Subject-Agent steps and the native verdict step. It SHALL NOT call the Supervisor the brain, reduce the Agent to hands, ask the Agent to skip native verdict, or imply that ordinary CI executes the case.

`experiments_playbook/RUN_INTERACTIVE_EXPS.md` SHALL be limited to single-case manual debug/replay and real-human judgment. It SHALL use the same playbook/native-completion/health semantics and SHALL NOT remain a second default batch runner.

Historical `RUN.md`, `RUN_EXPS.md`, `RUN_CLI_EXPS.md`, and `RUN_TUI_EXPS.md` references SHALL be migrated or retired so they do not remain conflicting active runner instructions.

#### Scenario: Normal autorun loads one Agent instruction and one case

- **WHEN** the Autorun Supervisor selects a manifest entry
- **THEN** it loads `RUN_AGENT_AUTORUN_EXPS.md` plus exactly that case playbook into a fresh Headless Playbook Agent
- **AND** the Agent executes the complete Markdown flow and native verdict

#### Scenario: Interactive execution is a diagnostic path

- **WHEN** an operator needs to replay one failed case or obtain real-human judgment
- **THEN** the operator launches the exact case through the host-created Interactive run context and the Interactive Playbook Agent uses `RUN_INTERACTIVE_EXPS.md`
- **AND** that file does not direct the Agent to run the full suite by default

#### Scenario: Runner manifest drift is deterministic

- **WHEN** the manifest omits, duplicates, or misclassifies a runnable case
- **THEN** the manifest validator fails before either Agent execution path starts
- **AND** no Agent is instructed to repair the manifest ad hoc during a run

### Requirement: Agent-driven execution ends in native completion and separate health reporting

Runner execution SHALL preserve the Coding Agent as the Markdown executor. For every selected autorun case, the Headless Playbook Agent SHALL execute each verdict-affecting step, consume Engine feedback, perform required real Subject Agent/Sub-agent work, and run the playbook-owned native verdict step. The Autorun Supervisor SHALL validate and aggregate that native completion; it SHALL NOT reinterpret arbitrary trace checks as the playbook verdict.

The report SHALL include selected count and separate effective PASS, FAIL, NOT_RUN, HUMAN, ERROR, and CANCELLED counts; native/lifecycle/Agent-process fields; health CLEAN/ISSUES/ERROR/null; concise failure or not-run reason; run-root/bundle preservation or cleanup; duration; per-case/accumulated USD cost or unknown; full completion/health result; and durable prompt/Agent-transcript/Subject-evidence references. PASS with health ISSUES SHALL remain PASS + ISSUES and SHALL be preserved. Cleanup SHALL require effective PASS + CLEAN + explicit cleanup flag and SHALL occur only after outside-run-root prompt/transcript files are closed/hashed, any required Subject evidence exact bytes are exported/fsynced, and the full durable audit append is fsynced and closed.

#### Scenario: Partial execution cannot be reported as PASS

- **WHEN** a Headless Playbook Agent exits after setup or generic Engine checks but before native completion
- **THEN** the Supervisor reports ERROR
- **AND** the report preserves any available run root and diagnostic log

#### Scenario: Native FAIL continues the selected batch

- **WHEN** one playbook produces a valid native FAIL completion
- **THEN** the Supervisor records the trace-bound failure reason and preserves the run root
- **AND** it continues with the next selected manifest entry without rewriting or repairing the failed playbook

#### Scenario: Native NOT_RUN remains deferred evidence

- **WHEN** a real-Agent-dependent playbook cannot obtain its required Subject Agent result and produces NOT_RUN
- **THEN** the report counts NOT_RUN separately from PASS, FAIL, and ERROR
- **AND** it does not overclaim Agent behavior

#### Scenario: Clean PASS may be removed after audit

- **WHEN** a native PASS case has CLEAN health and cleanup was explicitly requested
- **THEN** the Supervisor appends the durable audit record before containment-safe cleanup
- **AND** the full case result plus exact prompt and Agent transcript remain auditable after the run root is removed
