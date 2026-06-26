# CLI Inspect Output Conventions

> req: IOC-001, IOC-002, IOC-003

## Purpose

定义三个独立的 wave-specific 结构 lint CLI：`inspect-wave0-output.mjs`、`inspect-wave1-output.mjs`、`inspect-wave2-output.mjs`。每个 CLI 只检查自己 wave 的输出约定，不读 `current_gate`，不继承其他 wave。Agent 在对应 wave 中途跑，拿到 inspect/advice 反馈。不是 gate（不控制 phase 前进，不写 trace，不输出 routing）。

## ADDED Requirements

### Requirement: inspect-wave0-output.mjs structural checks

`inspect-wave0-output.mjs` SHALL 检查 wave 0 产出物结构约定：

1. **Flat directory**: `reference/` SHALL 无子目录（`readdirSync` + `isDirectory()` 过滤，忽略 `.DS_Store` 等隐藏文件）
2. **File naming**: 所有 `reference/*.md`（不含 `_INDEX.md`、`README.md`）SHALL 匹配 `00-shared-<slug>.md` 前缀
3. **Metadata block**: 每个 `00-shared-*.md` SHALL 在首个 `## ` header 之前包含以下必填 key：`source_url`、`acceptance_status`、`source_type`、`tier`、`evidence_role`、`trust_level`、`why_it_matters`、`accessed_at`、`related_topic`
4. **Standard sections**: 每个 `00-shared-*.md` SHALL 包含全部 5 个 `## ` section header：`## Key Facts`、`## Core Content Capture`、`## Relevance To This Research`、`## Quotable Terms / Concepts`、`## Risks And Limitations`
5. **_INDEX.md**: 存在，含完整 8 列表头（`ref_file`、`source_type`、`trust_level`、`tier`、`related_topic`、`source_layer`、`acceptance_status`、`date_landed`），至少 1 行数据
6. **README.md**: 存在且非空
7. **Thin YAML per topic**: `artifacts/wave0/<topic>/source.yaml` 存在 per `topic_registry`，每条通过 ReferenceMetadata schema 校验

CLI usage: `node inspect-wave0-output.mjs --bundle <path>`。输出 `{ check, inspect, advice }` JSON，不输出 routing，不写 trace。Exit code: 0 = pass，1 = fail，2 = 参数错误。

#### Scenario: Flat directory check passes

- **WHEN** `reference/` 下仅有 `.md` 文件（`_INDEX.md`、`README.md`、`00-shared-*.md`），无任何子目录
- **THEN** flat directory 检查 SHALL pass

#### Scenario: Flat directory check reports subdirectory

- **WHEN** `reference/` 下存在子目录（如 `reference/01_topic/`）
- **THEN** inspect SHALL 报告 "reference/: contains subdirectory '01_topic/' — directory must be flat"
- **AND** advice SHALL 指示将所有 `.md` 文件移至 `reference/` 平铺、删除空子目录

#### Scenario: Naming check reports unexpected file

- **WHEN** `reference/` 包含 `notes.md`（不以 `00-shared-` 开头）
- **THEN** inspect SHALL 报告 "reference/notes.md: filename does not match expected pattern '00-shared-<slug>.md'"
- **AND** advice SHALL 指示重命名或移出 `reference/`

#### Scenario: Metadata check reports missing key

- **WHEN** `reference/00-shared-ai-landscape.md` 的 metadata block 缺少 `trust_level` 字段
- **THEN** inspect SHALL 报告 "reference/00-shared-ai-landscape.md: metadata block missing required key 'trust_level'"

#### Scenario: Section check reports missing header

- **WHEN** `reference/00-shared-ai-landscape.md` 缺少 `## Risks And Limitations` section
- **THEN** inspect SHALL 报告 "reference/00-shared-ai-landscape.md: missing section '## Risks And Limitations'"

#### Scenario: _INDEX.md header validation

- **WHEN** `reference/_INDEX.md` 存在但 table header 缺少 `source_layer` 列
- **THEN** inspect SHALL 报告 "_INDEX.md: table header missing required column 'source_layer'"

#### Scenario: README.md missing or empty

- **WHEN** `reference/README.md` 不存在或内容为空
- **THEN** inspect SHALL 报告 "reference/README.md: file is missing or empty"

### Requirement: inspect-wave1-output.mjs structural checks

`inspect-wave1-output.mjs` SHALL 检查 wave 1 产出物结构约定（仅 wave 1 专属，不重复 wave 0 检查）：

