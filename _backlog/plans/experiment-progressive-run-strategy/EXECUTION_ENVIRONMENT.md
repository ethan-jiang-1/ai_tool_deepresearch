# Execution Environment Reference

> 别让下回跑糊涂了。每个 case 需要什么 host runtime，写清楚。

## 两种 Host Runtime

| | Headless | Interactive |
|--|----------|-------------|
| CLI 命令 | `--tier <tier> --max-total-budget-usd <N>` | `--interactive --case <id>` |
| Playbook Agent | `claude -p --permission-mode bypassPermissions` | 正常 claude session |
| 后端 | DeepSeek（`.env` 配置） | DeepSeek（`.env` 配置） |
| Subject Agent | spawn 独立 `claude -p` 子进程 | spawn 独立 claude session |
| WebSearch/WebFetch | ❌ 子进程拿不到 | ✅ |
| 适用 | `deterministic_contract` cases | `agent_behavior` cases |

## 按 proof_subject 分流

### `deterministic_contract`（~81 cases）→ Headless ✅

不需要真实 Agent。纯 JS/CLI/gate/filesystem。用 `--tier` 或 `--case` 跑。

```bash
node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs --tier light --max-total-budget-usd 5
node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs --tier standard --max-total-budget-usd 5
```

### `agent_behavior`（~20 cases）→ 分两拨

#### 能在 Headless 跑的（14 cases）✅

这些 case 的 Subject Agent 不需要 WebSearch/WebFetch，或者用 `--dangerously-skip-permissions` 能在 headless 子进程里跑通：

| Cases | 实验 | 备注 |
|-------|------|------|
| 163, 164 | evidence-extraction | 需要 real agent 但工具集不含 WebSearch |
| 204 | wfn-seedtopic | |
| 211, 221, 223, 225 | wfn-wave0/1 | |
| 234 | wfn-wave2 | CANCELLED（被 kill，非 case 问题） |
| 318 | wfn-rerun | |
| 406 | engine-boundary | |
| 604, 605 | autonomous-research | |
| 711 | iterative-interaction | ✅ PASS CLEAN |

#### 必须 Interactive 跑（6 cases）🔵 NOT_RUN

**根因：Subject Agent 需要 WebSearch/WebFetch，Headless 子进程无法提供。**

| Case | 实验 | 失败原因 |
|------|------|----------|
| 115 | wff-pre-research-repair | Subject Agent 不用 `--dangerously-skip-permissions`（设计如此），WebSearch 需交互授权 |
| 232 | wfn-wave2 | Subject Agent 需要 `real external search` |
| 712 | iterative-interaction | Subject Agent runtime 在 headless 子进程不可用 |
| 714 | iterative-interaction | 同上 |
| 715 | iterative-interaction | 基础设施未就绪（helper 不支持）+ Subject Agent 不可用 |
| 951 | workflow-foundation | AI-judge 需要独立 reviewer 进程 |

**正确跑法：**
```bash
# 逐个 interactive 跑
node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs --interactive --case case-115-heavy-hitl1-research-access-probe
node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs --interactive --case case-232-heavy-finding-triage
# ... 以此类推
```

## Budget 建议

| 速度档 | Headless budget | Interactive budget | 备注 |
|--------|----------------|-------------------|------|
| Sprint（~30s） | $2 | — | deterministic 不用 interactive |
| Standard（~200s） | $5 | — | |
| Marathon（~500s） | $8 | $5 | interactive 更快（无 retry overhead） |
| Extreme（~1000s+） | $15 | $10 | |

## 文件位置

| 文件 | 内容 |
|------|------|
| `SPEED_INDEX.md` | 按速度分档的完整 case 清单 |
| `MASTER_SUMMARY.md` | 全局汇总 |
| `EXECUTION_ENVIRONMENT.md` | 本文件 — host runtime 说明 |
