> req: PLR-003

## MODIFIED Requirements

### Requirement: Runner execution contract and report

Runner 的完整执行周期 SHALL 为：打开 active runner instruction surface 选定 playbook → 逐个打开 playbook → 对每个 playbook 执行全部 steps（包括 bash blocks 和 verdict） → 在 verdict 后、cleanup 前收集 post-run health → 收集每个 case 的 PASS/FAIL verdict 和 health status → 全部完成后向用户产出 summary report。

Accepted `playbook-runner` 仍定义 `experiments_playbook/RUN.md` 为 runner 入口；当前仓库实际 runner surface MAY be `experiments_playbook/RUN_EXPS.md` during implementation. This change SHALL make that drift explicit before updating runner instructions. Implementations SHALL NOT leave two active runner instruction files with conflicting health, cleanup, or report policy.

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
