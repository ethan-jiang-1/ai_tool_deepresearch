# BUG-222: Wave1 depth-review 缺失时，reference convergence 报误导性 `wave1_reference_topic_invalid`，掩盖真实根因 `reviewed_work_unit_refs_missing`

> 状态: 活跃 | 优先级: P2 | 严重度: P2 | 更新: 2026-08-12 | source: 真实 run 执行（enterprise-safe-ai-harness wave1）

## Why

Wave1 的 reference convergence 在**depth-review.yaml 尚未写入**时，`inspect-wave1-output.mjs`
报出 4 条（每 topic 一条）`[wave1_reference_topic_invalid] Current canonical Topic fact is unavailable.`。
真实根因是 `artifacts/wave1/<topic>/depth-review.yaml` 不存在（或其
`reviewed_work_unit_refs[]` 为空），但 Agent 收到的信息完全无法指向这一点。

**代码路径（已核实）：**

1. `evaluateWave1ReferenceTopic`（`wave1-reference-convergence.mjs:319`）：
   - `resolveReviewedWave1SubmittedBacking(...)` 在 depth-review 缺失时返回
     `{ ok: false, root: { code: 'reviewed_work_unit_refs_missing', detail: 'Missing artifacts/wave1/<slug>/depth-review.yaml.' } }`
     （见同文件 :157-158 与 :167-169 —— 这是**清晰、可直接执行**的根因信息）。
   - 但第 353 行 `topic: submittedBacking.ok ? submittedBacking.topic : null` ——
     backing 失败时 `topic` 被设为 `null`。
2. `evaluateWave1ReferenceConvergence`（:442-443）：
   - 第一个 guard 是 `if (!topic?.topic_uid || !topic?.topic_slug) return { outcome: 'parent_root', root: { code: 'wave1_reference_topic_invalid', detail: 'Current canonical Topic fact is unavailable.' } }`。
   - 由于 topic 是 null，此 guard **先于** `if (!submittedBacking?.ok) return { root: submittedBacking.root ... }`（:445）触发，
     把清晰的 `reviewed_work_unit_refs_missing` 根因替换成无信息的 `wave1_reference_topic_invalid`。

**为什么是真缺陷：** 依赖不成立（depth review 未写）时，Engine 有能力给出精确根因
（`Missing artifacts/wave1/<slug>/depth-review.yaml`），却因为 guard 顺序把它吞掉。
强模型按 phase 流程先做 reference materialization、后写 depth-review（phase-wave1.md
§3.2.2 在 §3.2.3 之前）时必然命中。这不是弱模型执行问题——是确定性反馈顺序缺陷。

## 复现

1. 完成 Wave1 work-unit submit，但**不写** `artifacts/wave1/<topic>/depth-review.yaml`。
2. `node DEEP_RESEARCH_HARNESS/cli/inspect-wave1-output.mjs --bundle <bundle>`
3. inspect 输出含 `[wave1_reference_topic_invalid] Current canonical Topic fact is unavailable.`
   （每 topic 一条），`failed_rule_ids` 含 `per_topic_ref_md_count_floor`。
   没有出现 `Missing artifacts/wave1/<topic>/depth-review.yaml`。
4. 写入含非空 `reviewed_work_unit_refs[]` 的 depth-review.yaml 后，同一 inspect
   才改为报 `materialize_projection`（真实后续路径）。

实测：enterprise-safe-ai-harness 首次 wave1 inspect 命中 4 条，耗时从
"读 inspect 猜原因" 到 "读 convergence source 发现 depth-review 依赖" 才定位。

## Owner / 最小修复

- Owner: `DEEP_RESEARCH_HARNESS/engine/helpers/wave1-reference-convergence.mjs` 的
  `evaluateWave1ReferenceConvergence`（guard 顺序）与 `evaluateWave1ReferenceTopic`
  （topic 传参）。
- 最小修复方向（二选一，或都做）：
  1. **调整 guard 顺序**：在 `evaluateWave1ReferenceConvergence` 中把
     `if (!submittedBacking?.ok)` 检查移到 `topic` 检查之前，使真实 backing 根因
     （如 `reviewed_work_unit_refs_missing`）优先浮出。
  2. **调用侧不丢弃 topic**：`evaluateWave1ReferenceTopic` 在 backing 失败时仍传入
     已解析的 topic（从 registry/topicRegistryFact 解析），避免 topic 变 null 触发
     无信息的短路径。
- 验收：depth-review 缺失时，inspect 输出应出现
  `Missing artifacts/wave1/<topic>/depth-review.yaml`（或同等可执行根因），不再出现
  孤立的 `Current canonical Topic fact is unavailable`。
