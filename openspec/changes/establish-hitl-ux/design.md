## Context

当前 HITL1/HITL2 的 phase MD（`phase-hitl1.md`、`phase-hitl2.md`）缺少预设的用户 prompt 文本和交互行为指引。Agent 在 HITL 阶段要即兴发挥——自己决定用什么措辞、什么格式、什么顺序向用户提问。结果是用户每次看到的交互不一致，且当前实际效果退化为 5 问线性问卷（用户要敲大量文字）。

V12 的 HITL 交互打磨过——字母菜单（A/B/C）+ 一句话 must-answer + 可选偏好带例子。但这个设计在当前框架中完全丢失了。

更根本的问题是：HITL 的真实交互形态不是线性问卷——是用户可以打转、探索、问 BTW 问题、得到帮助后再做出决定的**环**（loop）。当前实现和 V12 都没有做到这点。

来源：`_backlog/todo-hitl-ux.md`

## Goals / Non-Goals

**Goals:**
- 定义整体 UX 愿景：3 个浮出水面点——2 个交互式决策点（HITL1、HITL2）+ 1 个交付点（Final），其余全部静默自主——用户预期是"别问我，直接干完就好"
- 创建独立 capability `silent-wave-execution`：静默自主执行合同（SWE-001），与 `hitl-ux` 分开——静默阶段的行为纪律不被 HITL 环 UX 淹没
- 定义静默阶段的 Agent 行为契约：wave0/1/2 绝不浮出水面，遇错自动重试/降级/记 trace 继续，用户可关终端
- 设计 HITL 出口语：告知用户即将进入静默自主阶段 + 时长不确定性 + "可关终端" + "下次见面是 HITL2"
- 定义 HITL 环的交互模型：入口展示 → 环内行为分类 → 出口条件 → 防无限环轻推策略
- 为 HITL1 创建精确的入口 prompt 文本（字母菜单 A/B/C + 一句话 must-answer + 可选搜索偏好）
- 为 HITL2 创建精确的入口 prompt 文本（语境叙事 + 5 选项字母决策 A/B/C/D/E）
- 创建 `shared-agent-ux-guidance.md`——HITL 对话约定（中文优先、环的规则、字母菜单、enum 不可见、"我不确定" 路径）
- 创建 `shared-silent-execution.md`——静默阶段不浮出水面纪律（降级优先级链、repair escalation 冲突覆盖、降级期间 state 规则、用户主动消息处理）
- 修正 `shared-profile.md` 的字段名 drift、`phase-hitl2.md` 的计数错误

**Non-Goals:**
- 不改 profile schema、gate rule、CLI——`search_preference` 作为 `rb_profile.yaml` 的 informal YAML key 存储（不经 Zod 校验），正式 schema 支持留待后续 change
- 不新增 gate rule——现有 `gate-hitl1-recorded` 和 `gate-hitl2-recorded` 足够
- 不做 mid-wave 用户交互——Wave 0/1/2 完全静默
- 不做进度可观测性（心跳文件、哨兵文件等）——用户关了终端走人，不需要盯着进度
- 不实现运行时参数调整（`adjust-profile-parameters.md`）

**关于 "Final" 浮出水面点的说明：** "3 个浮出水面点" 中的 Final 是**交付**而非交互——`phase-final.md` 的 `stop: "no"` 且 `gate: null`，Agent 生成报告后自然终止，不等待用户输入。Final 的 "浮出水面" 语义是向用户交付最终报告，它不是一个决策点。真正的交互式停止点只有 HITL1 和 HITL2。

## Decisions

### Decision 1: Prompt 文案放在独立 `brief/` 目录而非 phase MD 内嵌

**选择：`nodes/brief/` 目录，`hitl1.md` + `hitl2.md` 各一份**

理由：
- prompt 文本是纯文案，需要独立迭代（调措辞不改 phase 逻辑）
- 不是 shared——每个 HITL phase 只需要自己的文案，不需要看到对方的
- 通过 `suggested_context` 指向，Agent 进入 phase 时按需加载
- `brief/` 与项目原生概念一致——HITL2 已有 `decision-brief.md` artifact，brief 贯穿 "决策点需要一份准备好的材料呈现给用户" 这条线

替代方案（shared 文件）：被拒绝——HITL1 和 HITL2 的文案不需要共享，放在 shared 里反而让 HITL1 Agent 看到 HITL2 的文案。

### Decision 2: 环内行为由 Agent 执行，Engine 只在出口后校验

HITL 环的入口/环内/出口逻辑全部是 Agent 行为约定，写在 `shared-agent-ux-guidance.md` 里。Engine（gate CLI）只在出口后检查 profile 的结构性完整性——不关心用户在环里绕了几圈、问了什么问题。

