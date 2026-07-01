# agent-output-declaration Delta Spec

> req: AGO-006

## MODIFIED Requirements

### Requirement: SlotResult SHALL include leaf cache_trails declaration

Sub-agent 在 slot result JSON 中声明的 `cache_trails` SHALL be treated as candidate cache trail declarations, not as ledger authority. 每项 SHALL 是 bundle-relative path，指向 `_cache/` 下的 leaf source directory，例如 `_cache/wave0/primary/01_topic/s01_source/`。

`commitSlotResult()` SHALL continue to schema-validate the slot result shape. Delegated `complete()` SHALL perform Engine validation before any candidate trail can enter `rb_output_declarations.jsonl`.

Delegated `complete()` SHALL hard-fail unsafe or structurally invalid candidate trails:

- absolute paths
- paths that escape the bundle
- paths outside `_cache/`
- parent cache directories that are not leaf source directories

Delegated `complete()` SHALL NOT hard-fail solely because a candidate leaf directory is missing one or more of `websearch.json`、`page.md`、`meta.json` during Phase 1. Instead, Engine SHALL filter out that trail, emit warning to trace/log, and leave gate `cache_coverage` to apply the two-phase enforcement policy.

#### Scenario: Sub-agent declares candidate cache leaf
- **WHEN** Sub-agent 在 `_cache/wave0/primary/01_xinhua/s01_xinhua-box-office/` 下写入三文件
- **AND** slot result 包含 `cache_trails: ["_cache/wave0/primary/01_xinhua/s01_xinhua-box-office/"]`
- **THEN** `commitSlotResult()` SHALL pass schema validation
- **AND** delegated `complete()` SHALL validate the candidate trail before ledger append

#### Scenario: Parent cache directory is rejected as structurally invalid
- **WHEN** slot result 声明 `cache_trails: ["_cache/wave0/primary/01_xinhua/"]`
- **AND** 三文件实际位于 `_cache/wave0/primary/01_xinhua/s01_source/`
- **THEN** delegated `complete()` SHALL hard-fail because the declared path is not a leaf source directory

#### Scenario: Incomplete candidate leaf is filtered during Phase 1
- **WHEN** slot result 声明 `_cache/wave0/primary/01_xinhua/s01_source/`
- **AND** 该 leaf directory 缺少 `page.md`
- **THEN** delegated `complete()` SHALL NOT write that trail to `rb_output_declarations.jsonl`
- **AND** Engine SHALL emit warning to trace/log
- **AND** delegated `complete()` MAY continue if all other delegated provenance and receipt checks pass

### Requirement: complete() SHALL write bundle-level output declaration ledger

`complete()` SHALL remain the only supported writer of bundle root `rb_output_declarations.jsonl`. Agent、Phase Agent、Sub-agent MUST NOT directly append ledger records.

`OutputDeclarationLedgerRecord.cache_trails` SHALL be populated by Engine in `appendOutputDeclarationLedger()` from the verified subset of slot result candidate `cache_trails`. The ledger field format remains `string[]`; it SHALL NOT store status objects.

Ledger append SHALL still require delegated task provenance, runtime receipt, and declared output file checks to pass. Incomplete candidate cache leaves SHALL be omitted from ledger `cache_trails` with warning during Phase 1; path escape, non-`_cache/`, or non-leaf trail declarations remain hard failures.

Downstream gates SHALL treat `rb_output_declarations.jsonl` as the authoritative index of Agent-produced outputs. `cache_coverage` SHALL dynamically re-check that ledger cache trail paths still exist, contain the required three files, and map each role=`reference` output to at least one plausible cache leaf by `source_url`, `source_slug`, or reference filename qualifier.

#### Scenario: Engine writes verified path strings to ledger
- **WHEN** Sub-agent 在 slot result 中声明 cache_trails 含 3 条路径
- **AND** Phase Agent 调用 `operate-queue complete` 完成 task
- **AND** Engine 验证 3 条路径全部通过（目录存在 + 含 3 文件）
- **THEN** `rb_output_declarations.jsonl` 记录的 `cache_trails` 字段 SHALL 包含这 3 条路径字符串（如 `_cache/wave1/primary/topic-a/s01_x/`）
- **AND** 格式为 `string[]`，不包含 status 对象

#### Scenario: Agent-written ledger lacks Engine authority
- **WHEN** Agent 直接 append 到 `rb_output_declarations.jsonl`（绕过 `complete()`）
- **THEN** that record SHALL NOT be considered Engine-written merely because it contains path strings
- **AND** 后续 `cache_coverage`、`ledger_coverage`、或 file observability SHALL surface the gap according to their enforcement policies

> **已知局限**: 此检测是启发式的——Agent 如果同时伪造 cache 目录和 cache_trails 路径，可以绕过硬编码检查。完全防御需要 Engine 对 ledger 条目签名（超出本 change 范围）。当前设计假设 Agent 不主动恶意绕过——目的是防止 Agent 因疏忽或流程缺失而跳过 cache 写入。
