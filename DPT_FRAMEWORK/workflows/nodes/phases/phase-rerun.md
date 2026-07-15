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
- **Path to pass**: Inspect canonical topic state, apply add/intent refinement or one complete layout target, update direction guidance/style params, increment `rerun_count`, then run the rerun gate.
- **Completion check**: `check-gate-rerun-ready.mjs` passes for `phases/phase-rerun.md`.
- **Failure posture**: Do not search or rewrite research artifacts here; if rerun is structurally impossible, record the accepted silent degradation/unpassable event and obey gate routing.

## 1. Stage Goal

HITL2 `user_decision: rerun` 后，Agent 用正常 HITL2 gate handoff或唯一accepted `post_final_reentry` exceptional handoff进入本 phase。后者已经记录同一HITL2 rerun decision，不重复询问用户，也不代表post-Final HITL2 gate曾运行。核心工作仍是将 HITL2 rationale（用户意图）与 seed_topics 现状（已有 topic 和深度）做**对比推断**，产出 topic 调整方案（保留、新增、补充维度、移除），写入 seed_topic 文件，递增 rerun_count，运行同一个 gate。

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
2. 读取 `rerun_count`——若字段缺失则初始化为 1，若已有值则后续 +1。计算 `target_rerun_count = current_rerun_count + 1`。
3. **崩溃恢复检查**：对每个已有 topic，检查其 `## 本轮重跑方向` section 是否已存在且 `rerun_count == target_rerun_count`。若全部已有 topic 的方向均已匹配 target → 本轮方向已写入（崩溃恢复），跳到 Stage 3 step 2（递增+gate）。若任一 topic 方向不存在或 `rerun_count != target` → 进入 Stage 2。
4. 扫描 `seed_topics/` 目录——列出所有已有 topic 文件，读取其 frontmatter 和 body 了解：
   - 每个 topic 的标题、slug、must_answer、hypothesis、search_guardrails
   - 当前深度（quick_factual / exploratory_map / claim_verification）
   - 已有的 ## 本轮重跑方向 section（上一轮 rerun 的方向 hints，如有）。方向中 `rerun_count` 不等于 target 的视为陈旧，忽略其 action。

**MUST** 检查 `seed_topics/` 非空。若意外为空（topic_registry 有但 seed_topics/ 为空），默认全量重跑——保留现有 reference 和 artifacts，按 topic_registry 重建 seed_topics/，然后走全量重跑路径。通过 accepted trace/log surface 记录 `silent_degradation`，不询问用户确认：
```bash
node DPT_FRAMEWORK/cli/log-event.mjs --bundle <bundle> --level warn --msg "silent_degradation" --detail '{"kind":"silent_degradation","phase":"rerun","reason":"seed_topics_empty","action":"full_rerun"}'
```

### Stage 2: 对比推断 — 产出 topic 调整方案

将 HITL2 rationale（用户意图）与 seed_topics 现状对比，推演出具体行动。已有 topic 的 `## 本轮重跑方向` section 中 `rerun_count` 不等于 `target_rerun_count` 的视为陈旧——忽略其 action，仅作为历史参考：

| 场景 | action | 含义 |
|------|--------|------|
| 用户对 topic 满意，不需改变 | 无需标记 | 保留已有 topic 和其 ## 本轮重跑方向 section |
| 用户要求在已有 topic 上加新维度/新方向/深挖 | `update_intent` | 保留 UID/id/slug/reference，更新 canonical intent 与方向 guidance |
| 用户要求新增一个之前不存在的 topic | `add_topic` | 先原子提交 registry+seed，再写 ## 本轮重跑方向 section |
| 用户要求 remove/rename/renumber/path move | unsupported C3B | 保留现状并报告 missing capability；禁止直接多文件编辑 |

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

