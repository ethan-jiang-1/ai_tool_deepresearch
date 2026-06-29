---
node_type: phase
id: phase-wave2
phase: wave2
gate: wave2-complete
stop: "no"
requires:
  - shared/shared-schemas
  - shared/shared-subagent-protocol
  - shared/shared-silent-execution
suggested_context:
  - shared/shared-anti-cheating-rules
---

# Phase: Wave2 — Cross-Topic Synthesis

## 1. Stage Goal

从所有 topic 的 Wave1 evidence-summary 和 question-list 派生 cross-topic synthesis，通过 finding taxonomy（三类 finding + 六种 decision）+ targeted search loop 发现和填补证据缺口，最终从 ledger/index 投影回填 seed topic 文件。

**Wave2 不是"写一篇 synthesis.md"。** Wave2 是一个 cross-topic cognition phase。产出三件套 artifact group：
- `synthesis.md` — narrative projection（人类阅读）
- `cross-topic-ledger.md` — Agent-readable dynamic ledger（6 个固定 section）
- `finding-index.yaml` — JS-readable shadow index（11 个 required field per finding）

Wave2 是最后一个 research phase——产出不是 final report，而是经过 triage + search 的综合判断供 HITL2 人类审查。

## 2. Required Inputs

- Wave0 产出的 `reference/_INDEX.md` 和所有 `artifacts/wave0/<topic>/source.yaml`
- Wave1 产出的所有 `artifacts/wave1/<topic>/evidence-summary.md`
- Wave1 产出的所有 `artifacts/wave1/<topic>/question-list.md`（四区结构：Targets → Reconciliation → Emergent Protocol → Exploration/Exploitation Decision）
- `shared-schemas.md`（wave2 artifact 路径、finding-index schema、enum 值）
- `shared-subagent-protocol.md`（relay slot 通信契约）

## 3. Allowed Actions

> **search_preference 下游使用**：Agent SHALL 在 wave2 cross-topic synthesis 和 emergent search 期间读取 `rb_profile.yaml` 的 `search_preference` 字段。将用户的自然语言偏好作为跨 topic 分析视角的软约束（如用户关注特定地区、时间段、方法论角度——在 cross-topic scan matrix 和 emergent search 中优先探索这些维度）。`search_preference` 不替代 `research_style_params` 的硬参数，而是在硬参数框架内的分析视角倾斜。

### §3.1 灌料 (Filling)

首次进入 wave2，如果 queue 为空：
1. 读取 `rb_plan.md` frontmatter 的 `topic_registry`
2. 创建 **1 个 synthesis task card JSON**：
   - `work_id: wave2-synthesis`
   - `targets: { controller: "main-agent" }`（当前 queue schema wire value；概念角色是 Phase Agent）
   - `producer_rule: cross_topic_synthesis`
   - `priority_class: P2_close_open_loop`
   - `required_receipts: ["file:artifacts/wave2/synthesis.md", "file:artifacts/wave2/cross-topic-ledger.md", "file:artifacts/wave2/finding-index.yaml"]`
   - `action`：描述完整的 synthesis + finding triage + targeted search loop 流程（见 §3.2）
3. 为 **每个 topic** 创建 **1 个 backfill task card JSON**：
   - `work_id: wave2-backfill-{slug}`
   - `targets: { controller: "main-agent" }`（当前 queue schema wire value；概念角色是 Phase Agent）
   - `producer_rule: seed_topic_backfill_wave2`
   - `priority_class: P4_progressive_artifact_or_seed_backfill`
   - `required_receipts: ["file:seed_topics/{topic.slug}.md"]`
   - `action`：含 token 替换指令（从 ledger/index 投影，见 §3.2 Phase 2）
4. 使用 `operate-queue enqueue` 逐个灌入，synthesis task 优先
5. 灌料完毕后跑 `operate-queue check` 确认

### §3.2 Queue-Driven 执行循环

**Phase 1 — Synthesis task**（先执行，`P2_close_open_loop` 优先级）：

