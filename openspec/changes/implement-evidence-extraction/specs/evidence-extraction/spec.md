# evidence-extraction Delta Spec

> req: EEX-001, EEX-002, EEX-003, EEX-004

## ADDED Requirements

### Requirement: isCountable reference判定

Engine SHALL 实现 `isCountable(ref)` 函数，返回 `{ countable: boolean, reason?: string }` 对象。当 `countable: true` 时表示该 reference 满足最低计数条件。满足以下全部条件方可计数：

1. `acceptance_status` 为 `accepted`
2. `## Core Content Capture` section 非空且 ≥ 100 字符
3. `source_url` 是 article-level URL（非 homepage/shallow，由 `isHomepageUrl()` 判定）
4. `## Key Facts` section 含 ≥ 5 条 bullet line（由 `checkReferenceKeyFactsMinLines()` 判定）

当文件不可解析（malformed MD、无 frontmatter、无法提取 section）时，`isCountable()` SHALL return `{ countable: false, reason: "unparseable" }`——不在异常中静默跳过。

#### Scenario: Accepted reference with substantive content is countable
- **WHEN** reference 文件 metadata block 含 `acceptance_status: accepted`
- **AND** `## Core Content Capture` section ≥ 100 字符
- **AND** `source_url` 指向具体文章（如 `https://example.com/research/findings`）
- **AND** `## Key Facts` 含 ≥ 5 条 bullet
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

Engine SHALL 实现 `countReferences(baseDir)` 函数，扫描 `reference/` 目录中所有 `.md` 文件（排除 `_INDEX.md` 和 `README.md`），对每个文件调用 `isCountable()`，返回 `{ count: number, uncountable: Array<{path: string, reason: string}> }` 对象供 audit 透明。

`count` SHALL 由 Engine 独立计算，MUST NOT 依赖 Agent 声明的 `evidenceCount` 字段。`uncountable` 数组 SHALL 列出每个不可计数文件的路径和原因。

`countReferences()` SHALL be a quality/count helper for `count_floor` and fork-router `ref_count`; it SHALL NOT grant ledger authority to files it finds. Orphan reference files found by directory scan SHALL remain non-authoritative until they are declared through `rb_output_declarations.jsonl` or otherwise handled by file observability / ledger coverage diagnostics.

#### Scenario: Engine counts only countable references
- **WHEN** `reference/` 目录含 10 个 `.md` 文件
- **AND** 其中 7 个满足 `isCountable()` 条件，3 个不满足
- **THEN** `countReferences(baseDir)` SHALL return `{ count: 7, uncountable: [...] }`
- **AND** `uncountable` 数组 SHALL 包含 3 个条目，每个含 `path` 和 `reason`

#### Scenario: Empty reference directory returns zero
- **WHEN** `reference/` 目录不存在或为空
- **THEN** `countReferences(baseDir)` SHALL return `{ count: 0, uncountable: [] }`

#### Scenario: Countable orphan reference remains non-authoritative
- **WHEN** `reference/orphan.md` exists and satisfies `isCountable()`
- **AND** no `rb_output_declarations.jsonl` record declares that file
- **THEN** `countReferences(baseDir)` MAY include it in the quality count
- **AND** content input checks such as `content_dedup` SHALL NOT treat it as authoritative ledger input
- **AND** file observability / ledger coverage SHALL still be able to flag the orphan authority gap

### Requirement: ref_count 改为 Engine 计算

`subagent-relay.mjs` 的 `mergeResults()` 函数 SHALL 使用 `countReferences()` 计算 `ref_count`，MUST NOT 累加 Agent 的 `evidenceCount` 字段。

Gate 的 `count_floor` 规则 SHALL 通过 `countReferences()` 获取实际 reference 数，MUST NOT 仅依赖 filesystem glob（glob 数所有文件，不区分是否可计数）。

Gate checks that need authoritative Agent-produced content inputs, including `content_dedup`, SHALL continue to consume `rb_output_declarations.jsonl` rather than switching to directory scan. `count_floor` using Engine count does not change ledger as the Source of Record for declared outputs.

#### Scenario: mergeResults uses Engine-computed ref_count
- **WHEN** Sub-agent relay 完成 wave0 source intake
- **AND** 产生了 8 个 reference 文件但只有 6 个 `isCountable()`
- **THEN** `mergeResults()` 返回的 `ref_count` SHALL 为 `6`

### Requirement: cache_trails 文件系统验证

Engine SHALL 在 `validateDelegatedCompletion()` 中验证 `slotResult.cache_trails` 数组中的每个路径：
1. 路径在 bundle 内（不 escape）
2. 路径位于 `_cache/`
3. 路径是 leaf source directory（不是仅包含 `sNN_*` children 的 parent）
4. 目录存在
5. 目录含 `websearch.json`、`page.md`、`meta.json` 三个文件

验证通过的路径 SHALL 写入 `OutputDeclarationLedgerRecord.cache_trails`（保持 `z.array(z.string())` 格式——只存路径字符串）。unsafe / non-leaf paths SHALL hard-fail delegated `complete()`。missing/incomplete leaf contents SHALL NOT 写入 ledger，Engine SHALL emit warning 到 trace/log during Phase 1.

Gate `cache_coverage` 规则在门控时动态检查文件系统中路径是否仍然存在且完整——不依赖 ledger 中存储的验证状态。

#### Scenario: Valid cache trail written to ledger
- **WHEN** slot result 的 `cache_trails` 含 `_cache/wave1/primary/topic-a/s01_source/`
- **AND** 该目录存在且含 `websearch.json`、`page.md`、`meta.json`
- **THEN** `OutputDeclarationLedgerRecord.cache_trails` SHALL 包含该路径字符串

#### Scenario: Incomplete cache trail not written to ledger, warning emitted
- **WHEN** slot result 的 `cache_trails` 含路径但目录缺少 `page.md`
- **THEN** 该路径 SHALL NOT 写入 `OutputDeclarationLedgerRecord.cache_trails`
- **AND** Engine SHALL emit warning 到 trace/log，包含路径和缺失文件

#### Scenario: Unsafe cache trail rejects completion
- **WHEN** slot result 的 `cache_trails` 含绝对路径、bundle escape、非 `_cache/` 路径、或 parent cache directory
- **THEN** delegated `complete()` SHALL reject the completion
- **AND** Engine SHALL NOT append ledger output for that delegated completion
