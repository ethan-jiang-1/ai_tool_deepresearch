# Plan: 迭代式 Final 交付 + 版本化 Final 输出

**性质:** 第一性原则 + 能力立项前设计计划（pre-OpenSpec）
**状态:** active（设计验证待开始）
**触发:** 对 `enterprise-safe-ai-harness-v2` 做技术深入版（`technical_deep_dive`）Final 交付时，暴露两个缺口：
1. **Final 一次成型，无法与用户反复打磨。** 当前 Final 是 terminal delivery：`interaction: terminal_delivery`，节点无 gate，报告写出即交付。但真实场景下，用户看了第一版报告后想改 view、调章节、换读者/篇幅/证据粒度——没有合法回路，只能靠人工重建或整条 rerun。用户明确期望：**Final 也能像 HITL2 一样跟用户反复敲打**。
2. **Final 输出文件名不随迭代变化。** 当前约定固定写 `final/`（内部 `report.md`）。一旦进入迭代，多次交付都写同一个名字，无法追溯「第几版」。用户期望：**默认 `final.md`；迭代后 `final_v1.md`、`final_v2.md` …；也容许带特征标签的形式 `final_<特征>_v<N>.md`（如 `final_technical_deep_dive_v1.md`）**，代表该 final 是冲某特定特点/视角输出的，跟踪版本。

**设计原则:** [`guidelines/project-charter.md`](../../guidelines/project-charter.md)、[`guidelines/evolution-simple-reliable-control.md`](../../guidelines/evolution-simple-reliable-control.md)、[`guidelines/evolution-helper-oriented-agent.md`](../../guidelines/evolution-helper-oriented-agent.md)
**相关既有契约:** HITL2 的 `user_decision` 枚举、`composition_handoff` v1 contract、Readiness/Final terminal contract、post-final rerun recovery（`operate-post-final-recovery.mjs`）
**给接手 Agent 的现状代码地图:**
- `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-final.md` —— **Final 节点本体**。当前明确是 terminal：`gate: null`、`next: null`、`stop: no`。§8「Stop Behavior — Terminal Delivery」硬性规定 Final **不得**提问、等待、反馈循环、repair loop、post-delivery feedback loop；ant-cheating §9 又规定「用户 final 后反馈 MUST NOT 通过 final node 处理，明确 rerun 只走 audited post-final recovery」。这就是要改的核心冲突点。
- `DEEP_RESEARCH_HARNESS/cli/operate-artifact-persistence.mjs` —— Final Markdown 只允许走 `persist-final-report` 提交；generic `persist` 不能提交 Final Markdown。
- `DEEP_RESEARCH_HARNESS/engine/helpers/final-delivery-backing.mjs` —— 只读的 Final Evidence Map admission 检查器（结构声明 + submitted provenance），不判 claim 质量。
- `DEEP_RESEARCH_HARNESS/engine/helpers/composition-handoff.mjs` + `composition-handoff-operation.mjs` —— `composition_handoff` v1 contract 的归一化/一致性/迁移事实。
- `DEEP_RESEARCH_HARNESS/engine/helpers/post-final-recovery.mjs` + `cli/operate-post-final-recovery.mjs` —— 当前唯一的 post-final 合法入口（`inspect|apply|recover`，只接受 closed `post_final_rerun` retained request），把 post-delivery 反馈带回 HITL2 rerun semantics。
- `DEEP_RESEARCH_HARNESS/schema/contracts/profile.mjs` —— `CompositionHandoffSchema`、`final_report_view`（`FinalReportView` enum 见 `schema/enums.mjs`）。
- `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-hitl2.md` —— 现有 HITL2 交互范式（`stop: yes`、向用户展示推荐、等用户决策），可作迭代回路交互模式的参考。

---

## 0. 结论

**核心是 UX：用户不知道自己最终拿到的报告长什么样，直到他看到第一版。** 因此 Final 不应当是「一次成型即终局」的哑交付，而应当是一个**可试错的交付面**：用户看到首版 → 不满意就在 Final 节点直接提意见（改改这/改改那个/加加这个/加加那个）→ Agent 就地改 → 出下一版 → 再看再提，直到用户满意。

