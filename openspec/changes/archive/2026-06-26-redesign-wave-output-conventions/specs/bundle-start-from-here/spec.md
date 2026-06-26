# Bundle Start From Here (delta)

> req: BUS-001, BUS-002

注：BUS-002 为 delta 新增 ID，内容嵌入 BUS-001 的 MODIFIED body 中（data directory map 新增 `reference/` 扁平结构 + `artifacts/wave0/`），不设独立 `### Requirement:` 块。参见 `openspec/governance/req-registry.yaml` 中对应 pending 条目。

## MODIFIED Requirements

### Requirement: START_FROM_HERE.md is the first file an agent reads

The boot entry SHALL provide: framework location (`../DPT_FRAMEWORK/`), control file list with `rb_` prefixed names, data directory map, and stop authorization rules. The data directory map SHALL document:

- `reference/` — 扁平 evidence 目录（`00-shared-*.md` / `00-cross-*.md` / `0N-*.md`，`_INDEX.md` 为 canonical inventory），无子目录
- `artifacts/` — 阶段产物按 wave 组织（`wave0/` thin YAML、`wave1/` topic 合成、`wave2/` cross-topic 合成）
- `seed_topics/` — 种子话题文件
- `final/` — 最终报告

#### Scenario: Agent reads updated boot entry data directory map

- **WHEN** an agent opens a bundle directory for the first time
- **THEN** `START_FROM_HERE.md` tells it `reference/` is a flat directory with `_INDEX.md` as canonical inventory
- **AND** tells it `artifacts/wave0/` exists alongside `artifacts/wave1/` and `artifacts/wave2/`

#### Scenario: Boot entry no longer references nested reference directories

- **WHEN** an agent reads `START_FROM_HERE.md`
- **THEN** it SHALL NOT see references to `reference/<topic>/` subdirectories or `reference/00_shared/source.yaml`
