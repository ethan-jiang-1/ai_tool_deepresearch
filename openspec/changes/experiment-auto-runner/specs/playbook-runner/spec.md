# playbook-runner (delta)

> req: PLR-001

## MODIFIED Requirements

### Requirement: RUN.md as unified runner entry with playbook manifest

`experiments_playbook/RUN_TUI_EXPS.md` SHALL 作为 coding agent 在 TUI 交互模式下的 runner 入口文件。该文件 SHALL 包含 playbook 清单（按 weight 分组）、执行指令、选择规则、failure 处理和 report 格式。

`experiments_playbook/RUN_CLI_EXPS.md` SHALL 作为 CLI 自动化模式下的 Agent 执行规范。该文件 SHALL 包含 CLI 模式特有的执行规则（`--target-dir .exp-bundles`、skip verdict、skip cleanup、打印 `BUNDLE=<path>`、打印进展标记）、执行协议和禁止做法。Runner（`run-experiment.mjs`）SHALL 读取此文件作为发送给 headless Agent 的 prompt 基础。

所有 `case-*.md` playbook 文件 SHALL NOT 修改。两份 instruction 定义"怎么跑"，playbook 定义"验证什么"。
