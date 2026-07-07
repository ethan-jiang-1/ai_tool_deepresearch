# Playbook Runner
> req: PLR-001, PLR-003

## Purpose

让 coding agent 成为 `experiments_playbook/` 的明确 runner——有一个统一入口文件 RUN.md（含 playbook 清单和执行指令），AI 打开就知道"跑哪些、怎么跑"，跑完出 report。不建传统 test runner；Agent 保留"读指令 → 执行 bash blocks → 读 trace → 裁决 → 继续或反问"的智力角色。
## Requirements
### Requirement: RUN.md as unified runner entry with playbook manifest (PLR-001)

`experiments_playbook/RUN.md` SHALL 作为 coding agent 的唯一 runner 入口文件。RUN.md SHALL 同时包含：

- **Playbook 清单**: 按 weight（light/heavy）分组的完整 playbook 列表，每项含相对路径和 case 简述
- **执行指令**: action-oriented 指令——"你现在是 runner。逐个打开以下 playbook，逐 step 执行 bash blocks"
- **选择规则**: 默认 run light，heavy 只在用户明确要求时
- **Failure 处理**: 记录失败原因、继续剩余、不确定时反问用户
- **Report 格式**: 跑完后产出 summary——PASS/FAIL 计数、失败 case 名和 trace 摘要

清单 SHALL 是手写 Markdown（非自动生成）。新增 playbook 时 SHALL 同步更新 RUN.md。

#### Scenario: AI opens RUN.md and has everything

- **WHEN** coding agent 打开 `experiments_playbook/RUN.md`
- **THEN** agent 看到完整的 light/heavy playbook 清单和执行指令
- **AND** agent 明确知道自己必须逐个执行 playbook，而非仅阅读
- **AND** agent 默认选取 light weight playbook

#### Scenario: User asks to run all playbooks including heavy

- **WHEN** 用户说"跑所有 playbook，包括 heavy"
- **THEN** agent 执行 RUN.md 中列出的所有 light + heavy playbook

#### Scenario: AI encounters a playbook failure during run

- **WHEN** 执行 playbook 时某个 case FAIL
- **THEN** agent 记录失败的 case 名、失败原因（从 trace 摘要提取）
- **AND** agent 继续执行剩余 playbook，不中断

#### Scenario: RUN.md manifest is out of sync with directory

- **WHEN** agent 发现 RUN.md 列出的 playbook 与实际目录不一致
- **THEN** agent 先更新 RUN.md 中的清单使其与实际目录一致，再开始执行

#### Scenario: Agent is unsure whether to run heavy

- **WHEN** 用户指令不明确（如"跑一下测试"而未指定 light 还是全跑）
- **THEN** agent 默认只跑 light，并追问用户是否需要 heavy

### Requirement: Runner execution contract and report (PLR-003)

Runner execution SHALL open the active runner instruction surface, select current playbooks, execute each selected playbook step by step, run every bash block and verdict, collect post-run health before cleanup, and report verdict and health status.

Accepted `playbook-runner` still defines `experiments_playbook/RUN.md` as runner entry; current repository implementation MAY use `experiments_playbook/RUN_EXPS.md` while this drift is explicit. Active runner surfaces SHALL NOT conflict on health, cleanup, report policy, or current/removed/migrated case classification.

Current runner surfaces SHALL NOT list old relay/slot playbooks, old hand-written delegated ledger fixtures, old queue slot-shape playbooks, or obsolete JS helper cases as current production proof. A playbook that depends on retired relay/slot production mechanisms, invalid non-delegated queue paths, or old delegated ledger rows SHALL be triaged for current value. If it can still prove or diagnose current work-unit or queue v2 behavior, it SHALL be migrated to the current path. If it cannot, it SHALL be removed from current runner surfaces and the obsolete runnable file/helper SHALL be deleted or moved out of current runner-readable locations by this cleanup. A legacy/backlog label MAY be used only as a temporary apply-time review state; it SHALL NOT remain as a permanent runner table or current-surface parking lot for obsolete production examples after this change archives.

Report SHALL include:

- selected case count, PASS count, FAIL count
- each FAIL case and failure reason summary
- group statistics for light, standard, heavy, skipped human cases, and removed/migrated case counts when applicable
- each executed case's verdict, health, optional `not_run_reason`, and `bundle_preserved`
- PASS verdict with health issues as PASS plus HEALTH ISSUES, not a collapsed verdict

Cleanup policy SHALL preserve the disposable bundle by default when verdict is FAIL or health is ISSUES, unless the playbook explicitly documents a safe cleanup exception.

#### Scenario: Full selected suite passes with clean health

- **WHEN** the agent executes selected current playbooks and all verdicts PASS
- **AND** post-run health reports are all CLEAN
- **THEN** the report SHALL show selected case count, PASS count, 0 FAIL, and 0 HEALTH ISSUES

#### Scenario: Mixed verdict and health status

- **WHEN** some selected playbooks FAIL or report health ISSUES
- **THEN** the report SHALL list each FAIL case with a trace or diagnostic summary
- **AND** the report SHALL list each HEALTH ISSUES case with concise health summary
- **AND** the report SHALL provide PASS/FAIL and CLEAN/ISSUES totals

#### Scenario: Passing verdict with health issues remains distinguishable

- **WHEN** a playbook verdict is PASS but post-run health is ISSUES
- **THEN** runner report SHALL show verdict PASS and health ISSUES as separate fields
- **AND** cleanup SHALL preserve the bundle by default for failure analysis

#### Scenario: Active runner surface drift is explicit

- **WHEN** implementation updates runner health or cleanup instructions
- **THEN** it SHALL identify whether `experiments_playbook/RUN_EXPS.md`, `experiments_playbook/RUN.md`, or both are active
- **AND** it SHALL update the active surface first
- **AND** if both files remain active, their health, cleanup, report, and removed-case policies SHALL agree

#### Scenario: old relay or queue-slot playbook is migrated or removed

- **WHEN** a runner surface names a playbook that still depends on retired relay/slot production mechanisms, old delegated ledger rows, or old queue slot shape
- **THEN** the playbook SHALL be migrated to prove current work-unit or queue v2 behavior, or removed from current runner surfaces
- **AND** it SHALL NOT remain visible as current work-unit production proof
- **AND** any temporary legacy/backlog classification SHALL be resolved before archive by migration or removal from current runner surfaces

#### Scenario: obsolete runnable files are not left as hidden current examples

- **WHEN** an old relay/slot playbook or JS helper is removed from runner tables because it has no current proof value
- **THEN** the corresponding current runnable file SHALL also be deleted or moved to an excluded historical archive path
- **AND** it SHALL NOT remain under `experiments_playbook/` as a runnable-looking current example

