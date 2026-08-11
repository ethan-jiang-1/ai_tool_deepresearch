---
node_type: brief
id: brief-hitl1
phase: hitl1
authority: exact-text
---

# HITL1 Brief - 研究对齐

`{DYNAMIC: variable_name}` 由 Agent 从原始问题与当前 run state 填入。

## 入口 Prompt

@impl HIU-002, HIU-005, HIU-006

<!-- TEMPLATE START -->

我建议按下面的方向开始：

**目标与范围**：{DYNAMIC: grounded_goal_and_scope}

**报告必须回答的问题**：
{DYNAMIC: proposed_must_answer_questions}

**初始话题预览**：
{DYNAMIC: seed_topics_preview}

话题按最小独立 Topic map 提议：只保留需要分别回答的问题、证据路径或交付价值。一个话题也可以成立；没有预设上限。若话题较多，我会按可审阅的研究线程分组并说明拆分理由，而不会要求你凑某个数量。

**建议的研究深度/广度**：{DYNAMIC: recommended_profile_description}

**理由与投入影响**：{DYNAMIC: recommendation_reason_and_effort}

你可以直接说“按这个开始”，也可以用自然语言修正目标、必须回答的问题、话题或研究深度。A/B/C 只是可选快捷方式：

- A：快速事实核查
- B：探索性全景研究
- C：核心主张对抗性验证

如果你还不确定报告必须回答什么，可以让我先基于原始问题提出更具体的问题；只有你接受或修正后的具体问题才会进入研究计划。

你也可以补充本轮研究控制，例如优先或排除的来源、分析视角、交付形式或业务背景。若希望某个话题额外多研究什么，也可以直接用自然语言说明；我会先给出简短理解，你可以接受或修正。它们只指导本轮研究，不会覆盖证据、来源、Gate 或运行时 contract；没有额外控制或重点时可直接说明“没有额外控制”。

<!-- TEMPLATE END -->

## 能力检查沟通

@impl HIU-002, PRP-002

### 探测前提示

<!-- TEMPLATE START -->

开始研究前，我先直接检查当前环境对中国和海外公开页面的实际取用情况，请稍候。

<!-- TEMPLATE END -->

### 已记录观察

<!-- TEMPLATE START -->

当前环境的直接取用观察已经记录。它只反映这一次探测，不保证后续网络保持不变。

<!-- TEMPLATE END -->

### 相关来源存在取用限制

<!-- TEMPLATE START -->

这次探测显示，和本轮研究相关的<来源范围或约束>目前存在直接取用限制（<当前观察>）。你可以调整网络后让我重新完整探测、修改来源范围，或明确“按当前取用范围继续”。

<!-- TEMPLATE END -->

### 访问不可用

<!-- TEMPLATE START -->

当前环境无法开始任何直接取用探测（<直接原因>）。这不是对网站是否可达的判定。你刚才的选择不会丢。

<!-- TEMPLATE END -->

这些模板只描述 framework 的用户消息。它们不得用中文 UI、用户语言、假定国家、VPN 状态或工具/provider 名称作为来源相关性的证据；不得承诺恢复、覆盖、固定时长、provider 结果、自动重试或未来稳定性；也不得请求非 material 的决定，或把接受当前范围描述为访问恢复成功。材料限制的用户决定边界只在 Agent 已确认 material gap 后出现；没有 material gap 时只渲染「已记录观察」而不提问。

## 出口语

@impl SWE-001

<!-- TEMPLATE START -->

已记录。接下来进入静默自主执行：Setup -> Seed Topics -> Wave 0 -> Wave 1 -> Wave 2。

时长取决于研究范围，可能从几十分钟到更久。框架不会主动发送普通进度、错误或确认请求；Agent 会沿现有合法路径处理机械工作。你可以关闭终端，durable state 可用于恢复。下一个框架主动邀请并等待决定的位置是 HITL2。

<!-- TEMPLATE END -->
