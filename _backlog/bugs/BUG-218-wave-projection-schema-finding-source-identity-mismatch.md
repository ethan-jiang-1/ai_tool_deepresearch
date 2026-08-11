# BUG-218: operate-topic-state wave_projection schema 对 finding source_identity 字段说明与 validator 不一致

> 状态: 活跃 | 优先级: P2 | 严重度: P2 | 更新: 2026-08-11 | source: 真实 run 执行（enterprise-ai-harness-adoption-open-source wave2）

## Why

`operate-topic-state.mjs schema --context wave_projection` 对
`apply_seed_projection` 的 `updates[].entries[].source_identity` 只暴露一个
必填字段：`source_identity.work_id`（value_shape 为 string）。`kind` 的闭集
同时允许 `submitted_work` 与 `finding`。但实际 Zod validator 对
`kind: "finding"` 要求 **`source_identity.finding_id`**，并拒绝 `work_id`
（报 `unrecognized_keys` + `finding_id Expected string; received undefined`）。

因此，一个遵循 schema 输出构造 Wave2 `wave2_judgment` projection packet 的
Agent，在 `kind: finding` 时使用 `work_id` 必然被 `input_invalid` 拒绝，
必须靠试错改用 `finding_id` 才能通过。schema 未区分 `submitted_work` /
`finding` 两个 kind 各自的必填标识字段，是**确定性契约缺口**——强模型
遵循 schema 输出仍会命中，不是弱模型执行 artifacts。

## 复现

```bash
# 1. schema 输出只列 work_id（不列 finding_id）
node DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs schema --context wave_projection
#   -> required source_identity fields: [... 'updates[].entries[].source_identity.work_id']
#   -> value_shapes: { ... 'updates[].entries[].source_identity.work_id': 'string' }

# 2. 按 schema 构造 kind: finding + work_id，被拒
cat > /tmp/repro.json <<'JSON'
{
  "context": "wave_projection",
  "action": "apply_seed_projection",
  "topic_uid": "tp_<uid>",
  "wave": "wave2",
  "updates": [{
    "slot_id": "wave2_judgment",
    "entries": [{
      "source_identity": { "kind": "finding", "work_id": "W2F-001" },
      "entry_id": "W2F-001",
      "evidence_meaning": "repro",
      "relationship": "supports",
      "refs": ["reference/00-cross-*.md"],
      "status": "partial",
      "next_hop": "repro"
    }]
  }]
}
JSON
node DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs apply --bundle <bundle> --input /tmp/repro.json
#   -> verdict: blocked, reason: input_invalid
#   -> validation_errors: updates[0].entries[0].source_identity.finding_id Expected string; received undefined.
#      updates[0].entries[0].source_identity Object contains unsupported fields.

# 3. 改用 finding_id 后通过（正确形态）
#   source_identity: { "kind": "finding", "finding_id": "W2F-001" }
```

## Owner / 最小修复

- Owner: `operate-topic-state.mjs` 的 wave_projection schema 投影输出
  （schema discovery 层，`--context wave_projection`）
- 最小修复: schema 输出按 `source_identity.kind` 区分必填标识字段——
  `submitted_work` 暴露 `work_id`，`finding` 暴露 `finding_id`；或至少在
  value_shapes / closed_values 中说明 finding kind 使用 `finding_id`。
- 可观察 done 条件: 按 schema 输出构造的 `kind: finding` packet 能通过
  `apply`，无需试错改用未列出的字段名。

## 备注

- 实测于 2026-08-11 `enterprise-ai-harness-adoption-open-source` wave2
  seed projection。5 个 topic 的 `wave2_judgment` packet 均需用
  `finding_id`，schema 输出对此零提示。
- 该 run 已用 finding_id 完成全部 wave2 投影，故仅记录契约缺口，不阻塞
  当前 run。
- 相关契约: `shared-schemas.md` finding-index 的 `source_identity.kind`
  enum 含 `finding`；wave2 projection packet 的 finding entry 用
  `entry_id = W2F-xxx`。
