---
title: Two-Level Specs Categorization
status: draft
created: 2026-08-06
---

# Two-Level Specs Categorization

## Problem

`openspec/specs/` 目前有 84 个 capability，全部平铺在一级目录下：

```
openspec/specs/agent-command-surface/spec.md
openspec/specs/agent-context-routing/spec.md
...
openspec/specs/workflow-node-contract/spec.md
```

`openspec/config.yaml` 本身已经声明 `目录名即分类`，但还是单层扁平结构。随着 capability 数量持续增长（已从早期的 30+ 增长到 84），平铺结构让 Agent 和人都难以快速定位相关 spec。

目标：引入二级目录分类 —— `openspec/specs/<category>/<capability>/spec.md`，大类套小类，今后新增 capability 归入已有或新增大类即可。

## 分类方案

大类不应过多（目标 6-8 个），每个大类下 5-20 个 capability，语义内聚。

### 1. `agent` — Agent 基础设施与契约 (12)

Agent actor、sub-agent dispatch、work unit、queue 等 Agent 侧运行时契约。

| capability | 前缀 | 说明 |
|---|---|---|
| agent-command-surface | ACS | Agent 命令表面与受众契约 |
| agent-context-routing | ACR | Agent 上下文路由 |
| agent-output-declaration | AGO | Agent 输出声明 ledger |
| agent-testing | AGT | Agent 辅助测试 playbook |
| agentic-queue | AGQ | 结构化队列与任务卡 |
| cmd-subagent-environment | CSE | Sub-agent 环境搭建 playbook |
| delegated-work-units | DEW | 委托工作单元 pipeline |
| subagent-directory-contract | SDC | Sub-agent 目录契约 |
| subagent-dispatch | SUD | Sub-agent 分发 |
| subagent-node-contract | SNC | Sub-agent 角色契约 |
| subagent-runtime-logging | SRL | Sub-agent 运行时日志 |
| work-unit-provenance-gate | WPG | 工作单元溯源 gate |

### 2. `cli-engine` — CLI 与确定性引擎 (12)

Engine、schema、logger、trace、CLI 约定等确定性 JS 侧基础设施。

| capability | 前缀 | 说明 |
|---|---|---|
| check-inspect-feedback | CHI | C&I 反馈闭环 |
| cli-exit-code-conventions | CLE | CLI 退出码约定 |
| cli-inspect-output-conventions | IOC | inspect CLI 输出约定 |
| cli-phase-transition | CPT | 阶段状态推进 CLI |
| framework-engine | FRE | 框架 engine 模块布局 |
| logger | LOG | Logger 零配置用法 |
| logging-conventions | LOC | 日志约定 |
| queue-input-validation | QIV | 队列输入校验 |
| runtime-reentry-debuggability | RRD | 运行时重入诊断 |
| schema-core | SCO | 核心 schema 枚举与合约 |
| trace-writer | TRW | 追加式 JSONL trace |
| transition-table | TRT | 显式状态转换表 |

### 3. `bundle` — Bundle 生命周期与文件系统 (10)

Bundle 创建、隔离、持久化、缓存、文件可观测性等运行时目录契约。

| capability | 前缀 | 说明 |
|---|---|---|
| artifact-persistence-recovery | ARP | 崩溃安全持久化工作区 |
| bundle-data-isolation | BUI | 多 bundle 共存隔离 |
| bundle-map | BUM | 被动 bundle map |
| bundle-start-from-here | BUS | 旧版入口（已废弃） |
| cache-raw-web-content | CRC | 标准化 _cache/ 目录 |
| cmd-bundle-instantiation | CMI | Bundle 生产 playbook |
| file-observability | FIO | 文件可观测性审计 |
| reference-flat-format | REF | 扁平 reference 目录格式 |
| run-entry | RUE | RUN.md 入口 |
| version-management | VEM | 版本管理与 CHANGELOG |

### 4. `research` — 研究阶段与门控 (22)

Pre-research、Wave0/1/2、种子话题、证据提取、内容交付、最终报告等研究生命周期。

