# DONE: HITL UX——HITL 是一个环，不是一张问卷

> 状态: 已完成（已移入 done/），OpenSpec change `establish-hitl-ux` 已于 2026-06-28 归档 | 优先级: 最高 | 创建: 2026-06-27 | 更新: 2026-07-01
>
> 本 TODO 的核心问题：**HITL1/HITL2 不是一个线性问卷——它是用户可以打转、探索、问 "BTW 问题"、获得帮助后再做出决定的环。当前把它当成了结构化表格填。**
>
> 直接依赖: research-styles ✅ DONE（profile 参数体系已就位）
> 上游 of: 无——UX 层独立于 evidence pipeline，两者并行

## 整体 UX 愿景：系统只有 3 个浮出水面点

一句话：**整个研究运行只有 HITL1、HITL2、Final 三个与用户交互的点。其余全部静默自主，绝不浮出水面。**

```
用户视角的时间线：

  HITL1                 HITL2                Final
    │                      │                    │
    ▼                      ▼                    ▼
┌───────┐  静默自主执行  ┌───────┐  静默自主  ┌───────┐
│ 交互  │◄──────────────▶│ 交互  │◄──────────▶│ 交付  │
│ (环)  │  绝不浮出水面   │ (环)  │  绝不浮出   │ 报告  │
└───────┘               └───────┘            └───────┘
    │                      │                    │
    │── setup(快)          │── readiness(快) ──│
    │── seed-topics(快)    │
    │── wave0 ═══ wave1 ═══ wave2              │
    │   (长程静默自主，可能数小时到一两天)        │
```

### 核心契约：静默自主

在浮出水面点之间，Agent 必须：

- **绝不浮出水面**：不报告进度、不提问、不确认、不等待用户输入
- **遇错自己处理**：网络波动 → 重试；爬取失败 → 换源；方法不行 → 降级；都不行 → 记 trace 继续
- **卡住了就等**：阻塞条件消除后（网络恢复、API 恢复等）自动继续——不打扰用户
- **用户可关终端**：所有状态落在 durable state 里（`rb_status.json`、`rb_profile.yaml`、`rb_trace.jsonl`），用户关了终端走人，下次打开从 durable state 恢复

用户的核心期望就一句：**"别问我，直接干完就好。"**

### 为什么只有 3 个浮出水面点

- `setup`、`seed-topics`、`readiness` 这些 node 执行很快（秒到分钟）——用户感知不到停顿
- `wave0/1/2` 才是长程挑战——时长取决于研究范围，可能几十分钟到一两天
- 只在这 3 个点停，用户预期极其简单：*"我给你输入 → 你去干活 → 你回来找我确认 → 你去干完 → 给我报告"*
- 当前最怕的是：系统在某个 wave 中间莫名其妙停下来等着人说"我知道了，继续"——用户不在，系统永远卡在那

### 时长不确定性

wave0/1/2 的实际时长完全取决于 research scope——快速事实核查可能 20 分钟，全景探索可能一两天。
因此 HITL 出口语**不给出具体时间估计**。格式：

> 接下来进入静默自主执行（Wave 0 → Wave 1 → Wave 2）。时长取决于研究范围——可能几十分钟，可能一两天。期间我不会浮出水面，遇错自动重试/降级。**你可以关闭终端**。下次见面是 HITL2。

HITL2 出口时同理：

> 已记录你的决策。接下来生成最终报告，期间我不会浮出水面。完成后交付。

### 架构已经支持这个模型

当前框架的机制天然支持这个 3-point 模型：

| 机制 | 如何支持 |
|------|---------|
| `stop: yes` 只在 HITL1/HITL2/Final 的 MD node 上 | 合法的停止点——其余 node 没有 `stop: yes` |
| Gate → chain → next phase | 每个 phase 结束后强制前进，Agent 不能跳过 gate |
| `rb_status.json` + `rb_profile.yaml` + `rb_trace.jsonl` | durable state 可在 session 断掉后恢复 |
| Queue `stop_authorization_state`（待实施） | 未来可硬强制"非 HITL 阶段不得停止" |
| `shared-anti-cheating-rules.md` 第 7 条 | 已禁止 Agent 编造 HITL 答案 |
| `shared-repair-guidance.md` | 已定义 Agent 自主修复/重试行为 |