| 现状 | 缺口 | 期望 |
|------|------|------|
| Final 节点 `interaction: terminal_delivery`，无 gate | 用户看到首版不满意，没有合法回路提意见、就地改 | 一条**有界的 Final 迭代回路**：用户可在 Final 节点直接提意见（改 view / 改章节 / 加内容 / 换读者等），Agent 就地重写产物，不重启整条 lifecycle |
| `final/` 固定写 `report.md` | 多轮交付互相覆盖，无法追溯版本 | **版本化输出**：首版 `final.md`；迭代后 `final_v1.md`、`final_v2.md` …；也容许带特征标签形式 `final_<特征>_v<N>.md`（如 `final_technical_deep_dive_v1.md`）——文件名即版本，可追溯、可回滚 |

**为什么必须有这个交付面（UX 第一性）：** 报告不是用户预先指定形状的产物，而是需要「看到才知道要不要」的东西。没有迭代回路，用户对第一版不满只能：(a) 接受不满意的交付，或 (b) 被迫整条重跑——两者都违背「交付是给人用的」这个目标。迭代回路让交付成为**对话**，不是**单向投递**。

**关键设计约束：**
- 迭代是**对最终报告的打磨**，不是对新证据的重新研究。若用户想要的是补充研究方向/新增 topic，那是 `rerun`（`phase-rerun`），不属于本 plan 的迭代回路。
- 迭代**不新增生命周期 checkpoint**——不新增第三个 HITL、不做新的 Gate/transition。它应是 Final 节点内的一个**有界、有审计、可回滚**的 Agent-owned 交付操作。
- 版本化输出**只改交付产物命名**，不改变 research state、queue、trace 的权威性；旧版本保留，新版本追加。

**区分：迭代交付 vs 重跑研究**
| 用户意图 | 走哪条路 |
|---------|---------|
| 「报告换个 view / 章节重排 / 读者换成管理层 / 篇幅缩短」 | **本 plan 的 Final 迭代回路**（就地重写产物） |
| 「某个 topic 要补充研究 / 新增方向 / 换 profile」 | `phase-rerun`（整条增量重跑） |
| 「彻底重新研究」 | 新建 bundle |

---

## 1. 动机（UX 第一性）

### 1.0 用户不知道最终报告长什么样，直到他看到第一版

这不是技术缺陷，而是**交付产品的本质**：报告的形状、深度、视角、取舍，用户只能在自己看到实物后才判断满不满意。把「用户看到首版」之前的一切（HITL1/HITL2 的选视角、选口径）都做对，也无法让用户预先确定「这一版对不对」。因此需要**让用户看到后能当场反馈**——这正是本 plan 存在的理由：把 Final 从「一次性投递」改成一个用户可以对着成品反复提意见、Agent 就地改的交付面。

### 1.1 真实触发场景（2026-08-16，`enterprise-safe-ai-harness-v2`）

在给 `enterprise-safe-ai-harness-v2` 做 `technical_deep_dive` 视角的 Final 交付时，用户先选了 HITL2 的 A（`proceed_to_readiness`），之后在 HITL2 交付视角询问时选了 E（`technical_deep_dive`）。Agent 按该视角重写了 `final/report.md`，但**重写后用户评价「这个 Final 看起来跟别的好像差不多」**——即 `technical_deep_dive` 版与之前的 `profile_default` 版结构/深度差异不明显，没有真正体现技术深入视角的差异。这暴露两个问题：
1. **Agent 的 view 重写质量不足**：`technical_deep_dive` 版沿用了大量综述骨架，只是改措辞加子标题，没在组织方式/深度/呈现上拉开差距。用户看完想改，但没有合法回路。
2. **交付没有反馈回路**：用户只能接受「不太满意」的第一版，或被迫整条 rerun——两者都糟糕。

用户在对话中明确表达的期望（原话要点）：
- **UX 第一性**：「用户也不知道他最后拿到的报告长啥样。他看到不满意的时候，他在 final 的这个 note 上可以提出他的意见，说，哎，改改这改改那个，加加这个加加那个。」
- **版本化命名**：「final 输出的文件名缺省叫 final.md，但如果不是这个的话，最好是写成 final…V1 V2，你跟踪一下版本就行了。」

