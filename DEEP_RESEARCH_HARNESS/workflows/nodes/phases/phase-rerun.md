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
- **Start here**: Read the route-bound HITL2 rationale, inspect/recover canonical topic state until no accepted workspace remains, then read current `rerun_count`, `rb_plan.md`, current seed topic files, and `topic_registry`.
- **Path to pass**: Materialize or reuse one complete target-round intent revision in `rb_plan.md## Decisions`, re-read the plan, run a fresh topic-state inspect, submit retained add/refine/direction-only candidates through the existing topic-state transaction, consume its returned style-projection handoff only when registry length changed, increment `rerun_count`, then run the rerun gate.
- **Completion check**: `check-gate-rerun-ready.mjs` passes for `phases/phase-rerun.md`.
- **Failure posture**: Do not search or rewrite research artifacts here; if rerun is structurally impossible, record the accepted silent degradation/unpassable event and obey gate routing.

## 1. Stage Goal

HITL2 `user_decision: rerun` 后，Agent 用正常 HITL2 gate handoff或唯一accepted `post_final_reentry` exceptional handoff进入本 phase。后者已经记录同一HITL2 rerun decision，不重复询问用户，也不代表post-Final HITL2 gate曾运行。核心工作仍是将 HITL2 rationale（用户意图）与 canonical plan/current seed 现状做**对比推断**，形成 retained topic-state candidate（保留、新增、补充 intent 或补充 direction），由既有 transaction 原子提交；若提交改变 registry length，则先消费其 returned style handoff，随后才递增 rerun_count 并运行同一个 gate。

本 phase 是分析层——不做搜索、不写 reference、不动 artifacts。只做对比分析和方向标记。后续 Wave materialization 写新 reference 时仍采用 shared template 的 current UID forms（Wave0 `all`、Wave1 scalar UID、Wave2 exact UID subset）；本 phase 不创建 legacy `related_topic` writer fallback。

## 2. Required Inputs

- `rb_profile.yaml#/human_decision_checkpoints/hitl2/rationale`（用户 rerun 意图）
- `rb_profile.yaml#/human_decision_checkpoints/hitl2/rerun_count`（当前 rerun 轮次）
- `rb_plan.md## Constraints > ### User Research Controls`（HITL1 及既有 bounded source-access alignment 完成后的 immutable baseline，如存在）
- `rb_plan.md## Decisions`（post-HITL1 accepted rerun revision history；普通恢复只读 newest complete matching revision，不合并旧 delta）
- `seed_topics/` 目录（已有 topic 文件清单及其内容——深度、must_answer、search_guardrails）
- `rb_plan.md` frontmatter 的 `topic_registry`（topic 集合的 source of truth）
- `shared-profile.md`（rerun_count 字段文档）

## 3. Allowed Actions — 三阶段智力工作

### Stage 1: 读输入

1. 读取 route-bound HITL2 rationale——理解用户想要什么改变（"加经济影响分析"、"去掉不可靠的来源维度"等）。若 rationale 含 `用户的重点原话（逐字保留）` 与 `Agent 对本轮额外研究方向的理解（可由用户修正）`，它们共同说明本轮新的或修订的 focus increment：原话保留用户语义，理解只提供当前可读 direction，不是 parser、profile/Topic field、Gate input 或新的 mutation authority。
2. 在改动任何 plan bytes 前运行 `operate-topic-state inspect`。若存在 accepted workspace，只能执行 inspect 返回的 exact `recover`，committed recover 后必须重新 inspect；重复此过程，直到当前 inspect 明确没有 accepted workspace。workspace 拥有 recovery 时，不得写/修 Decisions、提交新语义或创建平行恢复路径。
3. 无 accepted workspace 后读取 `rerun_count`——若字段缺失则按既有 profile owner 的默认值处理，若已有值则计算 `target_rerun_count = current_rerun_count + 1`。
4. 读取当前 `rb_plan.md`。`### User Research Controls` 是 immutable HITL1 baseline；`## Decisions` 中 complete revisions newest-first。对于 current intent，只组合 baseline 与 newest complete matching revision 的 cumulative active amendments；older revisions 只保留历史，不得重新 union 被替换/撤回的要求。legacy bundle 没有 revision 时沿用现有 profile/direction compatibility，不从 chat、文件名或旧 artifact 反推历史。
5. 从 canonical `topic_registry` 解析当前 topic，并读取它们 UID-bound current seed 的 frontmatter/body 了解：
   - 每个 topic 的标题、slug、must_answer、hypothesis、search_guardrails
   - 当前深度（quick_factual / exploratory_map / claim_verification）
   - 已有的 `## 本轮重跑方向` section（如有）；旧 section 可以作为上下文，但不能代替本轮 candidate。

