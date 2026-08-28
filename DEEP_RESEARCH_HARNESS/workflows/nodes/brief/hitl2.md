---
node_type: brief
id: brief-hitl2
phase: hitl2
authority: exact-text
---

# HITL2 Brief - 研究审阅

`{DYNAMIC: variable_name}` 由 Agent 从 verified artifacts、current profile 和 phase-derived availability facts 填入。

## 入口 Prompt

@impl HIU-003, CDP-001

<!-- TEMPLATE START -->

**目前证据足够回答的是**：
{DYNAMIC: what_evidence_can_answer}

**仍然不足或需要谨慎的地方是**：
{DYNAMIC: gaps_and_limitations}

**本轮已声明的重点及其承接情况**：
{DYNAMIC: declared_focus_and_coverage}

**当前推荐**：{DYNAMIC: one_available_recommendation}

**推荐理由与影响**：{DYNAMIC: recommendation_reason_and_effect}

**交付建议（尚未接受）**：

- **读者与熟悉程度**：{DYNAMIC: composition_reader_and_familiarity}
- **用途与首要焦点**：{DYNAMIC: composition_intended_use_and_primary_focus}
- **报告视角与阅读路径**：{DYNAMIC: composition_view_and_spine}
- **前置与压缩**：{DYNAMIC: composition_foreground_and_compress}
- **语言、篇幅、证据与附录**：{DYNAMIC: composition_delivery_posture}

这是面向交付的完整建议，不是字段表。你可以直接说“按这个出报告”或自然语言修正，例如“读者换成管理层，篇幅简短，但保留关键证据”。只有会实质改变读者任务、首要焦点、叙事主线、解释深度或证据展开的歧义，才会以最多三个带推荐与影响的问题一次询问；你不需要逐项填写。若选择继续研究，也可以说明某个 Topic 这次还要额外理解什么；我会先反映简短理解，你可以修正。A/B/C/D/E 仅作为可选快捷方式：交付、换视角、继续研究、修复、停止。

只有当前 accepted path 支持的动作才会被推荐为可立即执行；缺失 capability 会明确说明，不会假装已有 route。

<!-- TEMPLATE END -->

## 出口语

@impl SWE-001, CDP-001

- 交付：清楚接受、修正或委托这份完整建议后，Agent 重述已解决的交付目标，写入 accepted profile owner，运行 HITL2 Gate，沿 `check.next` 进入 readiness/Final；不再追加一次笼统确认。
- 换视角、修复或停止：只有存在对应 legal path 时执行；否则只说明最小缺失边界。
- 继续研究：记录具体方向和已披露的投入影响；如有新的或修订的重点，rationale 保留用户原话与可纠正的当前理解，由 Agent 进入现有 rerun pipeline。
