# COMMANDS

Deep Research Framework 命令索引。

> **最快触发**：把 `RUN.md` 拖进对话即触发框架（前门入口）。

## 实例化与开始 Research
| 命令 | 文件 | 说明 |
|------|------|------|
| run（drag-trigger） | RUN.md | 把本文件拖进对话即触发框架的前门入口 |
| instantiate-run-bundle | command_playbook/instantiate-run-bundle.md | 生产新的 Runtime Bundle |
| start-research | command_playbook/start-research.md | 从零开始一次完整的 Deep Research（创建 bundle → 写问题 → 加载第一个 phase） |

## Subagent 环境
| 命令 | 文件 | 说明 |
|------|------|------|
| setup-real-subagents | command_playbook/setup-real-subagents.md | 设置 Codex/Claude Code 项目级 real subagent 定义 |

## 质量检查
| 工具 | 文件 | 说明 |
|------|------|------|
| validate-bundle.mjs | cli/validate-bundle.mjs | Zod 校验 bundle 控制文件 |
| validate-phase-templates.mjs | cli/validate-phase-templates.mjs | 校验 phase MD 模板保持 controller + delegates 合约 |
| inspect-bundle.mjs | cli/inspect-bundle.mjs | bundle 目录结构完整性 |
