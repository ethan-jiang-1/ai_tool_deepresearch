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
- **Path to pass**: Inspect canonical topic state, submit retained add/refine/direction-only candidates through the existing topic-state transaction, consume its returned style-projection handoff only when registry length changed, increment `rerun_count`, then run the rerun gate.
- **Completion check**: `check-gate-rerun-ready.mjs` passes for `phases/phase-rerun.md`.
- **Failure posture**: Do not search or rewrite research artifacts here; if rerun is structurally impossible, record the accepted silent degradation/unpassable event and obey gate routing.

## 1. Stage Goal

HITL2 `user_decision: rerun` 后，Agent 用正常 HITL2 gate handoff或唯一accepted `post_final_reentry` exceptional handoff进入本 phase。后者已经记录同一HITL2 rerun decision，不重复询问用户，也不代表post-Final HITL2 gate曾运行。核心工作仍是将 HITL2 rationale（用户意图）与 canonical plan/current seed 现状做**对比推断**，形成 retained topic-state candidate（保留、新增、补充 intent 或补充 direction），由既有 transaction 原子提交；若提交改变 registry length，则先消费其 returned style handoff，随后才递增 rerun_count 并运行同一个 gate。

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
2. 读取 `rerun_count`——若字段缺失则按既有 profile owner 的默认值处理，若已有值则计算 `target_rerun_count = current_rerun_count + 1`。
3. 先运行 `operate-topic-state inspect`。若存在 accepted workspace，只能执行它的 exact `recover`；不存在 accepted workspace 时，旧 matching/stale direction 只是历史/现状事实，不能成为本轮 retained input 或跳过 apply 的收据。
4. 从 canonical `topic_registry` 解析当前 topic，并读取它们 UID-bound current seed 的 frontmatter/body 了解：
   - 每个 topic 的标题、slug、must_answer、hypothesis、search_guardrails
   - 当前深度（quick_factual / exploratory_map / claim_verification）
   - 已有的 `## 本轮重跑方向` section（如有）；旧 section 可以作为上下文，但不能代替本轮 candidate。

**MUST NOT** 通过扫描所有 seed 的方向、空目录或旧 matching section推断本轮是否已提交。缺失 current seed 是 canonical binding/topic-state repair，必须按 Gate hint 使用既有 owner，不得全量重建或直接编辑多个文件。

### Stage 2: 对比推断 — 产出 topic 调整方案

将 HITL2 rationale（用户意图）与 seed_topics 现状对比，推演出具体行动。已有 topic 的 `## 本轮重跑方向` section 中 `rerun_count` 不等于 `target_rerun_count` 的视为陈旧——忽略其 action，仅作为历史参考：

| 场景 | action | 含义 |
|------|--------|------|
| 用户对 topic 满意，不需改变 | 无需标记 | 保留已有 topic 和其 ## 本轮重跑方向 section |
| 用户要求改变已有 topic 的 canonical intent | `update_intent` | 保留 UID/id/slug/reference，在同一 candidate 中更新 intent 与方向 guidance |
| 用户只要求已有 topic 改变搜索/深挖方向 | `set_rerun_direction` | 保持 canonical intent 不变，在同一 candidate 中替换 direction |
| 用户要求新增一个之前不存在的 topic | `add_topic` | 原子提交 registry、canonical skeleton 与 direction |
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

### Stage 3: Candidate Publication & Gate

1. **Apply canonical topic change set**：先运行 `operate-topic-state inspect`，再把 HITL2 rationale 转成 retained JSON. Every sanctioned rerun `add_topic` / `update_intent` carries a direction candidate; a direction-only change uses `set_rerun_direction`. Read `command_playbook/operate-topic-state.md#Rerun Direction Input` for the exact six direction fields and action mapping. Submit it through the existing CLI:

```bash
node DPT_FRAMEWORK/cli/operate-topic-state.mjs apply --bundle <bundle> --input <retained-candidate.json>
```

The Engine validates the route-bound HITL2 witness plus count/action/required fields and atomically stages only the plan plus explicitly touched current seed bytes. Legacy bundle使用完整显式 `migrate_legacy` reconciliation；rename/reorder/renumber/safe-remove使用inspect返回的一个完整`mutate_layout` target。用户决定title/order/remove语义；Agent自行处理queued/claimed blocker、重跑同一input、exact recover、returned style handoff与inspect/audit。历史artifact/reference/output path保持原位。不得用direct multi-file edit或`human-directed`绕过；也不得 direct-edit seed direction 或 registry。

