## 1. Sub-agent reference 文件格式规范

- [x] 1.1 实现 REF-006: `phase-wave1-subagent.md` §2 增加 reference 文件格式规范段——在 question-list 格式规范后，新增 `### 2.3 reference/{topic.slug}-<source-slug>.md` 子节，列出 9 个 metadata 字段、5 个 `##` section header、明确禁止 YAML frontmatter
- [x] 1.2 实现 RTI-001: `phase-wave1.md` 的两个 task card `action` 文本（primary intake L58、supplementary re-fill L285-289）中增加格式提示——"禁止使用 YAML frontmatter（`---`），必须使用 metadata block 格式（`- key: value`）"

## 2. Wave2 rerun 全量重合成

- [x] 2.1 实现 RWP-012: `phase-wave2.md` Rerun-Aware Behavior 节增加场景表——在 L351 前插入 `action: add` vs `action: supplement` 的场景描述。`action: add` → 全量重合成（重读所有 evidence-summary、重建 scan matrix、从 scratch 生成三件套）。`action: supplement` → 保持当前 delta/append
- [x] 2.2 实现 RTI-002: 验证 `phase-wave2.md` 的 Rerun-Aware Behavior 节与 `phase-wave0.md` L252-271 和 `phase-wave1.md` L390-409 的场景表结构和 `action: add` 语义对齐

## 3. Gate 内容质量规则

- [x] 3.1 实现 RTI-003: `gate-wave1-complete.definition.json` 新增 `reference_format` rule——针对 `reference/*{topic}*.md` 文件检查 metadata block 9 字段、5 个 section header，并拒绝 YAML frontmatter
- [x] 3.2 实现 RTI-003: `gate-wave1-complete.definition.json` 新增 `source_url_article_level` rule——针对 `reference/*{topic}*.md` 文件解析 `- source_url:` metadata，拒绝空 URL、homepage URL 和 shallow path URL
- [x] 3.3 实现 RTI-003: `gate-wave1-complete.definition.json` 新增 `key_facts_min_lines` rule——针对 `reference/*{topic}*.md` 文件，检查 `## Key Facts` section 后至少有 5 行以 `- ` 开头的内容
- [x] 3.4 实现 GAC-008: `gate-wave1-complete.definition.json` 新增 `ledger_coverage` rule——filesystem 只用于 orphan detection；每个 `reference/*{topic}*.md` 文件必须有对应 `role === 'reference'` declaration

## 4. content_dedup fail-closed 与 Wave2 rerun gate

- [x] 4.1 实现 GAC-006: `gate-helpers.mjs` `checkContentDedup()` 保持只读 ledger；当 ledger 存在但 `role === 'reference'` entries 为 0 时 fail closed，不扫描 filesystem 作为合法输入
- [x] 4.2 实现 GAC-007: `isHomepageUrl()` 增加 path-depth heuristic——URL path depth < 2 判定为 homepage（depth=0: `/`、depth=1: `/news/`）
- [x] 4.3 实现 RWP-013: `gate-wave2-complete.definition.json` / `check-gate-wave2-complete.mjs` 新增 rerun `action:add` 检查——禁止 delta-only synthesis，并要求 scan/index 覆盖全部 topic slug

## 5. Requirement registry 与治理检查

- [x] 5.1 在 `openspec/governance/req-registry.yaml` 中注册新 capability `rerun-topic-integration`（prefix: RTI），新增 RTI-001/002/003/004。在已有 capability 组中新增 RWP-012/013、GAC-006/007/008、REF-006
- [x] 5.2 增加/更新 unit 和 integration tests：content_dedup empty declarations fail、ledger coverage、reference format/article URL/key facts、Wave2 action:add delta-only fail/full coverage pass
- [x] 5.3 运行 `node openspec/governance/check-project-reqs.mjs` → PASS（0 duplicate / 0 orphan / 0 unregistered）
- [x] 5.4 运行 `node openspec/governance/check-project-specs.mjs` → PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）
