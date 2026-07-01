# cache-raw-web-content Delta Spec

> req: CRC-005, CRC-006

## ADDED Requirements

### Requirement: cache_trails SHALL be Engine-populated

`rb_output_declarations.jsonl` 的 `cache_trails` 字段 SHALL 由 Engine 在 `complete()` 中通过 `appendOutputDeclarationLedger()` 填充——`validateDelegatedCompletion()` 读取 slot result 中的 candidate `cache_trails`，验证完整性，`appendOutputDeclarationLedger()` 写入验证通过的路径。Agent、Phase Agent、Sub-agent MUST NOT 直接写入 ledger。

Engine SHALL 读取 slot result 的 `cache_trails` 数组，验证每个路径存在且含 `websearch.json`/`page.md`/`meta.json` 三个文件，将验证通过的路径字符串写入 ledger record（保持 `z.array(z.string())` 格式不变）。

Engine SHALL hard-fail structurally unsafe candidate trails（absolute path、bundle escape、非 `_cache/` 路径、或 parent cache directory 而非 leaf source directory）。在 Phase 1 过渡期，missing/incomplete leaf content SHALL be filtered from ledger and reported as warning rather than blocking `complete()` by itself. This warning behavior does not make the missing trail authoritative; it only defers enforcement to `cache_coverage`.

#### Scenario: Delegated completion populates cache_trails with verified paths
- **WHEN** Phase Agent 通过 `operate-queue complete` 完成 delegated Sub-agent task
- **AND** slot result 的 `cache_trails` 含 3 条路径，全部通过文件系统验证
- **THEN** `rb_output_declarations.jsonl` 对应记录的 `cache_trails` SHALL 包含这 3 条路径字符串

#### Scenario: Incomplete cache trail not written to ledger
- **WHEN** slot result 的 `cache_trails` 含路径但目录缺少 `page.md`
- **THEN** 该路径 SHALL NOT 写入 ledger record
- **AND** Engine SHALL emit warning 到 trace/log
- **AND** `OutputDeclarationLedgerRecord.cache_trails` SHALL 仅包含验证通过的路径

#### Scenario: Unsafe cache trail hard-fails completion
- **WHEN** slot result 的 `cache_trails` 含 `../outside/` 或 `artifacts/wave1/topic-a/`
- **THEN** delegated `complete()` SHALL reject the completion
- **AND** Engine SHALL NOT append a ledger record for that delegated completion

#### Scenario: Empty cache_trails in slot result produces empty ledger trails
- **WHEN** slot result 的 `cache_trails` 为空数组
- **THEN** Engine SHALL emit warning 到 trace/log
- **AND** `OutputDeclarationLedgerRecord.cache_trails` SHALL 为空数组
- **AND** gate `cache_coverage` 规则 SHALL report the gap（见 CRC-006 两阶段策略）

### Requirement: Gate SHALL cross-validate cache trails（两阶段策略）

Gate wave0-complete 和 wave1-complete 的 `cache_coverage` 规则 SHALL 读取 `rb_output_declarations.jsonl`，检查每条 role 为 `reference` 的 declaration。

**Phase 1（过渡期——首版实现）：**
1. 如果 `cache_trails` 非空 → 验证每个 trail 路径在文件系统中存在且含 3 文件。缺失 → fail。
2. 如果 `cache_trails` 为空 → emit warning（不 fail）。该兼容只用于旧 bundle / 旧 declaration 的过渡缺口；新 rerun `action:add` 正常路径仍 SHALL 产生非空 verified cache trails。

**Phase 2（prose 层更新后——后续 change）：**
- 空 `cache_trails` 升级为 fail。

此两阶段策略 SHALL 在 spec 中明确标注，切换条件为 prose 层更新确认（task card 模板含 cache 路径指令、rerun cache 修复落地）。

#### Scenario: Non-empty cache trail with missing filesystem path fails gate
- **WHEN** declaration 的 `cache_trails` 含 `_cache/wave1/primary/topic-a/s01_x/`
- **AND** 该目录在文件系统中不存在
- **THEN** `cache_coverage` 规则 SHALL fail
- **AND** inspect SHALL 包含缺失路径

#### Scenario: Empty cache_trails emits warning during transition (Phase 1)
- **WHEN** declaration 的 role 为 `reference` 但 `cache_trails` 为空
- **THEN** `cache_coverage` 规则 SHALL emit warning（不 fail）
- **AND** inspect SHALL 包含 declaration 的 `work_id` 和 reference path

#### Scenario: All cache trails verified passes gate
- **WHEN** declaration 的 `cache_trails` 含 3 条路径
- **AND** 文件系统中每条路径都存在且含 3 文件
- **THEN** `cache_coverage` 规则 SHALL pass
