## Why

当前 Final 只能看到分散的 research purpose、`final_report_view`、`rationale` 和 verified artifacts，无法确定报告面向谁、用于什么、首要服务什么问题以及应采用怎样的交付姿态。若继续让 Final 从聊天、decision brief 或相邻字段补猜，同一份 verified research state 会因 consumer 推断不同而产生不可审计的 composition 漂移。

本 Change 将已接受的 backlog 设计收敛为一个可执行 contract：HITL2 在最后一个交互点完成 composition intent 的推荐、必要澄清和持久化，Engine 验证并见证该 handoff，Final 只读消费它并直接完成 Report Composition Pass。原始需求与锁定决定来自 `_backlog/plans/final-report-composition/hitl2-final-composition-handoff.md`、`recommended-final-composition-design.md` 和 `view-contract-sketch.md`。

## What Changes

- 在 `rb_profile.yaml#/human_decision_checkpoints/hitl2/composition_handoff` 增加 strict、versioned、rerun-bound 的 v1 composition contract；保留 `final_report_view`、`custom_slug`、`rationale`、`root_must_answer_set` 和 verified finding/backing surfaces 的现有 owner。
- HITL2 在展示 research review 的同时展示一份完整、用户可理解的 composition recommendation。只有会实质改变 reader task、primary focus、view、解释深度或 evidence exposure 的歧义才进入一次最多三个独立问题的 clarification frontier；清楚接受、修正或委托后不再二次确认。
- `proceed_to_readiness` 条件性要求完整 handoff、非 `not_started` view、custom semantics 和当前 `rerun_count` binding。其他 HITL2 decisions 不因缺少 composition handoff 被阻塞。
- passed HITL2 receipt 保存 normalized accepted projection 及 fingerprint；Readiness 校验 current profile 与该 witness 一致。纯 composition projection drift 使用 receipt-bound mechanical restore 后重跑同一 readiness checkpoint，不重新询问用户，也不把 receipt 变成 Final 的正常 source。
- Final 保持唯一 terminal delivery node、`gate: null`、无 outgoing transition、无提问和无 Sub-agent。Final 从 accepted handoff 与 verified state 执行 Reground、Answer Inventory、coverage/materiality、spine/placement、draft/self-check 五步 Composition Pass。
- `profile_default`、`executive_brief`、`evidence_map`、`claim_judgment`、`technical_deep_dive` 和 `custom` 获得可区分的 reader task、primary spine、selection/compression 和 evidence-exposure guidance；view 只改变阅读路径，不改变 finding meaning、confidence、limitations、must-answer coverage 或 submitted backing obligations。
- 新 authorization 不为 legacy bundle 静默生成默认值。历史 bundle 仍可 inspection；已越过旧 HITL2 但尚未进入 Final 的 in-flight bundle 必须通过受支持的 migration/HITL2 resolution 获得 handoff。
- 使用既有测试资产为主：扩展 schema unit、Gate/Readiness integration、delivery-tail deterministic E2E，以及 case-131/132 的 fixture-backed `agent_flow_e2e`；Readiness witness/restore/migration 由 JS-led integration 与 deterministic E2E 证明。当前 Change 只证明 deterministic contract，不把 recommendation、自然语言 acceptance、bounded clarification 或报告语义质量作为完成条件。任何实际原生运行超过 120 秒的 playbook 都移入 `exp_extrem_slow/` quarantine 并退出 active manifest/Change completion，保留为诊断历史。未来若要补真实 Agent evidence，必须另开 Change，并把单次运行硬限制在 60 秒以内。
- 不新增第三个 HITL、Final Gate、parallel composition owner、Formal Composer、ad-hoc Sub-agent、第二份 primary deliverable 或 report-quality deterministic verdict。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `engine/schema-core` | `openspec/specs/engine/schema-core/spec.md` | Modify | `ProfileSchema` 和 HITL/profile enums 的现有 owner；composition handoff 的 strict shape、closed enums、conditional fields 和 rerun binding 属于该 contract。 |
| `agent/hitl-ux` | `openspec/specs/agent/hitl-ux/spec.md` | Modify | HIU-003 已拥有 HITL2 recommendation、natural-language mapping 和 minimum clarification；本 Change 扩展其 composition recommendation 与接受规则。 |
| `research/content-delivery-phase-content` | `openspec/specs/research/content-delivery-phase-content/spec.md` | Modify | CDP-001/CDP-003 已拥有 HITL2 producer 和 terminal Final guidance；handoff write/consume 与 Composition Pass 应留在同一 phase capability。 |
| `research/content-delivery-gate-implementation` | `openspec/specs/research/content-delivery-gate-implementation/spec.md` | Modify | HITL2 Gate、Readiness Gate、gate receipt 与 deterministic handoff consistency 已由该 capability 拥有。 |
| `research/content-delivery-experiments` | `openspec/specs/research/content-delivery-experiments/spec.md` | Modify | CDE 已拥有 HITL2、Readiness 和 Final delivery-tail playbooks；本 Change 只收口 case-131/132 的 fixture-backed deterministic proof，并隔离超时 playbook。 |
| `research/final-delivery-backing` | `openspec/specs/research/final-delivery-backing/spec.md` | Verify-only | Mandatory Evidence Map、submitted backing 和 `persist-final-report` 行为保持不变；composition preference 不得覆盖它。 |
| `verification/verification-routing` | `openspec/specs/verification/verification-routing/spec.md` | Verify-only | 只选择既有四类 proof route 并创建 change-root plan，不修改 taxonomy、permissions 或 checker behavior。 |
| `research/post-final-recovery` | `openspec/specs/research/post-final-recovery/spec.md` | Excluded | 本 Change 不改变 post-final rerun/reentry；Final 内部仍无 feedback/recovery loop。 |
| `agent/subagent-node-contract` | `openspec/specs/README.md` 与 backlog 的 current decision | Excluded | 当前 executor 已锁定为 Final Phase Agent；任何 composition Sub-agent 都是 future Change，不属于当前 scope。 |