1. **写入 ## 本轮重跑方向 section**：对每个受影响的 topic，在 `seed_topics/{slug}.md` 文件中追加（或更新已有的）`## 本轮重跑方向` section。Section MUST 包含 `rerun_count: <target_rerun_count>`（即 `profile.rerun_count + 1`），绑定方向到即将进入的新轮次：

```markdown
## 本轮重跑方向
- **rerun_count**: <target_rerun_count>
- **action**: supplement
- **new_search_dimensions**: "成本分析"、"就业影响"
- **adjusted_depth**: quick_factual → exploratory_map
- **search_guardrails**: 避开纯理论文献，聚焦实证研究
- **rationale_excerpt**: "加经济影响分析…topic-B 的视角太窄"
```

每个 topic 文件的 `## 本轮重跑方向` section 最多一个——若已存在（上轮 rerun 遗留），用本轮结果**替换**整个 section（不追加）。

1b. **Apply canonical topic change set**：先运行 `operate-topic-state inspect`，再把 HITL2 rationale 转成 retained JSON。Legacy bundle使用完整显式 `migrate_legacy` reconciliation；add/refine使用`add_topic` / `update_intent`；rename/reorder/renumber/safe-remove使用inspect返回的一个完整`mutate_layout` target。用户决定title/order/remove语义；Agent自行处理queued/claimed blocker、重跑同一input、exact recover、named style follow-up与inspect/audit。历史artifact/reference/output path保持原位。Engine验证rerun current-node、route-bound HITL2 witness与incoming status window后提交；不得用direct multi-file edit或`human-directed`绕过。

1c. **重算 research_style_params**：topic_registry 变更后 topic_count 可能变化，必须重算 `wave0_shared_ref_total`（`base + per_topic × topic_count`）。读取当前 `research_profile`，重新运行 apply CLI：

   ```bash
   RESEARCH_PROFILE=$(node -e "const{parse}=require('yaml');const p=parse(require('fs').readFileSync('<bundle>/rb_profile.yaml','utf-8'));console.log(p.research_profile)")
   node DPT_FRAMEWORK/cli/apply-research-style.mjs --bundle <path> --style $RESEARCH_PROFILE
   ```
   
   验证 stdout JSON：`applied` 匹配 `research_profile`，`topic_count` 匹配更新后的 `topic_registry.length`，`wave0_shared_ref_total` 为 `base + per_topic × topic_count`。所有参数写入 `rb_profile.yaml#/research_style_params`（覆盖旧值）。

2. **递增 rerun_count**：
   - 当前值为 N，递增到 target_rerun_count（即 N+1）。
   - 写入 `rb_profile.yaml#/human_decision_checkpoints/hitl2/rerun_count`。
   - **不变量**：完成时 direction.rerun_count == profile.rerun_count == target_rerun_count。崩溃窗口中 direction.rerun_count > profile.rerun_count（方向已写为 target，profile 尚未递增）。

3. **确认 incoming status window**：Gate 前应保持 HITL2→rerun 的 source-gate window：`current_gate: hitl2_recorded` / `next_gate: rerun_ready`。不得在 rerun gate 通过前运行 `advance-status --to rerun_ready`。

4. **运行 gate CLI**：
```bash
node DPT_FRAMEWORK/cli/gates/check-gate-rerun-ready.mjs --bundle <path> --current-node phases/phase-rerun.md
```

5. **Gate pass** → 进入 §6：通过 `enter-phase --node <check.next>` 消费 `phases/phase-seed-topics.md`，再运行 `advance-status --to rerun_ready`
6. **Gate fail** → `no_transition`。Agent MUST 读取 inspect/advice，修复可修复的 bundle/profile 问题后 rerun gate；若 `rerun_count >= 3` 或 rationale 缺失等不可修复条件成立，记录 `silent_unpassable` / `repair_degraded`，保持当前 non-blocked/in-progress holding，不从 stop:no rerun phase 中途向用户提问或汇报。

## 4. Expected Artifacts

