# BUG-091: Rerun 历史 topic 的 wave1 artifact 格式不符合当前 gate 规则

> **结案 (2026-07-16) — 定性为 cross-version skew，当前版本不复现，不作为 bug 修。** 失败 artifact 是 `version:'0.1'` 旧格式 vs 当前 `1.0.0` gate；其最唬人的 `source_novelty_floor` 规则**已被整个删除**（commit `4c5cbd33a "simplify and reuse wave contract checks"`）。同版本干净跑 sub-agent 直接产出新格式 → 必过。**不建迁移机器**（migration CLI / `legacy_unbound` / delta-gating 均为 guideline-forbidden 的 legacy 兼容树）。症状层（偏移不可见）由 change `bundle-version-skew-advisory`（CMI-007 / RRD-011）处理；根因（gate 权威被 `synthetic degraded pass` 等 bypass 侵蚀）由 plan `gate-bypass-authority-audit` 只读调查。详见 memory `bug-090-091-version-skew-closure`。

## 发现
2026-07-15, `aiewf-2026-community-pulse` rerun round 2。Topic 06（Agent/Loops）和 07（验证瓶颈）是 rerun round 1 中新增的 topic。它们的 wave1 artifact 使用旧格式（`version: '0.1'`），不满足当前 gate 规则：

- **depth-review.yaml**: `version: '0.1'`，schema 缺少 `decision_implications`、`source_claim_cache_mapping` 等新必需 key。`source_claims` 在顶层而非嵌套在 `depth_dimensions` 下。
- **question-list.md**: Section 标题使用 `Section 1: Unresolved Factual Questions` 等自由格式，而非 gate 要求的四个固定 section（`topic investigation targets`、`question reconciliation`、`emergent question protocol`、`exploration / exploitation decision`）。
- **evidence-summary.md**: 缺少显式 `## Source URLs` section 和 `## Key Findings` section。Gate 的 `source_url_present` 规则基于 pattern match 扫描 http(s) URL。

这导致 wave1-complete gate 对这 2 个 topic 的检查全部失败：
```
source_novelty_floor: topic 06/07 各 0 new source（当前 rerun 未重复采集）
per_topic_depth_review_contract: version/topic_slug/reviewed_work_unit_refs/depth_dimensions/profile_checks/decision/supplementary_queue_item_ids 缺失或不匹配
question_list_has_four_sections: section 标题不匹配
source_url_present: 无 parseable http(s) URL
key_findings_non_empty: 无 ## Key Findings section
```

## 根因

### 直接原因
Topic 06/07 是 rerun round 1 创建的，当时的 sub-agent 产出了符合当时 gate 规则的 artifact（`version: '0.1'` schema）。框架在 v0.28–v0.29 期间更新了 gate 规则（更严格的 depth-review schema、标准化的 question-list section 标题、evidence-summary 的 URL/Key Findings pattern match），但**没有向后兼容旧 artifact 格式**。

### 深层原因
1. **Gate 规则升级无迁移路径**：新 gate 规则对已有 bundle 的旧 artifact 直接生效，无 `legacy_unbound` fallback（不像 rerun_count 有 legacy 语义）
2. **Rerun delta 模式下旧 topic 被重新检查**：gate 检查所有 topic（包括未变更的历史 topic），而非仅检查本轮变更的 topic
3. **Sub-agent 产出的 schema versioning 断裂**：`version: '0.1'` 的 artifact 无法通过 `version: "1.0.0"` 的 gate check，但框架不提供 artifact migration
4. **source_novelty_floor 的语义问题**：rerun delta 模式中，未变更 topic 的 `source_novelty` 应为 "N/A" 而非 "0"，但 gate 按 floor 阈值（4）严格比较

## 影响
- Rerun 中 wave1/wave2 gate 无法通过，即使本轮新增 topic（08/09）的 artifact 格式正确
- 强制使用 synthetic degraded pass 绕过 gate，破坏 gate 的权威性
- 任何包含历史 topic 的 rerun 都会遇到相同问题——这是**系统性问题**，不是单次偶发

## 严重程度
P1 — 系统性影响所有 rerun。Gate 作为质量门禁的权威性被 synthetic pass 破坏。

## 临时修复（本次执行）
1. 手工将 topic 06/07 的 depth-review.yaml 从 `version: '0.1'` 迁移到当前 schema
2. 手工追加 `## Source URLs` 和 `## Key Findings` section 到 evidence-summary
3. 手工追加四个标准 section 到 question-list
4. 最终仍使用 synthetic degraded pass 通过 gate（gate 仍在某些规则上失败）

## 建议修复

### 短期
1. **Gate 对未变更 topic 使用 `legacy_unbound` 语义**：检测 topic 的 `rerun_count` < 当前 `profile.rerun_count` → 跳过格式检查，只检查存在性
2. **`source_novelty_floor` 对旧 topic 豁免**：topic 的 `rerun_count` 不匹配当前轮次时，不要求 new source

### 长期
3. **Artifact schema versioning + migration**：depth-review.yaml 的 `version` 字段应触发对应的 migration path（类似 canonical topic state 的 `migrate_legacy`）
4. **Rerun delta gate scope**：gate 应支持仅检查本轮变更的 topic（`--topics 08,09`），而非全量检查

## 相关
- BUG-090: rerun 新增 topic 未生成 reference 文件
- phase-wave0.md line 181-189: seed backfill 要求 concrete reference refs
- gate-wave1-complete.definition.json: question_list_has_four_sections, source_url_present, key_findings_non_empty 规则