## Capabilities

### New Capabilities

无。现有 capability 已完整覆盖 schema、HITL2 interaction、delivery phase、delivery gates 和 delivery experiments；不创建平行 composition owner。

### Modified Capabilities

- `engine/schema-core`: 为 HITL2 profile 增加 strict v1 `composition_handoff` contract、closed delivery vocabulary、conditional custom semantics 和 rerun binding。
- `agent/hitl-ux`: HITL2 展示完整 composition recommendation，按 material ambiguity frontier 澄清，并把自然语言接受/修正收敛为 resolved handoff。
- `research/content-delivery-phase-content`: HITL2 持久化 accepted handoff；Readiness 保持 structural consistency boundary；Final 只读 handoff 并执行 view-aware Composition Pass。
- `research/content-delivery-gate-implementation`: 条件性 admission、normalized witness/fingerprint、Readiness drift detection、同 checkpoint restore 和 legacy fail-closed posture。
- `research/content-delivery-experiments`: 扩展 delivery-tail deterministic proof，并将超时 playbook 退出 active verification route。

## Semantic Precision

`composition_handoff` 回答一个有界问题：**对当前 rerun round 已接受的交付，Final 应为谁、为了什么、优先回答什么，并采用怎样的 view 与交付姿态组织报告？**

它保留会改变该问题答案的区别：reader 与 familiarity、intended use、primary focus、foreground/compress、language/length/evidence exposure/appendix、standard/custom view semantics，以及 current rerun binding。它刻意不复制 root must-answer、findings、confidence、limitations、source refs、outline 或 citation plan，因为这些已有 owner 或属于 Final working judgment。

正常停止点是 accepted profile handoff：HITL2、Readiness 和 Final 不再从 `rationale`、decision brief、chat 或 slug 重建 composition intent。若 contract 缺失、stale、unsupported 或 drifted，系统明确停在 upstream contract boundary，而不是由 Final 猜出一个成功结果。

## Control And Responsibility

Direct Source of Record 是 current bundle profile 中的 `final_report_view` 与 `composition_handoff`。HITL2 receipt 的 projection/fingerprint 只是 immutable accepted-state witness；decision brief 是 human-readable projection；Final working plan 不是 durable authority。

最短合法闭环是：

```text
HITL2 Agent 形成完整 recommendation
  -> 用户接受、修正或委托必要语义
  -> HITL2 Agent 写 current profile handoff
  -> HITL2 Gate 校验并写 accepted witness
  -> Readiness 校验同一 projection
  -> Final Agent 消费 handoff + verified state 并持久化报告
```

纯 mechanical drift 只恢复 receipt 已接受的 composition projection，然后重跑 Readiness。该闭环删除 Final 对 `rationale`、decision brief、chat、`custom_slug` 和 `not_started` 的 fallback inference，避免第二套 handoff status、Final Gate、controller、retry tree 或 Sub-agent production path。

用户只拥有新的 reader/use/focus/view 等语义决定；HITL2 Agent 负责推荐、最小澄清、合法写入和后续机械执行；Engine 负责 schema、Gate、witness、drift 和 persistence verdict；Final Agent 负责 materiality、spine、placement、draft 和 semantic self-check。Engine 不判断报告是否写得好，Final 不发起新的用户决定。

## Impact

- Framework schema/template/docs：`schema/contracts/profile.mjs`、schema exports、`rb_profile.yaml.tmpl`、`workflows/nodes/shared/shared-profile.md`。
- HITL2/Readiness/Final flow：`brief/hitl2.md`、`phase-hitl2.md`、`phase-readiness.md`、`phase-final.md`。
- Deterministic admission：HITL2/Readiness gate definitions、CLIs、shared gate/profile helpers，以及 narrowly scoped migration/restore surface。
- Verification：优先扩展 `tests/schema/contracts/profile.test.mjs`、现有 HITL2/Readiness integration tests、`tests/e2e/helpers/research-chain-fixture.mjs` 与 case-131/132 delivery playbooks；case-135/136 只保留为隔离诊断，未来 fast-evidence Change 才能重新选择真实 Agent proof。
- Compatibility：历史已交付 bundle 不改写；legacy inspection 与新 authorization 分离；无新依赖、无 TypeScript、无 Sub-agent capability。
