## Why

一个真实 bundle（`dpt_rb_ai-coding-evolution`）在用户批准 rerun 后，C5 阶段被 `operate-topic-state apply` 以 `rerun_not_authorized` 阻塞。根因是：该 bundle 的原始 profile 从未物化 `human_decision_checkpoints.hitl2.rerun_count`（schema 为 optional、default 0，`evaluateRerunAvailability` 也把缺失当 0 处理，因此 C5 资格检查通过），但 `classifyPostFinalProfile`（handoff-helpers.mjs L310-343）要求该键必须存在于当前 profile 且与事件 committed semantics 做 JSON 全等比较——而事件是 apply 时按契约原样保留的不可变快照，永远不会带上这个键。结果：**任何 profile 状态都无法通过分类器**，框架自己的 fixtures 和真实 bundle 都从创建起就带 `rerun_count: 0`，只有 legacy bundle 会踩中这个缺口。

来源：用户对话中的 rerun 批准（2026-08-24），C5 诊断见本会话；框架期望形态见 `tests/integration/cli/post-final-recovery-fixture.mjs`（fixture 恒写 `rerun_count: 0`）与 `openspec/specs/research/post-final-recovery/spec.md`。

## What Changes

- 修改 `DEEP_RESEARCH_HARNESS/engine/helpers/handoff-helpers.mjs` 的 `classifyPostFinalProfile`：当当前 profile 的 `hitl2.rerun_count` 缺失时，按事件 `rerun_guard.current_count`（即 0）参与计数窗口检查，而不是以 `undefined` 直接失败。
- 修改同一函数的 comparable JSON 检查：仅当事件 committed semantics 携带 `rerun_count` 键时才把它写回 comparable；事件语义缺键（legacy）时不在 comparable 强加该键，使 JSON 全等比较对 legacy 事件可满足。
- 保持所有其他 stage 谓词不变：`pre_entry`、`loaded_pending_status`、`synchronized_count_incremented`、`descendant_pipeline` 行为不变；非 legacy（带键）事件的行为逐字节不变。
- 在 `tests/` 增加覆盖：engine 层（`classifyPostFinalProfile` 对缺失键的 legacy profile 判定）+ integration 层（legacy profile 走完 C5 → enter → advance → topic-state apply 全链路）。

**BREAKING**：无。这是对既有可满足域的收紧前的放宽；带键事件的行为不变。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `research/post-final-recovery`: POF-003 的 stage 谓词语义放宽——`synchronized_initial_profile` 阶段对 legacy profile/事件（`hitl2.rerun_count` 键缺失）按事件-bound `current_count` 处理计数，不再把缺失视为不可满足 drift；其余谓词与带键路径不变。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| research/post-final-recovery | `openspec/specs/research/post-final-recovery/spec.md`（POF-003 stage 谓词、L403-405）、`openspec/governance/req-registry.yaml`（POF 行） | Modify | 本 change 改变 POF-003 下 `synchronized_initial_profile` 对缺失 `rerun_count` 的可满足性，是 requirement 级行为变化 |
| research/canonical-topic-state | `openspec/specs/research/canonical-topic-state/spec.md`、`canonical-topic-state.mjs` L1467-1494 | Verify-only | 只消费 `checkPhaseHandoffPreflight` 的 ok 结果，谓词语义在 handoff-helpers；本 change 不改 topic-state 自身契约 |
| research/research-styles | `openspec/specs/research/research-styles/spec.md` | Verify-only | style 谓词（event-bound 或 exact RES-001 projection）不变 |
| agent/work-unit-provenance-gate | （grep 命中的无关文件） | Excluded | 与 rerun_count 无行为关系 |

## Impact

- 受影响代码：`DEEP_RESEARCH_HARNESS/engine/helpers/handoff-helpers.mjs`（`classifyPostFinalProfile`，可能含 `inspectPostFinalHandoffStage` 的调用点微调）。
- 受影响测试：`tests/engine/helpers/post-final-recovery.test.mjs`（engine 层新增 legacy 用例）、`tests/integration/cli/post-final-recovery.test.mjs`（fixture 层 legacy 全链路）、`tests/integration/cli/post-final-lineage-consumers.test.mjs`（若其断言依赖现有分类器行为需复核，但带键路径不变）。
- 下游消费者（不改代码，只受益/复核）：`DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs`、`DEEP_RESEARCH_HARNESS/cli/check-reentry.mjs`、`DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs`。
- 运行时影响：只有 legacy bundle（profile 缺 `hitl2.rerun_count` 且事件语义同样缺键）走 rerun 时才被放开；schema、gate definitions、事件 schema 均不变。