**MUST NOT** 通过扫描所有 seed 的方向、空目录或旧 matching section推断本轮是否已提交。缺失 current seed 是 canonical binding/topic-state repair，必须按 Gate hint 使用既有 owner，不得全量重建或直接编辑多个文件。

### Stage 1.5: 持久化 target-round intent revision

在任何 topic-state candidate 产生前，将已经合法接纳的本轮 rationale 写成或复用 `rb_plan.md## Decisions` 顶部唯一一条 complete target-round revision。每条 revision 使用下面七个固定、Agent-readable labels：

```markdown
### Rerun intent revision: <target_rerun_count>

- Target rerun count: <N>
- This-round delta: <added / changed / withdrawn, or none>
- Affected canonical Topics: <UID + title, explicit proposed title, or none>
- Superseded or withdrawn requirements: <bounded items, or none>
- Accepted Agent interpretation: <bounded current interpretation, or none>
- Current active amendments relative to HITL1 baseline: <complete cumulative set, or none>
- Accepted user wording:
  > <each accepted non-empty line is prefixed with `> `>
  >
  > <each accepted empty line is retained as `>`>
```

前六个 label/value 必须各占一个 bounded bullet line，空集合显式写 `none`；只有 `Accepted user wording` 可以 multiline。用户原话的每一行都必须留在该 label 下的 blockquote：非空行写 `> `，空行写 `>`。原话里的 `## Progress`、`## Decisions`、`### Rerun intent revision`、checkbox-looking 行或其他 Markdown structure 因此只能是 quoted content，不能成为 host-file section、progress item 或 revision entry。只保留与本轮 accepted research change 直接相关的 wording，不复制整段对话。

`This-round delta` 记录这一轮新增、加强、替换或撤回了什么；`Current active amendments relative to HITL1 baseline` 必须写相对 baseline 的完整当前累计集合，而不是只写 delta。normal recovery 以 baseline + newest complete matching revision 为停止点，不 replay 或 merge older deltas。revision prose 不授予 route、mutation、permission、coverage 或 Gate authority，Engine 不解析 label、blockquote 或语义等价性。

按 target count 与 accepted rationale 执行幂等处理：

- 同 target、同 accepted meaning 的一条 complete revision：原样 reuse，不追加 duplicate；
- interrupted incomplete target draft：只在确认无 accepted topic-state workspace 后补齐，补齐前不得构造 candidate；
- 同 target 出现两个 complete duplicate/conflicting entries：保留原 bytes，停止在 plan ambiguity，不按文件顺序选 winner，不 apply topic state，也不递增 profile；
- complete older revisions：永不修改、重排或用当前内容重写。

写入、补齐或 reuse 后，必须重新读取 `rb_plan.md` 并确认 current entry complete、newest、target-matching。随后再次运行 fresh `operate-topic-state inspect`；Stage 2/3 的 retained candidate 必须基于这个已经包含 current revision 的 post-revision plan baseline。若 fresh inspect 暴露 workspace 或其他 owner boundary，先按其既有 exact operation 处理并回到本顺序，不得在 workspace 存在时继续改 plan。

### Stage 2: 对比推断 — 产出 topic 调整方案

将同一 accepted rationale、current revision 与 seed_topics 现状对比，推演出具体行动。接受的 focus 只影响受影响 Topic 的本轮 candidate：把新的 search dimensions、调整深度、guardrails 和 rationale excerpt（既有字段 `rationale_excerpt`）写入既有 `## 本轮重跑方向` guidance。每个 excerpt 只解释该 Topic 为什么受 current revision 影响；不同 Topic 可以不同，不得复制完整 user wording，也不要求跨 Topic 相同。已有 topic 的 `## 本轮重跑方向` section 中 `rerun_count` 不等于 `target_rerun_count` 的视为陈旧——忽略其 action，仅作为历史参考；旧 direction、submitted evidence、artifacts、reference paths 与 output history 不得被描述为新 focus work 或满足新的/修订 focus。

