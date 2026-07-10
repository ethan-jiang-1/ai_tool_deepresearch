## Why

来源：`_backlog/bugs/BUG-069-silent-autonomous-execution-unreachable-contract-not-self-sufficient.md`、`BUG-073-wave2-finding-index-contract-unreachable-without-engine-source.md`、`BUG-075-wave1-gate-contract-wall-provenance-format-ref-floor.md`。当前 Wave0/Wave1/Wave2 的正式 gate 与 mid-wave inspect 分别维护近似判断；同一事实会漂移，前置结构缺失会被放大成大量派生失败，表现层 Markdown 差异也可能被误当成 authority blocker。

这个 change 采用最短可靠控制链：正式 gate 与 inspect 复用同一份纯 artifact/provenance 判断；生命周期、副作用和 degraded handoff 仍只属于正式 gate；前置失败只返回最小可修复根因。目标不是建设更通用的 controller，而是删除重复判断、缩短反馈路径，让 Phase Agent 不读 Engine source 也能修复。

## What Changes

- 从 Wave0/Wave1/Wave2 formal gate 中分别抽取显式、只读的 artifact/provenance evaluator；formal gate wrapper 与 inspect CLI 调用同一 evaluator，不给 gate CLI 增加 dry-run/inspect flag。
- 明确边界：evaluator 只判断直接 artifact、submitted provenance、required structured fields 和显式 profile floors；node binding、handoff preflight、routing、degraded pass、gate-attempt durability、checkpoint、`trace_event_*` 和 durable diagnostics 仍只在 formal gate wrapper。
- 把 delegated-bypass 检测拆成纯扫描与 formal-only durable emission；每次 formal gate invocation 最多写一次 bypass trace/log，inspect 只读不写，并删除 gate 当前的重复 post-loop 检测。
- 复审 Wave rules：authority、provenance、required semantic structure、consumer navigation contract 和 explicit floors 保持 blocking；已接受的 inspect-only navigation blocker 保持原分类；纯表现/维护偏好改为宽容解析或 advisory。
- 对 Wave1 depth-review 与 Wave2 finding-index 使用局部 prerequisite guard；缺失或不可解析 parent 时，不继续制造 novelty、cache、enum、eligibility、handoff、backing 等依赖症状。
- 保留 inspect 现有 `{ check, inspect, advice }`、exit code 和 summary 字段；增量增加 machine-readable failed rule 与 finding classification。Inspect 始终返回 raw contract result，不应用 formal gate 的 degraded pass。
- 更新 Wave phase/shared guidance 的 canonical role、path、ref、field、enum 与 inspect 时机；不复制 validator 实现，不新增 schema 生成系统、通用 artifact controller、auto-normalize 或依赖。
- Framework behavior changes require a version bump; target version: `v0.17`.

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `cli-inspect-output-conventions`: Wave inspect 复用 formal artifact/provenance evaluator，保留现有输出兼容面，并明确 side-effect-free、raw-result 与 finding classification。
- `research-wave-gate-implementation`: 关闭 producer/authority/checker/diagnostic/guard 链，拆分 bypass 扫描副作用，精简 brittle presentation blockers，并短路依赖性级联诊断。
- `research-wave-phase-content`: Wave phase 在 completion evidence 与 formal gate 前调用对应 inspect，并保持 producer guidance 与 gate-consumed contract 自足一致。
- `check-inspect-feedback`: primary feedback 返回最小独立根因集和一个最近修复动作，完整下游细节不再形成 flat contract wall。

## Impact

- 预计影响 `DPT_FRAMEWORK/cli/gates/check-gate-wave{0,1,2}-complete.mjs`、`DPT_FRAMEWORK/cli/inspect-wave{0,1,2}-output.mjs`、Wave depth/finding/provenance helpers、gate rule definitions、phase/shared Markdown、gate-rule audit 与相关 root-level regression tests。
- 不新增 formal blocking contract；既有 direct authority/provenance/floor 行为先由 baseline tests 锁定。仅明确列出的 presentation tolerance、root-cause suppression、inspect purity 和 additive output fields 允许改变。
- Formal gate 继续是 routing、degraded handoff 和 durable witness authority；inspect 不产生 gate witness，不参与 phase routing，不因 fatigue 转为 pass。
- 本 change 应先于 `fail-fast-on-missing-research-access` (`v0.18`) 与 `put-continuation-cues-at-decision-points` (`v0.19`) apply；新增 `failed_rule_ids` 等字段保持 additive，供后续 decision-point cue 读取而不改变 gate verdict。
- 不新增 npm 依赖，不使用 Python，不把 semantic research quality 移入 JavaScript。
