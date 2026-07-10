## Why

来源：`_backlog/bugs/BUG-069-silent-autonomous-execution-unreachable-contract-not-self-sufficient.md`、`BUG-073-wave2-finding-index-contract-unreachable-without-engine-source.md`、`BUG-075-wave1-gate-contract-wall-provenance-format-ref-floor.md`。当前 Wave1/Wave2 的 phase-owned artifact 检查既有重复 surface，又会把一个前置缺口放大成大量格式/派生症状；Agent 往往到正式 gate 才看到 contract wall，且需要读 Engine source 才能区分根因。

这个 change 先删减脆弱 blocking rule，再让 mid-wave inspect 与正式 gate 复用同一套直接检查，使质量控制链比被检查对象更简单、更可修复。

## What Changes

- 复审 Wave1/Wave2 gate rules：authority、provenance、required structured fields、explicit profile floors 保持 blocking；纯表现格式改为宽容解析或 advisory。
- 前置结构或 authority 缺失时短路依赖检查，primary `inspect[]` 只返回最小可行动根因；完整细节可保存在 durable diagnostics。
- 为 Wave0/Wave1/Wave2 gate 增加 side-effect-free inspect mode，复用正式 gate rule evaluator，但不执行 handoff、routing、degraded pass、gate attempt、trace/checkpoint 写入。
- 让 `inspect-wave0/1/2-output.mjs` 的 blocking 结论来自同源 gate checks；phase Markdown 在正式 completion/gate 前运行对应 inspect。
- 修正 Wave2 Agent-facing 文档中 finding 字段数量等可见漂移，不再新增一份独立 validator prose。
- 不引入 schema 生成系统、通用 artifact controller、更多 auto-normalize 或新的依赖。
- Framework behavior changes require a version bump; target version: `v0.17`.

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `cli-inspect-output-conventions`: wave inspect 的 blocking 结果改为复用正式 gate checks，并明确 side-effect-free 行为与 finding 分类。
- `research-wave-gate-implementation`: 精简 blocking rule、区分 presentation advisory、短路依赖性级联诊断。
- `research-wave-phase-content`: Wave phase 在正式 gate 前调用同源 inspect，并保持 producer guidance 与必要 structured contract 可达。
- `check-inspect-feedback`: primary feedback 返回最小根因集，避免前置失败继续制造大量下游症状。

## Impact

- 预计影响 `DPT_FRAMEWORK/cli/gates/check-gate-wave{0,1,2}-complete.mjs`、`DPT_FRAMEWORK/cli/inspect-wave{0,1,2}-output.mjs`、shared gate helpers、Wave phase/shared schema Markdown、相关 regression tests。
- 正式 gate pass/fail authority 不变；inspect mode 不产生 gate witness，不参与 phase routing。
- 不新增 npm 依赖，不使用 Python，不把 semantic research quality 移入 JS。