理由：
- 环的探索是纯对话行为——Agent 理解用户意图、回答 BTW 问题、判断出口时机
- Engine 的职责是校验 durable state（profile 字段是否完整、enum 是否合法）——这是出口后的检查
- 如果 Engine 尝试用规则来判断"用户是否真的确认了"，会变成启发式猜测（用户说"OK"到底是不是确认？）——这只能靠 Agent 判断

### Decision 3: 字母菜单是 UX 约定，不写入 schema

A/B/C ↔ canonical enum（`quick_factual`/`exploratory_map`/`claim_verification`）的映射是 Agent 做的翻译。Schema 里的 enum 值不改为字母。

理由：
- 字母映射是中文 UX 层的约定，英文 canonical name 是机器可读标识——两层各司其职
- Gate CLI 检查的是 canonical enum，不关心用户敲了什么字母
- V12 也是这么做——字母纯粹是 Agent 翻译，内部始终用 canonical name

### Decision 4: must-answer 必填，搜索偏好可选

出口条件：
- `research_profile` 必填——用户必须选 A/B/C，或经过环内探索后确定
- `root_must_answer_set` 必填——至少一个条目；用户可以写 "我不确定，先帮我拆问题"，标记 `intake_status: gap_queue_backed`
- `search_preference` 可选——不填就过，记录 `not_specified_use_profile_defaults`

理由：V12 的 UX 约定——必答问题是研究方向的锚点，不能空（但可以不确定）；搜索偏好是锦上添花，不追问。

### Decision 5: 防无限环用 Agent 轻推，不用硬计数器

Agent 在用户问 5+ 轮还不决定时，总结已讨论内容 + 给明确建议 + 重申出口方式。不设硬性的最大轮数（"超过 N 轮自动退出"）。

理由：
- 硬上限对需要深入讨论的复杂话题不友好
- 轻推保留了灵活性——Agent 判断用户是否在 productive exploration 还是真的 stuck
- 这是纯 Agent 行为约定，不需要引擎参与

### Decision 6: HITL2 展示前写 durable state，但不需要引擎级 guard

在向用户展示 HITL2 决策 prompt 之前，Agent 先写完 `decision-brief.md` + 设 `hitl2.status = pending_user`。V12 的 stop guard（8 个 durable state 写入锁）不需要完整移植——当前框架用 `stop: yes` MD 指令而非 Claude Code stop hook。

### Decision 7: 静默阶段的 Agent 纪律——纯行为约定，Engine 不参与

HITL 是静默自主系统的**门户**——整个研究运行只有 3 个浮出水面点。在 HITL1 和 HITL2 之间（setup → seed-topics → wave0 → wave1 → wave2），Agent 必须完全不浮出水面。

**选择：创建独立 `shared-silent-execution.md`——静默纪律与 HITL 环 UX 分属两个 shared 文件**

`shared-silent-execution.md` 定义静默阶段行为纪律（降级优先级链、repair escalation 覆盖、state 规则、用户主动消息处理），wave phase MD 通过 `requires` 加载此文件。

`shared-agent-ux-guidance.md` 定义 HITL 环的交互模型（四阶段、防无限环、中文优先、"我不确定"路径），HITL phase MD 通过 `requires` 加载此文件。

两个文件各司其职——静默阶段 Agent 不加载 HITL 环规则，HITL 阶段 Agent 不加载降级优先级链。

核心规则（详见 SWE-001 spec）：
- Agent 在 wave0/1/2 期间 SHALL NOT 向用户展示任何内容、提问、请求确认
- setup 和 seed-topics 同属静默阶段（`stop: no`），静默纪律同样适用——虽然执行时间短，但概念上的一致性比"太快不值得讨论"更重要
- 遇错自行按降级优先级链处理（重试 → 换源 → 降级方法 → 标记 gap），不浮出水面
- 静默纪律覆盖 repair escalation 规则和 anti-cheating rules 规则 3——冲突解决全部写入 SWE-001 优先级覆盖表
- 用户主动发消息时 Agent 可做单轮状态告知（以句号结尾），但不得邀请对话、不得停止等待

HITL 出口语告知用户即将进入静默阶段 + 时长不确定性 + 可关终端 + 下次见面时机。

理由：
- 这完全属于 Agent 行为约定——Engine 只需保证 gate 推进 + schema 验证
- 用户预期简单：3 个浮出水面点（2 个交互式决策点 + 1 个终端交付点），其余静默。不需要心跳文件、进度查询
- 当前架构已提供结构保证：`stop: yes` 只在 HITL1/HITL2（Final 是 `stop: no` + `gate: null`），gate → chain → next phase 是确定性推进
- 将静默纪律独立为 `shared-silent-execution.md` 而非混入 `shared-agent-ux-guidance.md`——wave phase 只需加载静默纪律，不需要 HITL 环规则。两个文件各自被需要的 phase 加载，避免 Agent 在 wave 执行时读到 "以下是 HITL 环的行为模型" 造成混淆

