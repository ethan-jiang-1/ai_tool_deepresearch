---
bug_id: BUG-134
title: "Wave2 inspect misclassifies synthesis and ledger artifacts as seed return-map entries"
severity: P2
discovered: 2026-07-27
bundle: dpt_rb_openspec-derivative-frameworks
phase: wave2
node: phases/phase-wave2.md
gate: wave2-complete
status: active
---

# BUG-134: Wave2 inspect 把 synthesis/ledger 误当成 return-map

## 现象

发现时，bundle 首次完成合法的 Wave2 三件套后运行：

```bash
node DPT_FRAMEWORK/cli/inspect-wave2-output.mjs \\
  --bundle dpt_rb_openspec-derivative-frameworks
```

inspect 失败，并把 Wave2 的两个 phase-owned artifact 当作需要逐条拥有
return-map 五字段的对象：

```text
failed_rule_ids:
- return_map_missing_fields
- return_map_unsupported_prose

artifacts/wave2/cross-topic-ledger.md:
missing evidence_meaning, relationship, refs, status, next_hop

artifacts/wave2/synthesis.md:
missing evidence_meaning, relationship, refs, status, next_hop

artifacts/wave2/synthesis.md:
prose conclusion lacks bundle-relative refs and return-map fields
```

为了让 inspect 通过，被迫在 `synthesis.md` 和
`cross-topic-ledger.md` 顶部加入额外的 `## Return Map` section。当前文件
中的该 section 是为绕过本次误判留下的 workaround，并非 Wave2 artifact
contract 对这两个文件规定的必要结构。

## 契约对照

当前框架已经明确区分了两类 owner：

- `synthesis.md` 是 narrative projection，应包含 prose、Markdown links、
  W2F finding ids 和 unresolved questions。
- `cross-topic-ledger.md` 是六段结构化 synthesis-control ledger，并写入
  finding/index 的结构化事实。
- Wave2 return-map 的 owner 是 seed topic 的 `## 当前判断` 与
  `## 待验证问题`，其 entries 才要求 `evidence_meaning`、`relationship`、
  `refs`、`status`、`next_hop` 五字段。

证据：

- `DPT_FRAMEWORK/workflows/nodes/shared/shared-return-map-authoring.md` 的
  Wave-to-section ownership 将 Wave2 owner 指向 seed sections；
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2.md` 的 artifact contract
  将 synthesis 与 cross-topic ledger 定义为独立产物，并明确“backfill must
  preserve” return-map entries；
- `openspec/specs/research-return-map/spec.md` 要求 Wave2 return-map projection
  由 finding/index facts 驱动，并明确 pure synthesis 仍在 scope，但 targeted
  backing 不应由 projection check 重实现。

## 影响

1. 合法的 Wave2 narrative/ledger artifact 会在 inspect 阶段被拒绝。
2. Agent 被引导修改不属于该 artifact owner 的结构，增加重复内容和维护漂移。
3. 如果不加 workaround，Gate readiness 被一个与 seed return-map 无关的
   presentation/ledger 形状错误阻断；如果加 workaround，inspect contract
   反过来污染 phase artifact contract。

## 根因假设

Wave2 inspect 的 return-map evaluator 扫描范围过宽，未将 seed-topic
return-map projection 与 Wave2 synthesis/ledger narrative/structured
artifacts 隔离；随后把普通 prose 或 ledger 行解析成 return-map entry，产生
`return_map_missing_fields` 与 `return_map_unsupported_prose`。

## 建议方向

1. 将 Wave2 return-map evaluator 的输入限定为 plan-bound seed topic 的
   return-map owner sections。
2. 让 synthesis/ledger 继续由各自的 Wave2 artifact evaluator 检查；不要
   要求它们额外复制 return-map 五字段。
3. 增加回归：合法的纯 synthesis + 六段 ledger、无额外 `Return Map` section
   时，Wave2 inspect 应通过；seed section 缺字段时仍应准确报 return-map
   finding。

## 接手信息

### 已确认的代码路径

这不是只凭 prose 推测的“扫描范围可能太宽”。当前
`DPT_FRAMEWORK/cli/inspect-wave2-output.mjs` 调用
`inspectWaveArtifactReturnMaps(bundle, 'wave2', ...)`；后者在
`DPT_FRAMEWORK/engine/helpers/return-map.mjs` 的 Wave2 branch 对
`cross-topic-ledger.md` 和 `synthesis.md` 都直接调用默认的
`validateReturnMapContent()`。默认 validator 要求五个 return-map fields，
因此 narrative/ledger 在没有 workaround header 时被当作 return map。

最小 regression seam 是纯函数层：对一个有合法 Wave2 narrative 或六段 ledger、
但没有 return-map fields 的文本调用该 path，当前结果为
`return_map_missing_fields` / `return_map_unsupported_prose`；修复后该 artifact
path 应通过，而 seed-specific evaluator 仍应对缺字段 seed section 判红。

当前 `dpt_rb_openspec-derivative-frameworks` 已在两个 artifact 顶部保留
`## Return Map` workaround，因此 live `inspect-wave2-output` 会通过。这不是 scope
问题已经修复的证据；回归 fixture 应只移除这两个 workaround、保留其余合法
synthesis/ledger 内容，再验证该路径由红转绿。

### 不可误修的边界

- 不要粗暴关闭 Wave2 return-map validation。`inspectSeedTopicReturnMaps()` 对
  `## 当前判断` 与带 W2F refs 的 `## 待验证问题` 的检查仍是必需的。
- [BUG-138](BUG-138-seed-topic-wave-backfill-not-materialized-single-writer-missing.md)
  要求缺失的 seed projection 继续 blocking；修复 BUG-134 只能缩小
  phase-artifact evaluator 的输入范围，不能把 seed projection 一并静默跳过。
- six-section ledger、finding-index binding、synthesis W2F/link requirements 仍由
  各自 Wave2 evaluator 负责；不要把它们改造成 return-map fields 的替代检查。

### 完成判据

1. 没有 `## Return Map` workaround 的合法 Wave2 triple 可通过 Wave2 inspect。
2. 同一 fixture 中删掉一个 seed Wave2 entry 的五字段/W2F binding 时，inspect
   仍只报精确 seed coordinate。
3. 现有 synthesis、ledger 和 finding-index 的独立失败仍保持原有 rule ID/owner，
   不被新的 scope filter 掩盖。
