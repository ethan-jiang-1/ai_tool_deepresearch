---
node_type: phase
id: phase-rerun
phase: rerun
gate: rerun-ready
stop: "no"
requires:
  - shared/shared-profile
suggested_context:
  - shared/shared-anti-cheating-rules
---

# Phase: Rerun — 增量重跑预备

## 1. Stage Goal

HITL2 `user_decision: rerun` 后，Agent 用 `rerun` outcome 查 chain 进入本 phase。核心工作是将 HITL2 rationale（用户意图）与 seed_topics 现状（已有 topic 和深度）做**对比推断**，产出 topic 调整方案（保留、新增、补充维度、移除），写入 seed_topic 文件，递增 rerun_count，运行 gate。Gate pass 后 chain 路由进 seed-topics，开始增量链。

本 phase 是分析层——不做搜索、不写 reference、不动 artifacts。只做对比分析和方向标记。

## 2. Required Inputs

- `rb_profile.yaml#/human_decision_checkpoints/hitl2/rationale`（用户 rerun 意图）
- `rb_profile.yaml#/human_decision_checkpoints/hitl2/rerun_count`（当前 rerun 轮次）
- `seed_topics/` 目录（已有 topic 文件清单及其内容——深度、must_answer、search_guardrails）
- `rb_plan.md` frontmatter 的 `topic_registry`（topic 集合的 source of truth）
- `shared-profile.md`（rerun_count 字段文档）

## 3. Allowed Actions — 三阶段智力工作

### Stage 1: 读输入

1. 读取 HITL2 rationale——理解用户想要什么改变（"加经济影响分析"、"去掉不可靠的来源维度"等）
2. 读取 `rerun_count`——若字段缺失则初始化为 1，若已有值则后续 +1
3. 扫描 `seed_topics/` 目录——列出所有已有 topic 文件，读取其 frontmatter 和 body 了解：
   - 每个 topic 的标题、slug、must_answer、hypothesis、search_guardrails
   - 当前深度（quick_factual / exploratory_map / claim_verification）
   - 已有的 ## 本轮重跑方向 section（上一轮 rerun 的方向 hints，如有）

**MUST** 检查 `seed_topics/` 非空。若意外为空（topic_registry 有但 seed_topics/ 为空），退化为全量重跑模式并告知用户："seed_topics/ 为空，将按全量重跑执行。请确认：1) 全量重跑（保留现有 reference），2) 开新 Deep Research"。

### Stage 2: 对比推断 — 产出 topic 调整方案

将 HITL2 rationale（用户意图）与 seed_topics 现状对比，推演出具体行动：

| 场景 | action | 含义 |
|------|--------|------|
| 用户对 topic 满意，不需改变 | 无需标记 | 保留已有 topic 和其 ## 本轮重跑方向 section |
| 用户要求在已有 topic 上加新维度/新方向/深挖 | `supplement` | 保留已有 reference，追加新维度搜索 |
| 用户要求新增一个之前不存在的 topic | `add` | 需创建 seed_topic 文件，写入 ## 本轮重跑方向 section |
| 用户明确否定或要求移除某 topic | `remove` | 保留已有 reference，标记为 deprecated，不再搜索 |

**对比推断示例**：

```
输入:
  HITL2 rationale: "加经济影响分析，topic-B 的视角太窄需要补充成本分析维度"
  seed_topics 现状:
    - 01_topic-A: quick_factual, 方向=监管框架
    - 02_topic-B: quick_factual, 方向=技术实现

输出（topic 调整方案）:
  - topic-A: 保留不动（rationale 未提及）
  - topic-B: supplement — new_search_dimensions: "成本分析"
  - 新增 topic-C: add — 经济影响分析，depth=quick_factual
```

**MUST NOT** 删除任何已有 artifacts（reference/、artifacts/、seed_topics/ 中的已有文件均保留）。

### Stage 3: 写入 & Gate

1. **写入 ## 本轮重跑方向 section**：对每个受影响的 topic，在 `seed_topics/{slug}.md` 文件中追加（或更新已有的）`## 本轮重跑方向` section：

```markdown
## 本轮重跑方向
- **action**: supplement
- **new_search_dimensions**: "成本分析"、"就业影响"
- **adjusted_depth**: quick_factual → exploratory_map
- **search_guardrails**: 避开纯理论文献，聚焦实证研究
- **rationale_excerpt**: "加经济影响分析…topic-B 的视角太窄"
```

每个 topic 文件的 `## 本轮重跑方向` section 最多一个——若已存在（上轮 rerun 遗留），用本轮结果**替换**整个 section（不追加）。

1b. **同步 topic_registry**：做完 topic delta 后，更新 `rb_plan.md` frontmatter 的 `topic_registry` 以反映变更后的有效 topic 集合。`wave0_shared_ref_total` 依赖 `topic_count` 计算——topic 变了参数必须重算。

   - `action: add` → 在 `topic_registry` 数组中追加新 topic 条目（`id`/`slug`/`title`），同步更新 `derived_topic_count`
   - `action: remove` → 从 `topic_registry` 数组中移除对应条目，同步更新 `derived_topic_count`。seed_topic 文件保留但重命名为 `{slug}.md.deprecated`（保留历史记录，避免 seed-topics-ready gate 的 slug_consistency 规则检测到多余 slug）

