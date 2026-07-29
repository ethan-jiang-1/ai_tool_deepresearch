---
bug_id: BUG-152
title: "Wave0 topic-state projection upsert concatenates adjacent entries"
severity: P2
discovered: 2026-07-29
bundle: dpt_rb_openspec-evolution-popularity-user-demands
phase: wave0
node: phases/phase-wave0.md
category: topic-state-projection-writer-format
---

# BUG-152: Wave0 topic-state projection upsert concatenates adjacent entries

## 现象

在合法的 `seed_topics_ready -> wave0_complete` 窗口内，使用已有的
`operate-topic-state apply` 重放一个已存在的 Wave0 projection entry 时，命令返回
`verdict: committed`，但会把原 entry 的 `next_hop` 与下一个 entry 的 `entry_id`
粘在同一行：

```text
- **next_hop**: Read the concrete shared foundation reference before Wave1 deepening.- **entry_id**: wu-w0-b000-src-i0002/3
```

这会让 `inspect-wave0-output` 把本来完整的 Seed Topic return-map entry 解析成缺字段，
本次真实 bundle 的 blocking findings 从 24 增加到 92。

## Red loop（已运行）

当前 active bundle 中执行：

```bash
node DPT_FRAMEWORK/cli/operate-topic-state.mjs apply \
  --bundle dpt_rb_openspec-evolution-popularity-user-demands \
  --input retained-wave0-wu-w0-b000-src-i0002-projection.json

node DPT_FRAMEWORK/cli/inspect-wave0-output.mjs \
  --bundle dpt_rb_openspec-evolution-popularity-user-demands
```

`apply` 返回 `committed`；随后 inspect 返回 `checks_failed: 92`，并报告 Seed Topic
`return_map_missing_fields`。对当前文件扫描可稳定发现多个
`next_hop ... - **entry_id**` 粘连行。

## 预期行为

1. 对已有 entry 的 upsert 必须保持 entry block 之间的换行边界。
2. `apply` 的 postcondition 应拒绝任何会令下一个 entry 无法被独立解析的 staged bytes，
   而不是返回 `committed`。
3. 重放一个语义相同的合法 packet 不应改变其它已提交 projection 的可解析性或数量。

## 诊断结论

根因位于 topic-state projection writer 的替换边界：rendered entry 没有在替换现有
block 时补足 block 末尾换行，且 post-write assertion 只验证当前 packet entry 是否
存在，未捕获相邻历史 entry 的粘连。该问题与 BUG-146 的 rich-reference/return-map
contract collision、BUG-151 的 supplementary provenance drift 分离；它是一个独立的
writer serialization defect。

## 当前数据修复与边界

本次仅在 active bundle 的两个 Seed Topic 文件中补回被 writer 删除的换行；没有修改
`DPT_FRAMEWORK`、代码、ledger、result、receipt、trace、queue 或 status。修复后同一
inspect 恢复为原先 24 个 blocker。不要通过添加历史归属的 `i0002/20` 或 `i0005/13..23`
来掩盖 BUG-151，也不要向 rich reference 追加 return-map 字段来掩盖 BUG-146。

## 建议方向（需走 OpenSpec propose/explore/apply）

- 让 projection upsert 的 rendered replacement 保留明确的 block separator，并将整个
  projection slot 重新解析纳入 postcondition。
- 增加 deterministic regression：已有多 entry slot 上重复 apply 任一 entry 后，所有
  原 entry 仍逐条具备五个字段且 inspect findings 不增加。
- 保持当前 Seed Topic projection writer 的 authority boundary；不以 raw Markdown
  fallback 或第二套 projection ledger 规避问题。

## 接手信息

- Active bundle: `dpt_rb_openspec-evolution-popularity-user-demands`
- Red surface: `operate-topic-state apply` followed by `inspect-wave0-output`
- Owner boundary: `DPT_FRAMEWORK/engine/helpers/canonical-topic-state.mjs` projection
  rendering/upsert and postcondition

## 模型与归因备注（2026-07-29）

- 本次主 Coding Agent：Codex；运行时可见模型族为 GPT-5，精确 deployment/model ID
  未暴露。
- 触发重放的是 Agent，但 packet 本身合法，`apply` 返回 `committed` 后仍把相邻 entry
  粘连，故不能把结果归因成模型太弱；这是 projection writer 的 deterministic serialization
  defect。
- 调整方向：指导弱模型在每次 apply 后必须立刻做同一 inspect，并在发现粘连时只恢复合法
  数据换行；不要向历史 work unit 补 entry，也不要向 rich reference 添加字段。根本修复仍
  需要 writer postcondition/代码变更，本轮不实施。

## Follow-up reproduction (2026-07-29)

在同一 active bundle 中再次通过 `operate-topic-state apply` 写入一个合法的
`wu-w0-b000-src-i0002/20` deferred disposition，命令仍返回 `verdict: committed`，但
inspect 随即从 13 个 blocker 增加到 62 个，并再次发现
`next_hop ... - **entry_id**` 粘连。仅对 bundle Markdown 做机械换行归一化后，inspect
恢复到 12 个 blocker；没有改 framework、ledger、result、receipt、trace、queue 或
status。这是同一 writer 缺陷的第二次真实复现，不是新增的框架修复。
