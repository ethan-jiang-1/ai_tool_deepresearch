## Why

BUG-077 证明当前 Wave0/Wave1 在批量 claim 之后才通过 native spawn 的 API 402 得知 delegated actor 不可用，导致一批尚未产生任何研究输出的 work units 进入失败/清理循环；框架既没有 claim 前的正式 availability decision，也没有保留 work-unit authority 的 Phase Agent fallback。现在 C1 已关闭 contract-opacity，C2/C3 已建立可观察与 canonical 基础，可以在不新增调度器或长期 availability mode 的前提下收口 delegated execution 尾巴。（来源：`_backlog/bugs/BUG-077-subagent-api-402-and-cache-trail-schema-opaque.md`、`_backlog/plans/overall-recovery-canonical-state-and-delegation-roadmap.md` C4）

## What Changes

- **BREAKING**：delegated `operate-work-unit claim` 不再把“能 claim”当作“actor 可执行”；存在eligible delegated demand时，调用方必须在同一 decision point 显式提交一次与计划role绑定的当前 host actor observation 与选定的 `execution_actor_class`。`unknown` 或 delegated actor `unavailable` 时不分配 normal work unit，并返回一个最近动作。
- 在现有 claim 路径加入有界 actor preflight，而不是新增 probe daemon、availability registry、TTL cache、后台 watcher 或全局 lifecycle mode。host/native actor 可用性由 Agent 在 decision point 观察，Engine 只验证 observation、actor choice 与 claim/fallback 组合是否合法。
- 接受两个执行 actor class：正常 `delegated_subagent`，以及明确的 `phase_agent_fallback`。fallback 只在 observation 为 delegated actor unavailable、planned role exact match、且现有work-unit kind contract明确允许时可选；未知/未来kind默认禁止。fallback一次只claim一个work unit，并继续使用同一个 Engine 分配的 envelope、identity、result schema、runtime receipt、dry-submit/formal submit 与 ledger transaction。
- 将 `execution_actor_class`、normalized availability reason/source、planned role和fallback lineage绑定到manifest/index，并由beacon/result/receipt/ledger做必要projection/validation；`_agent.json`与runtime refs继续diagnostic-only，不参与actor verdict；pre-v0.25历史只投影`legacy_unrecorded`，不反向猜actor。
- 更新 Wave0/Wave1/Wave2 delegated guidance：先对当前queue-front planned role做一次小而真实的 native availability observation，再按 observation claim normal batch、显式 claim单个fallback attempt，或 fail-closed；unavailable 时不得先制造一批 doomed claimed attempts。
- unavailable → available 后由 Agent 重新执行同一个 claim checkpoint；不要求用户手改 queue/index/ledger，也不要求用户运行普通恢复命令。只有外部账户/host permission 确实需要人处理时才升级给用户。
- 增加 regression、authority snapshot 与现有 delegated-work controlled family 的真实 disposable case，证明 available、unavailable fail-closed、Phase Agent fallback、恢复后正常 claim 及 formal submit provenance。
- Framework 行为与 work-unit contract 发生变化，需要版本升级到 `v0.25`。

## Capabilities

### New Capabilities

无。actor availability 与 fallback 属于既有 delegated work-unit execution authority，新增独立 capability 会制造第二套调度/状态 owner。

### Modified Capabilities

- `delegated-work-units`: claim 增加 decision-point actor observation；work-unit authority绑定执行 actor class；Phase Agent fallback 仍通过同一 envelope、receipt、submit 与 ledger。
- `agentic-queue`: bounded batch claim 在分配 delegated demand 前消费role-bound actor preflight；normal path保留批量top-up，fallback固定单attempt；unavailable 时保持其余queue demand未 claim并支持恢复后幂等继续。
- `research-wave-phase-content`: Wave0/Wave1/Wave2 明确 `observe planned role → claim normal/fallback或block → spawn/execute → submit` 的最短合法闭环和 Agent/user/Engine 责任。
- `subagent-runtime-logging`: runtime receipt 绑定执行 actor class；fallback receipt 不得冒充 native delegated subagent。

## Impact

- 影响 `DPT_FRAMEWORK/engine/work-unit-*`、`DPT_FRAMEWORK/schema/contracts/work-unit.mjs`、`DPT_FRAMEWORK/cli/operate-work-unit.mjs`、Wave0/Wave1/Wave2/shared subagent guidance、命令文档与相邻 queue/work-unit tests。
- 不新增 npm dependency，不改变 evidence floor、source/cache/reference contracts、queue schema或 lifecycle state；只在既有work-unit kind contract增加窄actor policy，不修改 C3 topic state、C5 post-final recovery或 host account configuration。
- Direct Source of Record 仍是 queue demand + Engine-owned work-unit manifest/index/receipt/ledger；availability observation 只绑定本次 claim decision，不成为新的持久全局真相。
- 最短闭环为 `真实 native probe → 同一 claim checkpoint → normal/fallback/no-claim → formal submit`。Net simplification：删除“先批量 claim、再批量 spawn 失败、再逐个 fail/abandon/re-enqueue”的恢复链，复用existing claim trace events，并避免 host-report authority、probe service、fallback tree 与 availability cache。
- 责任边界：Agent 执行真实 probe、选择 accepted actor path并完成机械 claim/submit；用户只处理外部账户/权限或新的风险决定；Engine验证组合、分配 identity、约束 receipt/result并裁决 submit，`human-directed` 不创造 fallback 权限。
