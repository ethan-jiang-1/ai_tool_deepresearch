# Gate Content Dedup

> req: GAC-001, GAC-002, GAC-003, GAC-004, GAC-005

## Purpose

定义 content_dedup gate 规则——一种新的 gate check type，通过 Jaccard 内容相似度、URL 去重、首页域名检测和自指语言检测四种机制拦截虚假/重复 reference 文件。规则消费 Agent 产出声明（AGO-003），不扫描目录。这是对 Bug #001（46/52 个虚假 reference 绕过 gate）的确定性防御。

## ADDED Requirements

### Requirement: Jaccard similarity check SHALL detect near-duplicate reference content

系统 SHALL 实现 `jaccardSimilarity(tokensA, tokensB)` 函数，对两个 token 集合计算 Jaccard 系数 = |A∩B| / |A∪B|。系统 SHALL 实现 `tokenizeForSimilarity(text)` 函数，对中文使用 bigram tokenization、对英文使用 word tokenization。

`checkContentDedup()` SHALL 对 `output_files[]` 中所有 `role=reference` 的文件的 Key Facts section 两两比较。任一文件对的 Jaccard ≥ 阈值（默认 0.8）时，该文件对 SHALL 被标记为疑似 clone。

#### Scenario: Identical Key Facts detected as clone

- **WHEN** 文件 A 的 Key Facts = "年轻人消费平替趋势明显。国潮品牌市场份额增长。"
- **AND** 文件 B 的 Key Facts 逐字相同
- **THEN** Jaccard ≥ 0.8 SHALL be true
- **AND** 这两个文件 SHALL 被标记为疑似 clone

#### Scenario: Different Key Facts not flagged

- **WHEN** 文件 A 的 Key Facts 描述中国汽车市场
- **AND** 文件 B 的 Key Facts 描述日本电子产品
- **THEN** Jaccard < 0.8 SHALL be true
- **AND** 这两个文件 SHALL NOT 被标记为疑似 clone

#### Scenario: Jaccard threshold is configurable

- **WHEN** gate definition JSON 中设置 `threshold.jaccard: 0.9`
- **THEN** `checkContentDedup()` SHALL 使用 0.9 作为阈值
- **AND** 不写代码即可调整灵敏度

### Requirement: URL dedup check SHALL detect duplicate source URLs

`checkContentDedup()` SHALL 对 `output_files[]` 中所有 `role=reference` 的条目按 `source_url` 去重。同一个 `source_url` 出现在多个 reference 中时，这些文件 SHALL 被标记为 URL duplicate。URL 比较 SHALL 使用 normalize-then-compare（去 trailing slash、lowercase scheme+host、去 fragment）。

#### Scenario: Same URL in two files detected

- **WHEN** 文件 A 的 source_url = "https://www.chinanews.com.cn/sh/2024/01-01/10138674.shtml"
- **AND** 文件 B 的 source_url 完全相同
- **THEN** 这两个文件 SHALL 被标记为 URL duplicate

#### Scenario: Different URLs pass

- **WHEN** 文件 A 和文件 B 的 source_url 指向不同文章
- **THEN** URL dedup SHALL NOT 标记它们

#### Scenario: URL normalization catches sneaky duplicates

- **WHEN** 文件 A 的 source_url = "https://www.example.com/path"
- **AND** 文件 B 的 source_url = "https://www.example.com/path/"（trailing slash）
- **THEN** 归一化后两者相同 → SHALL 被标记为 URL duplicate

### Requirement: Homepage URL detection SHALL flag root-domain-only references

`checkContentDedup()` SHALL 检测 `source_url` 是否仅为域名首页（无具体文章路径）。source_url 的 path 部分为 `/`、空、或仅含 index.* 变体时，SHALL 被标记为 homepage URL。首页 URL 不能作为可信 reference——无法追溯具体文章内容。

#### Scenario: Root domain detected as homepage

- **WHEN** source_url = "https://www.chinanews.com.cn/"（无文章路径）
- **THEN** 该 reference SHALL 被标记为 homepage URL

#### Scenario: Article URL not flagged

- **WHEN** source_url = "https://www.chinanews.com.cn/sh/2024/01-01/10138674.shtml"
- **THEN** 该 reference SHALL NOT 被标记为 homepage URL

### Requirement: Self-referential language detection SHALL flag files describing themselves

`checkContentDedup()` SHALL 在 Key Facts section 中检测自指语言模式。匹配以下任一 pattern 的 reference SHALL 被标记为 self-referential：
- "This reference supplements..."
- "This document provides..."
- "This file contains..."
- 其他以文件自身为主语、不提供外部事实的模式

#### Scenario: Self-referential Key Facts detected

- **WHEN** 某 reference 的 Key Facts 内容为 "This reference supplements the wave1 deepening evidence for topic..."
- **THEN** 该 reference SHALL 被标记为 self-referential

#### Scenario: Normal Key Facts not flagged

- **WHEN** 某 reference 的 Key Facts 内容为 "2024 年中国新能源汽车销量突破 1000 万辆"
- **THEN** 该 reference SHALL NOT 被标记为 self-referential

### Requirement: content_dedup SHALL be integrated as a gate check type in gate-helpers.mjs

`content_dedup` SHALL 作为新的 gate check type 实现在 `gate-helpers.mjs` 中。gate definition JSON 中 SHALL 使用 `{ "id": "content_dedup", "check": "content_dedup", "threshold": { "jaccard": 0.8, "url_dedup": true, "homepage_detect": true, "self_ref_detect": true } }` 声明规则。

`checkContentDedup()` 主函数 SHALL 返回标准 gate check 结果：`{ passed: boolean, inspect: Array<{ file: string, issue: string, evidence: string }>, advice: string }`。

#### Scenario: Clean reference set passes all dedup checks

- **WHEN** 所有 reference 文件有不同的 source_url、不同的 Key Facts、URL 有具体文章路径、Key Facts 包含外部事实
- **THEN** `checkContentDedup()` SHALL return `passed: true`

#### Scenario: Any dedup sub-check failure causes overall fail

- **WHEN** 任一 reference 文件触发 URL dedup、Jaccard clone、homepage URL、或 self-referential language 任一检测
- **THEN** `checkContentDedup()` SHALL return `passed: false`
- **AND** `inspect` SHALL 列出所有触发项及具体文件和证据

#### Scenario: content_dedup consumes output_files declaration

- **WHEN** gate CLI 调用 `checkContentDedup()`
- **THEN** 函数 SHALL 从 `output_files[]` 声明中获取 reference 文件列表（`role=reference`）
- **AND** SHALL NOT 扫描 `reference/` 目录
