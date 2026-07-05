---
node_type: phase
id: phase-rerun
phase: rerun
gate: rerun-ready
stop: "no"
execution_contract:
  surface: phase-agent
  search_policy: no_search
requires:
  - shared/shared-profile
  - shared/shared-silent-execution
suggested_context:
  - shared/shared-anti-cheating-rules
---

# Phase: Rerun — 增量重跑预备

## 0. Execution Brief

- **Objective**: Translate HITL2 rerun intent into incremental topic changes before re-entering seed-topics.
- **Start here**: Read HITL2 rationale, current `rerun_count`, existing seed topic files, and `topic_registry`.
- **Path to pass**: Infer add/remove/supplement actions, update seed topic direction markers and registry/style params, increment `rerun_count`, then run the rerun gate.
- **Completion check**: `check-gate-rerun-ready.mjs` passes for `phases/phase-rerun.md`.
- **Failure posture**: Do not search or rewrite research artifacts here; if rerun is structurally impossible, record the accepted silent degradation/unpassable event and obey gate routing.

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

**MUST** 检查 `seed_topics/` 非空。若意外为空（topic_registry 有但 seed_topics/ 为空），默认全量重跑——保留现有 reference 和 artifacts，按 topic_registry 重建 seed_topics/，然后走全量重跑路径。通过 accepted trace/log surface 记录 `silent_degradation`，不询问用户确认：
```bash
node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level warn --msg "silent_degradation" --detail '{"kind":"silent_degradation","phase":"rerun","reason":"seed_topics_empty","action":"full_rerun"}'
```

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

3. **确认 incoming status window**：Gate 前应保持 HITL2→rerun 的 source-gate window：`current_gate: hitl2_recorded` / `next_gate: rerun_ready`。不得在 rerun gate 通过前运行 `advance-status --to rerun_ready`。

4. **运行 gate CLI**：
```bash
node DPT_FRAMEWORK/cli/gates/check-gate-rerun-ready.mjs --bundle <path> --current-node phases/phase-rerun.md
```

5. **Gate pass** → 进入 §6：通过 `enter-phase --node <check.next>` 消费 `phases/phase-seed-topics.md`，再运行 `advance-status --to rerun_ready`
6. **Gate fail** → `no_transition`。Agent MUST 读取 inspect/advice，修复可修复的 bundle/profile 问题后 rerun gate；若 `rerun_count >= 3` 或 rationale 缺失等不可修复条件成立，记录 `silent_unpassable` / `repair_degraded`，保持当前 non-blocked/in-progress holding，不从 stop:no rerun phase 中途向用户提问或汇报。

## 4. Expected Artifacts

- 受影响 seed_topic 文件中的 `## 本轮重跑方向` section 已写入/更新
- `rb_plan.md` frontmatter `topic_registry` 已同步（add → 追加，remove → 移除），`derived_topic_count` 反映当前条目数
- **新增 topic（`action: add`）必须在后续 phase（wave0/wave1/wave2）中遵循完整 `_cache/` 写入约定**：每个 source 写入 `websearch.json` + `page.md` + `meta.json`（11 字段），在 slot result 的 `cache_trails[]` 中声明 leaf 路径，确保 gate `cache_coverage` 可溯源。此约定与首次运行的 topic 完全一致。
- `rb_profile.yaml#/research_style_params` 已更新——`wave0_shared_ref_total` 反映当前 `topic_count`（通过 `apply-research-style.mjs` 重算）
- `rb_profile.yaml#/human_decision_checkpoints/hitl2/rerun_count` 已递增
- Gate 前 status window 为 `current_gate: hitl2_recorded` / `next_gate: rerun_ready`。Rerun gate pass 后，§6 的 `advance-status --to rerun_ready` 才会写入 `current_gate: rerun_ready` / `next_gate: seed_topics_ready`。
- `rb_trace.jsonl` 中有 `gate_attempt` event（由 gate CLI 写入）和 `rerun_ready` event：
  ```bash
  node DPT_FRAMEWORK/cli/log-event.mjs --bundle <path> --event rerun_ready
  ```

## 5. Gate Command

```bash
node DPT_FRAMEWORK/cli/gates/check-gate-rerun-ready.mjs --bundle <path> --current-node phases/phase-rerun.md --attempt <N>
```

Retry 时传 Agent-reported `--attempt N`（N 从 1 开始，每次 rerun 递增）。若 gate 返回 `step_back: true`，暂停并重新阅读本 phase instructions §0 和 §5。Rerun-ready gate fail 是结构性 fail——不可通过 re-fill loop 修复，按 §7 表处理。

