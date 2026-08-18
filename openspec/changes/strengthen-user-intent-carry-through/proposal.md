## Why

当前 Harness 已能在 HITL1 保存用户研究控制，也能在 HITL2 / post-Final rerun 记录当轮 rationale，但尚未把“用户后来补充、加强、替换或撤回的研究意图”接纳为一个可恢复的多轮历史，并在 Seed、delegated work、Wave1 coverage、Wave2 synthesis 与 Final 之间形成同一条消费链。长任务一旦换会话或经历多轮 rerun，执行者可能只能从当前 profile 或旧 Topic direction 猜测用户现在真正要求什么。

本 change 落实 `_backlog/plans/user-intent-carry-through-implementation-plan.md` 的收敛结论，并吸收 `_backlog/plans/user-intent-carry-through-design-analysis.md` 与 `_backlog/plans/rerun-feedback-carry-through-design-analysis.md` 的原始诉求：复用既有 `rb_plan.md`，让每轮已接纳反馈既能驱动当前研究，又能保留不可抹去的打磨轨迹。

## What Changes

- 将 `rb_plan.md## Constraints > ### User Research Controls` 明确为 HITL1 及既有 bounded source-access alignment 解决后的 immutable baseline；将既有 append-only、newest-first `rb_plan.md## Decisions` 明确为 post-HITL1 accepted rerun revision history，不新增运行时文档。
- `phase-rerun` 在构造 topic-state candidate 之前写入或复用一个 target-round revision。每条 revision 同时记录本轮 delta、受影响 Topics、被替代/撤回要求、linewise blockquote-contained accepted user wording 与 Agent interpretation，以及相对 HITL1 baseline 的完整当前有效 amendments；普通恢复只需读取 baseline 加顶部 revision，旧 revision 保持原样。
- Seed Topics 在 controls 对 Topic 有实际影响时，将最小 topic-local 解释写入既有 enrichment/body；rerun direction 的 `rationale_excerpt` 只解释该 Topic 为什么受当前 revision 影响，不复制整段用户原话。
- Wave0、Wave1 和 Wave2 targeted-evidence 在各自真实 enqueue 点使用既有 queue-owned `task_brief`，交付 baseline/current revision/current direction 的只读坐标与 bounded objective；完整原话不向每个 work unit 扇出。
- Wave1 只从 baseline、顶部 current revision、matching direction 与 current-round submitted backing 形成 focus commitments；Wave2 pure synthesis 消费这些 current intent / coverage surfaces，并在既有 `synthesis.md` 写非权威 current-intent coverage 投影。
- Final 同时读取 verified research state、baseline、顶部 current revision、Wave2 coverage 与 current-lineage `composition_handoff`；研究语义与呈现语义各守其 owner，任何一方都不能补造另一方缺失的 authority。
- post-Final focus-bearing request 的既有 `reason` 使用已经采用的“两段式标签”（用户原话 / Agent 理解）；`requested_scope` 仍独立，现有 serializer、profile rationale 与 event lineage 不变。
- 不接纳的对话草稿不写入 history；presentation-only Final 修改继续只存在于 immutable Final version lineage。

## Semantic Precision And Control Boundary

本 change 只回答一个有界问题：**当前执行者从哪里读“本轮仍然有效的用户研究意图”，审计者又从哪里看到它经过了哪些轮次的修改？** 必须保留三组区别：HITL1 baseline 与后续 amendment、当前累计集合与历史 delta、用户要求与完成证据。正常推理停止点是 `User Research Controls` baseline + `Decisions` 顶部 complete revision；执行者不需要扫描聊天，也不得把更旧 revision 合并回 current set。

direct Source of Record 仍是现有 run bundle：baseline 在 `rb_plan.md## Constraints > ### User Research Controls`，accepted revision history 在 `rb_plan.md## Decisions`，canonical Topic identity 在 plan frontmatter，current-round Topic projection 在 matching direction，submitted backing / coverage 仍由各自既有 owner 决定。最短合法闭环为：accepted route-bound rationale -> write/reuse target-round Decisions revision -> topic-state inspect/candidate/apply -> existing Wave/Final consumers。

