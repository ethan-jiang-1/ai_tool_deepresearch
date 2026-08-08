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

**当前推荐**：{DYNAMIC: one_available_recommendation}

**推荐理由与影响**：{DYNAMIC: recommendation_reason_and_effect}

你可以直接按这个建议继续，也可以自然语言修正，例如“资本约束这部分还不够，再补一下”“换成管理层视角”“这里的证据有错，先修正”或“先停在这里”。若选择继续研究，也可以说明某个 Topic 这次还要额外理解什么；我会先反映简短理解，你可以修正。A/B/C/D/E 仅作为可选快捷方式：交付、换视角、继续研究、修复、停止。

只有当前 accepted path 支持的动作才会被推荐为可立即执行；缺失 capability 会明确说明，不会假装已有 route。

<!-- TEMPLATE END -->

## 出口语

@impl SWE-001, CDP-001

- 交付：决定写入后由 Agent 运行 HITL2 Gate，沿 `check.next` 进入 readiness/Final。
- 换视角、修复或停止：只有存在对应 legal path 时执行；否则只说明最小缺失边界。
- 继续研究：记录具体方向和已披露的投入影响；如有新的或修订的重点，rationale 保留用户原话与可纠正的当前理解，由 Agent 进入现有 rerun pipeline。
