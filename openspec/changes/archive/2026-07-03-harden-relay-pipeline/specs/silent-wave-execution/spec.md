# Silent Wave Execution (delta)

> req: SWE-001, SWE-002

## Purpose

Constrain the silent execution degradation chain so that alternative methods MUST stay within the relay pipeline. Direct WebSearch/WebFetch with hand-written artifacts is not a legal degradation. When the relay path is fully blocked, mark gap rather than bypass.

## MODIFIED Requirements

### Requirement: Silent wave execution contract

在 `stop: no` phase 执行阶段，Agent SHALL 自主执行，不提问、不请求确认、不展示 A/B 选择、不把中途阻塞报告给用户。静默阶段包括：instantiation、setup、seed-topics、wave0、wave1、wave2、readiness、rerun，以及终端交付 phase final。（合法浮出水面点、降级优先级链、疲劳抵抗等见 main spec，此处不重复。）

**变更**: 降级优先级链第三步"降级方法（Method Degradation）"增加约束：

> 替代方法 MUST 保持在 relay pipeline 内。直接执行 WebSearch/WebFetch 并手工写入 artifact（绕过 relay）不是合法的替代方法。如果 relay pipeline 中的 queue/spawn/commit 路径全部失败，Agent SHALL 选择 mark gap（降级链第四步）而非绕过 relay。

在静默阶段优先级覆盖表中增加：

| 被覆盖的规则 | 来源 | 静默阶段改写 |
|-------------|------|------------|
| "遇到阻塞→切换方法→自己解决，不要浮出水面" | `shared-silent-execution.md` §1.1 (method switch guidance) | → 方法切换的合法范围限定在 relay pipeline 内。直接 WebSearch + 手工写 artifact 不在合法替代方法集合中 |

#### Scenario: Agent degrades within relay pipeline

- **WHEN** relay queue is unavailable
- **AND** Agent follows the degradation priority chain
- **THEN** Agent SHALL attempt repair of the queue/relay path first
- **AND** if repair fails, Agent SHALL mark gap rather than bypass relay

#### Scenario: Direct search is not a legal degradation

- **WHEN** Agent considers switching to direct WebSearch as an alternative method
- **THEN** this SHALL be treated as a violation of the degradation chain
- **AND** Agent SHALL instead record `silent_unpassable` or mark gap

After recording `silent_unpassable` or marking gap, downstream mechanisms take over: the `relay-provenance-gate` capability detects missing relay provenance at gate evaluation time (RPG-005 bypass suspicion), and the `trace-writer` capability records the gap in `rb_trace.jsonl` for post-hoc diagnosis (TRW-003). The SWE contract's role is to ensure the Agent does not silently route around the relay; detection and trace are handled by gate and trace respectively.

## ADDED Requirements

None. The degradation chain constraint is a modification of the existing contract, not a new requirement.
