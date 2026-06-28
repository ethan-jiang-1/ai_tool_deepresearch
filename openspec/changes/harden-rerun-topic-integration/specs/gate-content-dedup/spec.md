# Gate Content Dedup (delta)

> req: GAC-006, GAC-007

## ADDED Requirements

### Requirement: content_dedup filesystem fallback on empty ledger

`checkContentDedup(bundlePath, options)` SHALL 当 declaration ledger 中 `role === 'reference'` entry 数量为 0 时，触发 filesystem fallback：

1. 用 `readdirSync` 扫描 `reference/` 目录，筛选匹配 topic slug pattern 的 `.md` 文件
2. 对每个文件，从文件内容中解析 metadata block 的 `- source_url:` 行获取 source URL
3. 若文件使用 YAML frontmatter（`---`）且无法解析 `source_url`，SHALL fail，inspect 说明格式不兼容
4. 对 fallback 文件集执行与 ledger 模式相同的检查：URL dedup、homepage detect、self-referential check、Jaccard clone detection

#### Scenario: Empty reference ledger triggers directory scan

- **WHEN** `rb_output_declarations.jsonl` 不含任何 `role === 'reference'` 的 declaration
- **THEN** `checkContentDedup()` SHALL 扫描 `reference/` 目录
- **AND** SHALL 执行完整的 dedup + homepage + self-ref + Jaccard 检查

#### Scenario: Frontmatter-format reference causes fallback failure

- **WHEN** filesystem fallback 遇到以 `---` 开头的 YAML frontmatter 文件
- **AND** 无法从中解析 `source_url`
- **THEN** `content_dedup` SHALL return `passed: false`
- **AND** inspect SHALL 指示该文件需转换为 metadata block 格式

### Requirement: content_dedup homepage detection uses path-depth heuristic

`isHomepageUrl(url)` SHALL 将满足以下任一条件的 URL 判定为 homepage：
- URL path 为 `/`、空字符串、或仅 `/index.*`
- URL path depth < 2（即 path 仅含一个 segment，如 `/news/`）

#### Scenario: Shallow path detected as homepage

- **WHEN** URL 为 `https://m-en.yna.co.kr/`
- **THEN** `isHomepageUrl()` SHALL return `true`

#### Scenario: Deep path passes homepage check

- **WHEN** URL 为 `https://m-en.yna.co.kr/view/AEN20260113007053315`
- **THEN** `isHomepageUrl()` SHALL return `false`