### 1.2 交付是一次性的，用户无法打磨
当前 Final 是 `interaction: terminal_delivery`：Agent 写出 `final/report.md` 即交付结束，没有交互。用户看完第一版想「读者换成管理层」「篇幅精简但保留关键证据」「换个 view」「加一节对比」——没有合法回路。Agent 若直接改 final 产物，等于在 terminal 节点做未授权 mutation；若不改，交付质量就锁死在第一版。

### 1.3 文件名不随版本变化，无法追溯
迭代后多次交付写到同一位置，版本历史丢失。用户明确要求 `final.md`（首版）→ `final_v1.md`、`final_v2.md`（迭代版）的文件名约定，让「第几版」可追溯、可回滚、可对照。

### 1.4 命名允许带特征标签，标明「这份 final 是冲哪个特点做的」

用户进一步要求：除纯版本号外，也容许 **`final_<特征>_v<N>.md`** 形式——其中 `<特征>` 代表该 final 拥有的特点/视角（例如 `technical_deep_dive`、`executive_brief`、`custom_slug`、或其他用户自定义特征）。这使文件名本身就能表达「这份 final 是冲哪个特点/视角输出的」，而不仅是「第几版」。示例：`final_technical_deep_dive_v1.md`、`final_executive_brief_v2.md`。

---

## 2. 第一性原则（写入 guidelines 候选）

1. **交付 = 可迭代的产物，不是一次性事件。** Final 节点应当支持有界的交付打磨回路：用户请求修正 → Agent 就地重写最终产物 → 重新校验一致性 → 交付下一版。
2. **迭代回路必须有界、不新增生命周期 checkpoint。** 它复用 Final 节点内既有的 terminal delivery 姿态，不新增第三个 HITL、不新增 Gate/transition，不要求用户反复确认。用户显式请求修正才触发一次就地重写。
3. **迭代与 rerun 必须语义分界。** 迭代只改报告组织/呈现/深度，不动研究证据；补充研究/换 profile/加 topic 属于 `rerun`，走既有 `phase-rerun`。
4. **版本化输出必须可追溯、可回滚。** 首版 `final.md`，此后每次迭代追加 `final_v<N>.md` 或 `final_<特征>_v<N>.md`；旧版本始终保留，供对照与回滚。版本号由 Agent 或用户可见的单调计数器管理；`<特征>` 是可选的语义标签（view 名 / custom slug / 用户自定义特点），用于标明该 final 的输出特点。
5. **交付一致性必须可校验。** 每次迭代后，Engine SHALL 能校验产物与当前 `composition_handoff`（view/reader/focus/length/evidence）一致；view 变更需经用户确认后更新 `final_report_view` 与 handoff。

---

## 3. 能力（从原则派生）

| 能力 | 解决的痛 | 说明 |
|------|---------|------|
| **A. Final 迭代回路（bounded revision loop）** | 交付一次成型、无法打磨 | 在 Final 节点内提供「就地重写最终报告」的 Agent-owned 操作：用户请求修正 → Agent 读当前 final + composition handoff + 用户语义 → 重写产物 → 校验一致性 → 交付下一版。有界（不改证据、不新增 checkpoint）、有审计（写 trace/日志）。 |
| **B. 版本化 Final 输出命名** | 多轮交付互相覆盖 | 命名规则：首版 `final.md`；此后每次迭代 `final_v<N>.md`（N 从 1 递增）；也容许带特征标签 `final_<特征>_v<N>.md`（如 `final_technical_deep_dive_v1.md`）。`<特征>` 为可选语义标签（view 名 / custom slug / 用户自定义特点），标明该 final 的输出特点。单调版本计数器（可由 `composition_handoff` 迭代次数或独立 counter 承载）。旧版本保留。 |
| **C. 交付一致性校验（revision 后）** | 迭代后产物与 view 脱钩 | 每次迭代后跑一次只读校验：产物组织是否匹配当前 `final_report_view` / `composition_handoff`；view 变更时更新 profile owner 并重校验。 |
| **D. view/交付语义的显式用户确认** | view 变更无用户确认 | 用户请求换 view 时，Agent 用既有 view 枚举（profile_default/executive_brief/evidence_map/claim_judgment/technical_deep_dive/custom）向用户确认，再更新 `final_report_view` 并重写。 |

