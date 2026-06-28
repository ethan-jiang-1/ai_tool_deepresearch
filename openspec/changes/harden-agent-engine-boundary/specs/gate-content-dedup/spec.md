# Gate Content Dedup

> req: GAC-001, GAC-002, GAC-003, GAC-004, GAC-005

## Purpose

定义 `content_dedup` gate check：通过 URL 去重、首页检测、自指语言检测、Jaccard 内容相似度拦截虚假/重复 reference。该规则的输入 SHALL 来自 `rb_output_declarations.jsonl` 中已完成的 Agent output declaration，而不是扫描 `reference/` 目录发现文件。

## ADDED Requirements

### Requirement: content_dedup SHALL read reference inputs from declaration ledger

`checkContentDedup(bundlePath, options)` SHALL load bundle root `rb_output_declarations.jsonl` and use only entries in `output_files[]` where `role === "reference"` as its reference input list.

It SHALL NOT use `fs.readdir`, glob, or directory walking over `reference/` to discover additional inputs. Disk files not declared in the ledger SHALL NOT count toward pass conditions.

#### Scenario: Ledger reference entries become gate inputs

- **WHEN** `rb_output_declarations.jsonl` contains a completed declaration with `output_files: [{ path: "reference/a.md", role: "reference", source_url: "https://example.com/a" }]`
- **THEN** `checkContentDedup(bundlePath, options)` SHALL include `reference/a.md` in its reference input set

#### Scenario: Orphan reference is ignored for pass calculation

- **WHEN** `reference/orphan.md` exists on disk
- **AND** no ledger record declares `reference/orphan.md`
- **THEN** `content_dedup` SHALL NOT include it in URL/Jaccard/homepage/self-ref checks
- **AND** it SHALL NOT help the gate pass

#### Scenario: Missing ledger fails closed

- **WHEN** `rb_output_declarations.jsonl` is absent or empty
- **THEN** `content_dedup` SHALL return `passed: false`
- **AND** inspect/advice SHALL explain that no completed Agent output declarations were available

### Requirement: Jaccard similarity check SHALL detect near-duplicate reference content

System SHALL implement `tokenizeForSimilarity(text)` using Chinese bigram tokenization and English word tokenization. System SHALL implement `jaccardSimilarity(tokensA, tokensB)` as `|A∩B| / |A∪B|`.

`checkContentDedup()` SHALL compare the Key Facts or configured content section of declared reference files pairwise. If any pair has Jaccard >= configured threshold (default `0.8`), that pair SHALL be flagged as suspected clone.

#### Scenario: Identical Key Facts detected as clone

- **WHEN** file A Key Facts equals `年轻人消费平替趋势明显。国潮品牌市场份额增长。`
- **AND** file B Key Facts is identical
- **THEN** Jaccard SHALL be >= `0.8`
- **AND** the pair SHALL be reported as clone

#### Scenario: Different Key Facts not flagged

- **WHEN** file A describes China's automobile market
- **AND** file B describes Japan's electronics market
- **THEN** Jaccard SHALL be below threshold
- **AND** the pair SHALL NOT be reported as clone

### Requirement: URL dedup check SHALL detect duplicate source URLs

`checkContentDedup()` SHALL compare `source_url` from declared reference entries. URL comparison SHALL normalize scheme/host casing, remove fragments, and trim trailing slash before comparison. Duplicate normalized URLs SHALL fail the check.

#### Scenario: Same declared URL is detected

- **WHEN** two declared reference entries have the same `source_url`
- **THEN** they SHALL be reported as URL duplicates
- **AND** `content_dedup` SHALL fail

#### Scenario: URL normalization catches trailing slash duplicate

- **WHEN** one declared URL is `https://www.example.com/path`
- **AND** another declared URL is `https://www.example.com/path/`
- **THEN** normalization SHALL make them equal
- **AND** they SHALL be reported as URL duplicates

### Requirement: Homepage URL detection SHALL flag root-domain-only references

`checkContentDedup()` SHALL flag declared `source_url` values that point only to a domain homepage, an empty path, `/`, or an `index.*` homepage variant. Homepage URLs SHALL fail because they do not identify a specific source page.

#### Scenario: Root domain detected as homepage

- **WHEN** declared `source_url` is `https://www.chinanews.com.cn/`
- **THEN** the reference SHALL be flagged as homepage URL

#### Scenario: Article URL not flagged

- **WHEN** declared `source_url` is `https://www.chinanews.com.cn/sh/2024/01-01/10138674.shtml`
- **THEN** it SHALL NOT be flagged as homepage URL

### Requirement: Self-referential language detection SHALL flag files describing themselves

`checkContentDedup()` SHALL inspect the Key Facts section of declared reference files and flag self-referential patterns such as:

- `This reference supplements...`
- `This document provides...`
- `This file contains...`
- equivalent wording where the file itself is the subject instead of external facts

#### Scenario: Self-referential Key Facts detected

- **WHEN** a declared reference Key Facts says `This reference supplements the wave1 deepening evidence for topic...`
- **THEN** it SHALL be flagged as self-referential
- **AND** `content_dedup` SHALL fail

#### Scenario: Normal Key Facts not flagged

- **WHEN** Key Facts says `2024 年中国新能源汽车销量突破 1000 万辆`
- **THEN** it SHALL NOT be flagged as self-referential

### Requirement: content_dedup SHALL return standard gate check result

`content_dedup` SHALL be implemented as a gate check type in `gate-helpers.mjs`. It SHALL return `{ passed, inspect, advice }`. Any URL duplicate, homepage URL, self-referential file, or Jaccard clone SHALL make `passed` false.

The gate definition SHALL configure the rule with threshold flags, for example:

```json
{
  "id": "content_dedup",
  "check": "content_dedup",
  "target": "output_declarations",
  "threshold": {
    "jaccard": 0.8,
    "url_dedup": true,
    "homepage_detect": true,
    "self_ref_detect": true
  }
}
```

#### Scenario: Clean declared reference set passes

- **WHEN** all declared reference files have distinct article URLs and distinct factual Key Facts
- **THEN** `checkContentDedup()` SHALL return `passed: true`

#### Scenario: Any sub-check failure causes overall fail

- **WHEN** any declared reference triggers URL duplicate, homepage URL, self-referential language, or Jaccard clone
- **THEN** `checkContentDedup()` SHALL return `passed: false`
- **AND** `inspect` SHALL identify the affected declared files
