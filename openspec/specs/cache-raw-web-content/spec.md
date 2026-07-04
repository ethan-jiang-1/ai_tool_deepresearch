# cache-raw-web-content Specification

> req: CRC-001, CRC-002, CRC-003, CRC-004, CRC-005, CRC-006

## Purpose

Define the standardized cache directory structure for raw web content fetched during deep research waves. The cache stores websearch results, fetched pages, and metadata in a consistent four-level hierarchy so that any reference can be traced back to its original raw source data for diagnostic and provenance verification.

## Requirements

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

Sub-agent 的 spawn prompt SHALL 包含 `Cache directory:` 行，指向 `_cache/` 下的绝对路径（`_cache/{wave}/{batch}/{scope}/sNN_{source-slug}/` 布局，见 `shared-subagent-protocol.md` §2）。Phase Agent SHALL 在 spawn 前确保目标 cache 目录已存在（`mkdir -p`），并 SHALL 经 `drive-relay-slot stage` 产出 spawn prompt 与 `_beacon.json` 后再 spawn；SHALL NOT 经直接 `subagent-relay.mjs` engine 调用绕过 driver staging。

#### Scenario: Phase Agent spawns Sub-agent with cache path via driver

- **WHEN** Phase Agent delegates a search task
- **THEN** Phase Agent SHALL invoke `drive-relay-slot stage` before spawn
- **AND** the emitted spawn prompt SHALL include the line `Cache directory: /absolute/path/to/_cache/{wave}/{batch}/{scope}/`
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

`_cache/` remains non-authority: Gate SHALL NOT judge source quality from raw cache contents, and accepted verdict truth remains in Engine checks, ledger, receipts, and trace. However, once `cache_coverage` is enabled for wave0/wave1, cache leaves referenced by `rb_output_declarations.jsonl.cache_trails` become required provenance evidence until the relevant gate/reentry checks have completed and their verdict evidence has been recorded.

Phase Agent MAY delete `_cache/{wave}/` only after the gate/reentry verdicts that depend on `cache_coverage` have already completed and recorded their trace/gate-attempt evidence. Deleting cache leaves before those checks SHALL cause `cache_coverage` to fail or report a blocking gap for any non-empty ledger trail that no longer exists.

This modifies the previous deletability rule only for cache leaves that are actively referenced by Engine-written declarations. Unreferenced intermediate cache files remain non-authority and may be cleaned up according to existing bundle hygiene rules.

#### Scenario: Referenced cache leaf is retained until cache_coverage runs
- **WHEN** `rb_output_declarations.jsonl` contains `cache_trails: ["_cache/wave1/primary/topic-a/s01_source/"]`
- **AND** wave1 `cache_coverage` has not yet recorded a verdict
- **THEN** Phase Agent SHALL NOT delete that cache leaf
- **AND** if it is deleted, `cache_coverage` SHALL fail or report a blocking gap for that trail

#### Scenario: Cache may be cleaned after provenance verdict is recorded
- **WHEN** wave1 `cache_coverage` has passed and its gate attempt / trace evidence has been recorded
- **THEN** Phase Agent MAY clean `_cache/wave1/` to free space
- **AND** the historical gate verdict SHALL remain valid because the verdict evidence, ledger, and trace were recorded before cleanup

#### Scenario: Cleaning up cache after wave completion
- **WHEN** a wave gate passes
- **THEN** Phase Agent MAY delete `_cache/{wave}/` to free space
- **AND** deletion SHALL NOT affect gate pass verdict or `rb_status.json` state
- **AND** the `_cache/` top-level directory and `agentic-queue/` SHALL be preserved

#### Scenario: _cache/README.md exists at bundle instantiation
- **WHEN** a new bundle is instantiated via `instantiate-run-bundle.mjs`
- **THEN** `_cache/README.md` SHALL be created from template explaining the four-level directory structure, three-file-per-source convention, and reference cross-lookup method
- **AND** `_logs/README.md` SHALL be created from template explaining the log and trace file inventory and their writers

### Requirement: cache_trails SHALL be Engine-populated

`rb_output_declarations.jsonl` 的 `cache_trails` 字段 SHALL 由 Engine 在 `complete()` 中通过 `appendOutputDeclarationLedger()` 填充——`validateDelegatedCompletion()` 读取 slot result 中的 candidate `cache_trails`，验证完整性，`appendOutputDeclarationLedger()` 写入验证通过的路径。Agent、Phase Agent、Sub-agent MUST NOT 直接写入 ledger。

Engine SHALL 读取 slot result 的 `cache_trails` 数组，验证每个路径存在且含 `websearch.json`/`page.md`/`meta.json` 三个文件，将验证通过的路径字符串写入 ledger record（保持 `z.array(z.string())` 格式不变）。

