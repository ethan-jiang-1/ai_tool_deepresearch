# Evidence Extraction

> req: EEX-001, EEX-002, EEX-003, EEX-004

## Purpose

Define the Engine-side evidence extraction capabilities for assessing reference quality, counting references, and validating cache trails through the output declaration ledger.
## Requirements
### Requirement: isCountable reference判定

Engine SHALL 实现 `isCountable(ref)` 函数，返回 `{ countable: boolean, reason?: string }` 对象。当 `countable: true` 时表示该 reference 满足最低计数条件。满足以下全部条件方可计数：

1. `acceptance_status` 为 `accepted`
2. `## Core Content Capture` section 非空且 >= 100 字符
3. `source_url` 是 article-level URL（非 homepage/shallow，由 `isHomepageUrl()` 判定）
4. `## Key Facts` section 含 >= 5 条 bullet line（由 `checkReferenceKeyFactsMinLines()` 判定）

当文件不可解析（malformed MD、无 frontmatter、无法提取 section）时，`isCountable()` SHALL return `{ countable: false, reason: "unparseable" }`——不在异常中静默跳过。

#### Scenario: Accepted reference with substantive content is countable
- **WHEN** reference 文件 metadata block 含 `acceptance_status: accepted`
- **AND** `## Core Content Capture` section >= 100 字符
- **AND** `source_url` 指向具体文章（如 `https://example.com/research/findings`）
- **AND** `## Key Facts` 含 >= 5 条 bullet
- **THEN** `isCountable(ref)` SHALL return `{ countable: true }`

#### Scenario: Reference with homepage URL is not countable
- **WHEN** reference 文件的 `source_url` 是 homepage（如 `https://example.com/` 或 `https://example.com/news/`）
- **THEN** `isCountable(ref)` SHALL return `{ countable: false, reason: "source_url_is_homepage" }`

#### Scenario: Reference with thin Core Content Capture is not countable
- **WHEN** reference 文件 `## Core Content Capture` section 内容 < 100 字符
- **THEN** `isCountable(ref)` SHALL return `{ countable: false, reason: "core_content_capture_too_thin" }`

#### Scenario: Unparseable reference file returns not countable
- **WHEN** reference 文件无法解析（malformed MD、无 `##` section header、文件不可读）
- **THEN** `isCountable(ref)` SHALL return `{ countable: false, reason: "unparseable" }`
- **AND** Engine SHALL NOT throw exception

### Requirement: countReferences Engine计算

Engine SHALL 实现 `countReferences(baseDir, options?)` 函数，用于 Engine 计算 reference floor 和 fork-router `ref_count`。默认模式 SHALL 从 `rb_output_declarations.jsonl` 读取 role=`reference` 的 declared output paths，只对这些 Engine-ledgered reference 文件调用 `isCountable()`，返回 `{ count: number, uncountable: Array<{path: string, reason: string}> }` 对象供 audit 透明。

`count` SHALL 由 Engine 独立计算，MUST NOT 依赖 Agent 声明的 `evidenceCount` 字段。`uncountable` 数组 SHALL 列出每个不可计数文件的路径和原因。

`countReferences()` SHALL support scope filtering so gate rules can preserve target semantics:

- `options.targetGlob` MAY restrict candidates to a gate target such as `reference/00-shared-*.md` or `reference/*{topic}*.md`
- `options.topic` MAY further restrict candidates when a gate expansion carries topic context
- `options.source` defaults to `"ledger"` for pass/fail decisions; `"filesystem"` MAY be used only by diagnostics and SHALL NOT be used to satisfy a gate pass condition

`countReferences()` SHALL be a quality/count helper for `count_floor` and fork-router `ref_count`; it SHALL NOT grant ledger authority to files it finds. Orphan reference files found by directory scan SHALL remain non-authoritative until they are declared through `rb_output_declarations.jsonl` or otherwise handled by file observability / ledger coverage diagnostics. Gate `count_floor` and fork-router branch decisions SHALL NOT count orphan reference files.

#### Scenario: Engine counts only countable references
- **WHEN** `rb_output_declarations.jsonl` declares 10 role=`reference` files
- **AND** 其中 7 个 declared reference files 满足 `isCountable()` 条件，3 个不满足
- **THEN** `countReferences(baseDir)` SHALL return `{ count: 7, uncountable: [...] }`
- **AND** `uncountable` 数组 SHALL 包含 3 个条目，每个含 `path` 和 `reason`

