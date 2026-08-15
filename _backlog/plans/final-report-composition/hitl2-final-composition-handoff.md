# HITL2 -> Final Composition Handoff Contract

> 状态：已接受的 v1 plan contract；等待 OpenSpec proposal，不是 accepted spec 或 runtime contract。
>
> Producer：HITL2 Phase Agent。
>
> Admission owner：HITL2 Gate。
>
> Consumer：Final Phase Agent。
>
> 核心约束：Final 只接收已经收敛完成的 composition contract，不接收待解释的用户原话，也不向 HITL2 回问。

## 1. Contract Goal

这个 handoff 只解决一个问题：

> 在 verified research state 已经形成后，Final 应为谁、为了什么、以什么重点和交付姿态组织报告？

它不是第三份研究摘要，也不是把 HITL2 对话原样塞给 Final。HITL2 必须先把已有 durable facts、透明推荐和必要的用户修正收敛成 resolved values；只有 complete contract 才能伴随 `proceed_to_readiness` 离开 HITL2。

```text
HITL1 purpose / controls + verified review facts + view defaults
                         |
                         v
             HITL2 composition recommendation
                         |
              accept / bounded correction
                         |
                         v
       resolved composition_handoff + HITL2 Gate pass
                         |
                         v
               Readiness -> Final consumer

No Final question
No Final fallback inference
No Final -> HITL2 interpretation loop
```

## 2. Source Of Record

Canonical coordinate：

```text
rb_profile.yaml#/human_decision_checkpoints/hitl2/composition_handoff
```

相邻 existing owners 保持不变：

| Meaning | Existing owner | Handoff behavior |
|---|---|---|
| 用户是否交付、重跑、修复或停止 | `hitl2.user_decision` | 不重复 |
| 报告 view enum | `hitl2.final_report_view` | 不重复 |
| Custom identifier | `hitl2.custom_slug` | 不重复；不承担语义 |
| Decision reason / rerun focus | `hitl2.rationale` | 不作为 composition fallback |
| Root coverage obligations | `root_must_answer_set` | 不复制 |
| Findings、confidence、limitations、backing | verified research artifacts | 不复制 |
| Human-readable review/proposal | `artifacts/hitl2/decision-brief.md` | projection，不是 machine owner |

Final 的 composition semantics 只能读取 `final_report_view` 和 `composition_handoff`。它不得因为 handoff 缺字段而改读 `rationale`、decision brief、旧聊天或 `custom_slug` 猜答案。

## 3. Locked V1 Plan Schema

```yaml
human_decision_checkpoints:
  hitl2:
    status: recorded
    answerability_class: ready_substantive
    user_decision: proceed_to_readiness
    final_report_view: executive_brief
    rerun_count: 0
    rationale: "用户接受面向管理层的交付建议。"

    composition_handoff:
      contract_version: 1
      for_rerun_count: 0

      reader:
        description: "需要决定是否继续投入的业务与技术管理层"
        familiarity: working

      intended_use: "判断当前证据是否支持进入下一阶段投入，并识别必须先控制的风险。"
      primary_focus: "现有证据支持什么决策，主要风险和剩余未知是什么？"

      content_priorities:
        foreground:
          - "会改变投入决策的结论、条件和风险"
        compress:
          - "不影响判断的研究过程和低优先级技术细节"

      delivery:
        language: zh-CN
        length: concise
        evidence_exposure: key_evidence
        appendix: as_needed
```

`custom` example 额外包含：

```yaml
    final_report_view: custom
    custom_slug: board-risk-memo
    composition_handoff:
      # ...all common required fields...
      view_instructions: >-
        先按可逆与不可逆风险分组，再按三个月内需要作出的决定排序；
        不按研究 Topic 或 Wave 展开。
```

### 3.1 Closed enums

```text
reader.familiarity:
  general | working | expert | mixed

delivery.length:
  concise | standard | detailed

delivery.evidence_exposure:
  key_evidence | balanced | audit_ready

delivery.appendix:
  none | as_needed | required
```

`appendix: none` 只表示不增加额外 appendix；每份 Final Markdown 的 mandatory Evidence Map 仍然存在。

v1 只授权一份 primary report。`appendix` 控制该主报告是否附加 Evidence Map 之外的补充材料，不创建第二份 primary brief/report package；多 primary deliverables 需要未来 contract version。

### 3.2 Field contract

