# playbook-runner (delta)

> req: PLR-001

## MODIFIED Requirements

### Requirement: Shared manifest as unified runner entry for case discovery

`experiments_playbook/PLAYBOOK_MANIFEST.md` SHALL 作为所有 case 的权威清单——Light/Standard/Heavy/Human 四档表格、选择规则、迁移记录。两份 runner instruction 均引用此文件作为"跑哪些"的单一数据源。

`experiments_playbook/RUN_TUI_EXPS.md` SHALL 作为 TUI 交互模式下的 runner 入口文件。该文件 SHALL 引用 `PLAYBOOK_MANIFEST.md` 获取 case 清单，包含 TUI 执行协议（含 verdict、cleanup）、禁止做法和 report 格式。Agent 在 TUI 模式下对该文件的 verdict 和 cleanup 负责。

`experiments_playbook/RUN_CLI_EXPS.md` SHALL 作为 CLI 自动化模式下的 Agent 执行规范。该文件 SHALL 明确 Runner-Agent 分工：Runner（`run-experiment.mjs`）负责 playbook 发现、spawn Agent、读 trace 裁决、health check、cleanup；Agent 负责读 playbook、执行 bash blocks（加 `--target-dir .exp-bundles`、skip verdict、skip cleanup、打印进展标记和 `BUNDLE=<path>`）。Runner 读取此文件作为发送给 headless Agent 的 prompt 基础。

所有 `case-*.md` playbook 文件 SHALL NOT 修改。MANIFEST 定义"有哪些"，playbook 定义"验证什么"，instruction 定义"怎么跑"。