1c. **重算 research_style_params**：topic_registry 变更后 topic_count 可能变化，必须重算 `wave0_shared_ref_total`（`base + per_topic × topic_count`）。读取当前 `research_profile`，重新运行 apply CLI：

   ```bash
   RESEARCH_PROFILE=$(node -e "const{parse}=require('yaml');const p=parse(require('fs').readFileSync('<bundle>/rb_profile.yaml','utf-8'));console.log(p.research_profile)")
   node DPT_FRAMEWORK/cli/apply-research-style.mjs --bundle <path> --style $RESEARCH_PROFILE
   ```
   
   验证 stdout JSON：`applied` 匹配 `research_profile`，`topic_count` 匹配更新后的 `topic_registry.length`，`wave0_shared_ref_total` 为 `base + per_topic × topic_count`。所有参数写入 `rb_profile.yaml#/research_style_params`（覆盖旧值）。

2. **递增 rerun_count**：
   - 若 `rerun_count` 缺失 → 设为 `1`
   - 若已有值 → `+1`
   - 写入 `rb_profile.yaml#/human_decision_checkpoints/hitl2/rerun_count`

3. **推进 status**（使用 `advance-status` CLI 自动计算 `next_gate`）：
   ```bash
   node DPT_FRAMEWORK/cli/advance-status.mjs --bundle <path> --to rerun_ready
   ```
   （CLI 自动从 chain.json 计算 `next_gate: seed_topics_ready`）

4. **运行 gate CLI**：
```bash
node DPT_FRAMEWORK/cli/gates/check-gate-rerun-ready.mjs --bundle <path> --current-node phases/phase-rerun.md
```

5. **Gate pass** → chain 返回 `phases/phase-seed-topics.md` → Agent 加载 seed-topics phase
6. **Gate fail** → `no_transition`（rerun-ready gate fail 不可修复）。Agent MUST 停止执行并向用户说明原因（上限已到、目录缺失、status 不一致等），建议：
   - `rerun_count >= 3`：已达 rerun 上限，建议接受当前结果或开新 Deep Research
   - 其他 gate fail：检查 bundle 完整性并按 gate inspect/advice 修复后重试

## 4. Expected Artifacts

- 受影响 seed_topic 文件中的 `## 本轮重跑方向` section 已写入/更新
- `rb_plan.md` frontmatter `topic_registry` 已同步（add → 追加，remove → 移除），`derived_topic_count` 反映当前条目数
- **新增 topic（`action: add`）必须在后续 phase（wave0/wave1/wave2）中遵循完整 `_cache/` 写入约定**：每个 source 写入 `websearch.json` + `page.md` + `meta.json`（11 字段），在 slot result 的 `cache_trails[]` 中声明 leaf 路径，确保 gate `cache_coverage` 可溯源。此约定与首次运行的 topic 完全一致。
- `rb_profile.yaml#/research_style_params` 已更新——`wave0_shared_ref_total` 反映当前 `topic_count`（通过 `apply-research-style.mjs` 重算）
- `rb_profile.yaml#/human_decision_checkpoints/hitl2/rerun_count` 已递增
- `rb_status.json` 中 `current_gate: rerun_ready` / `next_gate: seed_topics_ready`（通过 CLI 推进）：
  ```bash
  node DPT_FRAMEWORK/cli/advance-status.mjs --bundle <path> --to rerun_ready
  ```
- `rb_trace.jsonl` 中有 `gate_attempt` event（由 gate CLI 写入）和 `rerun_ready` event：
  ```bash
  node DPT_FRAMEWORK/cli/log-event.mjs --bundle <path> --event rerun_ready
  ```

## 5. Gate Command

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-rerun-ready.mjs --bundle <path> --current-node phases/phase-rerun.md
```

## 6. On Gate Pass

读取 `check.next`。Chain 返回 `phases/phase-seed-topics.md`。加载 seed-topics phase——下游 phase 读 `rerun_count > 0` + `## 本轮重跑方向` section，以 delta 模式运行。

## 7. On Gate Fail

Rerun-ready gate fail 是终端状态——不可修复。读取 CLI `inspect` / `advice`：

| Fail | 说明 | 用户选项 |
|------|------|---------|
| `rerun_rationale_present` fail | HITL2 rationale 为空 | 回到 HITL2 补充 rationale |
| `rerun_count_valid` fail | `rerun_count >= 3`，已达上限 | 接受当前结果 或 开新 Deep Research |
| `bundle_structure_valid` fail | 目录结构不完整 | 检查 bundle 完整性 |
| `status_consistent` fail | rb_status.json 不一致 | 恢复 status 到正确值 |

## 8. Stop Behavior

`stop: no` — 本 phase 不等待用户输入。但 gate fail 时 MUST 停止并告知用户（gate fail = terminal）。

## 9. Anti-Cheating Rules

- **MUST NOT 删除已有 artifacts**：reference/、artifacts/、seed_topics/ 中的已有文件全部保留
- **MUST 读当前 rerun_count 后再递增**：若字段缺失则初始化为 1，若已有值则 +1。MUST NOT 直接覆盖为固定值
- **MUST 检查 seed_topics/ 非空**：若意外为空，退化为全量重跑模式并告知用户
- **MUST NOT 在无 rationale 或 rationale 为空时写 ## 本轮重跑方向**：方向 hints 必须来自用户明确的意图
- **MUST NOT 绕过 chain 直接加载 seed-topics**：所有路由必须通过 gate → chain 查询
- 参见 `shared-anti-cheating-rules.md` 的通用禁令