| Field | Type | Required on proceed | Meaning for Final |
|---|---|---:|---|
| `contract_version` | literal integer `1` | yes | 选择 consumer contract；不兼容版本不得猜读 |
| `for_rerun_count` | non-negative integer | yes | 必须等于 sibling `hitl2.rerun_count`，防止复用上一轮 handoff |
| `reader.description` | trimmed non-empty string | yes | 读者角色、责任或与主题的关系 |
| `reader.familiarity` | closed enum | yes | 决定背景铺垫、术语解释和机制展开深度 |
| `intended_use` | trimmed non-empty string | yes | 读者看完后要完成的判断、决定、核查或理解任务 |
| `primary_focus` | trimmed non-empty string | yes | 报告首要服务的问题、主张、决定或机制；不替代 root must-answer |
| `content_priorities.foreground` | unique non-empty string array | yes; may be `[]` | 用户希望前置的交付重点 |
| `content_priorities.compress` | unique non-empty string array | yes; may be `[]` | 可以压缩的内容；不授权删除 material obligations |
| `delivery.language` | normalized language tag string | yes | 报告叙述语言；canonical tokens 和 source titles 不翻译 |
| `delivery.length` | closed enum | yes | 主报告压缩程度 |
| `delivery.evidence_exposure` | closed enum | yes | 正文展示 evidence reasoning/provenance 的深度 |
| `delivery.appendix` | closed enum | yes | 是否增加 Evidence Map 之外的 appendix |
| `view_instructions` | trimmed non-empty string | conditional | 标准 view 的可选细化；`custom` 时必填并承担 custom semantics |

所有 nested objects 都应 strict；未知字段、空字符串、数组中的空项或完全重复项不应被静默接受。Authorized proceed contract 内不使用 `unknown`、`not_started`、空 placeholder 或“见 rationale”一类间接值。

## 4. What HITL2 Resolves, And What Final Decides

| Decision | Owner |
|---|---|
| Reader、use、primary focus、view、foreground/compress、language、length、evidence exposure、appendix posture | HITL2 resolved handoff |
| Must-answer coverage、material finding/contradiction/limitation 是否必须出现 | Existing research contracts + Final materiality rules |
| Exact section names、local ordering、paragraph transitions、specific evidence placement | Final Composition Pass |
| Claim strength、confidence、source eligibility、submitted backing | Existing verified state / Engine admission；handoff 不可覆盖 |
| 是否还需要问用户 | HITL2 only；Final 永远不拥有该决定 |

HITL2 传给 Final 的是写作目标与约束，不是预先替 Final 选完全部 findings。否则同一 finding 会在 research artifact 和 handoff 中出现两个 owner，下一轮 rerun 必然漂移。

## 5. HITL2 Resolution Precedence

HITL2 只从 durable/current facts 构造 recommendation，按以下顺序解决冲突：

```text
current HITL2 explicit correction
  -> accepted HITL1 purpose / delivery control
  -> current root must-answer shape
  -> selected view's transparent defaults
  -> disclosed system default where the view has no stronger rule
```

这个顺序只用于形成 candidate。Candidate 作为一个整体被用户明确接受、修正或委托后，才成为 resolved handoff；“Agent 推荐过”本身不产生 authority。

聊天中未写入 accepted owner 的旧表达不越过 durable facts。Research evidence obligations 又高于 composition preference：用户可以要求压缩，但不能授权隐藏会改变答案的反证、限制或 uncertainty。

## 6. Interaction Algorithm

### 6.1 Build one complete recommendation

HITL2 在提问前先填出完整 candidate，并以用户语言展示一个紧凑的“交付建议”：

```text
读者：...
用途：...
首要焦点：...
报告视角：...
重点 / 可压缩内容：...
语言、篇幅、证据展开、附录：...
```

用户不需要看 field names 或 enum。说“交付”“按这个来”或作出等价明确委托，即接受已展示 candidate，不再做笼统二次确认。

### 6.2 Ask only at a material ambiguity frontier

只有两个或更多合理取值会实质改变 view、primary spine、内容优先级、解释深度或 evidence exposure 时，才需要用户补充。

所有当前可回答、彼此独立的问题合并在一次 clarification message 中，最多三个；每项同时给出推荐值及其影响。依赖前一答案才成立的问题不得提前追问。用户回答后直接形成 resolved contract；只有回答本身仍有实质歧义时才继续同一个 HITL2 loop。

### 6.3 Never cross the node boundary unresolved

如果 material ambiguity 仍未解决：

- `hitl2.status` 保持 `pending_user`；
- candidate 只留在 decision brief 的 proposal section；
- 不写 `user_decision: proceed_to_readiness`；
- 不运行可通往 Readiness 的 passed handoff；
- Final 不会看到半成品 contract。