Claim → execute synthesis（cross-topic scan + finding triage + initial search + narrative projection）→ complete.

#### Synthesis Task 协议（单轮执行）

```
 1. 读取所有 topic 的 evidence-summary.md + question-list.md
    同时读取 `rb_profile.yaml#/research_style_params` 获取 wave2 参数：
    — wave2_cross_topic_depth（每 topic 至少连几个其他 topic）
    — wave2_emergent_search_rounds（每 topic 做几轮 emergent search）
    — p0p1_independent_backing（P0/P1 finding 最少 backing 数）
    — quality_min_tier / quality_min_substance（backing source 质量底线）

 2. 建立 cross-topic scan matrix
    — 记录哪些 topic pair 被检查
    — 检查 shared_pattern / contradiction / resolution_opportunity /
      emergent_question 四个维度
    — 每个 topic 至少与 wave2_cross_topic_depth 个其他 topic 建立 connection
    — 即使 pair 无 finding 也记录（finding_ids: "none"）
    → 写入 cross-topic-ledger.md §Cross-Topic Scan Matrix

 3. 将 findings 写入 ledger/index
    — 三类 finding（不变）
    → 写入 cross-topic-ledger.md（reasoning）
    → 写入 finding-index.yaml（id/type/status/decision/refs 等 11 field）

 4. 对每个 finding 做 exploration/exploitation decision（6 种 decision，不变）
    → 更新 finding-index.yaml 的 decision 和 search_required 字段

 5. 对 decision=exploit_search|explore_search 的 finding spawn Sub-agent
    — spawn dpt-topic-scout Sub-agent（sub-agent role 不变）
    — 每 finding 做 1 轮搜索（更多的 emergent search round 由 §3.3.2 Re-Fill Loop 追加）
    → ingestion receipt → 更新 finding-index.yaml 的 receipt_refs + status
    → 有价值的跨 topic source → promote 到 reference/00-cross-<slug>.md

 6. 跑 JS feedback check（L0/L1）（不变）

 7. 写 synthesis.md 作为 narrative projection（不变）

 8. 跑 JS feedback check（L1）（不变）

 9. Complete queue task
    — 本 task 只做一轮 synthesis + search
    — 不在此 task 内部循环收敛
    — quality 达标（cross-topic depth / emergent rounds / backing 质量）
      由下游 §3.3.2 Quality Re-Fill Loop 通过 Q 自主循环保证
```

**Phase 2 — Backfill tasks**（synthesis task complete 后执行）：

（逻辑不变——backfill 从 ledger/index 投影替换 seed topic token）

**行为约束（更新）：**
- Backfill 必须从 ledger/index 投影，不直接从 synthesis.md narrative 摘抄
- 每个 backfill 有独立 queue task + file receipt
- Token 替换的 deterministic 验证在 wave2 gate 中完成

### §3.3 收尾与 Quality Self-Check

1. 检查三件套 artifact 均存在（synthesis.md + cross-topic-ledger.md + finding-index.yaml）
2. 检查 ledger 含 6 个固定 section、index 可 parse
3. 检查所有 backfill token 已被替换
4. **Quality Self-Check**（见 §3.3.1 — 跑 gate 前必须逐条确认 5 个 wave2 参数）
5. 跑 gate（含 **§3.3.2 Quality Re-Fill Loop** — quality gap 时自动进入自主补充循环）：
   ```bash
   node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs \
     --bundle <path> --current-node phases/phase-wave2.md
   ```
6. gate pass → 读 `check.next`，advance to `hitl2`
7. gate fail → 按 §3.3.2 和 §7 处理

#### §3.3.1 Quality Self-Check（跑 Gate 前逐条确认 wave2 参数达标）

Agent MUST 在跑 gate 之前读 `rb_profile.yaml#/research_style_params`，逐条检查以下 5 个 wave2 参数。这不是 gate rule——gate 不做内容级质量验证。Agent 自己逐条确认后跑 gate。不达标的维度标记为 gap，由 §3.3.2 Quality Re-Fill Loop 通过 Q 自主补充。