唯一缺的：Agent 行为约定——**"在静默阶段绝不浮出水面，别把错误报告给用户，自己处理"**。这就是本 TODO 产出的 `shared-hitl-guidance.md` 里要写的一节。

---

## Why：V12 的 HITL 交互打磨过，当前版本丢了

### 当前问题：用户要敲太多字

当前 HITL1 的实际效果（从真实 run 中抓到）：

```
请回答以下结构化问题：

① Research Profile（研究深度/风格）
┌────────────────────┬──────────────────────────────────────┐
│      选项          │                含义                  │
├────────────────────┼──────────────────────────────────────┤
│ quick_factual      │ 快速事实核查 — 轻量、单维度          │
├────────────────────┼──────────────────────────────────────┤
│ exploratory_map    │ 探索性全景 — 覆盖面广、多维度 mapping │
├────────────────────┼──────────────────────────────────────┤
│ claim_verification │ 主张验证 — adversarial verification  │
└────────────────────┴──────────────────────────────────────┘

② 有哪些你必须要得到答案的具体问题？例如：
  - "这部电影为什么能成为票房黑马？"
  ...

③ 语言偏好：仅中文源 / 中英混合 / 不限？

④ 来源偏好：一手源优先（采访/官方物料）/ 学术优先 / 无偏好？

⑤ 其他约束？（如地域聚焦、时间限制等）
```

**问题：**
- ① 的表格展示可以，但没有说"A/B/C 选一个"——用户不知道可以直接敲字母
- ②-⑤ 全是开放式问题，用户必须写一大段话
- 没有提供默认路径（"不确定就写 X"）
- 没有搜索偏好的具体例子引导（"优先官方/学术来源""只看 2023 年以后"）

### V12 怎么做

V12 的 HITL1 是一个**三合一单 prompt**，用户只需敲一个字母（A/B/C）+ 一句话（可选 "我不确定"）：

```
开始前我需要确认这轮研究的目标。你更想要哪种结果？

A. 快速事实答案（quick factual）：适合低风险、范围很窄的问题。
B. 探索地图（exploratory map）：适合先摸清领域结构、空白和下一步重点。
C. 说法验证（claim verification）：适合判断一个说法是否被证据支持、削弱或需要限定。

另外，请用一句话写下：最终报告必须回答什么问题（final must-answer）？
如果你还不确定，也可以写"我不确定，先帮我拆问题"。我会把这个不确定记录为待澄清缺口。

如果你对搜索材料有偏好，也可以顺手说一句，例如"优先官方/学术来源""只看 2023 年以后""重点看中国/美国/欧盟""排除供应商营销页"。不写也可以，我会按研究模式的默认证据规则执行。
```

**关键差异：**

| 维度 | V12 | 当前 |
|------|-----|------|
| 选项呈现 | A/B/C 字母选择，中文优先 + 英文括号注释 | 表格列出英文 canonical name，无字母标签 |
| 交互方式 | 敲一个字母就能选 | 用户要打出 `quick_factual` 或描述意图 |
| Must-answer | "一句话写下"，提供 "我不确定" 的明确路径 | "有哪些你必须要得到答案的具体问题？"——开放式，无默认 |
| 搜索偏好 | 可选，带具体例子，不写就跳过 | ④⑤ 分开问，一样开放式，无形中增加负担 |
| 语言 | 全程中文，enum 值完全不可见 | 英文 canonical name 直接暴露在表格里 |
| prompt 结构 | 一个消息完成全部三问 | ①-⑤ 拆成 5 个独立问题，用户感觉在填问卷 |

## 核心挑战

**不是功能缺失——是文案/交互设计缺失。** 当前框架的 profile schema、gate rule、CLI 都到位了。缺的是：
1. HITL1/HITL2 phase MD 里没有**预设的用户 prompt 文本**
2. 没有字母选择的 UX 约定
3. 没有 "我不确定" / "跳过" 的优雅降级路径
4. 没有共享的 HITL 对话指引（`shared-hitl-guidance.md` 不存在）

## Why：HITL 是一个环，不是一张问卷

### 当前模型的隐含假设：HITL = 线性表格

当前 HITL1 phase MD 暗含的交互模型是：Agent 列出 ①-⑤ 五个问题 → 用户逐一回答 → Agent 收集完写入 profile → gate pass → 继续。这是**问卷模型**——单向、线性、一问一答。

