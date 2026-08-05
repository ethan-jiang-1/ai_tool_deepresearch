# Wave0 Artifacts Directory

> req: WAD-001, WAD-002, WAD-003

## Purpose

定义 `artifacts/wave0/` 目录：承载 wave 0 产出的 thin YAML source 列表（原在 `reference/<topic>/source.yaml`），与 `artifacts/wave1/`、`artifacts/wave2/` 并列，保持 artifacts 按 wave 组织的统一结构。

## Requirements

### Requirement: Bundle structure includes artifacts/wave0/ directory

Runtime bundle SHALL 包含 `artifacts/wave0/` 目录。该目录在 bundle instantiation 时创建（与 `artifacts/wave1/`、`artifacts/wave2/` 同步），inspect-bundle.mjs SHALL 将其纳入 required paths。

#### Scenario: Fresh bundle has empty artifacts/wave0/

- **WHEN** `instantiate-run-bundle.mjs` 创建新 bundle
- **THEN** `artifacts/wave0/` 目录被创建（可为空）
- **AND** `inspect-bundle.mjs` 检查该目录存在且为 directory

#### Scenario: inspect-bundle rejects bundle missing artifacts/wave0/

- **WHEN** `inspect-bundle.mjs` 检查一个缺少 `artifacts/wave0/` 的 bundle
- **THEN** 检查失败
- **AND** 输出中报告 `artifacts/wave0/` 缺失

### Requirement: Wave0 thin YAML source lists use ReferenceMetadata schema

`artifacts/wave0/<topic>/source.yaml` SHALL 遵循 `DEEP_RESEARCH_HARNESS/schema/contracts/reference.mjs` 定义的 ReferenceMetadata schema。每条 entry 包含 `url`、`title`、`retrieved_date`、`topic_tag`、`notes`（可选）。

Topic 集合的 source of truth SHALL 为 `rb_plan.md` frontmatter 的 `topic_registry`。共享 source（如有）SHALL 写入 `artifacts/wave0/00_shared/source.yaml`。

#### Scenario: Wave0 produces thin YAML per topic

- **WHEN** wave 0 为 topic 01 检索 foundation evidence
- **THEN** Agent 创建 `artifacts/wave0/01_<topic>/source.yaml`
- **AND** 文件通过 ReferenceMetadata schema 校验

#### Scenario: Wave0 shared sources go to 00_shared subdirectory

- **WHEN** wave 0 检索到跨 topic 共享的 foundation source
- **THEN** Agent 创建或追加 `artifacts/wave0/00_shared/source.yaml`

### Requirement: Instantiation creates artifacts/wave0/ directory

`instantiate-run-bundle.mjs` SHALL 在创建 bundle 时创建 `artifacts/wave0/` 空目录，与 `artifacts/wave1/`、`artifacts/wave2/` 并列。

#### Scenario: Instantiation creates all three wave artifact directories

- **WHEN** 执行 `node DEEP_RESEARCH_HARNESS/cli/instantiate-run-bundle.mjs <name>`
- **THEN** 创建的 bundle 包含 `artifacts/wave0/`、`artifacts/wave1/`、`artifacts/wave2/`
