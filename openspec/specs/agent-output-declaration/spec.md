# agent-output-declaration Specification

> req: AGO-001, AGO-002, AGO-003, AGO-004, AGO-005, AGO-006

## Purpose

Define the Agent output declaration contract that lets Relay slot results, delegated queue completion, the bundle-level output ledger, and downstream gates share one authoritative record of Agent-produced files and cache trails.

## Requirements
### Requirement: SlotResult SHALL include structured output_files declaration

Sub-agent 在完成文件写入后，SHALL 在返回的 slot result JSON 中包含 `output_files` 数组。数组每项 SHALL 至少包含 `path`（bundle-relative 路径）和 `role`（文件角色）。

`output_files[].role` SHALL 取以下值之一：`reference`、`evidence_summary`、`question_list`、`source_yaml`、`index`、`other`。`role=reference` 的条目 SHALL 包含 `source_url`。`source_slug` MAY be present。

`commitSlotResult()` SHALL 在写入 committed slot `result.json` 前验证该 schema。generated `result.schema.json` SHALL 与 Zod schema 同步包含此字段。

#### Scenario: Sub-agent declares reference file

- **WHEN** Sub-agent 写入 `reference/01_xinhua-xinhua-box-office.md`
- **AND** slot result 包含 `output_files: [{ path: "reference/01_xinhua-xinhua-box-office.md", role: "reference", source_url: "https://www.chinanews.com.cn/sh/2024/01-01/10138674.shtml" }]`
- **THEN** `commitSlotResult()` SHALL 通过 schema 验证并写入 committed slot `result.json`

#### Scenario: Missing role is rejected

- **WHEN** `output_files` 条目只有 `{ path: "reference/file.md" }` 而无 `role`
- **THEN** `commitSlotResult()` SHALL reject before writing committed result

#### Scenario: reference role without source_url is rejected

- **WHEN** `output_files` 条目 `role` 为 `reference` 但无 `source_url`
- **THEN** `commitSlotResult()` SHALL reject before writing committed result

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

`rb_output_declarations.jsonl` is mandatory provenance proof for reference/evidence-producing relay outputs. Wave0/Wave1 gate provenance relies on current-wave output declaration coverage plus successful current-wave subagent slot binding. Wave2 main-agent synthesis/backfill does not require a Wave2 ledger entry by itself; Wave2 new search/evidence/reference outputs, including promoted `reference/00-cross-*.md`, SHALL be ledger-covered. Files found on disk but not declared in Engine-written ledger records SHALL be treated as orphan/direct-written output and SHALL NOT satisfy coverage or countability by filesystem presence alone.

#### Scenario: complete writes ledger after delegated success

- **WHEN** delegated `complete()` validates committed slot result, runtime receipt, output files, and cache leaves
- **THEN** it SHALL append a record to `rb_output_declarations.jsonl`
- **AND** the record SHALL contain the validated `output_files[]` and `cache_trails[]`

#### Scenario: failed completion does not write ledger

- **WHEN** delegated `complete()` rejects because runtime receipt is missing or cache leaf is incomplete
- **THEN** it SHALL NOT append a record to `rb_output_declarations.jsonl`

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

### Requirement: Engine SHALL consume declaration ledger, not scan directories to discover Agent outputs

Engine code that needs Agent-produced file lists SHALL read from `rb_output_declarations.jsonl` after the completion boundary. Gate `content_dedup` SHALL read `role=reference` entries from the ledger. It SHALL NOT scan `reference/` with `fs.readdir` or glob to discover reference inputs.

Directory scanning MAY be used by a separate contamination diagnostic to report orphan files, but orphan files SHALL NOT be added to the reference input set and SHALL NOT help a gate pass.

#### Scenario: gate content_dedup reads from ledger

- **WHEN** gate `content_dedup` evaluates a bundle
- **THEN** it SHALL load `rb_output_declarations.jsonl`
- **AND** it SHALL filter `output_files[]` entries where `role=reference`
- **AND** it SHALL use only those entries as reference inputs

#### Scenario: orphan reference cannot help pass

- **WHEN** `reference/orphan.md` exists on disk
- **AND** no `rb_output_declarations.jsonl` record declares that path
- **THEN** `content_dedup` SHALL NOT count it as an input reference
- **AND** it SHALL NOT help satisfy any pass condition

### Requirement: Production and experiments SHALL converge at schema-validated declaration

Production SHALL obtain declarations from real Sub-agent committed slot results. Engine-layer experiments MAY use fixture slot results, but those fixtures SHALL pass the same SlotResult schema and enter the same delegated `complete()` / ledger / gate path as production after the declaration point.

#### Scenario: Experiment fixture uses same downstream pipeline

- **WHEN** an Engine-layer playbook provides a fixture slot result containing `output_files[]` and `cache_trails[]`
- **AND** that fixture passes `commitSlotResult()` schema validation
- **THEN** delegated `complete()` and gate SHALL process it through the same code path as a production Sub-agent result

#### Scenario: Production Sub-agent uses same downstream pipeline

- **WHEN** a real Sub-agent returns a committed slot result with declarations
- **THEN** delegated `complete()` SHALL validate and ledger it using the same code path used by fixture-backed Engine tests

### Requirement: Ledger declarations SHALL preserve enough creation context for accepted outputs

Each `rb_output_declarations.jsonl` record SHALL preserve enough context to explain why accepted Agent output files exist.

The record SHALL include the existing provenance fields (`work_id`, `producer_rule`, `slot_result_ref`, `runtime_receipt_ref`, `output_files`, `cache_trails`) and SHALL include a `creation_reason` string derived from one of:
- queue item title/action
- slot result summary
- rerun action/rationale when the output is rerun-related

`creation_reason` SHALL be human-readable, non-empty, and derived by the Engine from existing runtime state. Agent SHALL NOT write the ledger directly.

#### Scenario: Delegated completion explains output origin

- **WHEN** delegated `complete()` appends a ledger record
- **THEN** the record SHALL identify the queue work and relay slot that produced the file
- **AND** the record SHALL include a non-empty `creation_reason`
- **AND** a post-run audit SHALL be able to explain the file without reading chat memory
