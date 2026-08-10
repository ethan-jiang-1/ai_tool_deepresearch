## Why

当前 Wave0、Wave1、Wave2 的 delegated queue loop 只能在没有可记录配置时采用不高于 5 的保守默认值；`operate-work-unit claim --count` 虽接受更大的正整数，却没有一个受 schema 校验、可在 run profile 中审计的 delegated concurrency ceiling。七个独立 topic 因而不能作为正常、可配置的批量 fan-out 策略落地。

本 change 将把这一缺口收敛为一个直接的 profile control，使 Phase Agent 能按已知独立 demand 与剩余 in-flight capacity 作出有界 claim 决策，而不改变 Engine 的 work-unit 分配与 queue 交易权威。原始需求和调查边界见 `_backlog/plans/seven-topic-seven-subagent-concurrency-investigation.md` 与 `_backlog/plans/handoff-seven-topic-concurrency-2026-08-10.md`。

## What Changes

- 在 run profile 的既有 schema 与模板中加入唯一的 `delegated_concurrency_cap`，默认策略值为 `12`，并以严格的正整数边界校验其可用性。
- 令 Wave0、Wave1、Wave2 及 shared delegated protocol 从该 profile control 计算 `min(eligible_independent_demand, effective_delegated_concurrency_cap, remaining_free_capacity)`；没有新的 queue state、scheduler、work-id allocator 或 sub-agent allocation path。
- 将 accepted queue/dispatch contract 对齐到同一个 Source of Record：cap 限制 Main/Phase Agent 可 fan-out 的 work-unit prompt 数量，Engine 仍是唯一分配者，actor preflight、contiguous prefix、admission、transaction drift 与 `phase_agent_fallback = 1` 均保持不变。
- 增加 schema/template、claim-count guidance 边界及 fallback=1 的确定性回归。当前没有成本和时长可接受、又能证明七个真实 Actor 的活跃 playbook；此前的 case-221 将转入 extreme-slow 隔离区，不再作为本 change 的 `agent_flow_e2e` 证据或正常选择目标。确定性测试仍不得把 claim 数量表述为物理 host 并发证明。
- **BREAKING**：没有显式 profile cap 的新 bundle 将从已记录的保守 `<= 5` guidance 改为 schema-owned 默认值 `12`；这改变 Phase Agent 的正常批量 claim 上限，不改变 Engine 的 CLI 输入接受范围或 queue lifecycle。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `agent/agentic-queue` | `openspec/specs/agent/agentic-queue/spec.md`，尤其 AGQ-022 的 batch/top-up rule | Modify | 该 capability 已拥有 Wave delegated queue-loop 的 batch 选择、in-flight top-up 和不新增 scheduler 的行为契约；本 change 将其 cap Source of Record 具体化并覆盖 Wave2 shared loop。 |
| `agent/subagent-dispatch` | `openspec/specs/agent/subagent-dispatch/spec.md`，尤其 work-unit fan-out concurrency cap | Modify | 该 capability 已拥有 cap 只限制 Agent fan-out 而不改变 Engine allocation authority 的边界；需将其与 profile-owned effective cap 对齐。 |
| `agent/delegated-work-units` | `openspec/specs/agent/delegated-work-units/spec.md` | Verify-only | work-unit identity、lease 和 submit transaction 不改变；该 capability 仅受现有 claim 输出消费。 |
| `verification/verification-routing` | `openspec/specs/verification/verification-routing/spec.md` | Verify-only | verification plan 依其现有规则路由 deterministic 与 real agent-flow 证据；该 change 不改变 taxonomy 或 routing contract。 |
| `agent/delegated-concurrency-policy` | `openspec/specs/README.md` 与全量 catalog | Excluded | 新 control 的 reader question 是既有 queue batch claim 的约束，不具备独立 Engine module、Gate 或 requires chain；新 capability 会重复现有 `agentic-queue`/`subagent-dispatch` 责任。 |

## Responsibility And Control Boundary

- **Source of Record**：经 `ProfileSchema` 解析的 `rb_profile.yaml` 是每个 run 的唯一 structured policy input；显式的 `rb_profile.yaml#/delegated_concurrency_cap` 是持久 override，缺失时由同一 schema 的默认值产生 effective cap。Phase guidance 只消费该已解析的 effective value。
- **Agent**：在现有 claim path 内从可见的 eligible independent demand、effective cap 和 in-flight capacity 选择 `--count`，并按 returned work-unit prompt 做 native sub-agent handoff。
- **Engine**：继续独占 actor preflight、queue/admission、work-id 分配、transaction、receipt 和 trace verdict；不读取该值来建立第二 scheduler，也不证明物理 actor/liveness。
- **User**：保留实际 host capacity、外部运行许可和可接受风险的语义决定；默认 `12` 是记录的产品策略，不是虚构的 host-capacity receipt。

该结构让 Phase Agent 只需要回答一个有界问题：“当前可合法提出多少个 work-unit claim？”答案止于 profile cap 与现有 Engine constraints；它不把“claim N”提升为物理并发、host health 或新的 runtime state。

最短合法闭环是：profile 解析得到 cap -> Phase guidance 以现有 `claim --count` 提出有界 batch -> Engine 接受或拒绝既有 admission/actor/transaction 条件 -> Agent 按现有 prompt/submit 路径继续。相较于散落的 `<= 5` prose，这删除了 phase-local 默认判断，避免引入 scheduler、slot state、capacity daemon、host probe 或 fallback queue。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `agent/agentic-queue`: delegated queue loop SHALL 从 profile-owned delegated concurrency cap 计算 Wave0/Wave1/Wave2 的有界 top-up claim count。
- `agent/subagent-dispatch`: delegated fan-out cap SHALL 使用同一 effective profile control，且不改变 Engine work-unit allocation authority。

## Impact

- 目标实现：`DEEP_RESEARCH_HARNESS/schema/contracts/profile.mjs`、`DEEP_RESEARCH_HARNESS/rb_templates/rb_profile.yaml.tmpl`、Wave0/Wave1/Wave2 phase guidance 与 shared sub-agent protocol。
- 目标验证：`tests/` 下的 schema/Markdown/claim-count deterministic coverage；`agent_flow_e2e` 对本 change 当前不适用。将 case-221 从活跃实验清单迁至 `exp_extrem_slow/`，使 Autorun 和 Interactive 都无法选择它。
- 版本：修改 Harness 行为，计划发布为 `v0.83`；Apply 时同步 `CHANGELOG.md` 与 `DEEP_RESEARCH_HARNESS/RUN.md` banner。
- 依赖：不新增 npm 或 host dependencies。
