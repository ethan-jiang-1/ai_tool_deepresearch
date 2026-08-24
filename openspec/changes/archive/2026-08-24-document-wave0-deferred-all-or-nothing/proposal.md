# Document Wave0 Deferred All-Or-Nothing

## Why

`_backlog/bugs/BUG-238-wave0-deferred-contribution-partial-projection-collision.md`
（2026-08-24 已重写为高置信 DX 结论版）确认：`operate-topic-state.md` 与
`phase-wave0.md` 写「the writer derives every currently unprojected exact
identity」，让 Phase Agent 合理以为可以先显式物化部分 ordinal、再用
`deferred_contribution` 选择器补剩余部分。实际 writer 契约是**disposition
兼容性上的 all-or-nothing**（CTS-009 已接受：任何 selected identity 已持不同
持久化投影 → 整包原子拒绝 `projection_deferred_contribution_collision`，且
SHALL NOT 持久化部分子集）。两处 guidance 都漏掉了这个前置条件与合法恢复
路径，Agent 会撞上阻塞性拒绝却不知道下一步该做什么。

## What Changes

- `command_playbook/operate-topic-state.md`：在 contribution-wide
  `deferred_contribution` 小节写明 all-or-nothing 前置条件（每个 selected
  identity 必须 unprojected 或已是等价 deferred entry；任一不同 disposition
  整包原子拒绝、绝不覆盖），并写明混合贡献的恢复路径（对剩余 authoritative
  ordinal 用显式 `wave0_evidence` entries，然后 rerun 同一 inspect）。
- `phase-wave0.md`：同一前置条件与恢复指引进入 Wave0 phase guidance。
- `expandWave0DeferredContribution` 的 `projection_deferred_contribution_collision`
  反馈追加一句合法恢复（「Defer the remaining ordinals with explicit
  `wave0_evidence` entries, then rerun the same inspect」）；writer 判定逻辑
  零改动。
- 新增文档/契约回归：`wave-producer-contract-guidance.test.mjs` 断言两处
  guidance 携带前置条件与恢复短语；`operate-topic-state-projection.test.mjs`
  的既有 collision 测试断言反馈文本点名恢复路径。既有
  `rejects a deferred contribution that would overwrite a materialized identity`
  测试保持绿。

不改变：`expandWave0DeferredContribution` 的拒绝/原子/不覆盖行为、CTS-009 的
collision-safe 语义、explicit entry packet 路径、seed/index/ledger 写入权限。

## Capabilities

### New Capabilities

None。

### Modified Capabilities

- `research/canonical-topic-state`: 新增 requirement CTS-011 —— 贡献级
  deferred 选择器的 disposition 兼容性前置条件与碰撞反馈恢复路径必须被文档化。
- `research/research-wave-phase-content`: 新增 requirement RWP-023 —— Wave0
  phase guidance 必须写明 deferred 选择器前置条件并把混合贡献导向显式
  remaining-ordinal 包 + 同一 inspect rerun。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `research/canonical-topic-state` | `openspec/specs/research/canonical-topic-state/spec.md` CTS-009（deferred 原子展开 + collision-safe 场景）、`DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs`（`expandWave0DeferredContribution` 1273-1350）、`DEEP_RESEARCH_HARNESS/command_playbook/operate-topic-state.md` | Modify | 契约语义不变；新增 CTS-011 约束 guidance/feedback 必须写明前置条件与恢复路径。 |
| `research/research-wave-phase-content` | `openspec/specs/research/research-wave-phase-content/spec.md`（RWP 系列 phase guidance 契约）、`DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave0.md` §3.3 deferred 段落 | Modify | Wave0 phase guidance 是 deferred 选择器的另一读者面；新增 RWP-023。 |
| `research/research-return-map` | `openspec/specs/research/research-return-map/spec.md`（deferred disposition 语义、RRM-007） | Verify-only | 只确认既有 deferred 语义；本 change 不改 return-map 判定。 |
| `verification/verification-routing` | `openspec/specs/verification/verification-routing/spec.md` | Verify-only | 只用既有 integration 分类路由新证据。 |

## Semantic Precision Reflection

读者/有界问题：**「先显式物化部分 ordinal、再用 contribution-wide deferred
选择器补剩余」是否是合法操作？** 答案是否定的 —— 该选择器在 disposition
兼容性上是 all-or-nothing；这一前置条件必须被明确写成契约，而不是藏在
实现细节里。

必须保留的区别：

1. **「currently unprojected」的推导**（正常路径：整贡献仍未投影）vs
   **disposition 兼容性前置条件**（任一 selected identity 已持不同投影 →
   整包拒绝）。前者是派生算法，后者是拒绝规则；两处 guidance 现在只写了前者。
2. **贡献级选择器** vs **逐 ordinal 显式 entry**。混合贡献的合法路径是后者
   （显式 entries 只覆盖剩余 authoritative ordinal），不是把选择器降级为
   子集操作。
3. **等价 deferred replay**（幂等，allowed）vs **不同 disposition**
   （conflict，reject）。文档必须区分。

正常推理停止点：读者读到「deferred 选择器仅在整贡献未投影或全为等价 deferred
时可用；混合贡献用显式 entries 补剩余」即可正确操作，无需读实现。

## Authority And Control Boundary

- **direct Source of Record**：accepted CTS-009（writer 拒绝语义）+ 本 change
  的 CTS-011/RWP-023（guidance/feedback 契约）。文档与反馈都指向同一 writer
  行为，不创造第二 authority。
- **最短合法闭环**：Agent 读 guidance → 对混合贡献改用显式 entries → 同一
  inspect rerun。无新 state、无新 writer、无新 recovery。
- **net simplification**：把「撞上阻塞拒绝后被迫读源码猜规则」变成「文档直接
  给出前置条件与合法路径」；不加控制层，只补两处 guidance 与一句反馈。
- **责任边界**：Engine 继续按 CTS-009 原子拒绝（确定性）；Agent 按文档选择
  合法路径；User 无新 decision。本 change 不授予任何一方新 permission。

## Impact

- `DEEP_RESEARCH_HARNESS/command_playbook/operate-topic-state.md`：deferred
  小节澄清。
- `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave0.md`：§3.3 deferred
  段落澄清。
- `DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs`：
  `projection_deferred_contribution_collision` 反馈追加恢复句（仅消息文本）。
- `tests/integration/md/wave-producer-contract-guidance.test.mjs`、
  `tests/integration/cli/operate-topic-state-projection.test.mjs`：文档锁与
  反馈断言。
