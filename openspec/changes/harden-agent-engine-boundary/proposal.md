## Why

Agent 和 Engine 的边界当前仍依赖隐式约定：Agent 产出靠目录形状被发现，delegated task 是否真的经过 Sub-agent/Relay 缺少可验证 provenance，gate 可以被未声明的 reference 文件影响，trace 又分散在多个 sink。两个已发生的 P0 事件（Bug #001 虚假 reference 文件绕过 gate；Bug #002 Phase Agent 跳过 Sub-agent 自己做搜索）说明软约束不够。

本 change 的方向是把边界收紧到 Engine 可执法的事实：Relay 提交的 slot result、runtime receipt、Agent output declaration，以及 bundle-level declaration ledger。`--actor` 字符串和 task card 目录扫描都不能作为信任根。

## What Changes

- **保留现有 TargetSpec wire contract**：delegated queue task 仍使用 `targets.controller: "main-agent"`，并以 `targets.delegates.to: "sub-agent"` 表示必须委托。不会把 `controller` 改成当前 schema 不支持、概念也混乱的 `"sub-agent"`。
- **新增 Agent 产出声明**：Sub-agent 的 `result.json` 必须包含 schema-validated 的 `output_files[]` 与 `cache_trails[]`。`cache_trails[]` 是 leaf source directory，例如 `_cache/wave0/primary/01_topic/s01_source/`，每个 leaf 必须含 `websearch.json`、`page.md`、`meta.json`。
- **新增 declaration ledger/index**：`complete()` 在 delegated task 成功校验后写入 bundle 根的 `rb_output_declarations.jsonl`。该 ledger 是 downstream gate 读取 Agent 产物的唯一发现面。
- **强化 delegated `complete()`**：delegated task 完成时必须同时具备已提交 relay slot result、有效 runtime receipt、`output_files[]`、`cache_trails[]`、声明文件存在、cache leaf 完整；任一缺失都拒绝完成。
- **新增 content_dedup gate 规则**：实现 Jaccard 相似度、URL 去重、首页检测、自指语言检测。gate 只从 `rb_output_declarations.jsonl` 读取 `role=reference` 的声明，不扫描 `reference/` 目录发现产物。
- **新增 engine-boundary 实验家族**：case-401~405 作为 Engine/runtime 层 light/standard 实验；case-406 作为真实 Sub-agent/WebSearch/WebFetch 路径。每个 playbook 必须写 Reality Distance Ledger。
- **统一 trace 文件**：queue、relay、gate、playbook verdict 统一写 bundle 根 `rb_trace.jsonl`。同时更新 accepted specs、playbook schema/tests、README/RUN_EXPS、timeline inspector，避免只做机械文本替换。
- **新增长期防御**：`DPT_FRAMEWORK/cli/validate-bundle.mjs` 检查关键 gate rule ID；`validate-phase-templates.mjs` 检查 delegated task 模板保持 `controller: "main-agent"` + `delegates.to: "sub-agent"`。
- **关联文档辐射更新**：同步 phase docs、subagent protocol、anti-cheating rules、guidelines、COMMANDS，让 Sub-agent 产出声明、Relay provenance、ledger 消费成为明确合同。

## Capabilities

### New Capabilities

- `agent-output-declaration`：结构化 Agent 产出声明与 `rb_output_declarations.jsonl` ledger，定义 production/experiment 的汇聚点。
- `gate-content-dedup`：content_dedup gate 规则，从 declaration ledger 读取 reference 声明并执行去重/造假检测。
- `experiment-ref-integrity`：engine-boundary 实验家族，覆盖 Engine 层确定性验证、trace 单 sink guard 和真实 Sub-agent/WebSearch/WebFetch 全链路验证。

### Modified Capabilities

- `agentic-queue`：保留 `TargetSpec` 现有 controller enum；delegated task completion 改为由 relay provenance + declaration ledger + cache leaf 完整性执法。
- `trace-writer`：统一 trace sink 到 `rb_trace.jsonl`，并同步 accepted specs 和实验基础设施。
- `research-wave-gate-implementation`：wave0/wave1-complete gate definition 增加 `content_dedup` 规则。

## Impact

- **Engine 层**：`subagent-relay.mjs` 扩展 SlotResult schema 与 JSON Schema；`queue-manager.mjs` 在 `complete()` 校验 relay provenance、runtime receipt、declaration、cache leaf 并写 ledger；`gate-helpers.mjs` 读取 ledger 做 content_dedup；trace 写入统一到 `rb_trace.jsonl`。
- **CLI 层**：`operate-queue complete` 传递 relay/declaration 结果；gate CLI dispatch `content_dedup`；`inspect-bundle.mjs --timeline` 读取统一 trace；新增 `validate-phase-templates.mjs`。
- **Schema 层**：queue schema 继续拒绝 `controller: "sub-agent"`；SlotResult / generated `result.schema.json` 同步包含 `output_files[]` 和 `cache_trails[]`；新增 declaration ledger schema；playbook schema/tests 更新 trace 路径。
- **Workflow 层**：phase-wave0/1 的 delegated task 模板保持 `controller: "main-agent"` 并保留 `delegates.to: "sub-agent"`；Sub-agent prompts 要求返回声明；Phase Agent 通过 Relay collect 后调用 `complete()`，不直接 claim/执行搜索工作。
- **Experiment 层**：新增/收紧 6 个 playbook（`experiments_playbook/exp_engine-boundary/case-40[1-6]-*.md`）；case-401~405 标注 fixture-backed Engine/runtime 证明范围；case-406 标注真实 Sub-agent actor、真实 WebSearch/WebFetch、真实 `_cache/` 写入。
- **Guidelines/Governance 层**：更新 agentic queue/subagent/command experiment guidance、shared protocol、anti-cheating rules、COMMANDS、req registry，并运行 OpenSpec/governance checks。