1. **Per-topic rich MD**: 每个 topic（来自 `topic_registry`）至少 1 个 `reference/<topic-id>-*.md` 文件存在。`topic-id` 从 `topic_registry` 条目的 `id` 字段提取数字后缀（如 `"topic-03"` → `"03"`），或以 `slug` 的数字前缀提取（如 `"03_china-sponsorship..."` → `"03"`）。CLI SHALL 从 `rb_plan.md` frontmatter 读取 `topic_registry`（复用 `readBundlePlan()`）。
2. **0N-*.md metadata**: 每个 `reference/0N-*.md` 文件 SHALL 在首个 `## ` header 之前包含全部 9 个必填 metadata key（同 IOC-001 规则 3）
3. **0N-*.md sections**: 每个 `reference/0N-*.md` 文件 SHALL 包含全部 5 个 `## ` section header（同 IOC-001 规则 4）
4. **evidence-summary per topic**: `artifacts/wave1/<topic>/evidence-summary.md` 存在 per topic
5. **question-list per topic**: `artifacts/wave1/<topic>/question-list.md` 存在 per topic
6. **_INDEX.md wave1 entries**: `reference/_INDEX.md` table SHALL 至少包含 1 行 `source_layer` 列值为 `wave1_topic` 的条目

CLI usage: `node inspect-wave1-output.mjs --bundle <path>`。输出格式和 exit code 同 IOC-001。

#### Scenario: Detects missing topic reference files

- **WHEN** topic_registry 有 topic id=03
- **AND** `reference/` 没有任何 `03-*.md` 文件
- **THEN** inspect SHALL 报告 "topic 03: no reference/03-*.md files found"

#### Scenario: Checks 0N-*.md metadata completeness

- **WHEN** `reference/03-block-goose.md` 存在但 metadata block 缺少 `why_it_matters`
- **THEN** inspect SHALL 报告 "reference/03-block-goose.md: metadata block missing required key 'why_it_matters'"

#### Scenario: Checks 0N-*.md section completeness

- **WHEN** `reference/03-block-goose.md` 存在但缺少 `## Core Content Capture`
- **THEN** inspect SHALL 报告 "reference/03-block-goose.md: missing section '## Core Content Capture'"

### Requirement: inspect-wave2-output.mjs structural checks

`inspect-wave2-output.mjs` SHALL 检查 wave 2 产出物结构约定（仅 wave 2 专属，不重复 wave 0/wave 1 检查）：

1. **No 00_shared/ subdirectory**: `reference/` SHALL NOT 存在名为 `00_shared` 的目录
2. **00-cross-*.md format**: 如有 `reference/00-cross-*.md` 文件，每个 SHALL 通过 metadata block 完整性（9 key）和 5 section 检查
3. **00-cross-*.md index entries**: 如有 `reference/00-cross-*.md` 文件，`reference/_INDEX.md` SHALL 有对应的 `source_layer: wave2_cross` 条目
4. **Wave2 triple artifacts**: `artifacts/wave2/synthesis.md` 存在且非空、`cross-topic-ledger.md`（含 6 个固定 section header）存在、`finding-index.yaml`（可 parse YAML）存在
5. **No backfill tokens**: 所有 `seed_topics/*.md` 文件 SHALL NOT 包含 `__BACKFILL_WAVE2_JUDGMENT__` 或 `__BACKFILL_PENDING_QUESTIONS__` 残留 token

CLI usage: `node inspect-wave2-output.mjs --bundle <path>`。输出格式和 exit code 同 IOC-001。

#### Scenario: Detects 00_shared/ subdirectory

- **WHEN** `reference/` 下存在 `00_shared/` 目录
- **THEN** inspect SHALL 报告 "reference/00_shared/: subdirectory must be removed — cross-topic sources use reference/00-cross-*.md flat files"
- **AND** advice SHALL 指示将内容转为 `00-cross-*.md`

#### Scenario: Passes with no cross files

- **WHEN** `reference/` 没有任何 `00-cross-*.md` 文件
- **THEN** 00-cross 相关检查 SHALL pass（cross files 是可选产出）

#### Scenario: Detects missing wave2 artifacts

- **WHEN** `artifacts/wave2/synthesis.md` 不存在
- **THEN** inspect SHALL 报告 "artifacts/wave2/synthesis.md: file not found"

#### Scenario: Detects unreplaced backfill token

- **WHEN** `seed_topics/03_*.md` 中仍包含 `__BACKFILL_WAVE2_JUDGMENT__` 字面字符串
- **THEN** inspect SHALL 报告 "seed_topics/03_*.md: unreplaced backfill token '__BACKFILL_WAVE2_JUDGMENT__'"

#### Scenario: Detects missing ledger sections

- **WHEN** `artifacts/wave2/cross-topic-ledger.md` 存在但缺少 "HITL2 Handoff" section
- **THEN** inspect SHALL 报告 missing section
