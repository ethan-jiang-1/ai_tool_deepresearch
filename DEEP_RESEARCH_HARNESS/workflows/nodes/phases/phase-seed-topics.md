---
node_type: phase
id: phase-seed-topics
phase: seed-topics
gate: seed-topics-ready
stop: "no"
execution_contract:
  surface: phase-agent
  search_policy: no_search
requires:
  - shared/shared-profile
  - shared/shared-schemas
  - shared/shared-silent-execution
  - shared/shared-return-map-authoring
  - templates/seed-topic-template
suggested_context:
  - shared/shared-anti-cheating-rules
---

# Phase: Seed Topics Materialization

## 0. Execution Brief

- **Objective**: Verify and enrich committed UID-bound seed projections into search-relevant decision documents.
- **Start here**: Read canonical `rb_plan.md` `topic_registry`, the `## Constraints > ### User Research Controls` baseline when present, and the newest complete `## Decisions` revision matching the current rerun count when present; then read existing UID-bound `seed_topics/`, `rb_profile.yaml`, and the queue CLI state.
- **Path to pass**: Verify exact UID/slug/intent binding, enqueue only required enrichment work, drain the queue, repair from the canonical owner, then run the seed-topics gate.
- **Completion check**: `check-gate-seed-topics-ready.mjs` passes for `phases/phase-seed-topics.md`.
- **Failure posture**: Treat empty/thin queue as work routing, then consume top-level Gate `hints[]`; execute legal mechanical repair and never invent missing Topic semantics.

## 1. Stage Goal

Canonical new runs arrive with `topic_registry` and one UID-bound `seed_topics/{slug}.md` skeleton already committed together by HITL1 topic-state apply. 本 phase 验证并丰富 projection，不再是 approved intent 的首次 durable writer。A plan that fails the current canonical contract stops at its existing plan/topic-state prerequisite; seed filename or prose never supplies UID, new-topic, mutation, migration, adoption, or upgrade authority.

每个 topic 一个 `{slug}.md`（文件名 = `topic.slug` + `.md`）。`slug` 为 `NN_` 编号前缀 + 描述性短名。Canonical frontmatter carries topic_uid/id/slug/title/must_answer/scope_role/depends_on_topic_uids plus Agent-facing enrichment fields。

**`seed-topics-ready` 是结构+数量+一致性 gate，不是 topic 语义质量 gate。** 语义质量（topic 是否覆盖关键维度、是否与 research question 对齐）由 HITL1 阶段人类审查（`stop: yes`）负责。

## 2. Required Inputs

- 已通过 `setup-ready` gate 的 current run bundle
- `rb_plan.md` frontmatter 的 `topic_registry`（topic 集合的 source of truth）
- `rb_profile.yaml` 的 `root_must_answer_set` 和 `research_profile`（topic 派生的上游约束）
- controls present 时 `rb_plan.md## Constraints > User Research Controls`（唯一原文坐标，不是 machine authority）
- current-contract rerun 时 `rb_plan.md## Decisions` 中 newest complete revision whose target count matches current profile `rerun_count`（当前 cumulative amendments；older revisions 只作历史）
- `shared-schemas.md`（schema、trace、seed_topics/ 目录结构）
- `DEEP_RESEARCH_HARNESS/cli/operate-queue.mjs`（Agentic Queue CLI — 灌料、claim、complete 的入口）

## 3. Allowed Actions — Queue-Driven 三阶段

`root_must_answer_set` 只包含 HITL1 已接受的具体问题。Seed Topics 直接把这些问题分解为 topic intent 与现有 queue/task work；不得通过“不确定”等文本模式推断隐藏状态。当前研究意图由 HITL1 controls baseline 与 newest complete matching Decisions revision 的 cumulative amendments（如有）组成；older revision、stale/future/invalid direction、profile prose、chat 或 filename 不得重新激活已替换/撤回的要求。legacy bundle 没有 revision 时保留现有读取路径，不反推或补写历史。

Seed-topics 使用 Agentic Queue 驱动 topic 物化。每个 topic 一个 task，由 Phase Agent 直接执行（当前 wire value 为 `main-agent`；无外部 search，从 topic_registry 的结构化定义写为文件）。seed topic 文件 **不是笼统的标签**——它必须是能驱动后续 search 的决策级文件。

### 3.1 灌料 (Filling) — 首次进入 seed-topics

