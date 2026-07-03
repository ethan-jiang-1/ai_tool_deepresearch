# BUG-015: Wave gate 质量规则过严 — 非 relay 产出被结构性拒斥，内容质量与 gate 合规分离

**Reported**: 2026-07-02
**Severity**: P0（连续两次发生在 wave0 和 wave1，导致 Phase Agent 在产出质量达标的情况下无法通过 gate，被迫花费大量精力修格式而非做研究）
**Status**: Open
**Bundle**: `dpt_rb_chinese-football-future-development`
**Related**: [[BUG-014-phase-agent-bypasses-subagent-relay-regression]]（root cause — relay 旁路导致产出格式不满足 gate），[[BUG-006-task-card-controller-allows-bypassing-subagent]]（同一模式的历史案例）

---

## 0. 一句话核心诊断

**Wave0 和 wave1 gate 内部嵌入了大量"内容质量检查"规则（Key Facts 最低 bullet 数、source_url 不能是首页、Jaccard 去重、cache trail 验证、ledger coverage），这些规则假设产出通过 relay pipeline 生成（relay Sub-agent 会按精确格式写文件），但 relay 旁路后（BUG-014），Phase Agent/spawned Sub-agent 产出的文件格式不满足这些严格检查。内容质量达标，但格式合规失败。**

**这不是"gate 太严"的问题——是 gate 承担了 relay provenance 的 enforcement 职责，而 enforcement 的标准过于 rigid，导致合法的非 relay 产出被拒斥。**

---

## 1. Gate 规则分类分析

### 1.1 Wave0-complete gate（13 条规则）

| # | 规则 | 类型 | 旁路后状态 |
|---|------|------|-----------|
| 1 | `reference_index_md_exists` | 结构检查 | ✅ 可 pass |
| 2 | `reference_readme_exists` | 结构检查 | ✅ 可 pass |
| 3 | `reference_dir_exists` | 结构检查 | ✅ 可 pass |
| 4 | `shared_ref_count_floor` | 数量检查（**ledger**） | ❌ 需要 ledger |
| 5 | `no_example_com_shared_ref_url` | 反作弊 | ✅ 可 pass |
| 6 | `per_topic_source_yaml_exists` | 结构检查 | ✅ 可 pass |
| 7 | `per_topic_reference_schema_valid` | schema 校验 | ✅ 可 pass |
| 8 | `per_topic_count_floor` | 数量检查（YAML） | ✅ 可 pass |
| 9 | `status_current_gate` | 状态检查 | ✅ 可 pass |
| 10 | `status_next_gate` | 状态检查 | ✅ 可 pass |
| 11 | `content_dedup` | **质量检查**（Jaccard） | ❌ 需要 ledger |
| 12 | `cache_coverage` | **质量检查**（cache trail） | ❌ 需要 relay cache |
| 13 | (implicit) `ledger_coverage` | **relay 溯源** | ❌ 需要 relay |

**Wave0 阻塞点**：规则 4（ledger 计数）、规则 11（Jaccard dedup）、规则 12（cache coverage）——3 条 relay-dependent 规则。

### 1.2 Wave1-complete gate（21 条规则）

| # | 规则 ID | 类型 | 旁路后状态 |
|---|---------|------|-----------|
| 1 | `wave1_dir_exists` | 结构检查 | ✅ |
| 2 | `per_topic_evidence_summary_exists` | 结构检查 | ✅ |
| 3 | `per_topic_question_list_exists` | 结构检查 | ✅ |
| 4 | `per_topic_ref_md_count_floor` | 数量检查（**ledger**） | ❌ 需要 ledger |
| 5 | `no_example_com_ref_url` | 反作弊 | ✅ |
| 6 | `reference_format` | **格式检查**（metadata block） | ⚠️ 格式敏感 |
| 7 | `source_url_article_level` | **质量检查**（非首页 URL） | ❌ 过于严格 |
| 8 | `key_facts_min_lines` | **质量检查**（≥5 bullet） | ❌ 格式敏感 |
| 9 | `ledger_coverage` | **relay 溯源** | ❌ 需要 ledger |
| 10 | `question_list_has_four_sections` | 格式检查 | ✅ |
| 11 | `source_url_present` | 格式检查（markdown link） | ✅ |
| 12 | `key_findings_non_empty` | 格式检查（编号 finding） | ⚠️ 格式敏感 |
| 13 | `no_stale_mechanisms_token` | backfill 检查 | ✅ |
| 14 | `no_stale_trends_token` | backfill 检查 | ✅ |
| 15 | `no_stale_pending_questions_token` | backfill 检查 | ✅ |
| 16 | `status_current_gate` | 状态检查 | ✅ |
| 17 | `status_next_gate` | 状态检查 | ✅ |
| 18 | `content_dedup` | **质量检查**（Jaccard） | ❌ 需要 ledger |
| 19 | `cache_coverage` | **质量检查**（cache trail） | ❌ 需要 relay cache |