| 场景 | action | 含义 |
|------|--------|------|
| 用户对 topic 满意，不需改变 | 无需标记 | 保留已有 topic 和其 ## 本轮重跑方向 section |
| 用户要求改变已有 topic 的 canonical intent | `update_intent` | 保留 UID/id/slug/reference，在同一 candidate 中更新 intent 与方向 guidance |
| 用户只要求已有 topic 改变搜索/深挖方向 | `set_rerun_direction` | 保持 canonical intent 不变，在同一 candidate 中替换 direction |
| 用户要求新增一个之前不存在的 topic | `add_topic` | 原子提交 registry、canonical skeleton 与 direction |
| 用户要求 remove/rename/renumber/path move | `mutate_layout`（rename/reorder/renumber/safe-remove）+ 新 bundle（已研究 topic 剔除） | rename/reorder/renumber 走完整 `mutate_layout` target；safe-remove 仅限无依赖、无历史 topic；已研究 topic 的剔除 = 起新 bundle（不原地 retire）；path move 不支持（历史路径原位）；禁止直接多文件编辑 |

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

1. **Apply canonical topic change set**：使用 Stage 1.5 的 post-revision fresh inspect 与同一 accepted rationale/current revision 形成 retained JSON，不得再以 pre-revision plan bytes 构造 candidate。Every sanctioned rerun `add_topic` / `update_intent` carries a direction candidate; a direction-only change uses `set_rerun_direction`. Read `command_playbook/operate-topic-state.md#Rerun Direction Input` for the exact six direction fields and action mapping. `mutate_layout` 使用这次 fresh inspect 的 `expected_plan_sha256`；其他 action 继续由 existing apply 读取 current plan/prepared manifest 绑定。Submit it through the existing CLI:

```bash
node DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs apply --bundle <bundle> --input <retained-candidate.json>
```

The Engine validates the route-bound HITL2 witness plus count/action/required fields and atomically stages only the plan plus explicitly touched current seed bytes. A plan that fails the current canonical contract stops at the returned plan/topic-state boundary; it has no migration, adoption, upgrade, or direct conversion form. Canonical `previous_layouts[]` remains current lineage for prior coordinates, not a historical mutable-plan compatibility path. Rename/reorder/renumber/safe-remove使用inspect返回的一个完整`mutate_layout` target。用户决定title/order/remove语义；Agent自行处理queued/claimed blocker、重跑同一input、exact recover、returned style handoff与inspect/audit。历史artifact/reference/output path保持原位。不得用direct multi-file edit或`human-directed`绕过；也不得 direct-edit seed direction 或 registry。

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
node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-rerun-ready.mjs --bundle <path> --current-node phases/phase-rerun.md
```

5. **Gate pass** → 进入 §6：通过 `enter-phase --node <check.next>` 消费 `phases/phase-seed-topics.md`，再运行 `advance-status --to rerun_ready`
6. **Gate fail** → `no_transition`。Agent MUST 读取 direct hints 与 compatible inspect/advice，修复可修复的 bundle/profile 问题后 rerun gate；若 active rule reports exhaustion，或 rationale 缺失等条件在现有 legal path 下仍不可修复，记录 `silent_unpassable` / `repair_degraded`，保持当前 non-blocked/in-progress holding，不从 stop:no rerun phase 中途向用户提问或汇报。

## 4. Expected Artifacts

- 受影响 seed_topic 文件中的 `## 本轮重跑方向` section 已随 topic-state apply/recover 原子写入/更新
- `rb_plan.md## Constraints > ### User Research Controls` baseline 未重写；`## Decisions` 顶部有唯一 complete target-round revision，older complete revisions byte content 保持不变
- `rb_plan.md` canonical registry 与 touched UID-bound current seeds 已由 topic-state apply/recover完整提交；历史 artifact/reference/output path 未移动
- **新增 topic（`action: add`）必须在后续 phase（wave0/wave1/wave2）中遵循完整 `_cache/` 写入约定**：每个 source 写入 `websearch.json` + `page.md` + `meta.json`（11 字段），在 submitted work-unit result 的 `cache_trails[]` 中声明 leaf 路径，确保 gate `cache_coverage` 可溯源。此约定与首次运行的 topic 完全一致。
- 仅当 committed result 返回 `style_projection.status: refresh_required` 时，`rb_profile.yaml#/research_style_params` 已由 handoff 的既有 CLI 更新到当前 `topic_count`；无 length change 时该字段不因本 phase 重写
- `rb_profile.yaml#/human_decision_checkpoints/hitl2/rerun_count` 已递增
- Gate 前 status window 为 `current_gate: hitl2_recorded` / `next_gate: rerun_ready`。Rerun gate pass 后，§6 的 `advance-status --to rerun_ready` 才会写入 `current_gate: rerun_ready` / `next_gate: seed_topics_ready`。
- `rb_trace.jsonl` 中有 `gate_attempt` event（由 gate CLI 写入）和 `rerun_ready` event：
  ```bash
  node DEEP_RESEARCH_HARNESS/cli/log-event.mjs --bundle <path> --event rerun_ready
  ```