---

## 4. OpenSpec change 切割建议

按 failure mode 聚，建议 **2 个 change**，顺序 B→A/C/D（先定产物命名契约，再定迭代回路与一致性）：

- **Change 1 — 版本化 Final 输出命名契约**：定义 `final.md` / `final_v<N>.md` / `final_<特征>_v<N>.md` 命名规则、特征标签取值、版本计数器归属、旧版本保留策略。这是产物契约，独立可交付。
- **Change 2 — Final 迭代回路 + view 确认 + 一致性校验**：在 Final 节点内加有界的就地重写操作（复用 terminal delivery 姿态，不新增 checkpoint）；view 变更需用户确认并更新 `final_report_view`/`composition_handoff`；迭代后跑一致性校验。语义上明确与 `rerun` 分界。

**明确排除/不做的：**
- 不新增第三个 HITL checkpoint、不新增 Gate/transition（迭代是 Final 内的有界操作）。
- 不把「补充研究 / 换 profile / 加 topic」纳入迭代回路（那是 `rerun`）。
- 不改 research state / queue / trace 的权威性；迭代只作用于交付产物 + 必要的 profile view owner。

### 4a. 实现陷阱 / 风险（接手 Agent 必读）

现有 `phase-final.md` 的 ant-cheating §9 和 §8「Stop Behavior — Terminal Delivery」**硬性禁止** Final 内反馈循环。改动前必须先理解这些墙，否则会撞到：
1. **`MUST NOT 在 Final 内启动 post-delivery feedback loop`** —— 当前 Final 明确不得等待用户反馈后再修改报告。本 plan 要引入的迭代回路与这条直接冲突，**必须先修改 `phase-final.md` 的 §8/§9 措辞**，否则任何实现都会被现有 anti-cheating 规则判为违规。
2. **`用户 final 后反馈 MUST NOT 通过 final node 处理，明确 rerun 只走 audited post-final recovery`** —— 这条把 post-delivery 反馈全部推给 `operate-post-final-recovery`（整条 rerun）。本 plan 需要在「报告打磨」与「rerun 研究」之间**划出新的边界**：纯报告组织/呈现/深度调整不触发 rerun；补充研究才触发。修改这条措辞时务必保留真正的 rerun 通道不被破坏。
3. **`MUST NOT 写 final_delivery trace event 或用 log/chat summary 证明 delivery`** —— 交付事实由 `final/` 文件存在证明。版本化命名如果依赖 trace event 记录版本，会冲突；版本计数应放**独立的单调计数器**（profile 字段或 `final/` 目录清单），不依赖 trace。
4. **Final Markdown 只允许 `persist-final-report` 提交**（`operate-artifact-persistence.mjs`），generic `persist` 不能提交 Final Markdown。迭代时每份 `final_v<N>.md`（含带特征标签形式）都应走 `persist-final-report` 的 Evidence Map admission。
5. **`composition_handoff` 是 strict schema**（`CompositionHandoffSchema`，`z.object().strict()`），`final_report_view` 有固定 enum（`profile_default/executive_brief/evidence_map/claim_judgment/technical_deep_dive/custom`）。迭代时若用户换 view，必须更新这些 profile owner 并保持 schema 合法；view 变更属用户明确决策，不是 Agent 默认。
6. **确定性 handoff / trace-driven 状态机**：框架判定「当前在哪个节点」看 `rb_trace.jsonl` 最新合法 handoff，不是 `rb_status.json` 的 `current_node`。若迭代回路的实现想「回到某个 node 重新跑」，会被 handoff 校验拒绝——所以迭代应是 Final **节点内**的就地重写，不应试图移动节点。
7. **Final 的 `Evidence Map` 是 mandatory**：每份 Final Markdown 都必须含三列（Finding ID / Declared Key Finding / Submitted Backing）。版本化后每份 `final_v<N>.md`（含带特征标签形式）仍需满足，不能因迭代而省略。
8. **回归风险**：已有测试和 case（`final-report-composition`、`fast-final-composition`）依赖「Final 是 terminal、无反馈循环」的语义。改这块必须跑既有 verification-routing 下的测试，避免破坏已归档的 post-final 契约。

---