如果 queue 为空（`operate-queue check <bundle>` 返回 `queue_health` 为 thin/blocked 或 active_window 为空）：

1. 先运行 `operate-topic-state inspect`。Canonical mode 验证 registry 与 seed 的 UID/slug/intent exact binding；accepted workspace 先 explicit recover
2. 读取 `rb_plan.md` frontmatter 的 `topic_registry`，并从 baseline + newest complete matching revision 识别哪些 current controls/amendments 对每个 Topic 有实际影响，确定需要 enrichment 的 topic 集合
3. 为需要 enrichment 的 topic 生成一个 task card JSON 文件，然后 enqueue：

> **注意**：文件名直接使用 `{topic.slug}.md`（`slug` 含 `NN_` 编号前缀，如 `01_meal-timing-...`——`NN` 取自 topic_registry 数组 1-based 位置）。不需二次拼接 index。

**Task card JSON 模板（写入临时文件如 `/tmp/wfq-seed-{topic.slug}.json`）：**

```json
{
  "queue_item_id": "seed-topic-{topic.slug}",
  "title": "Materialize seed topic: {topic.title}",
  "targets": { "controller": "main-agent" },
  "action": "只编辑 seed_topics/{topic.slug}.md 的 <!-- seed-initialization:start --> 与 <!-- seed-initialization:end --> 之间的 Agent-owned Markdown body，并保留一个 complete enrich_seed input。该 input 只含 exact topic_uid 和 hypothesis/in_scope/out_of_scope/search_guardrails/evidence_route；当 current controls/amendments 实际影响此 Topic 时，把最小 topic-local interpretation 优先写入 search_guardrails/evidence_route，仅在必要时调整 hypothesis/in_scope，并在 initialization body 说明 research/delivery relevance。完整用户 wording 留在 rb_plan.md source coordinate；不适用时不写 decorative projection，信息不足时保留既有 explicit non-empty gap。通过 operate-topic-state apply 写入 frontmatter，再完成此 queue card。不得手写 canonical YAML、越过 end marker 编辑 appendix，或在 body 重复 must_answer、scope、evidence route。",
  "producer_rule": "seed_topic_materialize",
  "lineage": {"topic_slug": "{topic.slug}", "phase": "seed-topics"},
  "priority_class": "P3_current_gate_gap",
  "required_receipts": ["file:seed_topics/{topic.slug}.md"],
  "done_condition": "topic-state apply 已为 exact UID 写入 complete structured enrichment；seed body 只有一个 bounded seed-initialization region（主题定位/初始假设/why now/交付价值/下游位置），end marker 后保留 Engine-owned 轮次追加区占位；随后同一 queue completion 通过 shared evaluator。",
  "verification": {"engine": ["receipt_check"], "agent": ["frontmatter_completeness", "slug_consistency", "content_has_all_sections"]},
  "writes_to": ["seed_topics/{topic.slug}.md"],
  "status_sync": ["seed_topics_materialized"],
  "completion_receipt": "file:seed_topics/{topic.slug}.md",
  "failure_route": "queue_repair",
  "payload": {"topic_slug": "{topic.slug}", "topic_title": "{topic.title}"}
}
```

3. Enqueue 每个 task card：
```bash
node DEEP_RESEARCH_HARNESS/cli/operate-queue.mjs enqueue <bundle> --task /tmp/wfq-seed-{topic.slug}.json
```

4. 全部 topic 灌入后验证：
```bash
node DEEP_RESEARCH_HARNESS/cli/operate-queue.mjs check <bundle>
```

**Seed Topic 文件结构：** 文件名必须是 canonical `topic.slug + .md`；gate 校验 `filename_stem == registry_slug == frontmatter_slug`。Engine 是 canonical frontmatter 的唯一 writer；Agent 正常只编辑 stable start/end markers 之间的 initialization body，并提交完整 structured enrichment input。

已加载的 `templates/seed-topic-template` 定义完整初始化 skeleton、Appendix Slot、只读回填卡和 rendered entry shape。不要在本 phase 重写该模板。Projection Packet、repair map 与 rerun direction 是 `command_playbook/operate-topic-state.md` 的操作协议。Seed Topics 只在 start/end markers 内 materialize/enrich initialization area；research-round appendix 保持预埋，后续 Wave 只能按 command playbook 通过 retained packet 和 `operate-topic-state apply` materialize 其 owned slot，绝不手改 token、heading 或 end marker 之后的 bytes。

