# BUG-009: 生产 ledger 缺少 OutputDeclarationLedgerRecord 必需字段

**Severity**: P1 — 数据完整性缺陷
**Found**: 2026-07-01, 分析生产 bundle `dpt_rb_ai-agents-chinese-hospital-systems-2026`
**Related**: [[BUG-008-checkCacheCoverage-undefined-workid]], [[implement-evidence-extraction]]

## 症状

真实生产 bundle `dpt_rb_ai-agents-chinese-hospital-systems-2026` 的 `rb_output_declarations.jsonl` 包含 49 条 record，每条仅含 2 个字段：

```json
{"output_files":[{...}],"cache_trails":[]}
```

缺失 6 个必需字段：`work_id`、`declared_at`、`producer_rule`、`slot_result_ref`、`runtime_receipt_ref`、`creation_reason`。

`validate-bundle.mjs` 对这 49 条全部报错：
```
✗ rb_output_declarations.jsonl: line 1: Invalid input: expected string, received undefined (×6)
```

## 根因分析

框架中唯一的 ledger 写入路径是 `DPT_FRAMEWORK/engine/queue-manager.mjs` 的 `appendOutputDeclarationLedger()`。该函数对每条 record 调用 `OutputDeclarationLedgerRecord.parse(record)` ——这在 schema 层面保证 7 个字段齐全。

该 bundle 的 ledger 不匹配此 schema，说明写入时走的是**另一条代码路径**。可能原因：

1. **Agent/Phase Agent 直接写了 ledger**：尽管 `shared-anti-cheating-rules.md` 禁止 Phase Agent 直接写 ledger，但 phase MD 中可能存在未受约束的写入指令
2. **旧版 `appendOutputDeclarationLedger` 写入了简化格式**：在 `OutputDeclarationLedgerRecord.parse()` 加入之前，函数可能只写了 `output_files` + `cache_trails`
3. **存在未发现的第二写入路径**：`collectAndMergeSubagentResults` 返回 `output_files` 和 `cache_trails`，Phase Agent 可能将其直接序列化写入 ledger

关键在于：**cache 文件本身质量很高**（3 文件齐全、meta.json 11 字段、article-level URL），说明 Agent 确实执行了搜索+写入。但 ledger 记录不完整，说明写入 ledger 的环节有问题。

## 附加发现：cache_trails 全部为空

同 bundle 中 49 条 record 的 `cache_trails` 全部为 `[]`，而磁盘上 `_cache/wave0/primary/{topic}/sNN_{slug}/` 目录结构完全正确（3 文件齐全）。这说明 Sub-agent **写了 cache 文件**但**没有在 result JSON 的 `cache_trails[]` 中声明这些路径**。这是 Phase 2 prose 更新要解决的问题。

## 修复方向

1. **确认 ledger 写入路径**：搜索所有可能写入 `rb_output_declarations.jsonl` 的代码（包括 Agent 指令中的 bash 写入），确保只通过 `appendOutputDeclarationLedger()` 写入
2. **Phase 2 prose 更新**：在 sub-agent task 模板中明确要求 `cache_trails[]` 声明（这是已知的 CRC-005 两阶段策略的 Phase 2）
3. **向后兼容**：`checkCacheCoverage` 和 `readOutputDeclarations` 应能处理缺少字段的旧 record（见 BUG-008）

## 验证

- 对所有现有生产 bundle 运行 `validate-bundle.mjs`，确认 ledger 格式合法性
- 新建 bundle 通过完整的 `operate-queue enqueue → claim → complete` 路径后，确认 ledger 含全部 7 个字段
- `checkCacheCoverage` 对旧格式 ledger 不崩溃，且产生有意义的诊断消息