Engine SHALL hard-fail structurally unsafe candidate trails（absolute path、bundle escape、非 `_cache/` 路径、或 parent cache directory 而非 leaf source directory）。在 Phase 1 过渡期，missing/incomplete leaf content SHALL be filtered from ledger and reported as warning rather than blocking `complete()` by itself. This warning behavior does not make the missing trail authoritative; it only defers enforcement to `cache_coverage`.

#### Scenario: Delegated completion populates cache_trails with verified paths
- **WHEN** Phase Agent 通过 `operate-queue complete` 完成 delegated Sub-agent task
- **AND** slot result 的 `cache_trails` 含 3 条路径，全部通过文件系统验证
- **THEN** `rb_output_declarations.jsonl` 对应记录的 `cache_trails` SHALL 包含这 3 条路径字符串

#### Scenario: Incomplete cache trail not written to ledger
- **WHEN** slot result 的 `cache_trails` 含路径但目录缺少 `page.md`
- **THEN** 该路径 SHALL NOT 写入 ledger record
- **AND** Engine SHALL emit warning 到 trace/log
- **AND** `OutputDeclarationLedgerRecord.cache_trails` SHALL 仅包含验证通过的路径

#### Scenario: Unsafe cache trail hard-fails completion
- **WHEN** slot result 的 `cache_trails` 含 `../outside/` 或 `artifacts/wave1/topic-a/`
- **THEN** delegated `complete()` SHALL reject the completion
- **AND** Engine SHALL NOT append a ledger record for that delegated completion

#### Scenario: Empty cache_trails in slot result produces empty ledger trails
- **WHEN** slot result 的 `cache_trails` 为空数组
- **THEN** Engine SHALL emit warning 到 trace/log
- **AND** `OutputDeclarationLedgerRecord.cache_trails` SHALL 为空数组
- **AND** gate `cache_coverage` 规则 SHALL report the gap（见 CRC-006 两阶段策略）

### Requirement: Gate SHALL cross-validate cache trails（两阶段策略）

Gate wave0-complete 和 wave1-complete 的 `cache_coverage` 规则 SHALL 读取 `rb_output_declarations.jsonl`，检查每条 role 为 `reference` 的 declaration。

For each declared role=`reference` output, `cache_coverage` SHALL verify both:

1. every non-empty declared cache trail path still exists and contains `websearch.json` / `page.md` / `meta.json`
2. the reference has at least one plausible cache leaf mapping by `meta.json.url == output_files[].source_url` and/or by matching the cache leaf slug to `output_files[].source_slug` / reference filename qualifier

**Phase 1（过渡期——首版实现）：**
1. 如果 `cache_trails` 非空 → 验证每个 trail 路径在文件系统中存在且含 3 文件，并验证每个 role=`reference` output 至少映射到一个 trail。缺失或无法映射 → fail / blocking gap。
2. 如果 `cache_trails` 为空 → emit warning（不 fail）。该兼容只用于旧 bundle / 旧 declaration 的过渡缺口；新 rerun `action:add` 正常路径仍 SHALL 产生非空 verified cache trails。

**Phase 2（prose 层更新后——后续 change）：**
- 空 `cache_trails` 升级为 fail。

此两阶段策略 SHALL 在 spec 中明确标注，切换条件为 prose 层更新确认（task card 模板含 cache 路径指令、rerun cache 修复落地）。

#### Scenario: Non-empty cache trail with missing filesystem path fails gate
- **WHEN** declaration 的 `cache_trails` 含 `_cache/wave1/primary/topic-a/s01_x/`
- **AND** 该目录在文件系统中不存在
- **THEN** `cache_coverage` 规则 SHALL fail
- **AND** inspect SHALL 包含缺失路径

#### Scenario: Empty cache_trails emits warning during transition (Phase 1)
- **WHEN** declaration 的 role 为 `reference` 但 `cache_trails` 为空
- **THEN** `cache_coverage` 规则 SHALL emit warning（不 fail）
- **AND** inspect SHALL 包含 declaration 的 `work_id` 和 reference path

#### Scenario: All cache trails verified passes gate
- **WHEN** declaration 的 `cache_trails` 含 3 条路径
- **AND** 文件系统中每条路径都存在且含 3 文件
- **AND** each role=`reference` output maps to at least one trail by `source_url` or `source_slug`
- **THEN** `cache_coverage` 规则 SHALL pass

#### Scenario: Non-empty cache trails without reference mapping fails gate
- **WHEN** declaration 的 role=`reference` output has `source_url: "https://example.com/a"`
- **AND** `cache_trails` 非空且每条路径都存在并含 3 文件
- **AND** none of the trail `meta.json.url` values or slugs match that reference
- **THEN** `cache_coverage` 规则 SHALL fail or report a blocking cache mapping gap