这个模型对熟悉框架的用户勉强能跑（他们知道每个问题在问什么，敲完就过了），但对**陌生用户是灾难**：
- 用户看到 `quick_factual` vs `exploratory_map` vs `claim_verification` 三个选项——他不知道该选哪个，因为他不理解每个选项对他的具体话题意味着什么
- 用户想问"我这个场景该选 A 还是 C？"——但当前 prompt 没有给他留这个空间
- 用户有一个 BTW 问题——"对了，你能先解释下 adversarial verification 是什么意思吗？"——但当前 prompt 的五问结构暗示他必须先答完五题

### HITL 的真实交互形态：可探索的环

HITL 是一个**房间**——用户走进来，可以：
- 环顾四周（看 Agent 准备好的 topic rewrite + seed topics）
- 问问题（"这个 profile 在我的场景下意味着什么？""BTW，你说的 claim verification 和 fact check 是一回事吗？"）
- 得到解释后重新考虑选项
- 来回试探不同路径（"如果我选 A 会跑多久？选 C 呢？"）
- 改变主意（"之前我倾向 B，现在觉得 C 更合适"）

最终——在满足条件时——走出房间（明确确认，进入 setup）。

```
         ┌──────────────────────────────────────┐
         │             HITL 环                   │
         │                                      │
         │  Agent 展示 ◄──── 用户提问            │
         │  (topic +        (profile 差异?       │
         │   seed topics +   BTW 问题?           │
         │   选项)           跑多久? ...)         │
         │     │                     │           │
         │     ▼                     ▼           │
         │  Agent 解答 ◄──────────────┘          │
         │  (解释差异、                           │
         │   给建议、                              │
         │   回答 BTW)                             │
         │     │                                  │
         │     ▼                                  │
         │  用户是否满足于做出决定？                │
         │     │                    │             │
         │    是                   否             │
         │     │                    │             │
         │     ▼                    └──→ 继续环    │
         │  出口：写入 profile                    │
         │  gate pass → setup                    │
         └──────────────────────────────────────┘
```

### V12 也没有环——这是我们要比 V12 做得更好的地方

V12 的 HITL1 是一次性 prompt（A/B/C 选一个 + 一句话 must-answer + 可选偏好）。它对"老用户"友好（敲一个字母就过），但对新用户仍然不友好——它假设用户已经理解三个 profile 的含义。V12 的改善方向是：在选项里加了简短中文解释（"适合低风险、范围很窄的问题"），但仍然是**一次性消费**——用户没有空间追问。

我们要做的比 V12 更好：
- 保留 V12 的字母菜单（快速出口——老用户敲 A 就走）
- **新增** 环的探索能力（新用户可以打转、问问题、得到帮助后再选）
- 两个路径不矛盾——字母菜单是出口，环是你可以逛多久都行

### 环的出口条件

出口不是"用户回答了所有问题"——是"用户**确认**了选择"。确认是一个显式动作：
- 用户说 "OK 就 A 吧" / "选 C" / "确定了，继续" → 出口
- 用户说 "A 和 C 有什么区别？" → 还在环里，Agent 解释后继续等
- 用户说 "BTW，这个框架是怎么工作的？" → 还在环里，Agent 回答后继续等
- 用户说 "先不管了，继续" → 但如果 must-answer 还没填 → Agent 提醒 "还有必答问题没填，要不要现在填，还是写入'不确定'？"

出口后 Agent 写入 profile（research_profile + root_must_answer_set + search_preference），然后 run gate。Gate 检查结构性完整性（profile 存在、schema valid、hitl1 status recorded），不管对话质量。

## 从 V12 要抄的核心模式

### 1. 字母菜单（Letter-based Menu）

- 互斥选择用 A/B/C，不互斥用 checklist
- 中文描述为主，英文 canonical name 在括号里二次出现
- 用户敲一个字母就能选
- enum 值对用户完全不可见

### 2. "我不确定" 路径

- Must-answer 问题如果用户不确定 → 记录 `gap_queue_backed`，排入澄清队列
- 不让系统替用户猜
- 不阻塞流程

### 3. 可选偏好 = 带例子的自然语言

