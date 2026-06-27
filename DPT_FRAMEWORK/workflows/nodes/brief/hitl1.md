---
node_type: brief
id: brief-hitl1
phase: hitl1
authority: exact-text
---

# HITL1 Brief — 入口 Prompt + 出口语

Agent 在 HITL1 阶段 SHALL 使用本文件中的精确文本。模板文字（Agent 不改）与动态填入部分（Agent 填入）清晰区分。

`{DYNAMIC: variable_name}` 占位符表示 Agent 需要从当前 run state 中填入的内容。

---

## 入口 Prompt

@impl HIU-002

<!-- TEMPLATE START -->

你好！我已经完成了研究准备。下面是你的研究方向选择。

**研究主题**：{DYNAMIC: topic_rewrite_result}

**预计话题预览**：{DYNAMIC: seed_topics_preview}

---

### 请选择研究深度/广度（直接打字 A/B/C 或中文均可）

**A: 快速事实核查（quick_factual）**
轻量，单一维度——适合需要快速查证具体事实的场景。

**B: 探索性全景 mapping（exploratory_map）**
覆盖面广但深度可控——适合需要了解某个领域整体面貌的场景。

**C: 核心主张 adversarial verification（claim_verification）**
对核心主张做对抗性验证——适合需要严格检验某个论点的场景。

---

### 必须回答的问题（一句话）

你希望这份报告**最终必须回答什么**？用一句话写下。

> 如果不确定，可以写 "我不确定，先帮我拆问题"——系统会在后续帮你逐步澄清。

### 搜索偏好（可选）

有没有搜索方面的偏好？例如：
- "优先找中文资料"
- "关注 2024 年之后的研究"
- "优先使用学术论文，避免博客"
- "对 XX 来源保持警惕"

不写也没关系，系统会用默认策略。

---

**可以直接选字母，也可以问我问题。** 比如 "A 和 C 有什么区别？我的场景是跨境支付合规"——我会帮你分析后再选。

<!-- TEMPLATE END -->

---

## 出口语

@impl SWE-001

<!-- TEMPLATE START -->

已确认。接下来系统将进入**静默自主执行阶段**：

Setup → Seed Topics → Wave 0 → Wave 1 → Wave 2

- 时长取决于研究范围，可能**几十分钟到一两天**
- 期间**不会浮出水面**——遇错自动处理，不需要你在旁边守着
- **可以关闭终端**——系统从保存的状态恢复，不会丢失进度

下次见面是 **HITL2**（最终审查决策），届时我会汇总研究发现，由你来判断是否满意、是否要调整方向。

现在开始执行。

<!-- TEMPLATE END -->
