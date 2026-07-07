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

Runner 的完整执行周期 SHALL 为：打开 active runner instruction surface 选定 playbook → 逐个打开 playbook → 对每个 playbook 执行全部 steps（包括 bash blocks 和 verdict） → 在 verdict 后、cleanup 前收集 post-run health → 收集每个 case 的 PASS/FAIL verdict 和 health status → 全部完成后向用户产出 summary report。

Accepted `playbook-runner` 仍定义 `experiments_playbook/RUN.md` 为 runner 入口；当前仓库实际 runner surface MAY be `experiments_playbook/RUN_EXPS.md` during implementation. This change SHALL make that drift explicit before updating runner instructions. Implementations SHALL NOT leave two active runner instruction files with conflicting health, cleanup, or report policy.

Current runner surfaces SHALL NOT list old delegated playbooks, old hand-written delegated ledger fixtures, old queue position-shape playbooks, or obsolete JS helper cases as current production proof. A playbook that depends on retired delegated production mechanisms, invalid non-delegated queue paths, or old delegated ledger rows SHALL be triaged for current value. If it can still prove or diagnose current work-unit or queue v2 behavior, it SHALL be migrated to the current path. If it cannot, it SHALL be removed from current runner surfaces and the obsolete runnable file/helper SHALL be deleted or moved out of current runner-readable locations by this cleanup. A legacy/backlog label MAY be used only as a temporary apply-time review state; it SHALL NOT remain as a permanent runner table or current-surface parking lot for obsolete production examples after this change archives.

Report SHALL 包含：
- 跑了几个 case、几个 PASS、几个 FAIL
- 每个 FAIL 的 case 名和失败原因摘要（从 trace event 或 diagnostic summary 提取）
- light/standard/heavy 或 active runner surface 使用的分组统计
- 每个 executed case 的 `verdict`, `health`, optional `not_run_reason`, and `bundle_preserved`
- PASS verdict with health issues SHALL be visible as PASS + HEALTH ISSUES, not collapsed into a single verdict

Cleanup policy SHALL preserve the disposable bundle by default when verdict is FAIL or health is ISSUES, unless the playbook explicitly documents a safe cleanup exception.

#### Scenario: Full selected suite passes with clean health

- **WHEN** agent 执行选定 playbook 且全部 verdict PASS
- **AND** post-run health reports are all CLEAN
- **THEN** report 显示 selected case count, PASS count, 0 FAIL, and 0 HEALTH ISSUES

#### Scenario: Mixed verdict and health status

- **WHEN** 执行 playbook 时部分 verdict FAIL or health ISSUES
- **THEN** report 列出每个 FAIL 的 case 名和 trace 摘要中的 failure indicator
- **AND** report 列出每个 HEALTH ISSUES case 的 concise health summary
- **AND** report 末尾给出 PASS/FAIL and CLEAN/ISSUES 汇总

#### Scenario: Passing verdict with health issues remains distinguishable

- **WHEN** a playbook verdict is PASS but post-run health is ISSUES
- **THEN** runner report SHALL show verdict PASS and health ISSUES as separate fields
- **AND** cleanup SHALL preserve the bundle by default for failure analysis

#### Scenario: Active runner surface drift is explicit

- **WHEN** implementation updates runner health instructions
- **THEN** it SHALL identify whether `experiments_playbook/RUN_EXPS.md`, `experiments_playbook/RUN.md`, or both are active
- **AND** it SHALL update the active surface first
- **AND** if both files remain active, their health, cleanup, and report policies SHALL agree

#### Scenario: old delegated or queue-shape playbook is migrated or removed

- **WHEN** a runner surface names a playbook that still depends on retired delegated production mechanisms, old delegated ledger rows, or old queue position shape
- **THEN** the playbook SHALL be migrated to prove current work-unit or queue v2 behavior, or removed from current runner surfaces
- **AND** it SHALL NOT remain visible as current work-unit production proof
- **AND** any temporary legacy/backlog classification SHALL be resolved before archive by migration or removal from current runner surfaces

#### Scenario: obsolete runnable files are not left as hidden current examples

- **WHEN** an old delegated playbook or JS helper is removed from runner tables because it has no current proof value
- **THEN** the corresponding current runnable file SHALL also be deleted or moved to an excluded historical archive path
- **AND** it SHALL NOT remain under `experiments_playbook/` as a runnable-looking current example
