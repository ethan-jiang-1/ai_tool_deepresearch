# Playbook Runner
> req: PLR-001, PLR-003

## Purpose

让 coding agent 成为 `experiments_playbook/` 的明确 runner——有一个统一入口文件 RUN.md（含 playbook 清单和执行指令），AI 打开就知道"跑哪些、怎么跑"，跑完出 report。不建传统 test runner；Agent 保留"读指令 → 执行 bash blocks → 读 trace → 裁决 → 继续或反问"的智力角色。

## Requirements

### Requirement: RUN.md as unified runner entry with playbook manifest

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

### Requirement: Runner execution contract and report

Runner 的完整执行周期 SHALL 为：打开 RUN.md 选定 playbook → 逐个打开 playbook → 对每个 playbook 执行全部 steps（包括 bash blocks 和 verdict） → 收集每个 case 的 PASS/FAIL → 全部完成后向用户产出 summary report。

Report SHALL 包含：
- 跑了几个 case、几个 PASS、几个 FAIL
- 每个 FAIL 的 case 名和失败原因摘要（从 trace event 提取）
- light/heavy 分别统计

#### Scenario: Full light suite passes

- **WHEN** agent 执行所有 light playbook 且全部 PASS
- **THEN** report 显示 "N light playbooks, N PASS, 0 FAIL"

#### Scenario: Mixed pass/fail

- **WHEN** agent 执行 playbook 时部分 FAIL
- **THEN** report 列出每个 FAIL 的 case 名和 trace 摘要中的 failure indicator
- **AND** report 末尾给出 PASS/FAIL 汇总
