---
bug_id: BUG-131
title: "Degraded pass inconsistency — wave0/wave1 gate passed with failed rules, wave2 hard-failed with same pattern"
severity: P1
discovered: 2026-07-26
bundle: dpt_rb_openspec-influence-landscape
phase: wave2
node: phases/phase-wave2.md
gate: wave2-complete
related: [BUG-130, BUG-124, BUG-129]
---

# BUG-131: Degraded pass 策略在 wave0/wave1 和 wave2 之间不一致

## 现象

三次 gate 都出现了因 schema 合规性问题导致的规则失败，且 Phase Agent 无法通过合法路径修复（都是 Phase Agent materialization vs delegated provenance 的问题）。但 gate 的 degraded pass 行为不一致：

| Gate | 合规性失败 | Gate 结果 | Degraded? |
|------|-----------|----------|-----------|
| wave0-complete | `shared_ref_count_floor` (0/22) | **passed: true** | 隐式 degraded |
| wave1-complete | `per_topic_ref_md_count_floor` (0/10 per topic) | **passed: true** | 隐式 degraded |
| wave2-complete | `finding_index_contract` + `wave2_delegated_bypass_suspected` | **passed: false** | 显式拒绝: `degraded_not_eligible` |

三个 gate 的根本原因相同：Phase Agent 直接写的产物不被 gate 的 provenance 检查接受（BUG-124/129/130）。但 wave0 和 wave1 的 gate 选择了 degraded pass，wave2 的 gate 选择了 hard fail。

Wave2 gate 的拒绝理由是 `"Fatigue threshold reached, but runtime-truth or structural blocker(s) remain"`。但 wave0 和 wave1 在同样有 structural blocker（shared_ref_count_floor 和 per_topic_ref_md_count_floor 都是 count floor 类规则）的情况下却给了 degraded pass。

## 重现线索

1. 完成 wave0 — gate 报 shared_ref_count_floor 失败 → passed: true（degraded）
2. 完成 wave1 — gate 报 per_topic_ref_md_count_floor 失败 → passed: true（degraded）
3. 完成 wave2 — gate 报 finding_index_contract + wave2_delegated_bypass_suspected → passed: false，`degraded_not_eligible`
4. Phase Agent 多次尝试修复 finding-index.yaml schema → 每个修复只暴露新字段（onion peeling）
5. HITL2 无法进入（gate 未 pass，check.next = null，enter-phase 拒绝直接进入 HITL2）
6. 用户被卡在 wave2 和 HITL2 之间，无法通过框架表达"我接受当前状态，继续"

## 根因假设

**主因**：三个 gate 的 degraded pass 判定逻辑不一致。Wave0 和 wave1 的 gate 在 count floor 类规则失败时仍然给 `passed: true`。Wave2 的 gate 在 `finding_index_contract`（本质也是 schema 合规性）和 `wave2_delegated_bypass_suspected`（与 phase instruction 矛盾，见 BUG-130）失败时给 `passed: false` 并显式拒绝 degraded pass。这些失败在性质上与前两个 gate 的失败没有区别——都是 Phase Agent 无法通过合法路径修复的 schema 合规性问题。

**副因**：三个 gate 的 failure → hard fail vs degraded pass 的决策边界不透明。没有文档说明哪些失败是"structural blocker"（阻止 degraded pass）、哪些允许 degraded pass。

**第三因（结构性）**：当 `stop: no` phase 的 gate hard-fail 时，没有合法的框架内路径让人类介入。HITL1 和 HITL2 是仅有的交互检查点，但如果 gate 在 HITL2 之前 hard-fail，HITL2 无法被进入——形成了一个死锁：人类无法批准 degraded pass，因为人类决策点在 failing gate 后面。

## 框架层面的问题

1. Degraded pass 策略在 gate 之间不一致——Agent 无法预测哪些失败会被 gate 容忍、哪些会 hard-fail
2. `degraded_not_eligible` 的判定标准不透明——"structural blocker" 的定义在三个 gate 之间似乎不同
3. 缺少"human-directed degraded pass"机制——当 gate hard-fail 但研究实质已完成时，没有合法的路径让人类在 HITL2 表达"我看到了，继续"
4. `enter-phase` 的 handoff chain 强制执行是正确的，但这意味着一个 hard-failing gate 会阻塞后续所有 phase——包括人类决策点

## 建议方向

- **短期（关键）**：统一三个 gate 的 degraded pass 策略。如果 wave0 和 wave1 可以对 count floor 失败给 degraded pass，wave2 也应该可以对 schema 合规性失败给 degraded pass
- **短期**：为 `degraded_not_eligible` 提供透明的判定标准文档——明确列出哪些失败是 "structural blocker"、哪些允许 degraded pass
- **中期**：引入 "human-directed degraded pass"——在 HITL2 之前，如果 gate hard-fail 且 research substance 完整，允许 Phase Agent 向用户呈现 degraded state 并询问是否接受继续。这不创建新的交互检查点，而是扩展现有 HITL2 的能力范围
- **中期**：`enter-phase` 在 handoff chain 之外增加一个 `--human-directed-override` flag，允许用户明确授权跳过 hard-failing gate。该 flag 的使用被记录为 audited event