| # | Parameter | Check | 确认方式 |
|---|-----------|-------|---------|
| 1 | `p0p1_independent_backing` | 每个 P0/P1 finding 的 `backing_refs` 数量 ≥ 阈值 | 遍历 finding-index.yaml 中 status≠deferred 的 finding，检查 backing_refs 数组长度 |
| 2 | `quality_min_tier` | 每个 backing source 的 tier ≥ 阈值 | 检查 backing ref 指向的 reference/*.md 文件 metadata block 中的 tier 字段 |
| 3 | `quality_min_substance` | 每个 backing source 的 substance ≥ 阈值 | 同上——检查 reference/*.md 的 metadata block |
| 4 | `wave2_cross_topic_depth` | 每 topic 在 scan matrix 中至少与 N 个其他 topic 有 connection | 读 cross-topic-ledger.md §Cross-Topic Scan Matrix 表，统计每个 topic 出现的 pair 数。depth=0 → 跳过此条件。depth≥1 → 每个 topic 至少在 N 个 pair 中出现。若某 topic 的 pair 数 < depth → gap |
| 5 | `wave2_emergent_search_rounds` | 每 topic 至少完成 N 轮 emergent search，每轮不同搜索角度 | 检查 finding-index.yaml 中 type=emergent 的 finding 的 search 执行记录。rounds=0 → 跳过此条件。rounds≥1 → 每 topic 至少有 N 个 type=emergent finding 已完成搜索（status≠pending_search）。若不足 → gap |

**Enforcement boundary:** 以上 5 条是 Agent discipline——由 phase-wave2.md body 约束，不由 gate rule 验证。Gate 做 structural 检查（文件存在、section 完整、YAML parse），不做内容级质量判断。

#### §3.3.2 Quality Re-Fill Loop（quality gap 时的自主补充循环）

当 Quality Self-Check 发现 gap，Phase Agent 进入自主补充循环——创建针对性 supplementary task card → enqueue + drain Q → re-run Quality Self-Check → gate。此循环完全静默（`stop: no`），模式与 wave0 §3.3.1 / wave1 §3.3.2 完全一致。

**Loop 流程：**

```
Quality Self-Check → all pass? → gate
         │
         │ gap found
         ▼
  解析 gap type + target + magnitude
         │
         ▼
  attempt_count ≥ 3? → escalation
         │ no
         ▼
  为每种 gap 创建 supplementary task card → enqueue Q
         │
         ▼
  Drain Q（claim → Sub-agent execute → complete）
         │
         ▼
  Re-run Quality Self-Check（回到顶部）
```

**Loop 终止条件：** 与 wave0/wave1 一致——全部 5 项通过 → gate；attempt ≥3 → escalation；no-progress（连续两次同一维度的 gap 未缩小）→ escalation。

**Supplementary task card 模板：**

三种 gap 对应三种 task card。Phase Agent 根据 Quality Self-Check 的 gap 类型选择对应模板：

**A. Backing gap**（backing 数量不足或质量不达标）— `work_id: wave2-suppl-backing-{finding_id}-r{attempt}`：

```json
{
  "work_id": "wave2-suppl-backing-{finding_id}-r{attempt}",
  "title": "Supplementary backing search: {finding_id}",
  "targets": { "controller": "main-agent", "delegates": { "to": "sub-agent", "role_key": "dpt-evidence-extractor", "timeout_ms": 600000 } },
  "action": "为 finding {finding_id}（标题: {finding_title}，类型: {finding_type}）寻找更多/更高质量的 backing source。当前 backing: {current_count} 个，需要至少 {target_count} 个。quality_min_tier={min_tier}，quality_min_substance={min_substance}。先读现有 finding-index.yaml 和 reference/ 中已有的 backing ref，确认已有来源，避免重复。使用 WebSearch 搜索新增来源（不同于已有 URL 的 domain 或视角），WebFetch 获取内容，写入 reference/00-cross-<slug>.md（rich MD，按 shared-reference-template.md 格式：9 字段 metadata block + 5 section）。更新 finding-index.yaml 中该 finding 的 backing_refs 数组。不修改 synthesis.md 或 cross-topic-ledger.md。将原始搜索/抓取内容写入 `_cache/wave2/backing-r{attempt}/{finding_id}/`：每个 source 在 `sNN_<source-slug>/` 下保存 `websearch.json` + `page.md` + `meta.json`（11 字段）。",
  "producer_rule": "topic_deepening",
  "lineage": {"finding_id": "{finding_id}", "phase": "wave2", "trigger": "quality_backing_gap", "attempt": {attempt}},
  "priority_class": "P1_state_or_gate_repair",
  "required_receipts": [],
  "done_condition": "至少 1 个新的 reference/00-cross-*.md 文件被写入（含完整 metadata 且 tier≥{min_tier}、substance≥{min_substance}），且 finding-index.yaml 中该 finding 的 backing_refs 已更新",
  "verification": {"engine": [], "agent": ["source_url_not_duplicate", "tier_meets_min", "substance_meets_min", "backing_refs_updated"]},
  "writes_to": ["reference/00-cross-<slug>.md", "finding-index.yaml（backing_refs 更新）"],
  "completion_receipt": null,
  "failure_route": "queue_repair",
  "payload": {"finding_id": "{finding_id}", "target_count": {target_count}, "min_tier": "{min_tier}", "min_substance": "{min_substance}", "attempt": {attempt}}
}
```

**B. Cross-topic depth gap**（某 topic 的 cross-topic connection 不足）— `work_id: wave2-suppl-cross-{topic.slug}-r{attempt}`：

```json
{
  "work_id": "wave2-suppl-cross-{topic.slug}-r{attempt}",
  "title": "Supplementary cross-topic search: {topic.title}",
  "targets": { "controller": "main-agent", "delegates": { "to": "sub-agent", "role_key": "dpt-topic-scout", "timeout_ms": 600000 } },
  "action": "为 topic [{topic.title}] 寻找与至少 {target_count} 个其他 topic 的 cross-topic connection。当前 scan matrix 中此 topic 只连了 {current_count} 个其他 topic，需要 {target_count} 个。先读 cross-topic-ledger.md §Cross-Topic Scan Matrix 和所有 topic 的 evidence-summary.md，确认已有 connection，避免重复。使用 WebSearch 搜索跨 topic 的 evidence——shared pattern、contradiction、resolution opportunity。WebFetch 获取内容，写入 reference/00-cross-<slug>.md。更新 cross-topic-ledger.md 的 Scan Matrix 表（追加新 pair 行）。不修改 synthesis.md。将原始搜索/抓取内容写入 `_cache/wave2/depth-r1/{topic.slug}/`：每个 source 在 `sNN_<source-slug>/` 下保存 `websearch.json` + `page.md` + `meta.json`（11 字段）。",
  "producer_rule": "topic_deepening",
  "lineage": {"topic_slug": "{topic.slug}", "phase": "wave2", "trigger": "quality_cross_topic_gap", "attempt": {attempt}},
  "priority_class": "P1_state_or_gate_repair",
  "required_receipts": [],
  "done_condition": "至少 1 个新的 reference/00-cross-*.md 文件被写入，且 cross-topic-ledger.md Scan Matrix 中该 topic 的 pair 数增加",
  "verification": {"engine": [], "agent": ["source_url_not_duplicate", "scan_matrix_updated", "cross_topic_pair_added"]},
  "writes_to": ["reference/00-cross-<slug>.md", "cross-topic-ledger.md（Scan Matrix 追加）"],
  "completion_receipt": null,
  "failure_route": "queue_repair",
  "payload": {"topic_slug": "{topic.slug}", "topic_title": "{topic.title}", "current_count": {current_count}, "target_count": {target_count}, "attempt": {attempt}}
}
```

**C. Emergent search rounds gap**（某 topic 的 emergent search 轮次不足）— `work_id: wave2-suppl-emergent-{topic.slug}-r{attempt}`：

```json
{
  "work_id": "wave2-suppl-emergent-{topic.slug}-r{attempt}",
  "title": "Supplementary emergent search: {topic.title} (round {round_number})",
  "targets": { "controller": "main-agent", "delegates": { "to": "sub-agent", "role_key": "dpt-topic-scout", "timeout_ms": 600000 } },
  "action": "对 topic [{topic.title}] 做第 {round_number} 轮 emergent content search。前几轮的角度: {previous_angles}。本轮必须使用不同的搜索角度（如不同时间窗口、不同方法论视角、不同地域/监管框架、对立/竞争观点）。先读该 topic 的 evidence-summary.md 和 question-list.md，确认已有内容，避免重复。使用 WebSearch + WebFetch 搜索 emergent 内容，写入 reference/00-cross-<slug>.md。若发现新的 cross-topic emergent question，追加到 finding-index.yaml（type=cross_topic_emergent_question）。更新 question-list.md 的 Emergent Question Protocol。不修改 synthesis.md。将原始搜索/抓取内容写入 `_cache/wave2/emergent-r1/{topic.slug}/`：每个 source 在 `sNN_<source-slug>/` 下保存 `websearch.json` + `page.md` + `meta.json`（11 字段）。",
  "producer_rule": "topic_deepening",
  "lineage": {"topic_slug": "{topic.slug}", "phase": "wave2", "trigger": "quality_emergent_rounds_gap", "attempt": {attempt}, "round": {round_number}},
  "priority_class": "P1_state_or_gate_repair",
  "required_receipts": [],
  "done_condition": "至少 1 个新的 reference/00-cross-*.md 文件被写入，且 finding-index.yaml 中该 topic 新增了 type=emergent 的 finding（或已有 emergent finding 的 search_required 从 true 变为 false）",
  "verification": {"engine": [], "agent": ["source_url_not_duplicate", "emergent_finding_added_or_searched", "search_angle_different_from_previous"]},
  "writes_to": ["reference/00-cross-<slug>.md", "finding-index.yaml（新增/更新 emergent finding）"],
  "completion_receipt": null,
  "failure_route": "queue_repair",
  "payload": {"topic_slug": "{topic.slug}", "topic_title": "{topic.title}", "round_number": {round_number}, "previous_angles": "{previous_angles}", "attempt": {attempt}}
}
```

**Drain 注意事项（与 wave0/wave1 一致）：**
- 三种 supplementary task 的 `required_receipts: []`、`completion_receipt: null`——Phase Agent 在 Sub-agent 返回后手动验证条件
- 补充循环期间不重新回填 seed topic——backfill 已在 Phase 2 完成
- loop bounded by 3 attempts + no-progress detection

### §3.4 JS Feedback Checkpoint 调用参考

Feedback 分三层，按语义边界触发（不每次编辑都跑，不只在最后跑）：

| Level | 触发时机 | 检查内容 | 修复策略 |
|-------|---------|---------|---------|
| L0 | ledger/index 初建后 | 文件存在、ledger 固定 section、YAML parse、finding 字段完整、scan matrix 存在 | 立即修复并 rerun |
| L1 | finding triage 后 | type/decision/status/refs 完整、resolution.search_required=false、emergent 至少 2 topic | 最多 2 次修复后 escalate |
| L1 | Sub-agent spawn 前 | 只有 exploit_search/explore_search 才 spawn；defer/internal-data 不 spawn | 立即修复 |
| L1 | receipt ingest 后 | receipt refs 存在、status 已更新、失败如实记录 | 最多 2 次修复后 escalate |
| L1 | synthesis projection 后 | narrative 引用 W2F-xxx、无 unknown id、无 orphan | 最多 2 次修复后 escalate |
| L1 | backfill projection 后 | backfill 引用有效 finding id、保留 source_layer | 最多 2 次修复后 escalate |
| L2 | phase gate | 全部 12 条 gate 规则 | 现有 gate repair discipline |

Failure budget：L0 立即修复；L1 同一 finding/边界最多 2 次修复尝试 → 超过则 escalate 到 `defer_hitl2` 或 `record_only` 附原因；L2 不降级。

### §3.5 Finding Lifecycle 参考

```
candidate → classified → decision_made → searched / not_searched / deferred
  → resolved / partial / open / deferred
  → projected_to_synthesis and/or hitl2_handoff
  → backfilled_to_related_seed_topics
```

Ledger 记录 reasoning，index 记录 lifecycle state。JS 不判断 reasoning 是否好，但检查 lifecycle 是否断链。

### §3.6 Scan Matrix 构建指导

1. 列出所有 topic pair
2. 对每个 pair 检查四个维度：
   - `shared_pattern`：两个 topic 是否有共同模式
   - `contradiction`：两个 topic 的发现是否矛盾
   - `resolution_opportunity`：一个 topic 的 evidence 是否能回答另一个 topic 的 open question
   - `emergent_question`：拉通后是否出现新的跨 topic 问题
3. 记录到 ledger 的 Scan Matrix table：

```markdown
| pair_id | topics | checked_dimensions | finding_ids | notes |
| P01 | topic-a + topic-b | shared_pattern, contradiction, resolution_opportunity, emergent_question | W2F-001, W2F-002 | ... |
| P02 | topic-a + topic-c | shared_pattern, contradiction, resolution_opportunity, emergent_question | none | Checked; no material cross-topic relation found |
```

这**不是**要求 Phase Agent 做机械笛卡尔积表演，而是给 JS 和人类一个反馈面：如果 Wave2 声称做了 cross-topic synthesis，却没有 scan surface，就很容易滑回自由总结。

## 4. Expected Artifacts

- `artifacts/wave2/synthesis.md`（narrative projection，非空、含 Markdown links 引用 Wave0/Wave1 artifact、含至少 1 个 wave1 evidence-summary 或 question-list 引用、含 W2F-xxx finding id 引用）
- `artifacts/wave2/cross-topic-ledger.md`（Agent-readable dynamic ledger，含 6 个固定 section：Cross-Topic Scan Matrix / Wave1 Legacy Questions / Cross-Topic Resolutions / Emergent Cross-Topic Questions / Exploration Decisions / HITL2 Handoff）
- `artifacts/wave2/finding-index.yaml`（JS-readable shadow index，每 finding 含 11 个 required field：id/type/status/decision/affected_topics/origin_refs/trigger_refs/search_required/subagent_receipt_refs/appears_in_synthesis/hitl2_handoff，top-level 含 scan 对象）
- `reference/00-cross-<slug>.md（rich MD，格式见 shared-reference-template.md）`（可选——当 `dpt-topic-scout` 搜到跨 topic evidence 且 `affected_topics` ≥ 2 时，Phase Agent ingestion 后 promote 到共享 reference。`topic_tag` 填 `shared`，`notes` 中注明 `finding_id` 和 `source_layer: wave2_cross_topic`）
- 所有 seed topic 文件中 `__BACKFILL_WAVE2_JUDGMENT__` 和 `__BACKFILL_PENDING_QUESTIONS__` token 已被替换（替换内容从 ledger/index 投影，保留 source_layer/finding id/decision/status）
- `rb_trace.jsonl` 中有 `wave2_completion` event（通过 CLI 写入）：
  ```bash
  node DPT_FRAMEWORK/cli/log-event.mjs --bundle <path> --event wave2_completion
  ```
- `rb_status.json` 中 `current_gate: wave2_complete` / `next_gate: hitl2_recorded`（通过 CLI 推进）：
  ```bash
  node DPT_FRAMEWORK/cli/advance-status.mjs --bundle <path> --to wave2_complete
  ```

## 5. Gate Command

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle <path> --current-node phases/phase-wave2.md
```

## 6. On Gate Pass

读取 `check.next`。调用 `advance-status` 推进状态后加载下一 phase：
```bash
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle <path> --to hitl2_recorded
```
然后加载 `check.next` 指向的 node（应为 `phase-hitl2.md`）。

## 7. On Gate Fail

读取 CLI `inspect` / `advice`，修复后 rerun same gate。常见 fail 原因及修复方向：

| Fail | 修复 |
|------|------|
| `synthesis.md` 缺失或为空 | 基于 Wave0/Wave1 artifact 写 narrative projection，引用 W2F-xxx finding id |
| `cross-topic-ledger.md` 缺失或为空 | 建立 scan matrix → inventory findings → 写 6 个固定 section |
| ledger 缺固定 section | 补写缺失的 section heading 和内容 |
| `finding-index.yaml` 缺失或 unparseable | 写/修正 YAML，确保 11 required field per finding |
| 无 Markdown link | 为 synthesis 中的声明添加 Markdown link 引用 |
| synthesis 无 W2F-xxx finding id | 为关键 cross-topic claim 添加 finding id 引用 |
| 所有 link target 不存在 | 检查引用路径是否正确，确认目标 artifact 存在 |
| backfill token 残留 | 执行 backfill task 从 ledger/index 投影替换 token |
| 无 wave1 evidence 引用 | 在 synthesis 中添加对 evidence-summary/question-list 的引用 |
| `trace_event_present` fail | 确认已记录 `wave2_completion` trace event |
| status drift | 恢复 `current_gate`/`next_gate` 为 `wave2_complete`/`hitl2_recorded` |
| Quality gap（backing/cross-topic/emergent 不达标）| **进入 §3.3.2 Quality Re-Fill Loop**：读 Quality Self-Check gap → 创建对应 supplementary task card（backing/cross-topic/emergent）→ enqueue + drain → re-run Quality Self-Check。最多 3 次 gate attempt |

**Persistent failure：** 若 wave2 gate 连续 3 次修复无进展（含 quality re-fill attempt），记录 escalation 到 `rb_status.json`（`state: blocked`，`blocked_reason` 描述具体 gap 和 attempt 次数）和 `rb_trace.jsonl`。

## 8. Stop Behavior

`stop: no` — Phase Agent 自主执行 synthesis + finding triage + Quality Self-Check + re-fill loop。Wave2 不做 stop-and-wait 人类审查（HITL2 是独立的审查阶段）。Quality gap 通过 Q re-fill 静默补足——Phase Agent 不应因 quality 不达标就停下来问用户。

> **静默阶段纪律**：本 phase 在静默自主阶段。`requires` 已加载 `shared-silent-execution.md`。遇错按降级优先级链处理（重试→换源→降级方法→标记 gap），绝不浮出水面向用户报告进度、提问或请求确认。

## Rerun-Aware Behavior

> 当 rerun 路径被触发，Phase Agent MUST 先判断 rerun action。新增 topic (`action: add`) 走全量重合成；已有 topic 补维度 (`action: supplement`) 才走 delta/append。

### 检测

读 `rb_profile.yaml#/human_decision_checkpoints/hitl2/rerun_count`。若 `rerun_count > 0`，当前为 rerun 轮次。同时读取各 topic 的 `seed_topics/{slug}.md` 中的 `## 本轮重跑方向` section。

### 场景表

| 场景 | 行为 |
|------|------|
| **新增 topic（`action: add`）** | 全量 synthesis——与首次 wave2 一致。重读所有 topic 的 evidence-summary.md 和 question-list.md（包括新增 topic），重建 cross-topic scan matrix，重新生成 `synthesis.md`、`cross-topic-ledger.md`、`finding-index.yaml`。旧 synthesis 可备份为 `synthesis.prev-rerun-N.md`，但不得作为 baseline 追加 delta。 |
| **已有 topic，有 `action: supplement`** | 保持 delta/append。已有 synthesis 保留为 baseline，只针对新增/变更维度追加 delta section，并显式标注 conflict/defer HITL2。 |
| **已有 topic，无变更** | 保留已有 synthesis 判断；若无任何 add/supplement action，不重复合成。 |
| **移除 topic（`action: remove`）** | 不删除历史 synthesis；在本轮 ledger/index 中标记该 topic 已退出后续 projection。 |

### `action: supplement` Merge 策略

- **已有 synthesis 保留为 baseline**：前一（或首次）轮次的 `synthesis.md`、`cross-topic-ledger.md`、`finding-index.yaml` 全部保留。不作为本轮 synthesis 覆盖的目标——它们反映的是之前轮次 cross-topic synthesis 的结论。
- **Delta section 追加**：本轮 rerun 的新 synthesis（针对新增/变更 topic 的 cross-topic 分析）作为 delta section 追加到 `synthesis.md` 末尾：
  ```markdown
  ## Delta Synthesis (Rerun N)
  <本轮 rerun 的新 cross-topic 发现，仅覆盖新增和变更的 topic>
  ```

  `cross-topic-ledger.md` 中的新 findings 也以 delta section 追加（`## Delta Findings (Rerun N)`），不覆盖已有 finding。`finding-index.yaml` 中的新 finding 以 `rerun_N` 前缀标记 finding id（如 `W2F-R2-001`）。
- **冲突处理**：若新 synthesis 的结论与旧 synthesis 的结论矛盾（如旧 synthesis 说 "topic-A 和 topic-B 无关联"，但新 evidence 显示两者有关联），MUST NOT 静默覆盖旧结论。取而代之：
  1. 在 delta section 中标注冲突：`**冲突**: 本轮 evidence 显示 X，与 baseline synthesis (Rerun N-1) 的结论 "Y" 矛盾`
  2. 在 ledger 中记录为 cross-topic emergent question（`type: cross_topic_emergent_question`）
  3. 在 `finding-index.yaml` 中标记 `decision: defer_hitl2`——交由 HITL2 人类裁决

### 非增量路径的重构风险

若 rerun rationale 要求根本性重构（如改变 `research_profile` 从 `quick_factual` 到 `claim_verification`），这可能不适合 delta 合并模式。Agent MUST 在 `phase-rerun.md` 的分析阶段标记此情况——告知用户 delta 合并的局限性，建议考虑开新 Deep Research 而非增量 rerun。

## 9. Anti-Cheating Rules

- **禁止只有 `synthesis.md` 而没有 ledger/index 就声称完成 Wave2 emergence handling**
- **禁止把所有 finding 都叫 gap**（必须区分为 wave1_legacy_question / cross_topic_resolution / cross_topic_emergent_question）
- **禁止对 `cross_topic_resolution` spawn Sub-agent 搜索**（resolution 是 existing evidence integration，不是 gap）
- **禁止把 `cross_topic_emergent_question` 埋进某个 topic 的 pending questions 而不标注 `source_layer: wave2_cross_topic`**
- **禁止 `decision=explore_search` 或 `decision=exploit_search` 但没有 relay/runtime receipt**
- **禁止达到 3 次 quality re-fill attempt 后静默丢弃 unresolved finding**（必须进入 HITL2 handoff 或 record_only）
- **禁止 `synthesis.md` 写出没有 finding id（W2F-xxx）支撑的关键 cross-topic claim**
- **禁止让 Sub-agent 做 cross-topic judgment**（Sub-agent 只返回 bounded search/extraction result）
- **禁止 backfill 内容不从 ledger/index 投影**（直接从 synthesis.md narrative 摘抄或丢失 source_layer/finding id）
- **禁止跳过 finding triage loop 直接 complete synthesis task**
- **禁止凭空总结**（不引用任何 Wave0/Wave1 artifact）
- **禁止伪造引用路径**（Markdown link 目标必须是在 bundle 中真实存在的文件）
- **禁止声称 synthesis 是完整的 research conclusion**（Wave2 是 cross-topic synthesis，不是 final report——HITL2 和 readiness 阶段还会进行人类审查）
- 参见 `shared-anti-cheating-rules.md` 的通用禁令

## Log

记录命令: `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level <LEVEL> --msg "<message>"`

| 时机 | 命令 |
|------|------|
| Phase 开始 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:wave2 START"` |
| Phase 结束 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:wave2 END — <summary>"` |
