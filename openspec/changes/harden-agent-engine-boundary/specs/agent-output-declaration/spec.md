# Agent Output Declaration

> req: AGO-001, AGO-002, AGO-003, AGO-004

## Purpose

定义 Agent 产出声明合同：Sub-agent 的 slot `result.json` 声明其文件产出与 cache leaf；Engine 在 delegated `complete()` 成功校验后写入 bundle-level `rb_output_declarations.jsonl` ledger；下游 gate 只从 ledger 读取 Agent 产物，不通过目录扫描发现产物。

## ADDED Requirements

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

Sub-agent SHALL 在 slot result JSON 中包含 `cache_trails` 数组。每项 SHALL 是 bundle-relative path，指向 `_cache/` 下的 leaf source directory，例如 `_cache/wave0/primary/01_topic/s01_source/`。

每个 declared leaf directory SHALL directly contain:

- `websearch.json`
- `page.md`
- `meta.json`

`cache_trails[]` SHALL NOT point to a parent directory that merely contains `sNN_*` children. `complete()` SHALL validate the declared path itself as the leaf.

#### Scenario: Sub-agent declares cache leaf

- **WHEN** Sub-agent 在 `_cache/wave0/primary/01_xinhua/s01_xinhua-box-office/` 下写入三文件
- **AND** slot result 包含 `cache_trails: ["_cache/wave0/primary/01_xinhua/s01_xinhua-box-office/"]`
- **THEN** `commitSlotResult()` SHALL pass schema validation
- **AND** delegated `complete()` SHALL validate the three files directly under that leaf directory

#### Scenario: Parent cache directory is not accepted as a leaf

- **WHEN** slot result 声明 `cache_trails: ["_cache/wave0/primary/01_xinhua/"]`
- **AND** 三文件实际位于 `_cache/wave0/primary/01_xinhua/s01_source/`
- **THEN** delegated `complete()` SHALL reject because the declared path is not the leaf containing the required files

### Requirement: complete() SHALL write bundle-level output declaration ledger

`complete()` SHALL append one JSONL record to bundle root `rb_output_declarations.jsonl` after a delegated task passes all provenance and declaration checks. The ledger record SHALL be derived from the committed slot result; Agent SHALL NOT write this ledger directly.

Each ledger record SHALL include at least:

- `declared_at`
- `work_id`
- `producer_rule`
- `slot_result_ref`
- `runtime_receipt_ref`
- `output_files`
- `cache_trails`

The ledger SHALL be append-only. Downstream gates SHALL treat this ledger as the authoritative index of completed Agent outputs.

#### Scenario: complete writes ledger after delegated success

- **WHEN** delegated `complete()` validates committed slot result, runtime receipt, output files, and cache leaves
- **THEN** it SHALL append a record to `rb_output_declarations.jsonl`
- **AND** the record SHALL contain the validated `output_files[]` and `cache_trails[]`

#### Scenario: failed completion does not write ledger

- **WHEN** delegated `complete()` rejects because runtime receipt is missing or cache leaf is incomplete
- **THEN** it SHALL NOT append a record to `rb_output_declarations.jsonl`

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
