# Final Report Composition - Progressive Plan

> 状态：进行中。
>
> Tracking owner：本文件。完成一项就立即更新 checkbox；不在别的文档维护第二套进度。
>
> 当前步骤：P2.1，创建 active OpenSpec change。
>
> Last directory consistency audit：2026-08-15，P1.7 passed。

## How To Advance From This File

以后从本文件推进，不需要先重读整个目录：

1. 找到唯一标有 **CURRENT** 的 task。
2. 只读取该 task 明确引用或实际需要的设计/authoritative sources。
3. 完成 task 的产物与验证后，立即把它改为 `[x]`。
4. 将下一项改成 **CURRENT**，并同步下方 Current Checkpoint。
5. 若执行中发现新工作，先作为普通 pending task 插入正确阶段；不得藏在 prose 或另开第二套 TODO。

## Current Checkpoint

| Item | Current value |
|---|---|
| Phase | P2 - OpenSpec Proposal |
| Current task | P2.1 创建 active OpenSpec change |
| Primary inputs | `hitl2-final-composition-handoff.md`、`recommended-final-composition-design.md`、`view-contract-sketch.md` |
| Allowed writes | `openspec/changes/<change-name>/` only |
| Exit evidence | Active change exists，proposal/design/specs/tasks 已按后续 P2 tasks 可继续生成；Harness target code 未修改 |
| Next task after pass | P2.2 记录 owner、interaction、compatibility 和 handoff witness design |

## Tracking Rules

- `[x]`：产物已经形成，并满足该项出口条件。
- `[ ]`：尚未完成；标有 **CURRENT** 的一项是当前唯一推进点。
- 后一阶段不得以“先实现再说”跳过前一阶段的审定出口。
- 历史探索保留；未选路径标记“暂不考虑”，不从目录删除。
- `README.md` 只维护索引；设计正文和进度分别由专门 Markdown 持有。

## P0 - Direction Lock

- [x] P0.1 Final 保持 graph 上唯一的 terminal delivery node。
- [x] P0.2 Final Phase Agent 直接执行完整 Report Composition Pass。
- [x] P0.3 当前不使用 Formal Composer 或 ad-hoc Sub-agent。
- [x] P0.4 HITL2 是交付前最后一个用户交互 owner；Readiness 和 Final 不提问。
- [x] P0.5 Engine 只拥有 schema、state、handoff、backing 和 persistence 等可确定判断，不声称判断报告语义质量。

出口：执行者、交互位置和 Engine/Agent 边界不再作为当前 change 的开放分支。

## P1 - HITL2 -> Final Handoff Contract

- [x] P1.1 盘点现有 `rb_profile.yaml`、HITL2 prompt/phase、HITL2 Gate、Readiness 和 Final consumer。
- [x] P1.2 确定 durable owner：`rb_profile.yaml#/human_decision_checkpoints/hitl2/composition_handoff`。
- [x] P1.3 确定不重复 owner：继续复用现有 `final_report_view`、`custom_slug`、`root_must_answer_set` 和 verified finding/backing surfaces。
- [x] P1.4 形成 v1 contract：字段、枚举、resolution precedence、interaction algorithm、cross-field invariants、rerun binding、legacy posture 和 Final consumption rules。
- [x] P1.5 用户接受 [hitl2-final-composition-handoff.md](hitl2-final-composition-handoff.md)。
- [x] P1.6 将 accepted contract 同步回 `recommended-final-composition-design.md`、`composition-logic-feasibility.md`、`view-contract-sketch.md` 和 future Sub-agent seam，保留历史 alternatives 但移除 current contradictions。
- [x] P1.7 完成目录级系统性审计：统一 handoff/context/working-view 三层术语、owner、状态、legacy、witness、view decisions 和单一 tracking 入口。

出口：HITL2 能在离开 checkpoint 前生成一份完整、无 sentinel、绑定当前 rerun round 的 resolved contract；Final 不需要读取聊天、猜默认值或回问 HITL2。

## P2 - OpenSpec Proposal

- [ ] **P2.1 CURRENT** 创建一个 active OpenSpec change，不直接修改 Harness target code。
- [ ] P2.2 在 proposal/design 中记录 source of record、producer/consumer ownership、interaction boundary 和 compatibility posture。
- [ ] P2.3 为 HITL UX、profile contract、HITL2 Gate、readiness consistency 和 Final composition behavior 编写 delta specs。
- [ ] P2.4 把实现和验证拆成可逐项验收的 `tasks.md`；声明适用的 feedback marker。
- [ ] P2.5 运行 proposal/polish 检查并关闭所有阻塞性 spec gap。

