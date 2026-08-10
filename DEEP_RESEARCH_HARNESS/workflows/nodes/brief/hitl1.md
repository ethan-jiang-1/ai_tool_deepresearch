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

开始研究前，系统先快速检查一下联网搜索能力，大概几秒钟，请稍候。

<!-- TEMPLATE END -->

### 访问可用

<!-- TEMPLATE START -->

联网能力正常，开始准备研究。

<!-- TEMPLATE END -->

### 访问不可用

<!-- TEMPLATE START -->

联网检查没通过。多数是网络问题——请检查网络连接后重试；网络正常的话稍后再试也行。你刚才的选择不会丢。

<!-- TEMPLATE END -->

这些模板只描述 framework 的用户消息。它们不得承诺隐藏、替代、重述为成功，或以其他方式控制 selected-host-native 的工具调用、policy failure、transport/security error 或 permitted shell output；也不得承诺 host permission、provider success、automatic retry，或将“大概几秒钟”解释为精确时长保证。

## 出口语

@impl SWE-001

<!-- TEMPLATE START -->

已记录。接下来进入静默自主执行：Setup -> Seed Topics -> Wave 0 -> Wave 1 -> Wave 2。

时长取决于研究范围，可能从几十分钟到更久。框架不会主动发送普通进度、错误或确认请求；Agent 会沿现有合法路径处理机械工作。你可以关闭终端，durable state 可用于恢复。下一个框架主动邀请并等待决定的位置是 HITL2。

<!-- TEMPLATE END -->
