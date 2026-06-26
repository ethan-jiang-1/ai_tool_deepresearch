---
node_type: phase
id: phase-wave2
phase: wave2
gate: wave2-complete
stop: "no"
max_gapfill_iterations: 2
max_gapfill_subagents_per_round: 3
requires:
  - shared/shared-schemas
  - shared/shared-subagent-protocol
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

Claim → execute synthesis with embedded finding triage + targeted search loop → complete.

#### Finding Triage + Targeted Search Loop 协议

```
 1. 读取所有 topic 的 evidence-summary.md + question-list.md

 2. 建立 cross-topic scan matrix
    — 记录哪些 topic pair 被检查
    — 检查 shared_pattern / contradiction / resolution_opportunity /
      emergent_question 四个维度
    — topic_count ≤ 5 时默认检查所有 pair
    — 即使 pair 无 finding 也记录（finding_ids: "none"）
    → 写入 cross-topic-ledger.md §Cross-Topic Scan Matrix

 3. 将 findings 写入 ledger/index
    — 三类 finding：
      · wave1_legacy_question（来自 Wave1 question-list [仍开放]/[部分进展]）
      · cross_topic_resolution（A topic 的问题被 B/C topic evidence 回答）
      · cross_topic_emergent_question（Wave1 不存在、Wave2 拉通后首次出现）
    → 写入 cross-topic-ledger.md（reasoning）
    → 写入 finding-index.yaml（id/type/status/decision/refs 等 11 field）

 4. 对每个 finding 做 exploration/exploitation decision
    — use_existing_evidence → 用已有 evidence 整合（不搜索）
    — exploit_search → 窄域定向补搜（legacy question）
    — explore_search → 有限探索（emergent question）
    — defer_hitl2 → 进入 HITL2 handoff
    — requires_internal_data → 进入 HITL2 handoff
    — record_only → 记录为 open/deferred
    → 更新 finding-index.yaml 的 decision 和 search_required 字段

 5. 跑 JS feedback check（L0/L1）
    ```bash
    node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs \
      --bundle <path> --current-node phases/phase-wave2.md --feedback-level L0
    ```
    L0 检查：三件套文件存在、ledger 含 6 个固定 section、index YAML parse、
           finding 字段完整（11 required field）、scan matrix 存在
    L1 检查：resolution.search_required=false、emergent.affected_topics ≥ 2、
           每个 finding 有 type/decision/status/refs
    → fail: 读取 inspect/advice → 修复 ledger/index → rerun（L0 立即修）
    → pass: 继续

 6. 仅对 decision=exploit_search|explore_search 的 finding spawn Sub-agent
    — spawn dpt-topic-scout Sub-agent（直接 spawn，不走 queue delegates）
    — Sub-agent 读取 phase-wave2-subagent.md
    — Sub-agent 只做 WebSearch + WebFetch → 返回结构化 JSON
    — Sub-agent 不做 cross-topic synthesis judgment
    — 每轮最多 spawn max_gapfill_subagents_per_round（默认 3）个 Sub-agent
    → ingestion receipt → 更新 finding-index.yaml 的 receipt_refs + status
    → 如果 Sub-agent 返回了有价值的跨 topic source：
        Phase Agent 将其 promote 到 reference/00-cross-<slug>.md（rich MD，格式见 shared-reference-template.md）
        （topic_tag=shared，notes 注明 finding_id + source_layer: wave2_cross_topic）

 7. 跑 JS feedback check（L1）
    检查：receipt refs 存在（exploit/explore_search 必须有 receipt）、
          status 已更新、失败/不可访问的搜索如实记录
    → fail: 修复 receipt/status/decision（L1 同一 finding 最多 2 次尝试）
    → pass: 继续

 8. 写 synthesis.md 作为 narrative projection
    — 面向人类阅读的 cross-topic narrative
    — 组织最终综合判断、关键 patterns、残留问题
    — 引用 Wave0/Wave1 artifacts（Markdown links）
    — 引用 W2F-xxx finding id（让 narrative 可追溯回 ledger/index）
    — 不作为动态 finding source of truth

 9. 跑 JS feedback check（L1）
    检查：narrative 引用 W2F-xxx finding id、无 unknown finding id、
          无 orphan finding（appears_in_synthesis=false AND hitl2_handoff=false）
    → fail: 补 ledger finding 或降级 claim / 投影到 synthesis 或 HITL2 或
            mark record_only
    → pass: 继续

10. 收敛判断
    — 无新 finding → 收敛
    — 达 max_gapfill_iterations（默认 2）→ 强制收敛，unresolved finding
      必须进入 HITL2 Handoff 或 record_only，不能静默消失
    — 所有剩余 finding 均为 requires_internal_data/defer_hitl2/record_only →
      收敛
    → 回到步骤 3 继续迭代，或 complete queue task
```