### Decision 8: Registry 治理改进作为独立 capability `requirement-traceability`

`sileent-wave-execution` 起初被混入 `hitl-ux` spec——因为两个都被笼统归为 "UX 相关"。根因是项目缺少能力边界测试和 registry 自文档化机制。

**选择：创建 `requirement-traceability` capability（RET-001..006），在本 change 中同步实现**

RET-001..006 定义六个 requirement（详见 `specs/requirement-traceability/spec.md`）：
- RET-001 `prefixes:` 自文档化映射块
- RET-002 单 capability 单组头，解散合成组和 delta 段
- RET-003 Capability 边界测试（4 条件 + 反例）
- RET-004 字母序 + 数字序排列
- RET-005 废弃规则（留原组、标 [DEPRECATED]、全组废弃标 no spec directory）
- RET-006 Check 脚本硬性 gate

理由：
- 这不止是 HITL UX 的事——`req-registry.yaml` 有 19 个合成组头不映射 spec 目录，8 个前缀的 ID 碎片化在 3-4 处。silent-wave-execution 的边界问题会在任何新 capability 上重演。
- 本 change 刚好要注册 HIU-* 和 SWE-*——是最佳切入点。
- registry 改进是可独立验证的（check 脚本 PASS + ID 集合 diff 一致），不依赖本 change 其他部分的完成。

## Risks / Trade-offs

- **[Agent 不一致风险]** prompt 文本在 shared 文件里，但 Agent 可能不严格遵循 → 缓解：shared 文件里写明 "以下文本是用户 prompt 的精确模板，Agent 不应改动模板部分"，anti-cheating rules 第 7 条已禁止 Agent 编造 HITL 答案
- **[环的 Agent 判断误差]** 出口条件靠 Agent 判断用户是否确认——Agent 可能误判（用户说 "好的" 被当成确认）→ 缓解：guidance 里要求 Agent 在出口前做显式确认（"确定选 B？must-answer 写'我不确定'？确认后我会写入 profile 并推进到 setup。"）
- **[静默打破风险]** Agent 在 wave0/1/2 中可能仍然浮出水面——模型输出纯文本问"—是否继续？" 或报告进度 → 缓解：`shared-silent-execution.md` 明确禁止 + 所有三个 wave phase MD 的 `requires` 加载该文件，确保 Agent 在 wave 执行时始终看到静默纪律
- **[Repair escalation × 静默合约冲突]** `shared-repair-guidance.md` 的 escalation 规则（"修复需要用户 decision → escalation/block"）与 SWE-001 的静默纪律存在冲突——repair 3 次 fail 后的 escalation 逻辑假定可以浮出水面 → 缓解：SWE-001 spec 明确静默合约优先——escalation 改写为降级 + trace + 继续；到达 HITL2 时汇总报告。`shared-silent-execution.md` 中写入此优先级规则
- **[中文硬编码]** prompt 文本目前只有中文版 → 如果未来需要英文 UX，需要另写英文 prompt 模板。当前用户群全是中文用户，不是风险。
- **[模型原生"继续吗?"倾向]** Claude 等模型在长工具调用后原生倾向于输出 "Shall I continue?" 类文本——这不在 Agent 意识控制范围内，是模型层的默认行为。→ 缓解：静默纪律写入 phase MD 的 `requires` 链后，在 phase-wave0/1/2.md 正文的 §Anti-Cheating Rules 或 §Stop Behavior 中加一句前置声明（如 "本 phase 的 requires 已加载 shared-silent-execution.md 中的静默纪律。在任何情况下均不得向用户展示进度、提问或请求确认。"），用正文规则强化 requires 文件的约束力。

## Open Questions

1. **HITL2 view change 是否也为环？** → **已决议：是。** 用户选 B（换报告视角）后，Agent 遵循 HIU-001 环模型——用户可以探索不同视角的含义、对比视角差异、问 BTW 问题后再确定视角名。HIU-003 中已有 "用户在视角选择中途反悔" 的 scenario，与环模型一致。本决议已反映在 HIU-003 spec 中。

2. **`stop_blocked` 恢复路径？** → **Deferred scope。** `stop_blocked`（E）是用户主动停止——rb_status 设为 `blocked`，lifecycle 终止。恢复路径（用户说 "继续上次的研究" → 恢复 lifecycle/queue）需要独立设计（从哪个 phase 恢复？queue state 如何重建？已完成的 task card 是否保留？）。这属于独立的 "research recovery/resume" capability，留在未来 change 中处理。