#### Scenario: Empty reference directory returns zero
- **WHEN** `rb_output_declarations.jsonl` has no declared role=`reference` files, or declared reference files are missing/unreadable
- **THEN** `countReferences(baseDir)` SHALL return `{ count: 0, uncountable: [] }`

#### Scenario: Countable orphan reference remains non-authoritative
- **WHEN** `reference/orphan.md` exists and satisfies `isCountable()`
- **AND** no `rb_output_declarations.jsonl` record declares that file
- **THEN** `countReferences(baseDir)` with default `source: "ledger"` SHALL NOT include it in the quality count
- **AND** content input checks such as `content_dedup` SHALL NOT treat it as authoritative ledger input
- **AND** file observability / ledger coverage SHALL still be able to flag the orphan authority gap

#### Scenario: Per-topic scoped count does not use global reference count
- **WHEN** gate rule target is `reference/*topic-a*.md`
- **AND** ledger declares 6 countable references for topic-b and 0 for topic-a
- **THEN** `countReferences(baseDir, { targetGlob: "reference/*topic-a*.md", topic: "topic-a" })` SHALL return `{ count: 0, ... }`
- **AND** the topic-a `count_floor` rule SHALL fail even though the bundle has countable references for other topics

### Requirement: ref_count 改为 Engine 计算

Work-unit result processing SHALL use Engine-verifiable declared references to compute `ref_count` and MUST NOT accumulate an Agent-provided `evidenceCount` field. Production `ref_count` SHALL be derived from submitted work-unit result declarations after schema validation and/or the Engine-written ledger, not from untrusted Agent numeric claims.

Gate `count_floor` rules SHALL use `countReferences()` to obtain actual reference counts and MUST NOT rely only on filesystem globbing.

Gate checks that need authoritative Agent-produced content inputs, including `content_dedup`, SHALL continue to consume `rb_output_declarations.jsonl` rather than switching to directory scans. `count_floor` using Engine count does not change ledger as the Source of Record for declared outputs; it only changes how declared references are filtered for countability.

#### Scenario: work-unit submit path uses Engine-computed ref_count

- **WHEN** Wave0 source intake submits a work-unit result and ledger row declaring 8 reference files but only 6 are `isCountable()`
- **THEN** the Engine-computed `ref_count` SHALL be `6`

#### Scenario: Agent evidenceCount is ignored even when larger

- **WHEN** a sub-agent result declares `evidenceCount: 99`
- **AND** submitted declarations contain only 3 countable references
- **THEN** Engine-derived `ref_count` SHALL be `3`
- **AND** the Agent numeric claim SHALL NOT affect branch routing

### Requirement: cache_trails 文件系统验证

Engine SHALL validate every path in a submitted work-unit result `cache_trails` array:

1. Path is inside the bundle and does not escape.
2. Path is under `_cache/`.
3. Path is a leaf source directory rather than a parent collection directory.
4. Directory exists.
5. Directory contains `websearch.json`, `page.md`, and `meta.json`.

Validated paths SHALL be written to `OutputDeclarationLedgerRecord.cache_trails` as `z.array(z.string())` path strings. Unsafe or non-leaf paths SHALL fail submit closed. Missing or incomplete leaf contents SHALL NOT be written to the ledger, and Engine SHALL emit warning diagnostics to trace/log during the staged enforcement period.

Gate `cache_coverage` rules SHALL dynamically check at gate time whether ledger cache trail paths still exist and remain complete. For each role=`reference` output file, `cache_coverage` SHALL also verify that at least one declared cache leaf plausibly maps to that reference by matching `meta.json.url` to the reference `source_url` and/or matching the cache leaf slug to `output_files[].source_slug` or reference filename qualifier. A declaration-level non-empty `cache_trails` array alone SHALL NOT prove per-reference provenance.

#### Scenario: valid cache trail written to ledger

- **WHEN** a work-unit result `cache_trails` entry names `_cache/wave1/primary/topic-a/s01_source/`
- **AND** the leaf directory passes cache trail validation
- **THEN** submit SHALL write that path string to `OutputDeclarationLedgerRecord.cache_trails`

#### Scenario: unsafe cache trail rejects submit

- **WHEN** a work-unit result declares a cache trail outside the bundle
- **THEN** submit SHALL fail closed
- **AND** no ledger row SHALL be appended