controls 或 current amendment 对单一 Topic 有实际影响时，Seed 必须将最小 topic-local operational interpretation 优先投影为 `search_guardrails` / `evidence_route`，必要时才补充 `hypothesis` / `in_scope`，并在 existing initialization body 中说明该 Topic 的 research/delivery relevance。完整 controls/revision wording 只留在 `rb_plan.md` source coordinate，不复制到 Seed；不适用的 Topic 保持正常 enrichment，不创建空或 decorative projection。若 `rb_plan.md` 和 `rb_profile.yaml` 中不足以填充初始化字段，记录 existing explicit non-empty `pending` gap，不要编造。该 projection 不改变 canonical Topic identity，不增加 frontmatter field，不预写未来 Wave task brief，也不是 permission、coverage、Gate 或 Engine verdict。

### 3.2 Queue-Driven 执行循环

```
┌─────────────────────────────────────────────────────────────────────┐
│                     QUEUE-DRIVEN EXECUTION LOOP                      │
│                                                                      │
│  ┌─ 1. claim ──────────────────────────────────────────────────────┐│
│  │   operate-queue claim <bundle> --actor main-agent               ││
│  │   → stdout JSON: { item: {...task card...}, ... }                ││
│  │   → item 为 null → queue 空 → 跳到 §3.3                          ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                       │
│                              ▼                                       │
│  ┌─ 2. execute ────────────────────────────────────────────────────┐│
│  │   targets.controller = main-agent（当前 wire value；seed topic     ││
│  │   物化不涉及搜索，Phase Agent 只编辑 marker-bounded initialization）││
│  │   a. 读取 task.payload.topic_slug                                 ││
│  │   b. 在 start/end markers 内编辑 body，并形成 complete retained   ││
│  │      enrich_seed input                                            ││
│  │   c. node operate-topic-state.mjs apply --bundle <bundle>        ││
│  │      --input <retained-enrich-seed.json>                         ││
│  │   d. apply 的 exact syntax root 才可修 frontmatter，随后重跑 apply││
│  │   e. 缺失信息标注为 gap（不编造）                                ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                       │
│                              ▼                                       │
│  ┌─ 3. complete ───────────────────────────────────────────────────┐│
│  │   a. 创建 result JSON → /tmp/wfq-seed-result-{queue_item_id}.json:││
│  │      { "queue_item_id": "...",                                   ││
│  │        "receipt": "file:seed_topics/{topic.slug}.md",             ││
│  │        "summary": "materialized seed topic {topic.slug}",         ││
│  │        "writes": ["seed_topics/{topic.slug}.md"] }                ││
│  │   b. 运行:                                                       ││
│  │      operate-queue complete <bundle> --result <result.json>      ││
│  │   → receipt check PASS → promote → refill → render               ││
│  │   → receipt check FAIL → engine 自动生成 repair task             ││
│  │       → 读 inspect/advice → 修复 → 回到 claim                    ││
│  └─────────────────────────────────────────────────────────────────┘│
│                              │                                       │
│                              ▼                                       │
│  ┌─ 4. 读投影 → 回到 step 1 ───────────────────────────────────────┐│
│  │   cat <bundle>/_cache/agentic-queue/current-task.md              ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

**执行约束：**
- **不跳过 task**：只要 claim 返回了 task card，就执行+complete
- **不编造信息**：enrichment 如果上游（topic_registry / profile）未提供，标注为显式 gap；`must_answer` 永远由 Engine 从 registry copy，不编造
- **complete 阻塞**：receipt check 失败 → engine 生成 repair → 修复 → re-claim
- **seed topic 不是 chapter label**：每个 seed topic 必须包含足够的 search-relevant 约束（search_guardrails + evidence_route），否则 wave0 sub-agent 无法做定向搜索

### 3.3 Queue 空后 — 收尾与 Gate

#### Transition trigger

当 `operate-queue claim <bundle> ...` 返回 `item: null` 时，表示 active queue 已被 drain。Agent 应进入本节的 closeout/gate 流程，不得因为没有新 task 就自行发明 work item。

当 claim 返回 `item: null`（queue 空）时：

1. 跑 gate：
```bash
node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-seed-topics-ready.mjs --bundle <path> --current-node phases/phase-seed-topics.md
```
2. gate pass → 进入 §6：通过 `enter-phase --node <check.next>` 消费 `phase-wave0.md`，再同步 `seed_topics_ready`
3. gate fail → 按 §7 On Gate Fail 处理

## 4. Expected Artifacts

- `seed_topics/` 目录非空，其中对于 `topic_registry` 中的每个 topic 存在一个 `{slug}.md` 文件（slug 已含编号前缀）
- 每个文件的 frontmatter `slug` 与文件名 stem 一致，`title` 非空
- `seed_topics/` 下文件 slug 集合与 `topic_registry` slug 集合双向一致（无缺失、无多余）
- `rb_trace.jsonl` 中有 `seed_topics_completion` event（通过 CLI 写入）：
  ```bash
  node DEEP_RESEARCH_HARNESS/cli/log-event.mjs --bundle <path> --event seed_topics_completion --detail '{"topic_count":<N>}'
  ```
- Gate 前 status window 为 `current_gate: setup_ready` / `next_gate: seed_topics_ready`（首次运行）或 `current_gate: rerun_ready` / `next_gate: seed_topics_ready`（rerun 回流）。Seed-topics gate pass 后，§6 的 `advance-status --to seed_topics_ready` 才会写入 `current_gate: seed_topics_ready` / `next_gate: wave0_complete`。

## 5. Gate Command

```bash
node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-seed-topics-ready.mjs --bundle <path> --current-node phases/phase-seed-topics.md
```

## 6. On Gate Pass

读取 gate CLI JSON output，确认 `check.passed === true`，然后读取 `check.next`（应为 `phases/phase-wave0.md`）。先消费 handoff，再同步 source gate status：

```bash
node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle <path> --node <check.next>
node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle <path> --to seed_topics_ready
```

从 `enter-phase` 渲染出的 wave0 Markdown 继续执行下一 phase。`advance-status` 只同步 just-passed source gate；它不是加载或执行下一 phase 的动作。

## 7. On Gate Fail

先读取 CLI top-level `hints[]`；`inspect[]` / `advice[]` 只提供 compatible forensic detail，不是 action authority。反馈读取与互动放置的完整契约（`repair_kind` 只分配责任、当前 loaded node 的 `stop` 才决定 interaction placement、`stop: no` 不得主动发起提问/状态/approval/acknowledgement、current turn 回答不创建 checkpoint）见 `shared/shared-silent-execution.md` 与引擎注入的 AUTONOMOUS header。也不得用其 prose、filename 或 rule target 猜 repair kind/permission。按每个 independent primary hint 执行：

1. `repair_kind: agent_action`：正常仅可编辑 `seed-initialization` markers 之间的 body；唯一 frontmatter 例外是 apply 报告的 exact `frontmatter_invalid` syntax coordinate，修复后必须立即运行同一 `enrich_seed` writer。不得扩大到 Engine-owned appendix、registry、queue、ledger 或 canonical Topic 语义。
2. `repair_kind: engine_operation`：由 Agent 执行 `write_to` 指向的 existing legal operation，例如 topic-state inspect/recover/apply、completion-event operation 或合法 status/handoff owner；不得直接编辑 status、trace、canonical registry 或 provenance。
3. `repair_kind: user_decision`：识别 `missing_fact` 指出的真实 Topic/HITL 语义，例如 canonical registry 为空且没有已记录 Topic intent；不得从 seed filename、旧 prose 或 chat 猜 Topic。只有 existing HITL owner 可发起并记录，本 phase 暂无 legal path 时保持 failed checkpoint。
4. `repair_kind: external_action`：识别不可代理的权限/环境前置条件；不主动请求 acknowledgement，满足后由 Agent 继续。
5. `repair_kind: missing_contract`：保留 exact unavailable capability/contract boundary，不手写 registry/status/trace/ledger、不等待用户或创造第二成功路径。

Hint 不创造 permission。完成可执行动作后 Agent MUST 运行该 hint 的 exact `rerun`，回到同一个 `seed-topics-ready` checkpoint。Failed result 若没有可用 structured hint，不得从 `inspect[]`/`advice[]` 补猜 blocking repair；按 `missing_contract` 暴露最小边界。Topic/file 实例坐标从 `write_to` 读取；stable `rule_id` 本身不是 path，也不得靠 suffix 推断目标。

**Persistent failure：** 若 seed-topics gate 连续 3 次修复无进展，通过 accepted trace/log surface 记录 `silent_degradation`（`gap_impact: partial`）：
```bash
node DEEP_RESEARCH_HARNESS/cli/log-event.mjs --bundle <bundle> --level warn --msg "silent_degradation" --detail '{"kind":"silent_degradation","phase":"seed-topics","gate":"seed-topics-ready","gap_impact":"partial","reason":"persistent_failure_3x","attempts":3}'
```
不写 `state: blocked`。降级后 Agent 仍有责任继续尝试不同的修复策略，不浮出水面。

## 8. Stop Behavior

`stop: no` — Agent 自主物化，不发送阶段进度或 idle/no-work 汇报。Queue thin、active window 为空、registry 为空、或 seed topic 本地文件已写完，都不是停顿点；它们分别触发继续灌料、drain、registry repair、运行 gate 或静默降级。

若 registry 为空（Topic 语义未建立），这是 `user_decision` 或 `missing_contract` 边界，不得静默重建、猜测或从文件反向制造 intent。除此之外，普通 `agent_action` / `engine_operation` repair 均由 Agent 静默执行。Phase handoff 完成条件是 `seed-topics-ready` gate pass + `enter-phase --node <check.next>` 写入 route-bound load witness + `advance-status --to seed_topics_ready`；不得自判完成或自行加载下一 phase。

## Rerun-Aware Behavior

> 本 phase 被 `phase-rerun.md` gate pass 后 chain 直接路由进入（`rerun → seed-topics`）。当 `rerun_count > 0` 时，Agent MUST 按增量模式执行，而非从零重新发现 topic。

### 检测

读 `rb_profile.yaml#/human_decision_checkpoints/hitl2/rerun_count`。若 `rerun_count > 0`（或缺失/0），当前为 rerun 轮次。

