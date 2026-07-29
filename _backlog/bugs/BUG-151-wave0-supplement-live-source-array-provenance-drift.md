---
bug_id: BUG-151
title: "Wave0 supplementary append mutates a live source.yaml and makes new candidates appear owned by historical work units"
severity: P2
discovered: 2026-07-29
bundle: dpt_rb_openspec-evolution-popularity-user-demands
phase: wave0
node: phases/phase-wave0.md
category: work-unit-projection-provenance
---

# BUG-151: Wave0 candidate projection reads a mutable output path for every historical submission

## 现象

Wave0 的两个补充 work unit 按既有 queue contract 合法追加了同一个 topic 的
`artifacts/wave0/<topic>/source.yaml`，并分别通过 dry-submit 与 formal submit：

- `wu-w0-b000-src-i0002` 初次提交时 source array 有 19 条；补充 `wu-w0-b000-src-i0007`
  追加后当前文件有 20 条。
- `wu-w0-b000-src-i0005` 初次提交时 source array 有 12 条；补充 `wu-w0-b000-src-i0006`
  追加后当前文件有 23 条。

补充 work unit 的合法 projection 已通过 `operate-topic-state` 写入：

- `wu-w0-b000-src-i0007/1..20`
- `wu-w0-b000-src-i0006/1..23`

但随后正式 Wave0 inspect 仍返回：

```text
[return_map_current_candidate_omission] ...02_peer-influence-derivative-ecosystem.md:
missing wu-w0-b000-src-i0002/20
[return_map_current_candidate_omission] ...05_user-capability-requirements.md:
missing wu-w0-b000-src-i0005/13 ... /23
```

也就是说，新增 source candidate 被 inspector 错误地要求归属于历史 work ID；补充
work ID 的 projection 不能满足这个要求。

## Red loop（已运行）

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs submit \
  /Users/bowhead/ai_tool_deepresearch/dpt_rb_openspec-evolution-popularity-user-demands \
  --work-id wu-w0-b000-src-i0007 \
  --result /Users/bowhead/ai_tool_deepresearch/dpt_rb_openspec-evolution-popularity-user-demands/_work_units/wave0/wu-w0-b000-src-i0007/result.json

node DPT_FRAMEWORK/cli/operate-work-unit.mjs submit \
  /Users/bowhead/ai_tool_deepresearch/dpt_rb_openspec-evolution-popularity-user-demands \
  --work-id wu-w0-b000-src-i0006 \
  --result /Users/bowhead/ai_tool_deepresearch/dpt_rb_openspec-evolution-popularity-user-demands/_work_units/wave0/wu-w0-b000-src-i0006/result.json

node DPT_FRAMEWORK/cli/inspect-wave0-output.mjs \
  --bundle /Users/bowhead/ai_tool_deepresearch/dpt_rb_openspec-evolution-popularity-user-demands
```

The submit operations returned `status: submitted`. The inspect operation returned
`return_map_current_candidate_omission` for historical i0002/i0005 identities and
`return_map_classification: blocking`.

## 诊断结论

`DPT_FRAMEWORK/engine/work-unit-projection.mjs` 的
`collectEligibleWave0CandidateProjection` 遍历每个 submitted work unit，但使用该
work unit manifest 的 live `source_yaml` target 调用 `evaluateDirectOutputTarget`，再用
当前数组长度生成 `<work_id>/<ordinal>`。它没有使用 submitted result 的 immutable
cardinality/content snapshot，也没有把后续 append 的 ordinals 绑定到产生它们的补充
work ID。

与此同时，Wave0 supplementary task contract 明确要求 actor “append only new real
fetched source candidates” 到现有 `source.yaml`。因此合法 append 会改变历史 work unit
的观察结果，形成跨提交的 provenance drift。

## 预期行为

1. 每个 `<work_id>/<ordinal>` 必须来自该 work unit 提交时验证过的 result/output
   snapshot，或来自明确绑定该 ordinal 的 supplementary work unit。
2. 历史 submitted work 的 candidate cardinality 不应随同一路径后续 append 而改变。
3. Gate 应接受 `wu-w0-b000-src-i0007/20` 与 `wu-w0-b000-src-i0006/13..23` 等新归属，
   不应要求 Agent 把它们伪装成 `i0002`/`i0005` 的历史证据。

## 影响

当前 Agent 面临二选一：不补旧 work ID 时 Wave0 永远被 projection omission 阻断；
手工补 `i0002/20` 或 `i0005/13..23` 又会把后来的来源错误归属给历史 submitted
attempt，破坏 evidence provenance。新 work unit、cache、ledger 和正确的新 projection
都已存在，但无法合法完成 Gate closeout。

## 建议方向（需走 OpenSpec propose/explore/apply）

- 让 submitted work-unit result 持有并校验 source array 的 immutable cardinality/hash
  snapshot，projection 从该 snapshot 派生。
- 或为 supplementary append 分配独立的 immutable source artifact path，并让当前
  candidate evaluator 只把该 path 的 ordinals 绑定到补充 work ID。
- 在 submit boundary 拒绝对已有 submitted direct-output target 的原地 append，或由
  Engine 生成明确的 append lineage/ownership record。
- 增加 deterministic regression：初始 source array 提交后由 supplementary work append，
  断言历史 work 的 candidate set 不增长、补充 work 拥有新 ordinals、Wave0 inspect 可通过。

## Non-goals

- 不通过向 seed 手工追加 `i0002/20` 或 `i0005/13..23` 来掩盖归属错误。
- 不修改 submitted ledger、result hash、receipt、queue 或 source files 以伪造历史快照。
- 不与 BUG-146 的 rich-reference/return-map parser collision 合并；本卡即使关闭，
  shared reference 的 parser scope 仍需单独修复。

## 接手信息

- Active bundle: `dpt_rb_openspec-evolution-popularity-user-demands`
- Red surface: `inspect-wave0-output` after submitted supplementary append
- Current valid projections: `wu-w0-b000-src-i0007/1..20`, `wu-w0-b000-src-i0006/1..23`
- Owner boundary: `work-unit-projection.mjs` live direct-output cardinality and supplementary lineage

## 模型与归因备注（2026-07-29）

- 本次主 Coding Agent：Codex；运行时可见模型族为 GPT-5，精确 deployment/model ID
  未暴露。
- 这是确定性的 framework provenance bug，不是弱模型把归属写错：supplement actor 按
  “append real sources” 合法改变了 live `source.yaml`，而 evaluator 回看历史 work unit
  时错误地重新计算了数组 cardinality。
- 调整方向：对弱模型只需明确“新来源必须用 supplement work ID 投影”；不能让模型为了
  通过 inspect 伪造 `i0002/20` 或 `i0005/13..23`。修复应落在 immutable snapshot/lineage，
  而非数据补丁。