### 6.4 Delivery intent is not Final entry

用户说“交付”时：

- 若已经展示的 candidate 完整且没有 material ambiguity，这句话就是 acceptance，HITL2 立即持久化并继续；
- 若仍有 material ambiguity，这句话表达的是 delivery intent，但 node 仍停在 HITL2，只询问缺失边界；
- 用户对缺失边界给出清楚答案后，该回答与先前 delivery intent 共同完成决定，不再要求第二次“确认交付”；
- 用户在 pending loop 中说“换成管理层视角”只是修正 candidate，不应过早写成已提交的 `request_view_revision` branch。

持久化 accepted handoff 时，HITL2 同步把 decision brief 的 candidate projection 更新为 accepted projection，然后再运行 Gate。Profile object 是 machine owner；brief 只保证人类审阅和 session resume 时能看懂发生过什么。

## 7. Ask / Recommend Rules By Field

| Field | Normally resolve from | Ask only when | Transparent recommendation when absent |
|---|---|---|---|
| Reader | HITL1 purpose、业务背景、用户当前修正 | 两类 plausible readers 需要明显不同的术语、背景或决策 framing | 面向提问者本人，`working` familiarity；明确展示后由用户接受 |
| Intended use | HITL1 decision/delivery purpose | understand、decide、verify、implement 或 audit 的差异会改变报告 spine | 直接服务 recorded Purpose |
| Primary focus | Purpose + root must-answer | 多个 must-answer 无自然主次且排序会改变交付价值 | Purpose 中的核心任务 + 最主要 must-answer |
| Final report view | Explicit control + intended use | 两个 view 都合理且会造成实质不同报告 | decision -> executive；audit -> evidence map；claim -> claim judgment；mechanism -> technical deep dive；otherwise profile default |
| Foreground/compress | Explicit user emphasis | 用户给出的优先级互相冲突 | 两个数组均可为空，让 Final 按 materiality 排序 |
| Language | Explicit control + current user language | 多语言受众或交付语言与对话语言冲突 | 当前 accepted user language；无记录时沿现有 Chinese default |
| Length | Explicit control + view | 明确用途同时要求相冲突的 brevity/depth | executive `concise`；technical/evidence-led `detailed`；otherwise `standard` |
| Evidence exposure | Explicit control + view | 快速阅读与审计用途同时存在且正文/appendix 无法化解 | executive `key_evidence`；evidence map `audit_ready`；otherwise `balanced` |
| Appendix | Explicit output need + view | 是否需要独立审计材料会改变交付成本或形状 | `as_needed` |
| View instructions | Explicit wording | `custom` 被选择但组织语义不存在 | 标准 view 可省略；custom 不允许默认猜测，必须在 HITL2 解决 |

这张表定义的是 Agent 的 recommendation/clarification policy，不是给用户填写的问卷。

## 8. Lifecycle

| HITL2 state | Handoff state | Authority |
|---|---|---|
| Before HITL2 | absent | none |
| `pending_user` | accepted object absent；decision brief 可含 candidate | candidate only |
| Recorded non-delivery decision | object 可 absent；旧 object 即使保留也不授权 Final | ignored by Final |
| Recorded `proceed_to_readiness` | complete object，round-bound，Gate-valid | accepted composition authority |
| After rerun count increments | 旧 object's `for_rerun_count` mismatch | stale；下一次 HITL2 必须重解并覆盖 |

不要为 handoff 再增加 `draft/accepted/stale` status 字段。Outer HITL2 status、decision、rerun count 和 Gate receipt 已经拥有 lifecycle；再造一套会重新制造两个状态机。

## 9. Cross-Field Invariants

当且仅当 `user_decision: proceed_to_readiness` 时，HITL2 Gate 额外要求：

1. `status == recorded`。
2. `final_report_view != not_started`；未修改 view 时由 HITL2 写成 `profile_default`。
3. `composition_handoff` 存在且通过 strict v1 schema。
4. `composition_handoff.for_rerun_count == hitl2.rerun_count`。
5. `final_report_view == custom` 时，`custom_slug` 和 `view_instructions` 均为 non-empty。
6. 非 custom view 不从 `custom_slug` 恢复任何 composition meaning。
7. `compress` 不得被解释为删除 root must-answer、material contradiction/limitation 或 mandatory Evidence Map。

对 `rerun`、`repair`、`request_view_revision` 和 `stop_blocked`，composition handoff 不作为 Gate blocker，因为这些 branch 不进入 Final。