出口：change artifacts 自洽、可 apply，且没有把 Sub-agent、第三个 HITL 或 Final Gate 偷带入 scope。

## P3 - Apply: Handoff Producer And Admission

- [ ] P3.1 增加 composition handoff schema/enums，并保持 legacy profile 可检查。
- [ ] P3.2 更新 profile template、shared profile documentation 和 schema exports。
- [ ] P3.3 更新 HITL2 brief：展示完整 composition recommendation，而不是向用户暴露 schema 问卷。
- [ ] P3.4 更新 HITL2 phase：实现 material-ambiguity resolution、单一 clarification frontier 和 accepted write behavior。
- [ ] P3.5 扩展 HITL2 Gate：仅对 `proceed_to_readiness` 条件性要求完整 handoff，并校验 custom/not_started/rerun binding invariants。
- [ ] P3.6 在 passed HITL2 receipt 中记录 normalized accepted projection + fingerprint，并由 Readiness structural precheck 检测 drift。
- [ ] P3.7 实现 receipt-bound mechanical restore：仅恢复 composition projection；不重新询问用户，不把 receipt 变成 Final 的正常 source。
- [ ] P3.8 实现 legacy/in-flight bundle 的 supported migration posture；缺 handoff 不得由 Final 隐式默认。
- [ ] P3.9 覆盖 pending、accepted recommendation、user correction、custom、rerun、drift restore、legacy 和 malformed handoff tests。

出口：不完整或过期 handoff 无法进入 readiness；机械写入错误不会变成重复用户提问。

## P4 - Apply: Final Consumer And Composition Pass

- [ ] P4.1 更新 Final required inputs，使 composition semantics 只来自 accepted handoff + existing view owner。
- [ ] P4.2 实现 Reground、Answer Inventory、coverage/materiality、spine/placement、draft/self-check 五步 Composition Pass guidance。
- [ ] P4.3 为每个 `final_report_view` 固化可区分的 reader task、primary spine、selection 和 compression behavior。
- [ ] P4.4 规定 handoff preference 不得覆盖 must-answer、material contradiction/limitation、confidence 或 submitted backing obligations。
- [ ] P4.5 保持 `persist-final-report` 为唯一 Final Markdown admission path。
- [ ] P4.6 验证 Final 不新增 question、wait、feedback loop、outgoing Gate、transition 或 delegated production actor。

出口：Final 能从同一 verified research state 按 accepted handoff 生成真正不同、但事实边界一致的交付报告。

## P5 - Verification And Compatibility

- [ ] P5.1 Schema unit tests：字段类型、closed enums、strict objects、conditional requirements 和 round binding。
- [ ] P5.2 Gate/Readiness integration tests：proceed/handoff matrix、custom requirements、sentinel rejection、receipt fingerprint、repair ownership 和 handoff drift。
- [ ] P5.3 Deterministic lifecycle tests：HITL2 -> Readiness -> Final 正常 handoff，及 rerun 后旧 handoff 不可复用。
- [ ] P5.4 Legacy/migration tests：历史 bundle 可 inspect；in-flight bundle 只有 supported migration path；缺 handoff 不会被 Final 隐式默认或伪装成新授权。
- [ ] P5.5 真实 `agent_flow_e2e`：至少覆盖 executive、claim judgment、technical deep dive 和 custom 四种交付。
- [ ] P5.6 语义审阅：must-answer coverage、finding meaning、confidence、limitations 和 backing 不随 view 漂移。
- [ ] P5.7 文档/enum/schema/gate/test parity 检查全部通过。

出口：确定性测试证明 contract 和 lifecycle；真实 Agent flow 证明交互与报告组织实际可用，不使用 mock 报告冒充语义验证。

## P6 - Closeout

- [ ] P6.1 关闭 apply 中发现的所有 actionable feedback tasks。
- [ ] P6.2 同步 accepted specs，并完成 Agent-owned semantic closeout。
- [ ] P6.3 使用受支持的 governance finalizer archive change。
- [ ] P6.4 更新本文件全部 checkbox、最终状态和实现引用。

出口：change 已归档，accepted specs、Harness、tests、Agent-flow evidence 和 backlog tracking 一致。

## Definition Of Done

只有 P0-P6 全部为 `[x]`，本轮 Final Report Composition 工作才算完成。仅完成 schema 草图、仅改 Final prompt、仅通过 deterministic tests，或仅生成一份看似不错的报告，都不算完成。
