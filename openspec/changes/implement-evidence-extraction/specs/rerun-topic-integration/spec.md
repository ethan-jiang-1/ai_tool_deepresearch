# rerun-topic-integration Delta Spec

> req: RTI-006

## ADDED Requirements

### Requirement: Rerun-produced reference files SHALL have traceable cache trails

每个 rerun 产生的 reference 文件 SHALL 在 `rb_output_declarations.jsonl` 中有对应的 `cache_trails` 记录。Engine 的 `cache_coverage` gate 规则 SHALL 对 rerun 路径与首次运行路径一视同仁——不因 `rerun_count > 0` 而跳过 cache 验证。

This requirement applies to new rerun executions after this change is implemented. Existing legacy bundle declarations with empty `cache_trails` MAY be reported as Phase 1 warnings for compatibility, but that warning path SHALL NOT be interpreted as permission for new rerun `action:add` tasks to omit cache writing.

`check-reentry.mjs` 的 file observability audit SHALL 报告缺失 cache trail 的 reference 文件为 `unplanned_needs_explanation`（如果文件存在但无 cache trail）或 `orphan_authority_blocking`（如果文件存在但无 declaration）。该 finding SHALL use existing file observability classifications and mark the specific condition with `kind` or `check` = `cache_gap`; it SHALL NOT introduce a new top-level classification value.

#### Scenario: Rerun-added topic reference files have verified cache trails
- **WHEN** rerun `action: add` topic 的 Wave1 deepening 产生 5 个 reference 文件
- **AND** Phase Agent 通过 `complete()` 完成 delegated tasks
- **THEN** `rb_output_declarations.jsonl` 中每条对应 declaration 的 `cache_trails` SHALL 非空
- **AND** `cache_coverage` gate 规则 SHALL pass

#### Scenario: Legacy rerun reference file without cache trail is flagged
- **WHEN** an existing legacy rerun reference file exists but its declaration has empty `cache_trails`
- **THEN** `check-reentry` 的 file observability SHALL 报告该文件
- **AND** `cache_coverage` gate 规则 SHALL 按两阶段策略处理：Phase 1 emit warning（兼容过渡期），Phase 2 fail（CRC-006 定义）

#### Scenario: New rerun action:add omitting cache trail is not acceptable
- **WHEN** this change is implemented
- **AND** a new rerun `action:add` delegated task produces reference files with empty `cache_trails`
- **THEN** file observability SHALL report a `cache_gap` condition using existing classifications
- **AND** the run SHALL be treated as not satisfying the successful rerun cache-trail path
