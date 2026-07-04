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
| drive-relay-slot.mjs | cli/drive-relay-slot.mjs | 驱动 relay slot 生命周期（`stage`/`commit`/`merge`，SNC-003 唯一 runtime 路径；replacement 补位用 `stage --slot-index M --role ... --key ... --task ...`） |
| provenance-forensics-guide | command_playbook/provenance-forensics-guide.md | 事后判定 subagent 证据 provenance 真伪（S0–S5 信号 + 6-tier 矩阵） |

## 质量检查
| 工具 | 文件 | 说明 |
|------|------|------|
| validate-bundle.mjs | cli/validate-bundle.mjs | Zod 校验 bundle 控制文件 |
| validate-phase-templates.mjs | cli/validate-phase-templates.mjs | 校验 phase MD 模板保持 controller + delegates 合约 |
| validate-subagent-logging-contract.mjs | cli/validate-subagent-logging-contract.mjs | 校验 phase/role/protocol MD 的 subagent logging 契约与 driver-first 措辞（含直调反模式检测） |
| inspect-bundle.mjs | cli/inspect-bundle.mjs | bundle 目录结构完整性 |
