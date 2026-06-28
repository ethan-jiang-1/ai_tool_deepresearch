## Why

Agent 和 Engine 之间的边界当前依赖隐式约定——Engine 通过 `glob/readdir` 扫描文件系统来"发现" Agent 产出，gate 缺少跨文件内容去重检查，`claim()` 不校验 actor，trace 散落在 4 份文件里。这导致两个已发生的 P0 事件：Bug #001（46/52 个虚假 reference 文件绕过 gate，来源 `_backlog/bugs/001-fake-reference-files-gate-bypass.md`）和 Bug #002（Phase Agent 跳过 Sub-agent 自己做搜索，`_cache/` 完全为空，来源 `_backlog/bugs/002-task-card-controller-allows-bypassing-subagent.md`）。上次修复（ce6be275）全部是软约束，被轻松绕过。现在趁三个 Plan（`_backlog/plan/`）的设计刚完成，把边界从软变硬。

## What Changes

- **新增 Agent 产出声明**：Sub-agent 必须以结构化、schema-validated 的 `output_files[]` + `cache_trails[]` 声明其文件产出。Engine 消费声明做检查，不再通过扫描目录"发现"产出。生产和实验在这个声明处走完全相同的代码路径。
- **新增 content_dedup gate 规则**：实现 5 个函数（Jaccard 相似度、URL 去重、首页检测、自指语言检测），加入 wave0/1-complete gate definition。从"堵具体手段"变为"堵结果类别"。
- **新增 complete() cache trail 校验**：对 delegated task，`complete()` 强制检查 `_cache/` 下每目录 3 文件（websearch.json + page.md + meta.json），4 种边界均覆盖。
- **新增 claim() controller 校验**：`operate-queue claim --actor sub-agent` 必须匹配 task card 的 `targets.controller`。Phase Agent 不能 claim 搜索类 task（堵 Bug #002 根因）。
- **新增 ref integrity 实验家族**：6 个实验（case-12 到 case-17），分 Engine 层（2 个 light，无 Agent）和 Agent 层（4 个 heavy/standard，真实 Sub-agent + WebSearch），验证边界在各种压力下能扛住。
- **统一 trace 文件**：消灭 `_logs/_trace_agq_cli.jsonl`、`_logs/_trace_subagent.jsonl`、`_logs/_trace.jsonl`，全部合并到 `rb_trace.jsonl`。
- **改动 task card 模板**：phase-wave0/1/2.md 中所有 `delegates.to: "sub-agent"` 的搜索类 task，`controller` 从 `"main-agent"` 改为 `"sub-agent"`（**BREAKING**：Phase Agent 不能再 claim 此类 task）。
- **新增长期防御**：`validate-bundle.mjs` 加 required gate rule ID 检查；新建 `validate-phase-templates.mjs` 验证 task card 模板关键字段不被意外改动。

## Capabilities

### New Capabilities
- `agent-output-declaration`：结构化 Agent 产出声明合同——`output_files[]` + `cache_trails[]` schema，Engine 消费声明而非扫描目录，生产和实验的汇聚机制
- `gate-content-dedup`：内容去重 gate 规则——Jaccard 相似度、URL 去重、首页域名检测、自指语言检测，5 个 check 函数
- `experiment-ref-integrity`：ref integrity 实验家族——case-12 到 case-17 共 6 个 playbook，覆盖 Engine 层确定性验证和 Agent 层全链路验证

### Modified Capabilities
- `agentic-queue`：`claim()` 增加 `--actor` 与 `targets.controller` 匹配校验；`complete()` 增加 delegated task 的 `_cache/` trail 强制检查
- `trace-writer`：消灭 `_logs/_trace_agq_cli.jsonl`、`_logs/_trace_subagent.jsonl`、`_logs/_trace.jsonl`，只保留 `rb_trace.jsonl` 作为唯一 trace 文件
- `research-wave-gate-implementation`：wave0-complete 和 wave1-complete gate definition 增加 `content_dedup` 规则

## Impact

- **Engine 层**：`gate-helpers.mjs`（新增 5 个 dedup 函数）| `queue-manager.mjs`（`QUEUE.TRACE` 常量改路径，`complete()` 加 cache 检查，`claim()` 加 controller 校验）| `subagent-relay.mjs`（`SlotResult` schema 加 `output_files` + `cache_trails`，trace 路径统一）
- **CLI 层**：`operate-queue.mjs`（claim 支持 --actor 校验）| `check-gate-wave0-complete.mjs`、`check-gate-wave1-complete.mjs`（加 content_dedup dispatch）| `inspect-bundle.mjs`（--timeline 简化，少读 2 个 trace sink）| 新建 `validate-phase-templates.mjs`
- **Schema 层**：gate definition JSON（wave0/1-complete 加 content_dedup 规则）| `subagent-relay.mjs` SlotResult schema 扩展
- **Workflow 层**：phase-wave0/1/2.md（task card 模板 controller 改为 "sub-agent"，Sub-agent prompt 加 `output_files` 要求）
- **Experiment 层**：新增 6 个 playbook 文件（`experiments_playbook/exp_ref_integrity/case-1[2-7]-*.md`）| `wff-playbook-utils.mjs`（默认 trace 路径改为 `rb_trace.jsonl`）| ~30 个现有 playbook trace 路径机械替换
- **Governance 层**：`validate-bundle.mjs`（加 required gate rule ID 检查）| `req-registry.yaml`（登记 AGO、GAC、EXR 前缀和新 requirement ID）