net simplification 是避免引入 `user-intent.md`、feedback log、profile `focus` 字段、第二 parser、同步协议、Gate、queue kind、lifecycle state 或恢复控制器。User 决定研究语义；Agent 在既有合法边界内接纳、解释、投影和执行；Engine 只继续验证已有 schema、round binding、transaction、provenance 与 Gate facts，不解释 prose 是否“语义一致”。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `research/plan-hostfile-sections`: 赋予既有 `## Decisions` 明确的多轮 accepted intent revision contract，同时保留 append-only/newest-first 与非 Gate 语义。
- `research/user-research-controls`: 明确 controls snapshot 只拥有 HITL1 baseline，后续已接纳修订进入同一 host file 的 Decisions history。
- `research/post-final-recovery`: 约束 focus-bearing C5 request 使用现有两段式 `reason`，不改变 scope、serializer、schema 或 lineage。
- `research/pre-research-phase-content`: 要求各研究阶段从 baseline + current revision 消费意图，并让适用 controls 必达 Seed topic-local projection。
- `research/seed-topic-materialization`: 规定既有 enrichment/body 如何承载最小 topic-local baseline projection。
- `agent/delegated-work-units`: 将有当前意图的 delegated demand 从“可带 controls coordinate”收紧为 Phase-authored current-intent task brief contract。
- `research/research-wave-phase-content`: 在 Wave0/1/2 的实际 queue、coverage 与 synthesis decision point 消费 current intent。
- `research/wave1-intake`: 明确 `focus_coverage` 的正面来源、current-round backing 与 honest limitation 边界。
- `research/wave2-synthesis`: 在既有 `synthesis.md` 增加非权威 current-intent coverage 投影，不扩 finding/index schema。
- `research/content-delivery-phase-content`: 明确 Final 对 research-intent owners 与 composition owner 的并行读取和优先级。
- `workflow/rerun-incremental-node`: 在 topic-state candidate 前物化或复用 target-round Decisions revision，并界定 topic-local `rationale_excerpt`。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `research/plan-hostfile-sections` | `openspec/specs/research/plan-hostfile-sections/spec.md` PHS-001/PHS-004/PHS-007 | Modify | `rb_plan.md` 已是 narrative host file，`## Decisions` 已声明 append-only/newest-first，正是最小历史接纳面。 |
| `research/user-research-controls` | `openspec/specs/research/user-research-controls/spec.md` URC-001/URC-002 | Modify | URC-001 当前是 captured-once snapshot；需要明确其 baseline 边界及后续 amendment owner。 |
| `research/post-final-recovery` | `openspec/specs/research/post-final-recovery/spec.md` POF-001/POF-002 | Modify | C5 已分别持久化 normalized `reason` / `requested_scope` 并序列化 rationale，只需约束 focus-bearing authoring form。 |
| `research/pre-research-phase-content` | `openspec/specs/research/pre-research-phase-content/spec.md` PRP-012/PRP-013/PRP-014 | Modify | 已有 controls capture/consumer route；需要把 current revision 和 Seed 必达投影接入同一路径。 |
| `research/seed-topic-materialization` | `openspec/specs/research/seed-topic-materialization/spec.md` STM-001 | Modify | 既有 `enrich_seed` 与 initialization body 已是 topic-local Agent semantic surface，无需新字段。 |
| `agent/delegated-work-units` | `openspec/specs/agent/delegated-work-units/spec.md` DEW-005/DEW-021 | Modify | 既有 queue `task_brief` 会原样进入 manifest/task；应在此收紧 coordinate delivery，而非扩 work-unit schema。 |
| `research/research-wave-phase-content` | `openspec/specs/research/research-wave-phase-content/spec.md` RWP-001/RWP-002/RWP-003 | Modify | Wave0/1/2 phase docs 分别拥有真实 enqueue、coverage repair 与 pure-synthesis decision point。 |
| `research/wave1-intake` | `openspec/specs/research/wave1-intake/spec.md` WAI-004 | Modify | 既有 optional `focus_coverage` 已拥有 commitment/backing/limitation 结构，只缺 current intent 的正面来源规则。 |
| `research/wave2-synthesis` | `openspec/specs/research/wave2-synthesis/spec.md` WTS-004 | Modify | `synthesis.md` 已是 human-readable projection，适合增加 current-intent coverage；finding index 不应再背一份意图。 |
| `research/content-delivery-phase-content` | `openspec/specs/research/content-delivery-phase-content/spec.md` CDP-003 | Modify | Final composition 已从 verified state + composition handoff reground，需要补齐 research-intent owners 与冲突边界。 |
| `workflow/rerun-incremental-node` | `openspec/specs/workflow/rerun-incremental-node/spec.md` REI-002 | Modify | `phase-rerun` 已把 current rationale 转成 topic adjustment，是写入 target-round revision 的唯一共同 writer point。 |
| `agent/hitl-ux` | `openspec/specs/agent/hitl-ux/spec.md` HIU-001/HIU-002/HIU-006 | Verify-only | HITL1/HITL2 已规定 user wording + correctable Agent interpretation 和合法 accepted boundary，无需改变对话模型。 |
| `workflow/rerun-topic-integration` | `openspec/specs/workflow/rerun-topic-integration/spec.md` RTI-007 | Verify-only | target-round binding、matching/stale/future/legacy/invalid resolver 与 atomic direction publication 保持不变。 |
| `research/canonical-topic-state` | `openspec/specs/research/canonical-topic-state/spec.md` CTS-003 | Verify-only | 既有 writer 已保留非 Topic Registry plan body 与 seed body；只需证明 Decisions history 不被 replacement 丢失。 |
| `verification/verification-routing` | `openspec/specs/verification/verification-routing/spec.md` VER-001/VER-002 | Verify-only | 继续使用四类验证，并严格区分 deterministic structure 与 real Agent semantic behavior。 |
| `engine/schema-core` | `openspec/specs/engine/schema-core/spec.md` SCO-004 | Excluded | 现有 multiline rationale 足够；不新增 `focus`、revision、history 或 intent schema 字段。 |

Discovery 未发现无人拥有的 observable behavior，因此不创建 New capability 或 `requirement-reservation.yaml`。

## Impact

- 主要目标是既有 phase/playbook Markdown：`phase-rerun.md`、`phase-seed-topics.md`、`phase-wave0.md`、`phase-wave1.md`、`phase-wave2.md`、`phase-final.md` 与 `command_playbook/post-final-recovery.md`。
- 需要修改上述 11 个 capability 的 accepted contracts，并补充 focused Markdown/integration、topic-state continuity、C5 multiline durability 与 real two-rerun Agent-flow evidence。
- 预计不修改 production `.mjs`。若 Apply 发现现有 writer/serializer/task-brief path 无法满足契约，必须先把证据和最小新增机制写回本 change 再继续。
- 无新依赖、schema migration、runtime file、Gate、状态、命令、queue kind 或 compatibility migration；legacy bundle 缺少 Decisions revisions 时继续按既有 baseline/current profile/direction 路径读取，不反推历史。
