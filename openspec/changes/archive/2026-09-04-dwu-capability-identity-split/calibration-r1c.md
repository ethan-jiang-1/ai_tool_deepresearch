# R1c 指针化评审记录(2026-09-04)

> 范围:母体瘦身后 + 三新 capability spec(2026-09-04 迁移完成态)
> 方法:C1 扫描器(默认 4 类锚词表)全扫四文件 → 候选逐条按主 plan §2.1 三条件人审
> 结论:**审毕,零转换**——22 条候选无一满足指针化三条件。

## 候选分布与判定

| spec | 候选 | 判定 |
|---|---|---|
| delegated-work-units(瘦身后) | 17 | 全部保留(见下) |
| work-unit-submission | 2 | 保留 |
| work-unit-preflight | 2 | 保留 |
| work-unit-correction | 1 | 保留 |

## §2.1 三条件逐类判定

候选命中词均为 generated task / task.md / spawn / generated guidance 类,但逐条读原文后:

1. **条件 1(过程性复述)不满足**:命中句几乎全是本 spec 自己的 normative SHALL——"Generated work-unit task Markdown … SHALL include the current …"、"The generated task SHALL require the actor to write and verify…"、"generated task and spawn guidance SHALL display a bound…"。主语是 Engine 的生成投影面,**细节的 accepted owner 就是本 spec + engine 渲染实现**,不存在"owner 那边改一步、本段必须跟着改"的外部 owner;判定测试("若 owner 改步骤本段必须跟着改?")指向的是本 spec 自己,不构成复述。
2. **条件 3(可测试性)风险**:多数命中句被同块 `#### Scenario:` 的 WHEN/THEN 依赖(如 required_outputs 绑定、role-guidance ref 派生),删除即断场景锚点。
3. **无一处命中"指针句形态"适用场景**(Compatibility Pointer 类:指向 phase 节点/playbook 的 Authoring/procedural details)。

## 例外核对

- P2@262-266 "Generated task, starter, checklist and result-schema projections SHALL continue…" — 投影一致性契约,owner 在本 spec(envelope readers),非复述。
- P2@881-887 "already-authored task brief … carried unchanged" — 任务 brief 语义在母体保留域,self-owned。
- submission/preflight/correction 三新家的 5 条候选:内容随块整体迁移(逐字节守恒已证),迁移前即属 normative 域,迁移未改变其性质。

## before/after

文本零改动。若后续 owner 面(phase 节点/playbook)出现真实过程性复述,按 §2.1 另立 focused change,不在本 change 扩大。