- 搜索偏好/来源约束是**一个**可选自然语言输入
- 举 3-4 个具体例子让用户知道怎么答
- 不写就 `not_specified_use_profile_defaults`——不追问

### 4. HITL2 语境叙事 + 字母决策

V12 的 HITL2 不是直接甩 4 个选项——先给一段 Agent 总结的语境：

```
我已经完成综合。现在需要你确认下一步：

目前证据足够回答的是：{用一两句话概括能回答的内容，并说明来自本地证据}。
仍然不足或需要谨慎的地方是：{用一两句话说明缺口、限制或不能确认的点}。
如果继续补证据/重跑（repair and rerun），我会优先补：{具体主题、证据、冲突处理或综合缺口}。

请选择下一步：
A. 继续生成最终报告（proceed to final report）
B. 换一种报告视角（change final report view）
C. 继续补证据/重跑（repair and rerun）
D. 停止并保留阻塞原因（stop blocked）
```

当前 HITL2 没有这个语境叙事——phase-hitl2.md 只说"向用户展示 structured final review decision 问题"，但没有说怎么展示。

### 5. 中文优先

V12 的铁律（`AGENT-GUIDE.md`）：
> "User-visible interaction must be Chinese-first: startup guidance, HITL prompts, decision blockers, parameter-change confirmations, completion notes, and final delivery should use plain Chinese. Keep internal enum values, file paths, field names, command names, and provider ids in their canonical English form."

当前框架没有一个地方约定了这个语言分层规则。

### 6. State-machine guarded HITL2 stop

V12 的 HITL2 不是简单的 `stop: yes`。在向用户展示 prompt 之前，必须先写完 8 个 durable state 写入（PROFILE ×3 + STATUS ×3 + QUEUE ×2），确保：
- 如果用户在回复前 session 断了，恢复时能看到 `pending_user` 状态
- 如果模型在写 prompt 过程中跑偏了，5 个 control files 里留了完整的 checkpoint 状态

当前 HITL2 的 `stop: yes` 语义是对的（Agent 停下来等用户），但缺少 "stop 前先把 durable state 写完" 的指令。

## 现有基础设施（可复用）

| 组件 | 路径 | 状态 |
|------|------|------|
| Profile schema（含 HITL1/HITL2 字段） | `DPT_FRAMEWORK/schema/contracts/profile.mjs` | ✅ 完全就位 |
| HITL1/HITL2 enums | `DPT_FRAMEWORK/schema/enums.mjs` | ✅ 完全就位 |
| `apply-research-style.mjs` CLI | `DPT_FRAMEWORK/cli/apply-research-style.mjs` | ✅ 完全就位 |
| gate-hitl1-recorded | `DPT_FRAMEWORK/schema/gate_definitions/gate-hitl1-recorded.definition.json` | ✅ 完全就位 |
| gate-hitl2-recorded | `DPT_FRAMEWORK/schema/gate_definitions/gate-hitl2-recorded.definition.json` | ✅ 完全就位 |
| `phase-hitl1.md`（当前版本） | `DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl1.md` | ⚠️ 缺 checklist/预设 prompt |
| `phase-hitl2.md`（当前版本） | `DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl2.md` | ⚠️ 缺语境叙事模板 |
| `shared-profile.md` | `DPT_FRAMEWORK/workflows/nodes/shared/shared-profile.md` | ⚠️ 有字段名 drift |
| `shared-anti-cheating-rules.md` | `DPT_FRAMEWORK/workflows/nodes/shared/shared-anti-cheating-rules.md` | ✅ 13 条规则完整 |
| `rb_profile.yaml.tmpl` | `DPT_FRAMEWORK/rb_templates/rb_profile.yaml.tmpl` | ✅ 模板就位 |
| Research style JSON ×4 | `DPT_FRAMEWORK/schema/research-styles/` | ✅ 参数齐全 |

## 实验范围