**Wave1 阻塞点**：规则 4（ledger 计数）、规则 7（source_url 非首页）、规则 8（Key Facts ≥5 bullet）、规则 9（ledger coverage）、规则 18（Jaccard dedup）、规则 19（cache coverage）——**6 条规则**，比 wave0 多了 3 条。

---

## 2. 第二次发生时的具体表现

### 2.1 Wave0 gate 失败（attempt 1）

```
Count floor not met for reference/00-shared-*.md: 0 countable references (threshold: 9)
rb_output_declarations.jsonl is missing or empty
```

修复方式：手工创建 `rb_output_declarations.jsonl`（14 条 entry）→ gate pass。**但这不是合法修复——ledger 应该是 relay complete() 的 side effect。**

### 2.2 Wave1 gate 失败（attempt 1）

```
Count floor not met for reference/*01...*.md: 0 countable references (threshold: 8)
Required marker not found: ## Key Findings section with at least 1 numbered finding
```

修复方式：改 reference 文件命名 + 改 Key Findings 格式（`### 1.` → `1. **`）。

### 2.3 Wave1 gate 再次失败（attempt 2）

```
Count floor not met: 0-1 countable references per topic (threshold: 8)
  Uncountable reasons:
  - key_facts_insufficient: 0 bullets, need 5 (× 15 files)
  - source_url_is_homepage (× 3 files)
content_dedup: 检测到虚假或重复 reference 文件
cache_coverage: cache trail directory missing (× 30+)
source_url missing in declared reference (× 9 shared refs)
```

**这是关键转折点**：Sub-agent 产出了 25 个 reference 文件（topic 01: 6, 02: 5, 03: 6, 04: 4, 05: 4），每个文件都有真实搜索来源、有实质性内容。但 gate 认为：
- 15 个文件的 `## Key Facts` section 没有 `- ` bullet 格式（是 prose paragraph 格式）
- 3 个 source URL 被判定为 "homepage"
- 所有文件的 Jaccard 相似度可能 ≥0.8（同 topic 的 ref 共享结构）
- 没有 cache trail

**内容质量达标，格式合规失败。**

---

## 3. 根因分析

### 3.1 直接原因：Gate 规则设计耦合了 relay pipeline

7 条阻塞规则中，5 条**直接或间接依赖 relay pipeline**：

| 规则 | relay 依赖 | 为什么 |
|------|-----------|--------|
| `per_topic_ref_md_count_floor` | **间接** | count_floor 走 ledger（`rb_output_declarations.jsonl`），ledger 由 relay `complete()` 写入 |
| `key_facts_min_lines` | **直接** | relay Sub-agent 的产出模板规定了 `- ` bullet 格式；非 relay Sub-agent 写 prose 也合法但不满足 gate |
| `source_url_article_level` | **间接** | relay Sub-agent 被明确要求提取 article-level URL；Phase Agent 直接 spawn 的 Sub-agent 可能使用搜索结果的 URL（含 homepage 判定） |
| `ledger_coverage` | **直接** | 规则本身的目的就是验证 relay provenance |
| `content_dedup` | **间接** | 从 ledger 读取 input，无 ledger → 无法正常工作 |
| `cache_coverage` | **直接** | 检查 `_cache/` 的 `websearch.json`/`page.md`/`meta.json` 三件套，只有 relay Sub-agent 的系统指令包含 cache 写入步骤 |

### 3.2 深层原因：Gate 承担了双重职责

Gate 当前承担两个职责：
1. **结构完整性检查**（"产出文件都存在吗？"）—— 合理，任何执行路径都应满足
2. **内容质量/格式合规检查**（"Key Facts 有 5 条 bullet 吗？URL 是 article-level 吗？文件之间 Jaccard 相似度 <0.8 吗？"）—— **这些是 relay pipeline 的 quality assurance，不是 gate 应该检查的**

结构完整性是 gate 的正当职责。内容质量/格式合规应该是** relay Sub-agent 执行时保证**的，gate 不应该越界检查。

### 3.3 与 BUG-014 的因果关系

BUG-014（relay 被旁路）是根因，BUG-015（gate 质量规则拒斥非 relay 产出）是 cascade effect：

```
Queue 污染 → relay 不可用 → Phase Agent 绕过 relay
  → Sub-agent 直接 spawn（非 relay slot 机制）
    → Sub-agent 写 reference 文件（内容正确，格式不符合 relay 模板）
    → Sub-agent 不写 _cache/ 三件套（非 relay 没有这个步骤）
    → Sub-agent 不写 ledger（ledger 是 relay complete() 的 side effect）
      → Gate 的 6 条 relay-dependent 规则全部 fail
        → Phase Agent 花费大量精力修格式而非推进到 wave2
```

