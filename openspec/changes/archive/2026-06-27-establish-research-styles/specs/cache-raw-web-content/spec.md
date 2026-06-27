> req: CRC-001, CRC-002, CRC-003, CRC-004

## ADDED Requirements

### Requirement: Standardized cache directory structure

`_cache/` 目录 SHALL 遵循 `{wave}/{batch}/{scope}/{source_dir}/` 四级结构。每个 wave 的每次 queue drain 为独立 batch。每个 source 的原始网络内容 SHALL 写入 `{source_dir}/` 子目录，包含 `websearch.json`、`page.md`、`meta.json` 三个文件。

#### Scenario: Wave1 primary deepening caches raw web content
- **WHEN** Wave1 primary deepening Sub-agent executes WebSearch + WebFetch to find sources for a topic
- **THEN** it SHALL write each source's raw data to `_cache/wave1/primary/{topic_slug}/s{NN}_{source-slug}/`
- **AND** the directory SHALL contain `websearch.json` (raw search result), `page.md` (fetched page content), and `meta.json` (`{url, title, source_domain, source_name, fetched_at, fetch_method, fetch_chain, content_type, reliability_tier, reliability_basis, whitelist_status}`)
- **AND** the directory SHALL be created by the Phase Agent (`mkdir -p`) before spawning the Sub-agent
- **AND** the path SHALL be communicated to the Sub-agent via the spawn prompt and task card action text

#### Scenario: Wave0 supplementary re-fill caches raw web content
- **WHEN** Wave0 count-floor re-fill loop spawns a supplementary Sub-agent (gate attempt N)
- **THEN** it SHALL write raw data to `_cache/wave0/suppl-r{N}/{topic_slug}/s{NN}_{source-slug}/`
- **AND** `N` SHALL match the gate attempt number encoded in the task card's `work_id` (e.g. `wave0-suppl-{topic}-r2` → `suppl-r2`)

#### Scenario: Wave2 synthesis caches raw web content
- **WHEN** Wave2 synthesis `dpt-topic-scout` Sub-agent executes cross-topic scan
- **THEN** it SHALL write raw data to `_cache/wave2/synthesis/{finding_id}/s{NN}_{source-slug}/`
- **AND** `{finding_id}` SHALL come from the finding identifier in `finding-index.yaml`

### Requirement: Cache path delivery via spawn prompt

Sub-agent 的 spawn prompt SHALL 包含 `Cache directory:` 行，指向 `_cache/` 下的绝对路径。Phase Agent SHALL 在 spawn 前确保目标目录已存在。

#### Scenario: Phase Agent spawns Sub-agent with cache path
- **WHEN** Phase Agent spawns a Sub-agent via `subagent-relay.mjs`
- **THEN** the spawn prompt SHALL include the line `Cache directory: /absolute/path/to/_cache/{wave}/{batch}/{scope}/`
- **AND** Phase Agent SHALL run `mkdir -p` to create the directory before spawning
- **AND** if no cache path parameter is provided, the spawn prompt SHALL NOT include this line (backward compatible)

### Requirement: source-slug consistency between cache and reference

`_cache/` 下的 `{source-slug}` SHALL 与 `reference/` 下对应文件名中的 `<qualifier>` 一致，确保诊断时可从 reference 反查到原始缓存数据。

#### Scenario: Diagnosing a reference by its raw cache data
- **WHEN** any Agent needs to inspect the raw basis of `reference/01_topic-xinhua-box-office.md`
- **THEN** it SHALL be able to locate `_cache/wave1/primary/01_topic/sNN_xinhua-box-office/`
- **AND** `websearch.json` SHALL contain the original search query that led to this source
- **AND** `page.md` SHALL contain the original page content as fetched
- **AND** `meta.json` SHALL contain `{url, title, source_domain, source_name, fetched_at, fetch_method, fetch_chain, content_type, reliability_tier, reliability_basis, whitelist_status}` proving the source's provenance and authenticity

### Requirement: Cache is non-authority and deletable

`_cache/` 下的所有内容 SHALL 标记为 non-authority。Gate SHALL NOT 检查其内容质量。Wave 完成后 Phase Agent MAY 删除对应 wave 子目录以释放空间。

#### Scenario: Cleaning up cache after wave completion
- **WHEN** a wave gate passes
- **THEN** Phase Agent MAY delete `_cache/{wave}/` to free space
- **AND** deletion SHALL NOT affect gate pass verdict or `rb_status.json` state
- **AND** the `_cache/` top-level directory and `agentic-queue/` SHALL be preserved

#### Scenario: _cache/README.md exists at bundle instantiation
- **WHEN** a new bundle is instantiated via `instantiate-run-bundle.mjs`
- **THEN** `_cache/README.md` SHALL be created from template explaining the four-level directory structure, three-file-per-source convention, and reference cross-lookup method
- **AND** `_logs/README.md` SHALL be created from template explaining the log and trace file inventory and their writers