**Goals:**
- 定义整体 UX 愿景：3 个浮出水面点（HITL1、HITL2、Final），其余全部静默自主——用户预期是"别问我，直接干完就好"
- 定义静默阶段的行为契约：Agent 在 wave0/1/2 绝不浮出水面，遇错自动重试/降级/记 trace 继续，用户可关终端
- 设计 HITL 出口语：HITL1 出口告知用户即将进入静默自主阶段 + 时长不确定性 + "可关终端" + "下次见面是 HITL2"
- 定义 HITL 环的交互模型（入口展示 → 环内行为分类 → 出口条件 → 防无限环）
- 为 HITL1 设计入口 prompt 文本（字母菜单 + 一句话 must-answer + 可选偏好）
- 为 HITL2 设计入口 prompt 文本（语境叙事 + 字母决策）
- 创建 `shared-hitl-guidance.md`（HITL 对话约定 + 静默阶段行为约定：环的规则、中文优先、字母菜单、enum 不可见、"我不确定" 路径、BTW 问题处理、轻推策略、**静默阶段 不浮出水面纪律**）
- 创建 `shared-hitl-prompt-templates.md`（HITL1/HITL2 精确 prompt 文本 + **HITL 出口语模板**，标注模板 vs Agent 动态填入部分）
- 修正 `shared-profile.md` 中的字段名 drift
- 修正 `phase-hitl2.md` 中 "4 个选项" 的计数错误
- 决定是否要 HITL2 的 durable state 写入锁（V12 的 state-machine guarded stop）

**Non-Goals:**
- 不改变 profile schema、gate rule 逻辑、CLI——这些已经就位
- 不增加新的 gate rule
- 不做 mid-wave 用户交互——整个 Wave 0/1/2 完全静默
- 不做进度可观测性（心跳文件、哨兵文件等）——用户关了终端走人，不需要盯着进度
- 不实现 V12 的 `adjust-profile-parameters.md`（运行时参数调整）——留作后续

## 关键设计问题

### 1. 预设 prompt 放在 phase MD 里还是独立 shared 文件？

**选项 A：直接写在 phase-hitl1.md / phase-hitl2.md 里**

放在 phase MD 的 `§3 执行流程` / `§3b HITL1 问题收集` 下面，用代码块或引用块给出精确的 prompt 文本。Agent 直接复制使用。

优点：Agent 打开 phase MD 就能看到，不需要额外查文件。
缺点：phase MD 变长；prompt 文本和 procedural instruction 混在一起。

**选项 B：独立 `shared-hitl-prompt-templates.md`**

把 HITL1 和 HITL2 的用户 prompt 文本抽到独立 shared 文件，phase MD `requires` 引用。

优点：prompt 文本单独维护，易迭代；Agent 可以只 reload prompt 文件而不 reload 整个 phase。
缺点：多一层 indirect 引用，Agent 可能跳过。

**推荐：B（独立 shared 文件）。** V12 的做法是把 prompt 文本写在 `output_templates/PROFILE.md` 和 `flows/instantiation-flow.md` 中（放在流程说明文件里作为引用规范）。对应到当前架构，shared 文件是最接近的等价物。phase MD `requires` 加上这个文件，Agent 就会在进入 phase 时加载。

### 2. 字母选择是纯 Agent 约定还是需要引擎参与？

字母选择（A/B/C）→ canonical enum 的映射是 Agent 做的。当前 profile.mjs 的 enum 值是 `quick_factual` / `exploratory_map` / `claim_verification`——Agent 看到用户敲 "A"，自己翻译成 `quick_factual` 写入 profile。

**不需要引擎参与。** 引擎（gate CLI）检查的是 profile 里的 canonical enum，不关心用户是怎么选的。字母映射是纯 UX 约定，写在 prompt 文本里就行。

V12 也是这么做的——字母映射纯粹是 Agent 的翻译工作。

### 3. "我不确定" 之后怎么排入队列？

V12 的做法：记录 `final_must_answer_intake_status = gap_queue_backed`，然后排入具体的澄清/拆解任务卡到 queue。当前框架的 queue 系统支持 `producer_rule: manual_enqueue` 和自定义 action text。

**建议：** 如果用户说 "我不确定"，Agent 在 `root_must_answer_set` 里写入占位条目（标记 `intake_status: gap_queue_backed`），并在 seed-topics 阶段让 Agent 创建具体的问题拆解任务卡。不过这个细节可以在 implement 阶段再定——UX 层面只需保证 "我不确定" 是一个合法回答。

### 4. HITL2 durable state 写入锁要不要抄？

V12 的 stop guard 要求：在向用户展示 HITL2 prompt 之前，必须先写完 8 个 durable state 字段（PROFILE ×3 + STATUS ×3 + QUEUE ×2），确保 session 断了也能恢复。