## 6. On Gate Pass

读取 gate CLI JSON output，确认 `check.passed === true`，然后读取 `check.next`（应为 `phases/phase-seed-topics.md`）。先消费 handoff，再同步 source gate status：

```bash
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle <path> --node <check.next>
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle <path> --to rerun_ready
```

从 `enter-phase` 渲染出的 seed-topics Markdown 继续执行下一 phase；下游 phase 读取 `rerun_count > 0` + `## 本轮重跑方向` section，以 delta 模式运行。

## 7. On Gate Fail

Rerun-ready gate fail 是结构性 gate failure——不可通过 re-fill loop 修复。读取 CLI `inspect` / `advice`：

| Fail | 行为 |
|------|------|
| `rerun_rationale_present` fail | HITL2 rationale 为空 → 通过 accepted trace/log surface 记录 `silent_degradation`（`gap_impact: blocks_must_answer`），标记当前 research 缺乏用户方向。保持 non-blocked/in-progress，等待后续 HITL2 补充 rationale |
| `rerun_count_valid` fail | `rerun_count >= 3`，已达上限 → 通过 accepted trace/log surface 记录 `silent_unpassable`，建议接受当前结果（走 `phase-final` 交付）。不浮出水面询问用户 |
| `bundle_structure_valid` fail | 目录结构不完整 → 检查 bundle 完整性，按 inspect/advice 修复后 retry。传 `--attempt N` |
| status-window fail | Gate 前恢复 `current_gate: hitl2_recorded` / `next_gate: rerun_ready`，retry gate；不要在 rerun gate pass 前同步 `rerun_ready` |

所有 `silent_degradation` / `silent_unpassable` 记录通过 accepted trace/log surface：
```bash
node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level warn --msg "silent_degradation" --detail '{"kind":"silent_degradation","phase":"rerun","gate":"rerun-ready","reason":"<reason>"}'
node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level warn --msg "silent_unpassable" --detail '{"kind":"silent_unpassable","phase":"rerun","gate":"rerun-ready","reason":"rerun_count_exceeded","rerun_count":<N>}'
```

## 8. Stop Behavior

`stop: no` — 本 phase 不等待用户输入，不发送 rerun prep progress 或 idle/no-work 汇报。Rerun prep 本地写完后必须运行 `rerun-ready` gate；phase handoff 完成条件是 gate pass + `enter-phase --node <check.next>` 写入 seed-topics route-bound load witness + `advance-status --to rerun_ready`。

Gate fail 时通过 accepted trace/log surface 记录 `silent_degradation` 或 `silent_unpassable`，保持 non-blocked/in-progress。`rerun_count >= 3` 时记录 `silent_unpassable`；不得自行加载 seed-topics 或 final，所有路由必须来自 gate CLI `check.next`。

## 9. Anti-Cheating Rules

- **MUST NOT 删除已有 artifacts**：reference/、artifacts/、seed_topics/ 中的已有文件全部保留
- **MUST 读当前 rerun_count 后再递增**：若字段缺失则初始化为 1，若已有值则 +1。MUST NOT 直接覆盖为固定值
- **MUST 检查 seed_topics/ 非空**：若意外为空，默认全量重跑，通过 accepted trace/log surface 记录 `silent_degradation`
- **MUST NOT 在无 rationale 或 rationale 为空时写 ## 本轮重跑方向**：方向 hints 必须来自用户明确的意图
- **MUST NOT 绕过 handoff 直接加载 seed-topics**：所有路由必须来自 gate CLI `check.next`，并通过 `enter-phase --node <check.next>` 消费
- 参见 `shared-anti-cheating-rules.md` 的通用禁令

## Log

记录命令: `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level <LEVEL> --msg "<message>" --detail '<json>'`

| 时机 | 命令 |
|------|------|
| Phase 开始 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:rerun START"` |
| Phase 结束 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:rerun END — <summary>"` |
| Gate fail (terminal) | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level warn --msg "repair_escalated" --detail '{"kind":"repair_escalated","phase":"rerun","gate":"rerun-ready","reason":"<reason>"}'` |
| 降级处理 | `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level warn --msg "repair_degraded" --detail '{"kind":"repair_degraded","phase":"rerun","gate":"rerun-ready","reason":"<reason>"}'` |

> rerun-ready gate fail 后不会进入 repair loop（termial gate），但 MUST 在退出前记录 `repair_escalated` 或 `repair_degraded` 解释为何停止。
