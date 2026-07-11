# Plan: 用户可见输出尽量中文（软提示，不动内部逻辑）

**性质:** 试探 / 范围澄清 / **纯 nice-to-have**  
**状态:** 已按用户反馈收窄（2026-07-09）  
**触发:** HITL 已中文沟通，但偶有英文漏到用户眼前  
**相关:** `HIU-004`（HITL 已有中文优先）、`shared-agent-ux-guidance.md` §2

> ⚠️ **这是 nice-to-have，不是必须修的东西。**  
> 如果任何做法有可能破坏现有逻辑、phase 流程、gate 行为、internal instruction 的准确性——**那就不做。**  
> 只有确定安全、不动任何执行逻辑、纯粹加一句软提示时，才值得动。  
> 偶发英文漏给用户是完全可以接受的；为了压这个去冒险改动内部提示词，得不偿失。

---

## 0. 已拍板的边界（本 plan 的硬约束）

1. **内部提示词 / instruction 继续以英语为主**  
   - 生产侧 Agent 指令英语更准、LLM 更熟  
   - **逻辑部分能不碰就不碰** — phase 流程、gate 边界、silent 纪律、routing 一律不动

2. **不要去「调整内部提示词」当 UX 修复**  
   - 内部 MD 有时是提示词，有时是关键 instruction  
   - 整段翻译或改写 wave/setup/seed/readiness 等 body = 不值得，且有回归风险

3. **真正要管的只有：偶尔漏给用户的那一块**  
   - 目标不是全表面中文化契约  
   - 目标是给 LM 一句**软暗示**：呈现给用户的内容尽量用中文  
   - **尽量就行** — 不是硬 SHALL、不是 Engine 拦截、不是语言检测

```
┌─────────────────────────────────────────────────────────────┐
│  DO（轻）              │  DON'T（重 / 禁止）                  │
├────────────────────────┼────────────────────────────────────┤
│ 加一句 user-facing     │ 翻译 / 改写内部 phase instruction   │
│ 「尽量中文」软提示      │ 动 wave0/1/2 逻辑与提示词 body      │
│ 挂在已有 UX / HITL     │ 新 locale 字段、i18n、Engine 拦语言  │
│ 相关 shared 即可       │ 把 Final/silent 改成硬语言契约      │
│ HITL brief 已中文则    │ 为「中文」重开大 change 动 routing  │
│ 保持，不重写逻辑        │                                    │
└────────────────────────┴────────────────────────────────────┘
```

---

## 1. 问题怎么理解（收窄后）

不是「用户可见表面全面中文优先契约」，更不是「内部提示词中文化」。

> **内部继续英语 instruction；只在「对用户说话」时尽量中文。**  
> 用一句软提示提醒 LM 即可，不改执行逻辑。

HITL 模板（`brief/hitl1.md` / `brief/hitl2.md`）和 `HIU-004` 已经覆盖主交互面。缺口主要是：

- Final 交付时 chat / 报告套话偶发英文  
- 静默期用户插话时的单轮状态回复偶发英文  
- HITL 动态填入段偶发整段英文  

这些用**软提示**压即可，不必升格成新的硬 requirement 体系。

---

## 2. 建议做法（最小）

### 推荐：一处软提示，挂在已有 UX 表面

在 **已有** `shared-agent-ux-guidance.md`（或 HITL/Final 都会读到的极薄 shared 一句）加类似：

> When speaking to the user (HITL replies, terminal delivery summary, silent-phase status reply if any), prefer Chinese.  
> Keep internal enums, paths, commands, and source titles in canonical English.  
> Do **not** rewrite internal instructions or phase logic for language.

要点：

- 文案本身可以是**英语写的 soft hint**（给 LM 看的 instruction 仍英语）  
- 约束对象是 **user-facing output**，不是 node body  
- 强度 = **prefer / 尽量**，不是 MUST 全中文

### 可选（仍轻，且仅当不够用）

- Final §8 / silent §4 各加**半句** prefer-Chinese（仍不改逻辑段落）  
- 不新增 `report_locale`、不做 decision-brief 强制中文、不做 E2E 语言检测

### 明确不做

- 不翻译 wave0/1/2 / setup / seed / readiness / rerun 的 instruction body  
- 不改 gate / routing / silent 纪律逻辑  
- 不做 i18n、不做 Engine 语言拦截  
- 不把 HIU-004 扩成「全生命周期硬中文契约」（过重，且会诱使改内部文案）

---

## 3. 若以后要立项：任务应极短

> 正式走 OpenSpec 时也保持这个体量，避免膨胀。

1. 在 `shared-agent-ux-guidance.md`（或等价已加载表面）加 **prefer Chinese for user-facing output** 软提示一段  
2. （可选）Final / silent 用户可见出口各加半句交叉引用，**不改逻辑**  
3. 静态检查最多断言「软提示句子存在」— **不做** LLM 输出语言检测  
4. 回归：确认未改 wave/gate/routing 相关文件

预计 diff 很小；若 tasks 开始碰到 phase 逻辑段落，说明 scope 漂了，应停。

---

## 4. 开放问题（已大多关闭）

| # | 原问题 | 收窄后结论 |
|---|--------|------------|
| 1 | Final 默认中文是否硬性？ | **否** — prefer / 尽量 |
| 2 | decision-brief 是否 Tier A？ | **否** — 不强制；软提示覆盖「给人看的话」即可 |
| 3 | 英文源在 Final 里怎么处理？ | 保持原文引用；叙述尽量中文（软） |
| 4 | wave artifact 标题？ | **不碰** wave 产出约定 |
| 5 | 要不要 `report_locale`？ | **不要** |

仍可确认的一点（非阻塞）：软提示挂在 `shared-agent-ux-guidance` 是否够（HITL 已 requires）；Final / silent 是否需要半句交叉引用，还是一处全局 hint 就够。

---

## 5. 非目标 / 反模式

- 把内部英语 instruction 翻成中文「显得对用户友好」  
- 为语言问题重写 phase 逻辑或 gate 文案  
- 新 capability + 大 spec + 多 phase 硬 SHALL  
- 和 BUG-020、timeout 等逻辑 bug 绑同一 change

---

## 6. 建议下一步

1. 若认同「一处软提示就够」→ 小 change propose（名称可如 `soft-hint-user-facing-chinese`）  
2. 若觉得 HITL 已够、偶发英文可忍 → **可以不立项**，本 plan 仅作边界备忘  
3. 无论哪种，**不要**先动 wave / 内部 instruction body

---

## 7. 一句话结论

**内部英语 instruction 不动；只对「漏给用户」的输出加 prefer-Chinese 软提示。尽量即可，不值得为 UX 去改内部逻辑或翻译提示词。如果有任何破坏现有行为的风险——不做了。这是 nice-to-have，不是必须。**