**当前框架不必抄这个。** 理由：
- V12 的 stop guard 是针对 Claude Code `stop` hook 的——当前框架没有用 `stop` hook
- 当前框架用 `stop: yes` MD 指令 + Agent 纪律来停——模型看到 `stop: yes` 就停下来等
- 在 `stop: yes` 之前写 durable state 可以作为一个 "推荐做法" 写入 phase MD，不需要引擎级别的 guard

**轻量方案：** 在 phase-hitl2.md 里加一条指令：在向用户展示决策 prompt 之前，先把 decision-brief.md 写完，把 hitl2 status 写成 `pending_user`。这样如果用户半天不回 / session 断了，bundle 里留了完整的  "正等待 HITL2 用户决策" 状态。

### 5. 搜索偏好要不要和 V12 一样做成可选自然语言一条？

当前 HITL1 把搜索偏好拆成了 ③④⑤ 三个问题（语言偏好、来源偏好、其他约束），每个都是独立的问题。V12 的做法是合成一个 "如果你对搜索材料有偏好，也可以顺手说一句"——可选，带例子，不写就跳过。

**建议：抄 V12。** 理由：
- 减少用户认知负担——不是三个独立问题，是一个可选备注
- 例子引导比空白 prompt 更友好
- 当前框架的 profile schema（`profile.mjs` 的 `search_preference`）已经是一个可选 string 字段——不需要改 schema

### 6. 中文优先要不要写成正式的约定文档？

当前框架没有任何地方说 "用户可见交互用中文"。`project-charter.md` 没有提到这个；`CLAUDE.md` 没有。

**建议：在 `shared-hitl-guidance.md` 里明确写这条规则。** 不需要改 phase MD 的 procedural instruction 语言（那些仍是中英混合，因为要引用英文文件名/字段名/cli 命令）。只约定了用户交互层的语言。

### 7. 环怎么设计——出口条件 vs 环内行为

这是这个 TODO 最核心的设计问题。HITL 环需要定义三件事：

**7a. 入口：Agent 第一次向用户展示什么？**

V12 的做法：一次性展示字母菜单 + 一句话 must-answer + 可选偏好。这是环的**初始态**——Agent 把准备好的信息（topic rewrite + seed topics + 选项）一次性摊开，然后等待用户反应。

推荐：保留这个模式。入口展示三件东西：
- Agent 准备好的内容（topic rewrite 结果 + seed topics 预览）
- 字母菜单（A/B/C）
- 两个开放式入口（must-answer 一句话 + 可选偏好）
- 一个明确的信号："你可以直接选 A/B/C，也可以问我问题"

**7b. 环内：用户行为分类**

用户在环内可能做的事：

| 用户行为 | Agent 反应 | 是否靠近出口 |
|----------|-----------|-------------|
| 直接选 A/B/C | 记录 profile，追问 must-answer（如果还没填） | ✅ 快速出口路径 |
| "A 和 C 有什么区别？" | 解释两个 profile 在本话题下的具体差异 | 还在环里，但更接近决定 |
| "BTW，X 是什么意思？" | 回答 BTW 问题，然后轻推回主路径（"还有其他问题吗？还是可以选了？"） | 还在环里 |
| "如果我选 B，会跑多久？" | 基于 topic 数量给出估算 | 还在环里，但更接近决定 |
| "先选 A 试试" / "确定了，继续" | **出口**——记录确认，写 profile | 🚪 出口 |
| 沉默/跳过 must-answer | Agent 提醒 + 提供 "我不确定" 选项 | 还在环里（must-answer 是必填） |
| "能不能换个话题？" | 回到 topic rewrite（不常见，但环应该允许） | 还在环里（可能回到入口前） |

**7c. 出口条件**

出口不是 "所有问题都被回答了"——是 **"用户确认了选择"**。具体规则：
- **快出口（老用户）**：用户说 "B" → Agent 确认 "选 exploratory_map，must-answer 写什么？" → 用户写一句话 → 出口
- **探索后出口（新用户）**：用户问 3 轮 → Agent 每轮解释 → 用户最终说 "OK 就 C" → Agent 确认 → 出口
- **must-answer 是必填**：即使用户确认了 profile，如果 must-answer 还没填，Agent 提醒："还有必答问题——最终报告必须回答什么？不确定可以写'我不确定'。"
- **搜索偏好可选**：不填就直接过，不追问