**Phase 2 — Backfill tasks**（synthesis 完成 + finding triage loop 收敛后执行）：

1. Claim backfill task
2. `grep -n '__BACKFILL_WAVE2_JUDGMENT__' seed_topics/{slug}.md` 定位 token
3. 从 Wave2 ledger/index 投影 finding（筛选 `affected_topics` 包含该 topic 的 finding）
4. 替换 `__BACKFILL_WAVE2_JUDGMENT__` token 行为跨 topic 判断（保留 source_layer + finding id）
5. `grep -n '__BACKFILL_PENDING_QUESTIONS__'` 定位 token
6. 更新问题状态标签：
   - `[开放]` → `[部分解答]`（被 cross-topic resolution 或 search 解答）
   - 保持 `[开放]`（仍无解答）
   - 新增 cross-topic emergent question 标记为 `[涌现]` 并保留 `source_layer: wave2_cross_topic`
7. 替换 `__BACKFILL_PENDING_QUESTIONS__` token 行
8. Complete（queue receipt 只验证 `file:` 前缀；token absence 由 gate 验证）

**行为约束：**
- Synthesis 本体必须完成 + finding triage loop 收敛后才能开始 backfill
- Backfill 必须从 ledger/index 投影，不直接从 synthesis.md narrative 摘抄
- 每个 backfill 有独立 queue task + file receipt
- Token 替换的 deterministic 验证在 wave2 gate 中完成

### §3.3 收尾与 Gate

1. 检查三件套 artifact 均存在（synthesis.md + cross-topic-ledger.md + finding-index.yaml）
2. 检查 ledger 含 6 个固定 section、index 可 parse
3. 检查所有 backfill token 已被替换
4. 跑 gate：
   ```bash
   node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs \
     --bundle <path> --current-node phases/phase-wave2.md
   ```
5. gate pass → 读 `check.next`，advance to `hitl2`
6. gate fail → 按 §7 On Gate Fail 处理

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
- `rb_trace.jsonl` 中有 `wave2_completion` event
- `rb_status.json` 中 `current_gate: wave2_complete` / `next_gate: hitl2_recorded`

## 5. Gate Command

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle <path> --current-node phases/phase-wave2.md
```

## 6. On Gate Pass

读取 `check.next`。Advance to `hitl2`：加载 `phase-hitl2.md`。

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

**Persistent failure：** 若 wave2 gate 连续 3 次修复无进展，记录 escalation。

## 8. Stop Behavior

`stop: no` — Phase Agent 自主执行 synthesis + finding triage + search。Wave2 不做 stop-and-wait 人类审查（HITL2 是独立的审查阶段）。

## Rerun-Aware Behavior

> 当 rerun 路径被触发，Phase Agent MUST 按增量模式执行 synthesis——已有 synthesis 保留为 baseline，新增/变更 topic 的 synthesis 作为 delta section 追加。

### 检测

读 `rb_profile.yaml#/human_decision_checkpoints/hitl2/rerun_count`。若 `rerun_count > 0`，当前为 rerun 轮次。

### Merge 策略

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
- **禁止达到 max iteration 后静默丢弃 unresolved finding**（必须进入 HITL2 handoff 或 record_only）
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
