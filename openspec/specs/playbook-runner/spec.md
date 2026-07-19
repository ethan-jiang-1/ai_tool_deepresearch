# Playbook Runner
> req: PLR-001, PLR-003

## Purpose

让 coding agent 成为 `experiments_playbook/` 的明确 runner——有一个统一入口文件 RUN.md（含 playbook 清单和执行指令），AI 打开就知道"跑哪些、怎么跑"，跑完出 report。不建传统 test runner；Agent 保留"读指令 → 执行 bash blocks → 读 trace → 裁决 → 继续或反问"的智力角色。
## Requirements
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

#### Scenario: AI opens RUN.md and has everything

- **WHEN** a coding agent opens the active `RUN_AGENT_AUTORUN_EXPS.md` runner instruction and selected case playbook
- **THEN** it has the one-case execution instruction, selected manifest entry, and complete Markdown flow needed to execute the case rather than merely read it
- **AND** case profile selection remains explicit in the Autorun invocation rather than inferred from a retired `RUN.md` default

#### Scenario: User asks to run all playbooks including heavy

- **WHEN** a user requests all manifest playbooks including heavy cases
- **THEN** Autorun selects all eligible light, standard, and heavy manifest entries under its explicit all-profile policy
- **AND** one fresh Headless Playbook Agent executes each selected complete playbook

#### Scenario: AI encounters a playbook failure during run

- **WHEN** a selected playbook produces native FAIL
- **THEN** the Supervisor records the case and trace-bound failure reason
- **AND** it continues the remaining selected manifest entries

#### Scenario: RUN.md manifest is out of sync with directory

- **WHEN** the active manifest and runnable playbook directory are inconsistent
- **THEN** deterministic manifest validation reports the mismatch before execution
- **AND** the Agent does not modify the manifest while running a selected case

#### Scenario: Agent is unsure whether to run heavy

- **WHEN** the user request leaves the profile selection ambiguous
- **THEN** the Agent requires an explicit Autorun profile/selection rather than silently running heavy cases
- **AND** Interactive replay remains restricted to one selected diagnostic case

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

#### Scenario: Full selected suite passes with clean health

- **WHEN** all selected manifest cases produce native PASS and CLEAN health
- **THEN** the report shows the selected count, matching effective PASS count, zero FAIL, and zero health ISSUES

#### Scenario: Mixed verdict and health status

- **WHEN** selected playbooks produce FAIL or health ISSUES
- **THEN** the report lists each failed case with a concise trace-bound reason
- **AND** it lists each health-issues case with a concise health summary and separate native/effective and health totals

#### Scenario: Passing verdict with health issues remains distinguishable

- **WHEN** a playbook native verdict is PASS but health is ISSUES
- **THEN** the report shows PASS and ISSUES as separate fields
- **AND** cleanup preserves the run root by default for analysis

#### Scenario: Active runner surface drift is explicit

- **WHEN** implementation updates runner execution, health, or cleanup instructions
- **THEN** it updates the active Autorun/Interactive instruction surfaces and their manifest contract consistently
- **AND** retired `RUN.md` and legacy runner documents do not remain conflicting active instructions

#### Scenario: old relay or queue-slot playbook is migrated or removed

- **WHEN** a historical runner surface names a playbook dependent on retired relay/slot mechanisms, old delegated ledger rows, or old queue slot shape
- **THEN** the playbook is migrated to current work-unit or queue-v2 proof, or removed from the active manifest and instructions
- **AND** it does not remain visible as current production proof

#### Scenario: obsolete runnable files are not left as hidden current examples

- **WHEN** an obsolete relay/slot playbook or JS helper has no current proof value and is removed from active runner surfaces
- **THEN** its runnable-looking current file is deleted or moved to an excluded historical path
- **AND** it does not remain under `experiments_playbook/` as a current example

