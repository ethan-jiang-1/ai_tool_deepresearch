## Why

来源：`_backlog/bugs/BUG-071-missing-search-capability-contract-and-graceful-degradation.md`。Canonical research waves 硬依赖真实 search + fetch，但框架在进入 silent execution 前从不确认该能力；受限环境会在 Wave0 才静默卡死，Agent 只能在造假、越权补救和无期限等待之间自行猜测。

这个 change 不建设 offline mode，而是在用户本来就在场的 HITL1 做一次真实、有限、可记录的能力确认；不可用就早失败并明确交还用户。

## What Changes

- HITL1 增加一次 bounded real search + fetch probe；probe 只判断环境能力，不作为 research evidence，不进入 reference/artifact/cache coverage。
- 在 `rb_profile.yaml` 增加最小 `research_access` observation，记录 `unprobed | available | unavailable`、probe 时间、工具、结果 URL、fetch outcome 或失败原因。
- `ProfileSchema` 对 observation 做直接一致性校验：available 必须有可解析 URL 与成功 fetch；unavailable 必须有非空 reason。
- HITL1 gate 只有在 `research_access.status=available` 时才允许进入 Setup/Wave；unprobed/unavailable 返回明确 blocker 和重试路径。
- HITL1 用户面说明当前环境缺少 evidence-backed research 所需能力，要求切换/修复环境后重试。
- 不实现 offline report、无证据分析骨架、用户素材 ingestion、curl 探针矩阵或 generalized capability framework。
- Framework behavior changes require a version bump; target version: `v0.18`.

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `schema-core`: Profile contract 增加最小 research-access observation 及跨字段一致性约束。
- `pre-research-phase-content`: HITL1 负责执行并记录 bounded capability probe，明确 probe 非 evidence。
- `pre-research-gate-implementation`: HITL1 gate 在进入 silent waves 前 fail fast 检查 research access。

## Impact

- 预计影响 ProfileSchema、profile template、HITL1 phase、hitl1 gate definition/CLI、相关 regression tests 与一个真实 Agent-controlled capability experiment。
- Engine 只验证 Agent observation 的结构，不声称能独立证明外部工具可用。
- Existing bundles without `research_access` 将在 HITL1/pre-research 检查中得到明确 `unprobed` repair path；不静默默认 available。
- 不新增依赖，不使用 fake search/fetch 作为 E2E 证据。