**7d. 防无限环**

Agent 应该在适当时候轻推用户靠近出口。环不是无限聊天——它是有目标的探索。如果用户已经问了 5+ 轮还不决定，Agent 可以：
- 总结已讨论的内容
- 给一个明确建议（"基于你刚才说的，我建议选 B，因为…"）
- 重申出口方式（"你随时可以说 A/B/C 选定，或者在 must-answer 写'我不确定'先跑起来"）

这不是硬限制——是 Agent 行为约定，写在 `shared-hitl-guidance.md` 里。

## 实现思路

### Phase 1：创建共享 HITL 对话指引 + prompt 模板

1. 创建 `DPT_FRAMEWORK/workflows/nodes/shared/shared-hitl-guidance.md`：
   - **环的规则**（核心）：入口展示内容 → 环内行为分类与 Agent 反应 → 出口条件 → 防无限环轻推策略
   - HITL 对话约定（中文优先、字母菜单、enum 不可见、"我不确定" 路径、可选偏好带例子、BTW 问题处理）
   - 不包含具体的 prompt 文本——只包含**约定**，prompt 文本放独立模板文件

2. 创建 `DPT_FRAMEWORK/workflows/nodes/shared/shared-hitl-prompt-templates.md`：
   - HITL1 入口 prompt 文本（A/B/C 字母菜单 + 一句话 must-answer + 可选搜索偏好 + "你可以直接选，也可以问我问题" 信号）
   - HITL2 入口 prompt 文本（语境叙事模板 + A/B/C/D 字母决策）
   - 每个 prompt 标注：哪些部分是模板文字（Agent 不改），哪些是 Agent 需要填入的动态内容

### Phase 2：更新 phase HITL1 / HITL2 MD

3. 更新 `phase-hitl1.md`：
   - `requires` 加入 `shared/shared-hitl-guidance` 和 `shared/shared-hitl-prompt-templates`
   - §3b 替换 "见下方 checklist" 为引用 prompt 模板 + 填充指引
   - 加入 search preference 的收集指引（可选，不写则记录 `not_specified`）

4. 更新 `phase-hitl2.md`：
   - `requires` 加入 `shared/shared-hitl-guidance` 和 `shared/shared-hitl-prompt-templates`
   - 加入语境叙事生成指引（回答什么 / 不能回答什么 / repair 会补什么）
   - 加入 "展示 prompt 前先写完 decision-brief.md + 设 hitl2 status = pending_user" 指令
   - 修正 "4 个选项" → "5 个选项"
   - A/B/C/D 字母映射表

### Phase 3：修正 drift

5. 修正 `shared-profile.md` 中的字段名 drift：
   - `wave0_shared_ref_floor` → 区分 `wave0_per_topic_source_floor`（per-topic）和 `wave0_shared_ref_total`（全局，由 CLI 计算）
   - `wave1_per_topic_ref_floor` 确认字段名一致

### Phase 4：注册 + 验证

6. 更新 `DPT_FRAMEWORK/workflows/manifest.json`：加入两个新 shared 文件
7. 用真实 bundle 做 HITL1/HITL2 对话质量评估（Agent 能不能正确使用字母映射、中文文案、优雅降级）

## 相关文件

| 路径 | 角色 |
|------|------|
| `_backlog/done/_old_topics/_original_dpt_v12/DEEP_RESEARCH_TEMPLATE_V12/` | V12 参考实现——output_templates/PROFILE.md、flows/instantiation-flow.md、flows/execution-flow.md |
| `DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl1.md` | 当前 HITL1 phase MD（待更新——缺 checklist/预设 prompt） |
| `DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl2.md` | 当前 HITL2 phase MD（待更新——缺语境叙事模板） |
| `DPT_FRAMEWORK/workflows/nodes/shared/shared-profile.md` | 当前 profile 字段参考（待修正字段名 drift） |
| `DPT_FRAMEWORK/schema/contracts/profile.mjs` | Profile Zod schema（不改，纯参考） |
| `DPT_FRAMEWORK/schema/enums.mjs` | 枚举定义（不改，纯参考） |
| `DPT_FRAMEWORK/schema/research-styles/*.json` | 4 套 style 参数（不改，纯参考） |
