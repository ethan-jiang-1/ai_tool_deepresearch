## Why

现有 HITL1 research-access probe 由 Phase Agent 在主上下文直接执行 search 和
fetch。返回的 query、URL、页面内容会干扰其后的研究综合，也让用户在已经完成研究
决定后突然看到难以解释的工具活动。来源计划：
`_backlog/plans/isolate-hitl1-capability-probe.md`。

本 change 将这一次非研究性的能力检查隔离给一次性 probe agent，同时保留现有
`research_access` observation、HITL1 Gate、重跑入口和证据边界。

## What Changes

- Phase Agent 在原有 probe 前提示后，加载专用 probe-agent guidance 并 spawn 一个
  无 bundle 读取或写入权的一次性 agent；主 Agent 不再直接调用 search/fetch。
- probe agent 只执行现有固定 neutral query、候选筛选、native-first / 同 URL fallback
  序列，并返回最终 `available` 或 `unavailable` 的既有 `research_access` observation。
  Phase Agent 是
  `rb_profile.yaml` 的唯一 writer，原样写入可接受返回后运行同一个
  `hitl1-recorded` Gate。
- spawn 失败、缺失返回或返回不符合既有 observation 分支时，Phase Agent 记录诚实的
  `unavailable` 原因，并保留同一 probe/Gate 的可见重跑路径；不增加自动重试树、
  ledger、receipt、work unit 或新的持久面。
- 将 HITL1 能力检查的三条用户文案替换为计划中已确定的小白中文版本；结果仍在
  observation 后、同一 Gate 前，成功文案不宣布 Gate 已通过，失败不要求用户重做
  已记录选择。
- 新增 Phase-to-probe return-map 的静态管道验证；重构 case-115 为直接观察 probe
  agent 的真实工具事件和诚实 return-map。该 canary 不再声称 probe agent 写 profile
  或运行 Gate，因为它没有这些权力。
- 实现阶段发布 Harness `v0.84`，更新 `CHANGELOG.md` 和 `DEEP_RESEARCH_HARNESS/RUN.md`。

## Semantic Boundary

读者是已经记录 HITL1 决定的 Phase Agent；它需要回答的有界问题是：“这个隔离 agent
返回的 observation 能否按既有分支写入 profile，并回到哪个检查点？” 必须保留的区别是
probe agent 的外部工具行为、Phase Agent 的 profile 写入、以及 Engine 的 Gate verdict。
当 Phase 已记录一个既有有效 observation 并运行同一 Gate 时，推理停止；不会新增
“probe completed”状态、投影或控制器。

直接 Source of Record 仍是 `rb_profile.yaml#/research_access` 与现有 HITL1 Gate。最短
合法闭环为：

```text
recorded HITL1 decision -> existing notice -> spawn bounded probe agent
  -> compact existing observation -> Phase writes rb_profile.yaml
  -> same hitl1-recorded Gate
  -> existing pass exit | existing unavailable repair and same-probe rerun
```

这消除了主 Agent 内保存 page/tool payload 的隐性上下文路径，同时避免增加第二个
writer、state、checker、retry loop、provider path 或 host controller。用户只在真实的
研究语义或外部环境边界上作决定；probe agent 执行被委派的 search/fetch，Phase Agent
执行已授权的 relay、profile write 与 rerun，Engine 保持 profile validation 和 Gate verdict。

## Capability Discovery

| Candidate | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `research/pre-research-phase-content` | `openspec/specs/research/pre-research-phase-content/spec.md` (PRP-002, PRP-005) | Modify | HITL1 从 Phase 直接 probe 改为 spawn、返回 observation、Phase 写入和同 Gate 的行为变化。 |
| `research/research-access-adapter` | `openspec/specs/research/research-access-adapter/spec.md` (REA-002, REA-003) | Modify | REA-002 当前明确要求 Phase Agent 亲自建立 search-to-fetch binding；新 contract 将外部执行交给受限 probe agent，并收紧真实 canary 的证明对象。 |
| `agent/hitl-ux` | `openspec/specs/agent/hitl-ux/spec.md` (HIU-002) | Modify | HITL1 probe 前后 exact-text UX 改为已确定的小白中文，且仍要保留 observation/Gate 的时间和责任区别。 |
| `research/pre-research-experiments` | `openspec/specs/research/pre-research-experiments/spec.md` | Verify-only | case-115 是 REA 的 provider-scoped evidence asset；该 capability 没有把 case-115 的 actor 或 profile writer 规定为独立行为。 |
| `research/pre-research-gate-implementation` | `openspec/specs/research/pre-research-gate-implementation/spec.md` | Verify-only | Profile schema 和 `hitl1-recorded` Gate 规则不变。 |
| `agent/subagent-node-contract` and `agent/subagent-directory-contract` | corresponding accepted specs | Excluded | 两者只拥有 Engine-claimed work-unit subagent 的 beacon/receipt/submit contract；probe agent 明确不进入该路径。 |
| `verification/verification-routing` | `openspec/specs/verification/verification-routing/spec.md` | Verify-only | 该 capability 只决定证明分类，不改变其 requirement。 |

### New Capabilities

None. The new guidance file is a Phase-loaded implementation surface for an
existing HITL1 behavior, not a new work-unit, lifecycle, provider, or Engine
capability.

### Modified Capabilities

- `research/pre-research-phase-content`: PRP-002/PRP-005 will require isolated
  probe delegation, existing observation relay, and the unchanged same-Gate loop.
- `research/research-access-adapter`: REA-002/REA-003 will bind the selected
  adapter's real search/fetch sequence to the probe agent and define the
  provider-scoped return-map proof boundary.
- `agent/hitl-ux`: HIU-002 will own the replacement capability-check text and
  preserve its observation-before-Gate timing.

## Impact

- Framework Markdown: `phase-hitl1.md`, `brief/hitl1.md`, and a new
  `workflows/nodes/shared/shared-hitl1-capability-probe.md` guidance surface.
- Verification: `tests/integration/md/phase-hitl1-research-access.test.mjs`,
  case-115 playbook, selected Subject runner, observer, and focused runner/
  observer tests.
- Release: `CHANGELOG.md` and the `DEEP_RESEARCH_HARNESS/RUN.md` v0.84 banner.
- No dependency, profile schema, gate definition, adapter selection, bundle
  migration, work-unit, ledger, receipt, evidence, or host-permission change.