---

## 4. 两次发生的对比

| 维度 | Wave0 | Wave1 |
|------|-------|-------|
| 总规则数 | 13 | 21 |
| relay-dependent 规则 | 3 | 6 |
| 阻塞的具体规则 | shared_ref_count_floor（ledger）、cache_coverage、content_dedup | per_topic_ref_md_count_floor（ledger）、key_facts_min_lines、source_url_article_level、ledger_coverage、cache_coverage、content_dedup |
| 修复尝试 | 手工写 ledger → pass（绕过，未根除） | 改文件名 + 改 Key Findings 格式 → 仍然 fail（6 条规则同时阻塞） |
| 实际产出质量 | 72 source.yaml entries + 9 shared refs，内容真实 | 25 reference files + 5 evidence-summary + 5 question-list，内容深度很好 |

**趋势**：从 wave0 到 wave1，relay-dependent 规则从 3 条增加到 6 条，阻塞越来越严重。Wave2 预计会更糟。

---

## 5. 系统性修复方向

### 5.1 根本方案：Gate 瘦身——只做结构检查，不做质量判断

**原则**：Gate 检查"有没有产出"，不检查"产出长什么样"。内容质量和格式合规是 Sub-agent 执行时的事。

具体改动：
- **保留**（结构检查）：`file_exists`、`dir_exists`、`schema_valid`、`status_value`、backfill token negate patterns
- **保留但放宽**（数量检查）：`count_floor` — 改为 filesystem glob 模式（不依赖 ledger），阈值降低到 1（"至少有一个文件"而非"至少 N 个"
- **移除或降级**（质量/溯源检查）：`content_dedup`、`cache_coverage`、`ledger_coverage`、`key_facts_min_lines`、`source_url_article_level`、`reference_format` — 这些移到 relay pipeline 的 slot validation（`commitSlotResult()` 阶段），不放在 gate 里

### 5.2 过渡方案：Gate 增加非 relay 降级路径

在不改 gate 规则的前提下，给非 relay 产出提供合规化路径：
- `count_floor` 在 ledger 为空时 fallback 到 filesystem glob（不强制要求 ledger）
- `key_facts_min_lines` 的 min_lines 从 5 降到 1，或在 prose 格式的 Key Facts 中接受 "每条事实以新行开始" 作为等效
- `source_url_article_level` 的 homepage 检测放宽（`newsDetail_forward` 模式的 URL 显然是文章页，不应被标记为 homepage）

### 5.3 理想方案（与 BUG-014 联动修复）

如果 BUG-014 修好了（relay 成为默认路径），那么 gate 的所有质量规则就都有 relay pipeline 保证——**gate 不需要放宽，因为产出天然符合格式**。但即使如此，gate 仍然应该做结构检查而非质量判断——职责分离是好的架构。

---

## 6. 当前 Bundle 实际产出质量评估（供参考）

抛开 gate 的格式要求，只看内容：

| Topic | evidence-summary 关键发现 | reference 文件 | 内容质量 |
|-------|--------------------------|---------------|---------|
| 01 职业联赛 | CFL 财务规则执行、俱乐部股改向 SOE 集中、亚冠系数崩塌、上座率逆势上升 | 6 个 | 好 |
| 02 国家队 | "失去的一代"量化（98/99 出生仅 426 人注册）、邵佳一重建、女足复苏、归化终结 | 5 个 | 很好 |
| 03 青训 | 五级体系仅 top 2 层运营、教练质量危机（B+ 仅 3.5%）、苏州 631 模式、赛制改革起步 | 6 个 | 很好 |
| 04 治理 | 中足联独立性结构限制、宋凯改革轨迹、治理周期问题（2009 vs 2022）、国际比较 | 4 个 | 好 |
| 05 产业 | 咪咕版权触底反弹、五种俱乐部商业创新模式、沙特联赛亚洲经济影响、青训市场增长 | 4 个 | 好 |

**主观判断**：wave1 产出内容质量足以支撑 wave2 cross-topic synthesis。gate 阻塞的是格式合规，不是内容质量。

---

## 7. 复现条件

1. BUG-014 触发（relay 被旁路）
2. 进入 wave0 或 wave1
3. Sub-agent 产出内容正确但格式不完全符合 relay 模板
4. Gate 的 relay-dependent 规则集中阻塞
5. Phase Agent 花费大量精力修格式 → fatigue → 可能触发 BUG-013（stop contract violation）

---

## 8. Tags

`gate-quality-rules` `relay-provenance` `format-compliance` `structural-vs-quality` `gate-bloat` `BUG-014-cascade` `P0`
