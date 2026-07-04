# Shared Node Content (delta)

> req: SHC-003

## MODIFIED Requirements

### Requirement: Shared schemas content matches current executable surface

`shared-schemas.md` SHALL summarize the current executable schema surface without duplicating full Zod definitions. It SHALL cover:

- `rb_profile.yaml`, `rb_status.json`, `rb_queue.json`, `rb_plan.md`, `rb_trace.jsonl` field summaries
- gate definition JSON location under `DPT_FRAMEWORK/schema/gate_definitions/`
- transition / gate state contract in `DPT_FRAMEWORK/schema/contracts/gate.mjs`
- ReferenceMetadata schema summary (`DPT_FRAMEWORK/schema/contracts/reference.mjs`)
- wave artifact directory structure:
  - `artifacts/wave0/{topic}/source.yaml` → Wave0 per-topic reference metadata（YAML array，每项满足 ReferenceMetadata schema）
  - `artifacts/wave1/<topic>/evidence-summary.md` → Wave1 relay-backed evidence summary
  - `artifacts/wave1/<topic>/question-list.md` → Wave1 relay-backed question list
  - `reference/{topic.slug}-*.md` → Wave1 relay-backed rich reference files
  - `reference/_INDEX.md` → canonical flat reference inventory
  - `artifacts/wave2/synthesis.md` → Wave2 cross-topic synthesis
  - `artifacts/wave2/cross-topic-ledger.md` → Wave2 Agent-readable finding ledger
  - `artifacts/wave2/finding-index.yaml` → Wave2 JS-readable shadow index
- `final/` terminal delivery output directory distinction
- runtime audit trace `rb_trace.jsonl` vs experiment verdict trace `_trace.jsonl`

Shared schemas SHALL NOT 复制完整 Zod schema 定义。

#### Scenario: Agent understands wave artifact directory and schema

- **WHEN** Agent 需要理解 wave artifacts 应放在哪些目录、metadata 用什么格式
- **THEN** `shared-schemas.md` SHALL 摘要 `reference/`、`artifacts/wave0/`、`artifacts/wave1/`、`artifacts/wave2/` 的用途、schema 和引用格式
- **AND** body SHALL 指向完整 contract 文件位置

#### Scenario: Agent distinguishes runtime trace from experiment verdict trace

- **WHEN** Agent 读取 trace schema 摘要
- **THEN** `shared-schemas.md` SHALL explain that `rb_trace.jsonl` is active bundle runtime audit
- **AND** SHALL explain that `_trace.jsonl` is command experiment verdict evidence
- **AND** SHALL NOT treat `_trace.jsonl` as production runtime truth
