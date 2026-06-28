## 1. Sub-agent reference 文件格式规范

- [ ] 1.1 实现 REF-006: `phase-wave1-subagent.md` §2 增加 reference 文件格式规范段——在 question-list 格式规范后，新增 `### 2.3 reference/{topic.slug}-<source-slug>.md` 子节，列出 9 个 metadata 字段、5 个 `##` section header、明确禁止 YAML frontmatter
- [ ] 1.2 实现 RTI-001: `phase-wave1.md` 的两个 task card `action` 文本（primary intake L58、supplementary re-fill L285-289）中增加格式提示——"禁止使用 YAML frontmatter（`---`），必须使用 metadata block 格式（`- key: value`）"

## 2. Wave2 rerun 全量重合成

- [ ] 2.1 实现 RWP-012: `phase-wave2.md` Rerun-Aware Behavior 节增加场景表——在 L351 前插入 `action: add` vs `action: supplement` 的场景描述。`action: add` → 全量重合成（重读所有 evidence-summary、重建 scan matrix、从 scratch 生成三件套）。`action: supplement` → 保持当前 delta/append
- [ ] 2.2 实现 RTI-002: 验证 `phase-wave2.md` 的 Rerun-Aware Behavior 节与 `phase-wave0.md` L252-271 和 `phase-wave1.md` L390-409 的场景表结构和 `action: add` 语义对齐

## 3. Gate 内容质量规则

- [ ] 3.1 实现 RTI-003: `gate-wave1-complete.definition.json` 新增 `source_url_article_level` rule——`pattern_match` 类型，针对 `reference/*{topic}*.md` 文件，regex 匹配 `source_url:\s*https?://[^/]+/?(index\.\w+)?\s*$`（negate: true），拒绝 homepage URL
- [ ] 3.2 实现 RTI-003: `gate-wave1-complete.definition.json` 新增 `key_facts_min_lines` rule——`pattern_match` 类型，针对 `reference/*{topic}*.md` 文件，检查 `## Key Facts` section 后至少有 5 行以 `- ` 开头的内容
- [ ] 3.3 实现 RTI-003: `gate-wave1-complete.definition.json` 新增 `ledger_coverage` rule——新类型 `cross_check`，比较 filesystem glob count 与 `rb_output_declarations.jsonl` 中 `role === 'reference'` 的 entry count，filesystem 数 ≤ ledger 数则 pass

## 4. content_dedup filesystem fallback

- [ ] 4.1 实现 GAC-006: `gate-helpers.mjs` `checkContentDedup()` 增加 filesystem fallback——L695 读 ledger 后，若 `referenceEntries.length === 0`，用 `readdirSync` 扫描 `reference/` 目录，筛选匹配 topic slug pattern 的 `.md` 文件。对每个文件解析 `- source_url:` 行获取 URL
- [ ] 4.2 实现 GAC-006: fallback 模式遇到 YAML frontmatter（`---`）文件时，`source_url` 解析失败则 return `{ passed: false, inspect: ["格式不支持: <file>"] }`
- [ ] 4.3 实现 GAC-007: `isHomepageUrl()` 增加 path-depth heuristic——URL path depth < 2 判定为 homepage（depth=0: `/`、depth=1: `/news/`）
- [ ] 4.4 移除 `checkContentDedup()` L721-723 的空转通过逻辑——`return { passed: true, inspect: [], advice: [] }` 替换为上述 filesystem fallback 调用

## 5. Requirement registry 与治理检查

- [ ] 5.1 在 `openspec/governance/req-registry.yaml` 中注册新 capability `rerun-topic-integration`（prefix: RTI），新增 RTI-001/002/003。在已有 capability 组中新增 RWP-012、GAC-006/007、REF-006
- [ ] 5.2 运行 `node openspec/governance/check-project-reqs.mjs` → PASS（0 duplicate / 0 orphan / 0 unregistered）
- [ ] 5.3 运行 `node openspec/governance/check-project-specs.mjs` → PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）
