# BUG-225: `operate-work-unit claim` stdout 不是合法 JSON —— 内嵌 task.md 全文含未转义控制字符，机器消费者全部解析失败

> 状态: 活跃 | 优先级: P1 | 严重度: P1 | 更新: 2026-08-17 | source: 真实 run 执行（dpt_rb_ai-transformation-organization，wave0/wave1 claim）

## Why（完整上下文）

Deep Research Harness 的委托工作流要求 Phase Agent 用
`operate-work-unit.mjs claim <bundle> --phase waveN ...` 领取 work unit，然后从
stdout JSON 中读取 `claimed_work_ids[]` 与 `prompt_refs[]` 继续执行。该 CLI 的输出
声明为 JSON（以 `{` 开头），但 `prompt_refs[].task_ref` 会把生成的完整 `task.md`
（含 `## Completion Contract`、Result JSON Starter 等长文本）**内嵌进 stdout JSON 的
字符串字段**。task.md 内含原始换行与不可见控制字符，序列化时未做 `\n` 转义。

实测后果：任何严格 JSON 消费者都解析失败——`python3 -c "import json,sys; json.load(sys.stdin)"`
报 `Invalid control character at: line 1346 column 92 (char 62539)`；`JSON.parse`
同样失败。Agent 只能放弃解析，改用 `grep -o '"wu-w[0-9a-z-]*"'` 之类的正则从
无效 JSON 里硬抠 work_id。这是本 run 最严重的一次事故的直接诱因（见「影响」）。

## 复现

```bash
# 1. 有 1+ 个可 claim 的 wave0/wave1 queue item（如 wave1-deepen-{topic}）
# 2. 正常 claim
node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs claim <bundle> --phase wave1 \
  --count 1 --actor-outcome unavailable --actor-source native_probe \
  --actor-role-key dpt-evidence-extractor --actor-reason probe_host_policy_blocked \
  --execution-actor phase_agent_fallback
# 3. 把 stdout 交给任何严格 JSON parser
node ... claim ... | python3 -c "import json,sys; json.load(sys.stdin)"
# → json.decoder.JSONDecodeError: Invalid control character at: line 1346 column 92 (char 62539)
```

## 影响（本 run 实账）

- wave0 与 wave1 的全部 claim 都无法机器解析；Agent 被迫用正则提取 `work_id`。
- 正则提取在 claim 成功返回**大段 prompt/task 文本**时取错行（取到已存在 work unit
  的 id 而非新 claim 的 id），导致执行器把 topic 09/10 的补充证据内容写进了
  **已提交**的 `wu-w1-b000-deep-i0001` / `wu-w1-b000-deep-i0002`（topic 01/02 的
  primary work unit）目录，覆盖了它们的 `result.json` 与 cache leaf。
- 恢复需要：从 `rb_output_declarations.jsonl` 逐字段重建 result.json、重抓全部
  cache leaf 并修正 meta.json url 映射、用 engine 的 stableStringify hash 验证
  与 ledger `result_hash` 一致（hash 基准是 `sha256(stableStringify(result))`，
  不是原始文件字节，这一点也没有文档）。
- 整段事故约耗时 20-30 分钟（含误判、恢复、验证）。

## 为什么是框架缺陷（不是 Agent 执行错误）

- CLI 的输出契约是 JSON（结构化、可消费）；内嵌原始控制字符使输出对任何机器
  消费者都无效，是序列化层缺陷，与模型强弱无关。
- `prompt_refs` 只需给出文件路径（`task_ref` 指向磁盘上的 task.md），不需要把
  task.md 全文塞进 stdout；这是输出设计问题。
- Agent 用正则硬抠是「在坏契约上自保」，不是可接受的长期工作方式。

## Owner / 最小修复方向

- Owner: `DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs` 的 claim 输出组装。
- 最小修复：claim stdout 中对任何内嵌长文本字段（task 内容等）做合法 JSON 转义
  （`JSON.stringify` 天然转义 `\n`/控制字符），或改为只输出
  `claimed_work_ids[]` / `prompt_refs[]`（路径）等结构化短字段，正文留在
  `task.md` 文件。
- 附带修复建议：为 claim stdout 增加回归测试「输出必须是可解析 JSON」。
- 相关小项（可并入本卡或独立）：`result_hash` 的基准是
  `sha256(stableStringify(result))`（`engine/work-unit-utils.mjs`），恢复/验证
  result.json 时无从得知该基准；建议在 ledger row 或工作单元文档中标注 hash 基准。