## 5. Gate Command

```bash
node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-rerun-ready.mjs --bundle <path> --current-node phases/phase-rerun.md --attempt <N>
```

Retry 时传 Agent-reported `--attempt N`（N 从 1 开始，每次 rerun 递增）。若 gate 返回 `step_back: true`，暂停并重新阅读本 phase instructions §0 和 §5。Rerun-ready gate fail 是结构性 fail——不可通过 re-fill loop 修复，按 §7 表处理。

## 6. On Gate Pass

读取 gate CLI JSON output，确认 `check.passed === true`，然后读取 `check.next`（应为 `phases/phase-seed-topics.md`）。先消费 handoff，再同步 source gate status：

```bash
node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle <path> --node <check.next>
node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle <path> --to rerun_ready
```

从 `enter-phase` 渲染出的 seed-topics Markdown 继续执行下一 phase；下游 phase 读取 `rerun_count > 0` + `## 本轮重跑方向` section，以 delta 模式运行。

## 7. On Gate Fail

先读取 CLI top-level `hints[]`；`inspect[]` / `advice[]` 只提供 compatible forensic detail，不是 action authority。反馈读取与互动放置的完整契约（`repair_kind` 只分配责任、当前 loaded node 的 `stop` 才决定 interaction placement、`stop: no` 不得主动发起提问/状态/approval/acknowledgement、current turn 回答不创建 checkpoint）见 `shared/shared-silent-execution.md` 与引擎注入的 AUTONOMOUS header。不得从旧表格、legacy prose、rule target、path shape 或源码补猜 repair kind、permission、字段、命令或路由。按每个 independent primary hint 执行：

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

通用 anti-cheating 禁令见 `shared/shared-anti-cheating-rules.md`（已在 requires）；本 phase 特有条目如下（与 §3 重复的 MUST NOT 删除 artifacts / direct-edit registry/seed / 重新解析 profile / 绕过 handoff 加载 seed-topics 已并入 §3）：

- **MUST NOT direct path-move historical outputs**：rename/reorder/renumber/safe-remove只使用existing C3B complete `mutate_layout` target；不得创建parallel addendum namespace
- **MUST NOT 把 `post_final_reentry` 称为gate pass或permission**：它只记录accepted HITL2 rerun semantics并复用本phase现有owners
- **MUST 读当前 rerun_count 后再递增**：若字段缺失则初始化为 1，若已有值则 +1。MUST NOT 直接覆盖为固定值
- **MUST NOT 在无 rationale 或 rationale 为空时写 ## 本轮重跑方向**：方向 hints 必须来自用户明确的意图
- **MUST NOT direct-edit seed direction，或以 all-seed scan / old matching section 跳过 retained candidate 与 apply**：只允许 existing accepted workspace 的 exact recover
- **MUST NOT 在 accepted topic-state workspace 存在时写/修 Decisions**：先 exact recover 并 re-inspect until clear；revision durable 后必须 re-read plan 与 fresh inspect 才能构造 candidate
- **MUST NOT merge older revision deltas into current intent**：current set 只来自 HITL1 baseline + newest complete matching cumulative revision；presentation-only feedback 与 unaccepted draft 不进入 Decisions

## Log

记录命令: `node DEEP_RESEARCH_HARNESS/cli/log-event.mjs --bundle <bundle> --level <LEVEL> --msg "<message>" --detail '<json>'`

| 时机 | 命令 |
|------|------|
| Phase 开始 | `node DEEP_RESEARCH_HARNESS/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:rerun START"` |
| Phase 结束 | `node DEEP_RESEARCH_HARNESS/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:rerun END — <summary>"` |
| Gate fail (terminal) | `node DEEP_RESEARCH_HARNESS/cli/log-event.mjs --bundle <bundle> --level warn --msg "repair_escalated" --detail '{"kind":"repair_escalated","phase":"rerun","gate":"rerun-ready","reason":"<reason>"}'` |
| 降级处理 | `node DEEP_RESEARCH_HARNESS/cli/log-event.mjs --bundle <bundle> --level warn --msg "repair_degraded" --detail '{"kind":"repair_degraded","phase":"rerun","gate":"rerun-ready","reason":"<reason>"}'` |

> rerun-ready gate fail 后不会进入 repair loop（termial gate），但 MUST 在退出前记录 `repair_escalated` 或 `repair_degraded` 解释为何停止。
