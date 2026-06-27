---
node_type: brief
id: brief-hitl2
phase: hitl2
authority: exact-text
---

# HITL2 Brief — 入口 Prompt + 出口语

Agent 在 HITL2 阶段 SHALL 使用本文件中的精确文本。模板文字（Agent 不改）与动态填入部分（Agent 填入）清晰区分。

`{DYNAMIC: variable_name}` 占位符表示 Agent 需要从当前 run state 中填入的内容。

---

## 入口 Prompt

@impl HIU-003

<!-- TEMPLATE START -->

研究执行完毕。以下是我从 Wave 0/1/2 中提取的研究现状。

---

### 当前研究状态

**目前证据足够回答的是**：
{DYNAMIC: what_evidence_can_answer}

**仍然不足或需要谨慎的地方是**：
{DYNAMIC: gaps_and_limitations}

**如果继续补证据/重跑，会优先补**：
{DYNAMIC: priority_for_further_evidence}

---

### 请选择下一步（直接打字 A/B/C/D/E 或中文均可）

**A: 继续生成最终报告（proceed to final report）**
当前研究产出已足够，直接生成最终报告。

**B: 换一种报告视角（change final report view）**
不重跑研究，但调整最终报告的侧重点和格式。

**C: 继续补证据/重跑（rerun）**
从 seed-topics 重新展开，当前结果保留。

**D: 修复问题后重试（repair）**
就地修复具体问题（补充缺失证据、修正错误），修复后重新审查。

**E: 停止并保留（stop blocked）**
暂停研究，状态已保存，可随时恢复。

---

**可以直接选字母，也可以问我问题。** 比如 "B 换视角有哪些可选？" 或 "C 和 D 有什么区别？"——我会帮你分析后再选。

<!-- TEMPLATE END -->

---

## 出口语

@impl SWE-001

### A 路径：proceed_to_readiness

<!-- TEMPLATE START -->

已确认。系统将进入最终报告生成阶段。期间不会浮出水面，完成后向你交付最终报告。

<!-- TEMPLATE END -->

### B 路径：view_revision

<!-- TEMPLATE START -->

已记录。接下来我会帮你选择新的报告视角——选定后重新展示 decision brief，你可以再次决定下一步。

<!-- TEMPLATE END -->

### C 路径：rerun

<!-- TEMPLATE START -->

已确认。系统将从 seed-topics 重新展开研究。当前的 wave 研究结果将被保留，新 run 基于调整后的方向重新展开。

<!-- TEMPLATE END -->

### D 路径：repair

<!-- TEMPLATE START -->

已记录。接下来我会针对性修复你提到的问题。修复完成后重新展示 decision brief，你可以再次审查。

<!-- TEMPLATE END -->

### E 路径：stop_blocked

<!-- TEMPLATE START -->

已确认。研究已暂停，所有状态已保存。你随时可以恢复——系统会从当前进度继续。

<!-- TEMPLATE END -->
