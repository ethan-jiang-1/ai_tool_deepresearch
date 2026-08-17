# BUG-228: Wave1 `per_topic_ref_md_count_floor` 的阈值解析与「哪些文件可数」口径不可发现——按定义文件/失败文案准备必然被打回

> 状态: 活跃 | 优先级: P1 | 严重度: P2 | 更新: 2026-08-17 | source: 真实 run 执行（dpt_rb_ai-transformation-organization，Wave1 closeout）

## Why（完整上下文）

Wave1 closeout 要求 Phase Agent 为每个 topic 物化 `reference/{topic}-*.md`。
gate 定义 `gate-wave1-complete.definition.json` 的 `per_topic_ref_md_count_floor`：

```json
{ "id": "per_topic_ref_md_count_floor", "check": "count_floor",
  "target": "reference/*{topic}*.md", "threshold": 1,
  "threshold_source": "rb_profile.yaml#/research_style_params/wave1_per_topic_ref_floor",
  "failure_message": "Topic {topic} has fewer than 1 reference/*{topic}*.md rich MD file. Create at least one ..." }
```

三处误导叠加：

1. **定义字面 `threshold: 1` + failure message「at least one」**，但
   `gate-helpers-readers.mjs#resolveThreshold` 会从 profile 的
   `wave1_per_topic_ref_floor`（本 run = 8）解析出**有效阈值为 8**。Agent 按「至少 1」
   准备 1-2 个文件必然 fail；只能读源码确认阈值来源。
2. **「哪些文件可数」口径未公开**：Agent 用 topic 的 **Wave0** 来源也物化了
   canonical 路径的 topic reference（10 个/每 topic，其中 4 个 Wave0-backed），
   inspect 仍报 `reference_floor_deficit: 6/8; deficit 2`——只有 **Wave1 submitted
   backing 的候选**（`inspect-wave1-output` 的 `materialize_projection` 候选）可数，
   Wave0-backed 的文件虽通过 `reference_ledger_coverage`（它们 source_url 在 accepted
   URLs 内）却不计入 floor。计数口径只能靠读 `wave1-reference-convergence.mjs` 的
   `inspectWave1CandidateProjection` 才知道。
3. **hint 每次只给一个候选**（与 BUG-221 相同根因）：deficit 修复提示逐 topic 出现，
   不列出全部 materializable 候选，Agent 无法一次补齐。

## 复现

1. 完成 Wave1 全部 10 个 topic 的 deepening submit。
2. 按 failure message 的字面意思，为每 topic 物化 1-8 个 `reference/{topic}-*.md`
   （含用 topic 的 Wave0 来源做的文件）。
3. `node DEEP_RESEARCH_HARNESS/cli/inspect-wave1-output.mjs --bundle <bundle>`
   → `[reference_floor_deficit] Current canonical reference floor is 6/8; deficit 2.`
   （6 = 该 topic 的 Wave1 accepted sources 数；8 = profile floor；Wave0-backed
   文件不计入）。
4. 只有补足 Wave1 submitted-backed 候选（本 run 走 supplementary
   `wave1_topic_deepening` 补 2-3 个新源/每 topic）后才到 8。

## 影响（本 run 实账）

- 首轮物化了 100 个 topic reference（含 40 个 Wave0-backed），其中 4/每 topic
  不计入 floor；随后为 10 个 topic 各跑 1 个 supplementary work unit 补源，
  再物化 30 个补充 reference。合计约 40-50 分钟额外工作量，且中途多次按
  inspect 逐个排查。
- 如果一开始就知道「阈值=8、只数 Wave1 submitted backing、一次只给一个候选」，
  可以直接规划 8+ 个 Wave1-backed 源/每 topic，省掉整轮补充。

## 为什么是框架缺陷（不是 Agent 执行错误）

- 定义文件与失败文案是 Agent 的唯一权威反馈面，却与实际校验语义（阈值解析、
  计数口径）不一致；Agent 无法在不读源码的前提下正确行动。
- 阈值动态解析本身合理（profile 驱动），但定义文件的 `threshold: 1` 与
  failure message 应反映解析后语义（或标注 `threshold_source` 的解析规则）。

## Owner / 最小修复方向

- Owner: `DEEP_RESEARCH_HARNESS/schema/gate_definitions/gate-wave1-complete.definition.json`
  （文案）+ `wave1-reference-convergence.mjs`（计数口径的可发现性）。
- 最小修复：
  1. `per_topic_ref_md_count_floor` 的 failure message 写明「有效阈值来自
     profile `wave1_per_topic_ref_floor`（当前 8），且仅 Wave1 submitted
     backing 的 canonical 候选计入」。
  2. inspect 的 `materialize_projection` 一次列出该 topic 全部候选的 canonical
     target path（与 BUG-221 同修）。
- 回归测试建议：断言 failure message / 定义语义与实际 `resolveThreshold` 一致；
  断言 Wave0-backed topic reference 不计入 Wave1 floor（锁语义）。