Gate 只验证结构、closed vocabulary、conditional presence 和 round binding，不判断 reader/use 写得是否“聪明”。语义未解决时，HITL2 根本不应先写 recorded proceed；记录后出现的纯机械缺字段由 Agent 修复，不得默认再次询问用户。

## 10. Handoff Witness And Drift

Passed HITL2 receipt 应保存 immutable accepted projection 及其 deterministic fingerprint，而不是只记录 `user_decision`：

```text
final_report_view
custom_slug when present
composition_handoff.contract_version
composition_handoff.for_rerun_count
composition_handoff full normalized value
```

Readiness structural precheck 重算 current profile projection 的 fingerprint，并与 passed HITL2 receipt 比较。这个检查只证明“Final 将读取 HITL2 Gate 接受过的同一 contract”，不评价 composition quality，也不创建 Final Gate。

Profile 仍是 current source of record；receipt projection/fingerprint 是 immutable accepted-state witness，不是 Final 的正常读取入口。若 drift 只涉及这份 projection，受支持的 Engine operation 从 receipt 精确恢复 accepted values，并重新运行 Readiness check；若存在 unrelated profile drift，则暴露 exact lifecycle/contract boundary。两种情况都不得再次询问用户，也不能让 Final 先猜一个版本再回头找 HITL2。

## 11. Final Consumption Algorithm

Final legal entry 后按固定顺序消费：

1. 验证 route-bound Readiness witness 已成立，并读取 current accepted handoff。
2. 用 `reader`、`intended_use` 和 `primary_focus` Reground，不再从 `rationale` 恢复 composition intent。
3. 用 `final_report_view` 选择 primary spine；`view_instructions` 只在既有 evidence/coverage 边界内细化。
4. 从 verified artifacts 建立 Answer Inventory，独立识别 must-answer coverage 和 material limitations。
5. 用 `foreground` 决定前置，用 `compress` 决定压缩位置；materiality obligations 始终优先。
6. 用 delivery fields 控制解释深度、正文 evidence exposure 和 appendix。
7. 起草、自检并通过 `persist-final-report` 提交。

Final 可以决定章节名、局部编排和具体证据放置，但不得：

- 补猜缺失 reader/use；
- 把 `not_started` 静默解释成另一个 view；
- 从旧聊天、slug 或 rationale 创建 custom semantics；
- 因 `compress` 隐藏会改变答案的事实；
- 主动提问、等待确认或返回 HITL2。

若 legal Final entry 仍遇到缺失、版本不支持、round mismatch 或 receipt drift，这是 upstream contract invariant breach，不是新的用户决策。Final 不提供 fallback success path。

## 12. Deliberately Excluded From The Schema

以下内容不进入 composition handoff：

- root must-answer 的复制；
- selected finding IDs、confidence 或 limitation 清单；
- source refs、citation plan 或 Evidence Map rows；
- Final 文件名、staging path、Gate target 或 transition；
- 完整章节 outline；
- 原始聊天 transcript；
- `confirmed: true`、第二套 handoff status 或平行 lifecycle。

这些内容已有 owner，或属于 Final 的内部 working judgment。把它们塞进 handoff 会扩大 stale state 和 cross-node disagreement surface。

## 13. Legacy And Resume Posture

- Historical profile 可以为了 inspection 继续允许 handoff absent。
- 新的 `proceed_to_readiness` authorization 不接受 absent/partial handoff。
- 已交付的历史 bundle 不做追溯性重写。
- 升级时停在 HITL2 之前的 bundle 按新 contract 正常进入 HITL2。
- 已越过旧 HITL2、但尚未进入 Final 的 legacy bundle 必须通过受支持的一次性 migration/HITL2 resolution 获得 contract；Final 不生成兼容性默认值。
- Resume 时只信 durable pending/accepted state，不根据 session chat 猜用户已经答过什么。

## 14. Accepted Decisions

本 contract 已锁定以下设计决定：

1. HITL2 写 resolved contract，Final 不解释 raw intent。
2. `composition_handoff` 是唯一新增 durable composition owner。
3. `final_report_view` 保持现有 owner；`not_started` 不得进入 delivery path。
4. Custom semantics 由 `view_instructions` 持久化，`custom_slug` 只作 identifier。
5. Handoff 与当前 `rerun_count` 绑定，并由 Gate/Readiness witness 防止漂移。
6. Final 不问、不默认、不回跳；不完整 contract 永远停在 HITL2 boundary 内解决。