- 受影响 seed_topic 文件中的 `## 本轮重跑方向` section 已写入/更新
- `rb_plan.md` canonical registry 与 touched UID-bound current seeds 已由 topic-state apply/recover完整提交；历史 artifact/reference/output path 未移动
- **新增 topic（`action: add`）必须在后续 phase（wave0/wave1/wave2）中遵循完整 `_cache/` 写入约定**：每个 source 写入 `websearch.json` + `page.md` + `meta.json`（11 字段），在 submitted work-unit result 的 `cache_trails[]` 中声明 leaf 路径，确保 gate `cache_coverage` 可溯源。此约定与首次运行的 topic 完全一致。
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

先读取 CLI top-level `hints[]`；`inspect[]` / `advice[]` 只提供 compatible forensic detail，不是 action authority。不得从旧表格、legacy prose、rule target、path shape 或源码补猜 repair kind、permission、字段、命令或路由。按每个 independent primary hint 执行：

1. `repair_kind: agent_action`：当 `write_to` 是已授权的 rerun rationale/profile/bundle mutable surface 时，由 Agent 修复 exact field/file；不得发明 HITL2 rationale、重置 count 或伪造 completed-run structure。
2. `repair_kind: engine_operation`：由 Agent 执行 `write_to` 指向的 existing legal topic-state/status/handoff/recovery operation；不得要求用户运行普通命令，也不得直接编辑 `rb_status.json`、trace、ledger、index、receipt、hash 或 provenance authority。
3. `repair_kind: user_decision`：只暴露 `missing_fact` 指出的真实 HITL2 rationale、rerun-limit或风险决定。Rerun 是 `stop: no`，本 phase 不自行创建新 HITL、repair controller、lifecycle 或回跳路由；没有 accepted decision path 时保持当前 checkpoint failed，不把该 root 静默改写成 final pass。
4. `repair_kind: external_action`：只暴露不可代理的权限/环境前置条件；满足后机械执行回到 Agent。
5. `repair_kind: missing_contract`：报告 exact unavailable capability/contract boundary，不提供 hand-written status/trace、backup path、final shortcut 或平行成功状态。

Hint 不创造 permission、controller、lifecycle 或 route。完成可执行动作后 Agent MUST 运行 hint 的 exact `rerun`，回到同一个 `rerun-ready` checkpoint。Failed result 若没有可用 structured hint，不得从 `inspect[]`/`advice[]` 猜 blocking repair；按 `missing_contract` 暴露最小边界。Diagnostic log MAY记录当前 structured root，但不得替代 repair、Gate verdict 或 legal routing。

## 8. Stop Behavior

`stop: no` — 本 phase 不等待用户输入，不发送 rerun prep progress 或 idle/no-work 汇报。Rerun prep 本地写完后必须运行 `rerun-ready` gate；phase handoff 完成条件是 gate pass + `enter-phase --node <check.next>` 写入 seed-topics route-bound load witness + `advance-status --to rerun_ready`。

Gate fail 时按 structured hint 处理并保持当前 checkpoint failed。`user_decision` / `external_action` / `missing_contract` 只暴露最小边界，不在本 phase 建立新的等待模式或路由；不得自行加载 seed-topics 或 final，所有成功路由必须来自 gate CLI `check.next`。

## 9. Anti-Cheating Rules

- **MUST NOT 删除已有 artifacts**：reference/、artifacts/、seed_topics/ 中的已有文件全部保留
- **MUST NOT direct-edit registry/seed 模拟 mutation**：只用 sanctioned topic-state apply；context/`human-directed` 不绕过 lifecycle authority
- **MUST NOT direct path-move historical outputs**：rename/reorder/renumber/safe-remove只使用existing C3B complete `mutate_layout` target；不得创建parallel addendum namespace
- **MUST NOT 把 `post_final_reentry` 称为gate pass或permission**：它只记录accepted HITL2 rerun semantics并复用本phase现有owners
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