## 5. 验收（当前 Harness 的期望行为）

- 首版交付产出 `final/report.md`（或按需 `final.md`）。
- 用户请求「换个 view / 改章节 / 换读者」后，Agent 就地重写并产出 `final/report_v1.md`（或带特征标签，如 `final/report_technical_deep_dive_v1.md`），原首版保留。
- 再次迭代产出 `final/report_v2.md`（或 `final/report_<特征>_v2.md`），依此类推。
- view 变更经用户确认后，`rb_profile.yaml#/human_decision_checkpoints/hitl2/final_report_view` 与 `composition_handoff` 同步更新，且一致性校验通过。
- 用户若表达「补充研究/新增方向」，走 `phase-rerun`，不进入迭代回路。

---

## 6. 接手 Agent 的操作指引（从哪开始）

这个 plan 是要让**另一个 Agent** 读完后能动手改进 Final 交付体验。建议推进顺序：

1. **先读现状**：读 `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-final.md`（尤其 §8/§9）、`operate-artifact-persistence.mjs`、`final-delivery-backing.mjs`、`composition-handoff.mjs`、`post-final-recovery.mjs`，理解当前 terminal 语义与 anti-cheating 墙。
2. **跑一遍真实触发**：`dpt_rb_enterprise-safe-ai-harness-v2`（当前在 `technical_deep_dive` final）——先交付一版，然后模拟用户提「改这个/加那个」，看当前是否有合法回路（预期：没有）。
3. **走 OpenSpec propose**（本仓库 workflow）：按 §4 切 2 个 change（先命名契约，再迭代回路）。在 `openspec/changes/` 里写 spec/design/tasks，`DEEP_RESEARCH_HARNESS/` 直到 `/opsx:apply` 才改。
4. **改 `phase-final.md` 措辞**：这是硬前提——必须先解除 §8/§9 对 Final 内反馈循环的禁令，并明确「报告打磨 vs rerun」新边界，否则实现会被现有规则判违规。
5. **实现迭代回路 + 版本化命名**：见 §3 能力 A/B/C/D；版本计数用独立单调计数器（profile 字段或 `final/` 目录清单），不依赖 trace event。
6. **补验收测试**：按 §5 写用例（首版 `final.md` → 迭代 `final_v1.md` → 再迭代 `final_v2.md`；带特征标签 `final_technical_deep_dive_v1.md`；view 变更更新 profile owner；report 打磨不进 rerun）。

**约束提醒**：Node.js >=20 纯 ESM `.mjs`、无 Python、无新增依赖（仅 zod/yaml）、测试在 `tests/`（repo root）下、`DEEP_RESEARCH_HARNESS/` 在 `/opsx:apply` 前只读。

---

## 7. 评审后定案（2026-08-16，取代前文冲突建议）

> 本节是对前文 pre-OpenSpec 设想的正式复核结论。凡与本节冲突，以本节和
> `openspec/changes/iterate-final-delivery-in-place/` 的 change artifacts 为准。

### 7.1 对问题的最终理解

这个需求不是“Final 完成后再开一个反馈流程”，而是：

1. **第一次合法进入 Final，先直接产出并展示首版，不能先问用户。**
2. **首版交付后仍停在同一个 `phases/phase-final.md` node。** 用户不满意就对着已经看到的报告继续提意见；Agent 每次产出一个新版本、再次展示、继续等反馈。
3. **用户满意只结束当次交互。** 不离开 Final、不新增 lifecycle state、Gate、trace event、满意字段或 outgoing transition。
4. **这里的 `final` 是用户当时拿到的主报告。** 它不固定等于某个“烦恼点”、`technical_deep_dive` 或其他 view；可选 feature 只描述这一版的呈现特点，不是新的报告类型、计数器或 authority。
5. **只有越过当前 verified research boundary 才离开 Final。** 改读者、结构、篇幅、措辞、解释深度、现有证据显隐仍在 Final；新增来源、Topic、证据、研究结论或 research-profile 语义才走现有 audited C5/post-final rerun。

因此应把两层语义分开：

```text
lifecycle：Readiness -> Final（terminal，之后无普通 transition）
delivery interaction：首版 -> 用户反馈 -> v1 -> 用户反馈 -> v2 -> …… -> 用户满意
```