| capability | 前缀 | 说明 |
|---|---|---|
| canonical-topic-state | CTS | 正典话题状态 |
| content-delivery-experiments | CDE | 内容交付实验 |
| content-delivery-gate-implementation | CDG | HITL2/readiness gate |
| content-delivery-phase-content | CDP | HITL2/readiness/final phase body |
| evidence-extraction | EEX | 证据计数与 ref 提取 |
| final-delivery-backing | FDB | 最终报告证据 backing |
| plan-hostfile-sections | PHS | rb_plan.md 结构与节 |
| post-final-recovery | POF | 最终后恢复路径 |
| pre-research-experiments | PRE | Pre-research 实验 |
| pre-research-gate-implementation | PRG | Pre-research gate 规则 |
| pre-research-phase-content | PRP | Pre-research phase body |
| research-access-adapter | REA | 研究访问适配器 |
| research-return-map | RRM | 证据-声明 map |
| research-styles | RES | 研究风格参数 |
| research-wave-experiments | RWE | Wave 实验 |
| research-wave-gate-implementation | RWG | Wave gate 规则 |
| research-wave-phase-content | RWP | Wave phase body |
| seed-topic-materialization | STM | 种子话题物化 |
| user-research-controls | URC | 用户研究控制 |
| wave0-artifacts-directory | WAD | Wave0 产物目录 |
| wave1-intake | WAI | Wave1 摄入阶段 |
| wave2-synthesis | WTS | Wave2 综合阶段 |

### 5. `experiment` — 实验基础设施 (5)

Autorun、可观测性、ref 完整性、运行策略、共享基础设施。

| capability | 前缀 | 说明 |
|---|---|---|
| experiment-agent-autorun | EXA | Agent 实验 Autorun |
| experiment-observability | EXO | 实验运行后健康报告 |
| experiment-ref-integrity | EXR | 实验 ref 完整性 |
| experiment-run-strategy | ERS | 实验运行策略 |
| experiment-shared-infra | EXS | 实验共享基础设施 |

### 6. `gate` — Gate 基础设施 (4)

Gate skeleton、状态机、fork 路由、内容去重等 gate 相关独立能力。

| capability | 前缀 | 说明 |
|---|---|---|
| gate-content-dedup | GAC | 内容去重 gate（全系废弃） |
| gate-fork-router | GAF | Gate 分支分类与解析 |
| gate-skeleton | GSK | Gate 定义骨架与 CLI |
| gate-state-machine | GAS | Gate 检查点反馈与转换 |

### 7. `workflow` — 工作流结构与节点 (10)

Workflow 目录契约、节点元数据、动态加载、条件节点、静默执行、修复循环等。

| capability | 前缀 | 说明 |
|---|---|---|
| conditional-nodes | COS | 确定性分支检查点 |
| dynamic-node-loading | DYS | 显式 fileRef Markdown 加载 |
| fork-repair-converge | FOR | 多失败共享修复检查点收敛 |
| playbook-runner | PLR | Playbook Agent 入口 |
| repair-loop | REL | 修复检查点回环 |
| rerun-incremental-node | REI | 阶段重跑节点 |
| rerun-topic-integration | RTI | 重跑话题集成 |
| shared-node-content | SHC | 共享节点内容 |
| silent-wave-execution | SWE | 静默 wave 执行 |
| workflow-directory-contract | WDC | Workflow 目录契约 |
| workflow-node-contract | WNC | Workflow 节点契约 |

### 8. `governance` — 项目治理与元规范 (9)

需求追踪、变更反馈、guidance 宪章、HITL UX、测试分类、验证路由等跨横切关注点。

| capability | 前缀 | 说明 |
|---|---|---|
| change-feedback-loop | CHF | Change 反馈生命周期 |
| guidance-constitution | GCO | Guidance 宪章 |
| hitl-ux | HIU | HITL 对话循环模型 |
| integration-tests | INT | 集成测试 |
| local-deepseek-claude-launcher | LDC | 本地 Launcher |
| requirement-traceability | RET | 需求追踪 |
| test-fixtures | TEF | 测试 Fixture 框架 |
| verification-routing | VER | 验证路由四类分类 |

总计: 12+12+10+22+5+4+11+9 = 85（含 `local-deepseek-claude-launcher` 计数微调；部分 capability 如 `local-deepseek-claude-launcher` 本质是 host 工具，放在 governance 或独立分类均可，后续讨论确定）

## 影响面

### 需要修改的文件

| 文件 | 变更内容 |
|---|---|
| `openspec/config.yaml` | L237 `specs/<capability>/spec.md` → `specs/<category>/<capability>/spec.md` |
| `openspec/governance/req-registry.yaml` | `prefixes:` 映射和组头注释可能需要标注 category，但不强制 |
| 84 个 spec 目录 | `git mv openspec/specs/<cap> openspec/specs/<category>/<cap>` |

