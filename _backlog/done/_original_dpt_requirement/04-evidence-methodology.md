# 04 — 证据方法论

## 证据优先原则

深度研究靠**可复用的本地证据**推进，不是靠聊天印象。

一个来源被接受为参考（reference）时，它应该成为 **Authoritative Copy**：捕获足够的结构化细节，使后续推理无需依赖聊天记忆或重复访问原始 URL。

---

## 证据质量阶梯

| Tier | 来源类型 | 默认用途 |
|------|---------|---------|
| Tier 1 | 官方来源、备案、标准、法规、一手数据集 | 可支撑关键声明 |
| Tier 2 | 行业协会、可信研究、有方法论的报告、专利/产品文档 | 可支撑重要声明 |
| Tier 3 | 高质量媒体、专家访谈、实践案例 | 上下文、机制、失败 |
| Tier 4 | SEO、营销、弱二手覆盖 | 仅发现，除非别无选择 |

**关键声明需要 Tier 1 或 Tier 2 支撑。** 如果只有低层支撑，标记置信度为 low 并保持差距可见。

---

## 本地参考字段（26 个）

每个接受的参考必须提供：

| 字段 | 说明 |
|------|------|
| `source_url` / `source_file` | 来源标识 |
| `acceptance_status` | accepted / reviewed_uncounted / excluded / background |
| `source_type` | 来源类型 |
| `source_family` | 来源家族/发布者家族 |
| `tier` | tier_1 / tier_2 / tier_3 / tier_4 |
| `evidence_role` | foundation / must_answer / mechanism / trend / difficulty / limitation / comparison / synthesis_backing / discovery_only |
| `topic_unique_status` | topic_unique / shared_foundation / both / not_applicable |
| `accessed_at` | 访问日期 |
| `source_date_scope` | 来源日期范围 |
| `related_topic` | 相关话题 |
| `trust_level` | official / academic / practitioner / community |
| `why_it_matters` | 为什么重要 |
| `supports_claims` | 支撑的声明 |
| `seed_backfill_status` | current / deferred_queue_backed / shared_foundation_only / not_applicable |
| `captured_excerpt` | yes / partial / no |
| **网页诊断字段：** | |
| `web_substance` | substantive / thin / none / not_webpage |
| `commercial_intent` | none / mild / strong / unknown |
| `marketing_risk` | low / medium / high |
| `cross_verification_required` | yes / no |
| `cross_verification_status` | verified / pending / unavailable_after_search / not_required |
| `content_retention_decision` | retain / prune_partial / exclude_source |
| `risks_or_limitations` | 风险或限制 |
| `excluded_reason` | 排除原因（仅排除的参考） |

### 参考文件名溯源

- Wave 0 共享基础：`00-shared-<source-or-claim-slug>.md`
- Wave 1 话题特定：`<topic-id>-<source-or-claim-slug>.md`
- **禁止**：全局不透明编号 `ref-NNN-*`（隐藏了证据来自共享基础还是话题深化）

---

## 网页材料诊断硬门槛

每个网页来源在被计数前必须通过此诊断：

| 规则 | 说明 |
|------|------|
| `web_substance=thin` 或 `none` | **不能**计入 source floor |
| `commercial_intent=strong` 或 `marketing_risk=high` | **不能**作为中性事实/市场现实/结果/benchmark 或 P0/P1 声明的证据，除非已验证 |
| P0/P1 声明 + `cross_verification_required=yes` | 必须 `cross_verification_status=verified` 才能计 |
| 整页不合格 | 记录到 excluded inventory，不留作普通参考 |
| 部分有用 | `content_retention_decision=prune_partial`，从 Core Content Capture 剔除 SEO/营销内容 |

**营销页可以作为"发布者如何表达自己"的证据，不能未经验证就当成外部真实结果。**

---

## 探索/利用决策框架

### 关键信号

**探索信号**（考虑开新方向）：
- 高频未归类概念（≥2 独立参考指向同一新概念）
- 未建模维度（新机制/风险/评价维度未被当前框架覆盖）
- 核心问题未回答（must_answer 仍有实质空洞）
- 横向依赖变强（新发现影响多个话题结论）

**利用信号**（继续深挖或收束）：
- 证据收敛（新增材料重复已知事实）
- 问题清单收敛（旧问题被回答，新问题产生速度下降）
- 反例搜索饱和（专门搜索后未发现新的关键反例）
- 机制稳定（核心机制能用简洁语言解释，有多个高可信来源支撑）