第二行是同一 Final node 上的用户会话，不是状态机自环、自动 rewrite loop 或第三个 HITL。

### 7.2 命名定案

Primary Final series 统一为：

```text
首版：       final/final.md
无标签修订： final/final_v1.md
带标签修订： final/final_technical_deep_dive_v2.md
下一版：     final/final_v3.md
```

- `N` 在有标签和无标签文件之间**全局单调递增**，不能按 feature 分叉计数。
- `<feature>` 使用安全 lowercase `snake_case`，只说明呈现特点；用户不需要选择文件名或版本号。
- 已提交版本全部不可变；新反馈只能追加一份完整新报告，不能覆盖、删除或重编号历史。
- canonical `final/final*.md` 只允许由 Engine 的 `publish-final-report` 分配和提交。
- 老 bundle 若没有 `final/final.md` 且恰有一份可辨认的 root-level Markdown 主报告（如 `final/report.md`），将它只读视为 legacy v0，第一次修订直接追加 v1；多个候选时 fail closed，不按 mtime、目录顺序或内容猜。
- 目录 inventory 同时是版本号和 latest report 的 Source of Record；不新增 profile counter 或 `current-final` pointer。

### 7.3 对前文方案的修改意见

以下前文建议经评审后明确废弃：

| 前文设想 | 评审后决定 | 原因 |
|---|---|---|
| 拆成“命名”和“迭代”两个 change | 合并为一个 change：`iterate-final-delivery-in-place` | 两者共享一个用户可见闭环、一个 publisher 和同一兼容边界；拆开会产生中间不可用状态 |
| 用 profile 字段或独立 counter 跟踪版本 | 只读 canonical Final inventory 分配版本 | 避免 filesystem/counter 双真源和 crash recovery 原子性问题 |
| Final view 变化时回写 `final_report_view` / `composition_handoff` | presentation revision 不回写 HITL2 handoff/profile/receipt | 后续偏好不应伪装成首版交付时已接受的研究语义 |
| Engine 校验报告是否符合 view、是否足够 technical | Engine 只校验路径、inventory、版本、不可覆盖、backing 和 durable commit | “够不够深入/用户满不满意”是 Agent 与用户的语义判断，不能伪造成 deterministic verdict |
| 写 Final revision trace/log 作为版本 authority | committed primary inventory 是 authority；日志仅诊断 | Final delivery 仍不新增 trace event，避免平行版本账本 |
| 所有 post-delivery feedback 都走 rerun | 仅 evidence/research expansion 走 C5；presentation 留在 Final | 报告打磨不应重跑研究，真正的新研究仍必须审计 |
| clean Final reentry 默认推荐 C5 | clean Final 默认恢复 Final owner；accepted C5 workspace/lineage 成立后才由 C5 接管 | 机械上“可以 rerun”不等于用户已经请求 rerun |
| `stop: "yes"` 表示进入 Final 后先等待 | Final 专用语义是“deliver first, then wait/refine” | 用户只有看到首版后才知道如何反馈 |

### 7.4 落地架构

OpenSpec change：`openspec/changes/iterate-final-delivery-in-place/`

最短合法闭环：

```text
legal Final entry
  -> Final Agent 从 accepted handoff + verified evidence 写 retained staging
  -> Engine publish-final-report
       -> resolve canonical inventory
       -> admit Evidence Map submitted backing
       -> allocate target/version
       -> atomic no-clobber commit
  -> Agent 展示 latest report 并邀请反馈（current_node 仍是 Final）
  -> presentation feedback：重复一次完整 staging + append publication
  -> satisfied：停止当前交互，不写 runtime fact
  -> evidence expansion：existing C5 inspect/apply/recover -> legal rerun chain
```

实现分为五个直接 owner：

