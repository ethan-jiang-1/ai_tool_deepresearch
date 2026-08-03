## Why

`_backlog/plans/experiment-progressive-run-plan.md` 的 P4.5 保留了 case-115 的
`surface_absent` 边界：已选择的 research-access adapter 声明 `WebSearch` /
`WebFetch`，但共享 DeepSeek child environment 和独立 Subject settings 都把
`ENABLE_TOOL_SEARCH` 固定为 `false`。一次与正式 provider routing 相同、仅临时启用
该开关的受限 host probe 已实际暴露 `WebSearch`，因此这是本地 launcher configuration
与已接受 adapter contract 的直接矛盾，而不是应持续重试的外部不可用结论。

该变化服务的读者是需要判断“所选 host 是否允许 Agent 开始已声明的最小 research probe”
的 Phase Agent 和运行维护者。它只保留两个会改变该答案的区别：launcher 是否暴露可请求的
工具表面，以及一次真实 search/fetch 是否已证明可用性。前者由 launcher configuration
解决；后者仍只能由当前 bundle 的真实 Subject evidence 解决。因而读者在看到可请求工具后
仍会正常停在现有 bounded probe / Gate，而不会把环境变量当作 available claim。

## What Changes

- 将 selected DeepSeek/Claude child environment 的 launcher-owned
  `ENABLE_TOOL_SEARCH` 固定值改为 `true`，同时继续清除继承值并禁止 caller extra env
  覆盖 provider routing 或该固定值。
- 让独立 iterative Subject 创建新的 tool-owned `v2` 临时 Claude settings，并使用同一
  启用值，避免已存在的 `v1` settings 缓存继续让 case-owned Subject 与共享 launcher 对
  declared research surface 产生漂移。
- 增加确定性 launcher/Subject configuration coverage，证明启用值会进入实际 Claude
  invocation plan，同时保留 generic non-bypass、credential isolation 和不把工具名称视为
  provider availability proof 的边界。
- 以 `v0.68` 更新 framework release projection，并在修复后通过既有 `assurance` profile
  的显式 case-115 scope 做一次 bounded real verification；该 invocation 只有一个已声明
  case、明确 duration/budget/timeout 上限，并在一个终态后停止。它不改变 profile、预算、
  timeout、fallback、Gate 或 evidence semantics。

这是最短合法闭环：已选 adapter contract -> launcher exposes tool-discovery surface -> Agent
执行既有 bounded case-115 probe -> existing profile observation -> existing Gate。显式 assurance
scope 删除了 discovery inventory 轮转这个与该 claim 无关的消耗，而没有新增 provider registry、
capability state、preflight checker、retry service 或 alternate route；Engine 继续只裁决现有
schema/Gate，Agent 继续拥有 search/fetch 和语义判断，用户不需要执行普通修复命令。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `local-deepseek-claude-launcher`: Selected production Claude child environments
  enable the tool-discovery setting needed for the already-declared native research
  tool surface, while preserving isolation and non-bypass launcher constraints.

## Impact

- Affected code: `DPT_FRAMEWORK/host_tools/lib/env-deepseek.mjs`, the iterative
  Subject settings builder, and their focused tests.
- Affected release surfaces: `CHANGELOG.md` and `DPT_FRAMEWORK/RUN.md` for `v0.68`.
- Affected runtime evidence: one future real, explicit-assurance-scoped case-115 Subject
  run; no existing result is rewritten or upgraded.
- No dependencies, global Claude settings, provider fallback, permission escalation,
  runtime state, new CLI, or background controller will be added.