### 不需要修改的文件（已验证兼容）

| 文件 | 原因 |
|---|---|
| `openspec/governance/check-project-specs.mjs` | 已递归扫描 `specsDir`，自动适配任意嵌套深度 |
| `openspec/governance/check-project-reqs.mjs` | 扫描 `specs/` 和 `changes/`，不依赖目录深度 |
| `openspec/changes/archive/*` | 历史归档，不修改 |
| `tests/` 下的测试文件 | 不直接引用 spec 路径；通过 OpenSpec 工具间接访问 |
| `DEEP_RESEARCH_HARNESS/` | 不引用 spec 路径 |

### config.yaml 措辞调整

当前 L237:
```
Capability 用 kebab-case 命名，目录名即分类
```

改为:
```
Capability 用 kebab-case 命名，二级目录结构：<category>/<capability>/spec.md
Category（大类）用于粗粒度分组（如 agent、research、bundle），capability（小类）是行为契约的最小单元
```

L240:
```
openspec/specs/<capability>/spec.md
```

改为:
```
openspec/specs/<category>/<capability>/spec.md
```

## 迁移策略

### Phase 1: 确定分类

1. 以本 plan 的分类方案为起点
2. 逐个 capability review，确保归属合理
3. 对归属模糊的 capability（如 `local-deepseek-claude-launcher`、`fork-repair-converge`、`queue-input-validation`），讨论后确定
4. 输出最终 mapping（YAML 或 CSV，放入 `_backlog/plans/` 作为迁移脚本输入）

### Phase 2: 执行迁移

```bash
# 为每个 category 创建目录
mkdir -p openspec/specs/{agent,cli-engine,bundle,research,experiment,gate,workflow,governance}

# 逐个 git mv
git mv openspec/specs/agent-command-surface openspec/specs/agent/agent-command-surface
# ... (批量执行)
```

迁移脚本从 mapping 文件读取，自动化执行全部 `git mv`。

### Phase 3: 更新引用

1. 更新 `openspec/config.yaml` 路径描述
2. 运行 `node openspec/governance/check-project-specs.mjs` 确认 PASS
3. 运行 `node openspec/governance/check-project-reqs.mjs` 确认 PASS
4. 运行 `openspec validate` 确认 PASS（如果 OpenSpec 工具支持二级目录）

### Phase 4: 验证

- `git status` 确认所有变更都是 `renamed:` 操作
- 两个 governance check 脚本 PASS
- 抽样检查几个 spec 的 `> req:` 头完整

## 风险与注意事项

1. **OpenSpec 工具兼容性**: 当前使用的 `@fission-ai/openspec` 版本是否原生支持二级目录需要验证。如果不支持，可能需要先升级 OpenSpec 工具链。
2. **Active changes 的中断**: 迁移时如果有 active change 引用了 spec 路径（delta spec 放在 `openspec/changes/<name>/specs/<capability>/spec.md`），delta 路径不需要改动 —— delta spec 保持与 main spec 相同的 `<capability>` 叶子名即可，OpenSpec archive 时自动同步到正确位置。
3. **Config.yaml 是唯一硬编码路径的地方**: 其余工具均为递归扫描，天然兼容深层目录。这是好消息。
4. **大类命名**: `cli-engine` vs `engine`、`research` 囊括了 22 个 capability（是否需要拆分？）、`governance` 是否语义准确 —— 这些都需要讨论后敲定。
5. **git history**: `git mv` 保留文件历史，但 `git log --follow` 跨目录重命名可能需要 `--follow` 参数。

## 决策待定

- [ ] 大类命名最终确定
- [ ] `research` 是否拆分为 `research-phase` + `research-delivery`（22 个偏多）
- [ ] `local-deepseek-claude-launcher` 归属（host 工具，放在 governance 或独立 `host` 类？）
- [ ] `queue-input-validation` 归属（bundle 还是 cli-engine？）
- [ ] `fork-repair-converge` 归属（workflow 还是 gate？）
- [ ] `integration-tests` 和 `test-fixtures` 是否合并为 `testing` 大类
- [ ] 迁移时机：是否有 active change 正在进行中，需要等归档后再迁移
- [ ] 是否作为 OpenSpec change 走 `/opsx:propose → apply → archive` 流程，还是直接执行（因为不涉及 `DEEP_RESEARCH_HARNESS/` 代码变更）