1. **Primary series resolver**：新增纯 helper `engine/helpers/final-report-series.mjs`，唯一解释 base/legacy/version/latest/blocker。
2. **Deep publisher**：在既有 artifact-persistence Module 内新增 `publish-final-report`；调用者不能传 target/version/CAS/force。
3. **No-clobber commit**：primary publication 使用同设备原子 no-clobber 创建，关闭现有 check-then-rename 在并发窗口可能覆盖的风险；失败者重新 inspect/allocate，不加持久锁或 counter。
4. **Final interaction guidance**：`phase-final.md` 改为 Final 专用 `stop: "yes"`，loader 保留既有 `terminal_delivery / deliver_final_artifacts` cue，但解释为 inventory-aware deliver-first/refinement。
5. **Reentry/C5 precedence**：publication recovery > inventory blocker > accepted C5 lineage > clean Final owner；Engine 不读 chat、不推断满意或反馈类型。

### 7.5 验证边界

- `unit`：primary series truth table、publication workspace/result、no-clobber、每版 backing、Final/C5 owner precedence。
- `integration`：production CLI、Final loader/header/cue、Markdown/command parity、C5 request boundary、clean Final reentry。
- `deterministic_e2e`：合法 Final entry 后依次提交 base/v1/labelled-v2，证明旧 bytes 不变、`current_node` 不变、明确 request 后才 C5。
- `agent_flow_e2e`：新增 `case-138-standard-final-refinement.md`，使用无网络、单 Subject session、一个 finding/一行 Evidence Map 和 compact reports；五次 supplied turn 依次观察首次直接交付、两轮 presentation revision、满意后由 observer 固化无 mutation snapshot，以及随后在同一 lineage 上选择/accept C5 且不再写 report。

case 138 的 total Subject runtime hard cap 为 accepted active-suite threshold `120s`，且只授权一次 canonical native run；失败、超时或缺少 native health/completion 就保留诊断、quarantine 并记 `NOT_RUN`，对应 Agent-flow claim/task 保持未完成以待显式重规划，不能自动 retry。静态 Markdown、fixture 和 Node tests 不能证明报告变好了或真人满意；case 138 也只证明该次真实 Agent procedure，不能外推通用写作质量。历史 case 137 继续是 quarantined no-evidence，不能重新包装成 proof。

### 7.6 Progress Tracking

> OpenSpec `tasks.md` 是 Apply/Archive 的权威工作账本；这里是方便从原 plan 查看全局阶段的镜像。不要只勾这里而不更新 `tasks.md`。

#### 分析与 OpenSpec 规划

- [x] 阅读 Project Charter、`CONTEXT.md`、原始 plan、相关 accepted specs 和实现 seam
- [x] 锁定“首次直接交付、同一 Final node 驻留、满意不落状态、研究扩张才 C5”
- [x] 建立 OpenSpec change `iterate-final-delivery-in-place`
- [x] 完成 `proposal.md` 和 9 份 delta specs
- [x] 完成 `design.md`
- [x] 完成 `semantic-closure.yaml`（含 planned `final.primary-report-series` family）
- [x] 完成 `verification-plan.yaml`（四类 verification，12 条 claim）
- [x] 完成 `tasks.md`（Apply 前 review、实现、验证、sync、closeout）
- [x] 完成最终 strict/governance/readiness 双轮审查（第二轮修正 publisher/lifecycle authority 与 case 138 风险边界；第三轮零编辑通过）

#### Apply（尚未开始）

- [ ] 完成 `openspec-feedback:plan-review`，关闭所有 review finding
- [ ] 实现 primary Final series resolver
- [ ] 实现 `publish-final-report`、reserved namespace 与 crash-safe no-clobber commit
- [ ] 更新 Final node、workflow header/cue 和 Agent-facing entry/command guidance
- [ ] 更新 clean Final reentry 与 accepted C5 owner precedence
- [ ] 完成 unit + integration + deterministic E2E
- [ ] 创建、登记并真实运行 case 138；无真实 Agent 能力时只能记 `NOT_RUN`
- [ ] 运行完整 `node --test tests` 与 assets-mode governance checks
- [ ] 将 9 份 delta specs 同步到 main specs 并语义复核

#### Archive（尚未开始）

- [ ] 完成 `openspec-feedback:closeout-review`，关闭所有 ordinary finding tasks
- [ ] 通过 archive-mode requirement check 和 project-spec check
- [ ] 仅通过 `finalize-change-archive.mjs` 完成归档

当前阶段结论：**OpenSpec change 已 `ready for apply`，但尚未修改 Harness、tests 或 experiments；下一阶段必须由新的显式 `/opsx:apply` 请求启动。**