1c. **只消费 returned style handoff**：读取 committed apply/recover JSON。

   - 仅当结果含 `style_projection.status: refresh_required` 时，在递增 `rerun_count` 前原样执行它的 `command`。该 exact `apply-research-style.mjs` command 已绑定 selected profile 与 committed topic count；Agent 不得重新解析 `rb_profile.yaml`、计算参数或拼出第二个命令。
   - 读 style CLI stdout，确认 `applied` 与 handoff 的 `selected_profile` 一致，`topic_count` 与 `committed_topic_count` 一致。CLI 是 `research_style_params` 唯一 writer。
   - 没有 `style_projection` 的 no-length-change commit 不启动 style CLI，也不读取 profile 来决定是否启动。`profile_unavailable` 不是 direct-edit profile 的理由；保留给既有 profile prerequisite/Gate feedback。
   - 若此前一个合法 handoff 未完成，`rerun-ready` 的单一 `style_projection_freshness` root 会返回同一个 writer 与同一 Gate rerun；不得以无条件 style apply 绕开它。

   对 C5 的 accepted event-bound style/count 行为保持不变：在 count increment 前已经写出的 exact current projection 是可恢复的既有形状，不增加新的 stage、writer 或 event mutation。

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
6. **Gate fail** → `no_transition`。Agent MUST 读取 direct hints 与 compatible inspect/advice，修复可修复的 bundle/profile 问题后 rerun gate；若 active rule reports exhaustion，或 rationale 缺失等条件在现有 legal path 下仍不可修复，记录 `silent_unpassable` / `repair_degraded`，保持当前 non-blocked/in-progress holding，不从 stop:no rerun phase 中途向用户提问或汇报。

## 4. Expected Artifacts

- 受影响 seed_topic 文件中的 `## 本轮重跑方向` section 已随 topic-state apply/recover 原子写入/更新
- `rb_plan.md` canonical registry 与 touched UID-bound current seeds 已由 topic-state apply/recover完整提交；历史 artifact/reference/output path 未移动
- **新增 topic（`action: add`）必须在后续 phase（wave0/wave1/wave2）中遵循完整 `_cache/` 写入约定**：每个 source 写入 `websearch.json` + `page.md` + `meta.json`（11 字段），在 submitted work-unit result 的 `cache_trails[]` 中声明 leaf 路径，确保 gate `cache_coverage` 可溯源。此约定与首次运行的 topic 完全一致。
- 仅当 committed result 返回 `style_projection.status: refresh_required` 时，`rb_profile.yaml#/research_style_params` 已由 handoff 的既有 CLI 更新到当前 `topic_count`；无 length change 时该字段不因本 phase 重写
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

先读取 CLI top-level `hints[]`；`inspect[]` / `advice[]` 只提供 compatible forensic detail，不是 action authority。不得从旧表格、legacy prose、rule target、path shape 或源码补猜 repair kind、permission、字段、命令或路由。`repair_kind` 只分配责任，当前 loaded node 的 `stop` 才决定 interaction placement；本 phase 为 `stop: no`，任何分类都不得主动发起提问、状态/进度、approval、acknowledgement 或等待。用户主动的 current turn 可从 direct facts 得到直接回答，但回答不创建 checkpoint、state、permission、route、mutation 或 reentry authority。按每个 independent primary hint 执行：

1. `repair_kind: agent_action`：当 `write_to` 是已授权的 rerun rationale/profile/bundle mutable surface 时，由 Agent 修复 exact field/file；不得发明 HITL2 rationale、重置 count 或伪造 completed-run structure。
2. `repair_kind: engine_operation`：由 Agent 执行 `write_to` 指向的 existing legal topic-state/status/handoff/recovery operation；不得要求用户运行普通命令，也不得直接编辑 `rb_status.json`、trace、ledger、index、receipt、hash 或 provenance authority。
3. `repair_kind: user_decision`：识别 `missing_fact` 指出的真实 HITL2 rationale、active-rule exhaustion 或风险决定。Rerun 是 `stop: no`，本 phase 不自行创建新 HITL、repair controller、lifecycle 或回跳路由；没有 accepted decision path 时保持当前 checkpoint failed，不把该 root 静默改写成 final pass。
4. `repair_kind: external_action`：识别不可代理的权限/环境前置条件；不主动请求 acknowledgement，满足后机械执行回到 Agent。
5. `repair_kind: missing_contract`：保留 exact unavailable capability/contract boundary，不提供 hand-written status/trace、用户等待、backup path、final shortcut 或平行成功状态。

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
- **MUST NOT 在无 rationale 或 rationale 为空时写 ## 本轮重跑方向**：方向 hints 必须来自用户明确的意图
- **MUST NOT direct-edit seed direction，或以 all-seed scan / old matching section 跳过 retained candidate 与 apply**：只允许 existing accepted workspace 的 exact recover
- **MUST NOT 重新解析 profile 或无条件启动 style CLI**：只在 committed result 的 `style_projection.command` 存在且要求 refresh 时、并且在 count increment 前执行它
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
