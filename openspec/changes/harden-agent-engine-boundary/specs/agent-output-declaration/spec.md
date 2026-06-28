# Agent Output Declaration

> req: AGO-001, AGO-002, AGO-003, AGO-004

## Purpose

定义 Sub-agent 的结构化产出声明合同——Agent 的文件产出（路径、角色、来源）必须以 schema-validated 的声明形式记录在 result JSON 中。Engine 消费声明做 receipt 检查、content dedup 和跨文件一致性验证，不再通过 glob/readdir 扫描文件系统"发现" Agent 产出。生产和实验在这个声明处汇聚：两者提供同样 schema 的声明，声明之后的下游管道走完全相同的代码路径。

## ADDED Requirements

### Requirement: Sub-agent result SHALL include structured output_files declaration

Sub-agent 在完成搜索和文件写入后，SHALL 在返回的 result JSON 中包含 `output_files` 数组。数组每项 SHALL 至少包含 `path`（bundle-relative 路径）和 `role`（文件角色）。`role` 为 `reference` 的条目 SHALL 额外包含 `source_url`。

`output_files[].role` SHALL 取以下值之一：`reference`、`evidence_summary`、`question_list`、`source_yaml`、`index`、`other`。

`commitSlotResult()` SHALL 在写入 result.json 前用 Zod schema 验证 `output_files`。

#### Scenario: Sub-agent declares reference file

- **WHEN** Sub-agent 写入 `reference/01_xinhua-xinhua-box-office.md` 作为 reference
- **AND** 返回 result JSON 包含 `output_files: [{ path: "reference/01_xinhua-xinhua-box-office.md", role: "reference", source_url: "https://www.chinanews.com.cn/sh/2024/01-01/10138674.shtml" }]`
- **THEN** `commitSlotResult()` SHALL 通过 schema 验证并写入 result.json

#### Scenario: Sub-agent declares evidence summary

- **WHEN** Sub-agent 写入 wave1 deepening 产出 `artifacts/wave1/01_xinhua/evidence-summary.md`
- **AND** 返回 result JSON 包含 `output_files: [{ path: "artifacts/wave1/01_xinhua/evidence-summary.md", role: "evidence_summary" }]`
- **THEN** `commitSlotResult()` SHALL 通过 schema 验证

#### Scenario: Missing role is rejected

- **WHEN** output_files 条目只有 `{ path: "reference/file.md" }` 而无 `role`
- **THEN** schema 验证 SHALL fail

#### Scenario: reference role without source_url is rejected

- **WHEN** output_files 条目 role 为 `reference` 但无 `source_url`
- **THEN** schema 验证 SHALL fail

### Requirement: Sub-agent result SHALL include cache_trails declaration

Sub-agent SHALL 在 result JSON 中包含 `cache_trails` 数组。每项 SHALL 是 bundle-relative 路径字符串，指向 Sub-agent 写入 `_cache/` 的 source 目录。cache_trails SHALL 用于 `complete()` 的 cache 存在性检查。

#### Scenario: Sub-agent declares cache trail

- **WHEN** Sub-agent 在 `_cache/wave0/primary/01_xinhua/s01_xinhua-box-office/` 下写入了 websearch.json + page.md + meta.json
- **AND** 返回 result JSON 包含 `cache_trails: ["_cache/wave0/primary/01_xinhua/s01_xinhua-box-office/"]`
- **THEN** `commitSlotResult()` SHALL 通过 schema 验证

#### Scenario: Empty cache_trails is valid

- **WHEN** Sub-agent 未写入任何 _cache/（例如因搜索失败）
- **AND** 返回 result JSON 包含 `cache_trails: []`
- **THEN** schema 验证 SHALL pass（空数组合法）
- **AND** `complete()` 的 cache trail 检查 SHALL 在 delegated task 时 reject（见 AGQ-018）

### Requirement: Engine SHALL consume output_files declaration, not scan directories

Engine 代码（`complete()`、gate `content_dedup`、trace verdict）SHALL 从结构化 `output_files[]` 声明中获取 Agent 产出文件列表，SHALL NOT 通过 `fs.readdir` / glob 扫描目录来"发现" Agent 产出文件。

- `complete()` SHALL 遍历 `output_files[].path` 逐项验证文件存在
- gate `content_dedup` SHALL 读 `output_files[]` 中 `role=reference` 的条目获取 reference 文件列表，不再扫描 `reference/` 目录
- trace verdict SHALL 基于声明做事件记录

#### Scenario: complete() checks files from declaration

- **WHEN** `complete()` 被调用
- **AND** result JSON 的 output_files 声明了 3 个文件路径
- **THEN** `complete()` SHALL 逐项检查这 3 个文件是否存在
- **AND** SHALL NOT 扫描 artifacts/ 或 reference/ 目录

#### Scenario: gate content_dedup reads from declaration

- **WHEN** gate `content_dedup` 需要获取 reference 文件列表
- **THEN** it SHALL 从 `output_files[]` 中过滤 `role=reference` 的条目
- **AND** SHALL NOT 扫描 `reference/` 目录

### Requirement: Production and experiment converge at output declaration

生产环境由 Sub-agent 产出声明（经 `commitSlotResult()` schema 验证）。实验环境由 playbook 提供同样 schema 的 fixture 声明（手写 result.json）。声明之后的所有下游代码路径（`complete()` receipt 检查、gate `content_dedup`、trace verdict）SHALL 完全相同，不区分生产与实验。

#### Scenario: Experiment fixture uses same result.json schema as production

- **WHEN** 实验 playbook 手写 result.json fixture 包含 `output_files[]` + `cache_trails[]`
- **AND** fixture 通过 `commitSlotResult()` 的 schema 验证
- **THEN** `complete()` 和 gate 对 fixture 的检查 SHALL 与对生产 Sub-agent 产出的检查走完全相同的代码路径

#### Scenario: Production Sub-agent output goes through same pipeline

- **WHEN** Sub-agent 在真实搜索后返回 result JSON
- **AND** result JSON 通过 schema 验证
- **THEN** 下游 `complete()` 和 gate 调用 SHALL 与实验无任何代码路径差异