### 9 种决策状态

| 决策 | 含义 |
|------|------|
| `continue` | 当前线索仍有高价值 gap |
| `exploit_current_line` | 转入有针对性的验证、反例搜索或来源族交叉检查 |
| `explore_new_line` | 新概念/矛盾/空白/噪声模式值得开新搜索线 |
| `topology_candidate` | 证据建议可能需要话题拆分/合并/重定向/新话题 |
| `complete` | 活跃地板 + artifact/backfill 要求均满足 |
| `early_saturation_review` | 需要结构化饱和审查，非自动停止 |
| `suspend` | 重要但当前缺材料或访问受限 |
| `archive` | 继续下钻边际收益低 |
| `redirect` | 另一话题或新 formalized 话题是更好的路径 |

---

## 涌现问题协议

**执行顺序（不可颠倒）：**

```
1. Question Reconciliation（修订存量）
   → 标记 [已解决] / [部分进展] / [仍开放] / [需内部数据]
   → 移除已解决的

2. Emergent Question Protocol（生成增量）
   → 新概念涌现检查
   → 矛盾涌现检查
   → 空白涌现检查
   → 噪声模式反思检查
   → 生成 [涌现] 问题

3. Exploration / Exploitation Decision
   → 选择一个决策状态
   → 记录 trigger_refs、queue_consequence、next_action
```

---

## 源获取委托

源获取可以将高噪声检索委托给前台 subagent runner：

**委托 runner 只能写入：**
- `_cache/intake/<batch-id>/intake-request.md`
- `_cache/intake/<batch-id>/retrieval-results.md`
- `_cache/intake/<batch-id>/candidate-cards.md`
- `_cache/intake/<batch-id>/capture-manifest.md`
- `_cache/excluded/<batch-id>-excluded.md`

**主 Agent 拥有：**
- fan-in 审查
- `_cache/promote-log.md`
- 推广到 `REFERENCE_DIR`
- `_INDEX.md`、STATUS、QUEUE、TRACE
- 共享 artifact 和话题种子文件

**`_cache/` 是暂存区，不是证据。** 不能计入 source floor、授权 gate、或替代 `seed_topics/_reference`。

---

## Artifact 生命周期

### 最小 Artifact 集合

```
ARTIFACT_DIR/
  README.md
  wave1_topics/<topic-id>-<topic-slug>/evidence-summary.md    ← 每话题
  wave1_topics/<topic-id>-<topic-slug>/question-list.md      ← 每话题
  wave2/cross-topic-synthesis.md                             ← Wave 2
  wave2/human-decision-brief.md                              ← HITL2
```

### 生命周期触发

| 阶段 | 触发条件 | 动作 |
|------|---------|------|
| 初始生产 | `topic_unique_ref_count >= 1` + `produced_at_ref_count = 0` | 立即生产两个 artifact (evidence-summary + question-list)，必须在 slot_1 或 slot_2 |
| 增量刷新 | `accepted_topic_ref_count - produced_at_ref_count >= 2` | 轻量刷新：只读新 ref，更新受影响行 |
| Gate 审计刷新 | Wave 1 审计时 | 每个话题必须 `produced_at_ref_count = accepted_topic_ref_count` |

### Artifact 新鲜度

- stale: `produced_at_ref_count < accepted_topic_ref_count`
- delta=1: 不触发刷新（边际变化太小）
- delta>=2: 触发刷新任务
- delta>=5: 可以全量重写

---

## 反停滞降级

**原则：** 对单个细节做有限尝试。试少量替代查询或来源路线，记录限制，必要时降级置信度，然后继续队列。

**不降级的情况：** 高风险、不可逆、合规、安全、成本、数据丢失相关的决策。

**运行级预算：**
- >3 个开放限制影响 P0/P1 判断 → 停止正常推进
- >20% 活跃话题 must-answer 声明依赖降级证据 → 停止正常推进

---

## 停止条件（每个话题）

标记话题饱和前必须满足：

- 核心对象列表稳定
- 确认的 `wave1_topic` must-answer 条目被本地参考支撑/降级/分类/排队
- 确认的 `wave2_synthesis` must-answer 条目有具体 Wave 2 路线
- 限制/失败模式搜索已尝试
- 反例/否定证据搜索已尝试
- 官方声明已交叉检查（如果可能）
- 剩余未知已列表化

`complete` 还需要：来源族重复检查、所有活跃地板、artifact/backfill 完成。