### 增量行为

- **保留已有 topic**：`seed_topics/` 中已有 canonical topic 文件全部保留；只按 canonical plan/current seed binding materialize queue work，不从 filename 或 orphan seed 推断 scope。
- **新增 topic**：topic-state `add_topic` 已将 canonical skeleton 与 `action: add` direction 原子提交；Seed Topics 只按 binding/enrichment loop处理它，不重写其 direction。
- **补充 topic**：matching `action: supplement` direction 为 Wave0 提供追加搜索角度；读取 shared parser-compatible fields，不直接替换 seed section。
- **无当前 direction 或陈旧 direction**：按正常模式处理；不把旧 direction 当作本轮 operation receipt，也不迁移/删除它。
- **current amendment**：只读取 target count 等于 current profile `rerun_count` 的 newest complete Decisions revision，并与 immutable baseline 组合；older revisions 不 union 回 current set。matching direction 是受影响 Topic 的 current-round projection，不替代 revision source。

### 灌料时读方向 hints

在 enqueue 每个 topic 的 task card 前，Agent MUST 读取对应 `seed_topics/{slug}.md`——若存在 `## 本轮重跑方向` section 且 `action: supplement`，task card 的 action 字段中需包含 `new_search_dimensions` 作为追加搜索关键词。若 `action: add`（新 topic），全量搜索——与首次 wave0 一致。

