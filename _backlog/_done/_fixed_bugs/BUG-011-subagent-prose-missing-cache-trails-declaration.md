# BUG-011: Sub-agent prose 未要求声明 cache_trails，导致 ledger 中 cache_trails 永远为空

**Severity**: P1 — 阻塞 cache_coverage Phase 2 迁移
**Found**: 2026-07-01, 分析生产 bundle `dpt_rb_ai-agents-chinese-hospital-systems-2026`
**Related**: [[BUG-010-production-ledger-missing-required-fields]], [[implement-evidence-extraction]], [[cache_coverage]]

## 症状

真实生产 bundle 中 Sub-agent **写了正确的 cache 文件**（`_cache/wave0/primary/{topic}/sNN_{slug}/` 下三文件齐全、meta.json 含 11 字段、URL 为 article-level），但 `rb_output_declarations.jsonl` 中 49 条 record 的 `cache_trails` **全部为空数组**。

`checkCacheCoverage()` 对这 49 条全部 emit Phase 1 warning：
```
[cache_coverage] WARNING (Phase 1): declaration <id> has empty cache_trails for reference <path>
```

## 根因

Sub-agent 的 task 模板（phase MD 中的 `action` 字段和 `task.md` 模板）**没有明确要求 Agent 在 result JSON 中填写 `cache_trails[]`**。对比：

- `output_files[]`——phase MD 中多处明确要求：「返回 JSON 必须包含 Agent Output Declaration：`output_files[]`」
- `cache_trails[]`——phase MD 中**仅在 prose 中描述了 cache 目录约定**，但没有在 result JSON 要求中列出 `cache_trails[]`

`SlotResult` schema 中 `cache_trails` 默认值为 `z.array(z.string()).default([])`，所以 Agent 不填时 Engine 静默接受空数组。

结果：Agent 忠实执行了搜索→写入 cache 文件，但从未被告知要**声明**这些 cache 路径。Engine 只能看到空数组。

## 修复方向（Phase 2 — CRC-005 两阶段策略）

在以下文件中添加 `cache_trails[]` 声明要求：

1. **`DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md`**：在 task card 的 `action` 模板末尾，`output_files[]` 声明旁边，添加 `cache_trails[]` 的明确要求
2. **`DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md`**：同样
3. **`DPT_FRAMEWORK/engine/subagent-relay.mjs`**：`taskMarkdownForSlot()` 中 Output section 已列出了 `result.schema.json` 要求，但可以加强
4. **`DPT_FRAMEWORK/workflows/nodes/shared/shared-subagent-protocol.md`**：在 Agent Output Declaration 示例中补充 `cache_trails` 示例

具体要求措辞（参考现有 `output_files[]` 声明）：
> 返回 JSON 必须包含 Agent Output Declaration：`output_files[]`（每个产出文件声明 path/role/source_url/source_slug，role=reference 时 source_url 必填）和 **`cache_trails[]`（实际写入的 leaf source 目录路径，每目录直接含 websearch.json/page.md/meta.json，不声明 parent cache dir）**。

Phase 2 完成后，`cache_coverage` 规则的空 `cache_trails` 从 Phase 1 warning 升级为 fail。

## 验证

- 修改 prose 后用新 bundle 跑一次完整 wave0 source intake
- 确认 Sub-agent result JSON 的 `cache_trails` 非空
- 确认 `rb_output_declarations.jsonl` 的 `cache_trails` 非空
- 确认 `checkCacheCoverage` 不再 emit empty trail warning
- 确认 `_cache/` 目录结构与声明的路径一致