## 9. Anti-Cheating Rules

- **禁止物化空目录就声称完成**：每个 registry topic 必须有对应文件
- **禁止创建与 `topic_registry` slug 不一致的文件**：slug 以 registry 为 source of truth
- **禁止编造 `must_answer_refs` 引用**：seed topic 正文只写研究骨架（维度/前提/open questions），不编造不存在的 reference
- **禁止在 seed-topics 阶段做 research**：seed-topics 是物化已有的 topic 定义，不做搜索/阅读/evidence 工作
- **禁止 direct-edit `## 本轮重跑方向`**：rerun direction 仅由 phase-rerun 形成 retained candidate 并通过 existing topic-state transaction 发布
- **禁止复制完整 controls/revision wording 或预写 future Wave task brief**：Seed 只在 current intent 实际影响 Topic 时写最小 local interpretation；不适用或 legacy-missing-revision 路径不得制造空 projection 或 inferred history
- 参见 `shared-anti-cheating-rules.md` 的通用禁令

## Log

记录命令: `node DEEP_RESEARCH_HARNESS/cli/log-event.mjs --bundle <bundle> --level <LEVEL> --msg "<message>"`

| 时机 | 命令 |
|------|------|
| Phase 开始 | `node DEEP_RESEARCH_HARNESS/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:seed-topics START"` |
| Phase 结束 | `node DEEP_RESEARCH_HARNESS/cli/log-event.mjs --bundle <bundle> --level info --msg "phase:seed-topics END — <summary>"` |
