## Context

动机见 [proposal.md](proposal.md)。当前实现已经提供全部必要接缝：

- `rb_plan.md.tmpl` 已把 `### User Research Controls` 与 append-only、newest-first `## Decisions` 放在同一个 narrative host file；
- `phase-rerun.md` 已从 accepted HITL2 rationale 计算 `target_rerun_count`，再形成 add/update/direction candidate；
- `canonical-topic-state.mjs` 只刷新它拥有的 plan frontmatter / standard Topic Registry，并保留其他 plan body；accepted workspace 已有 exact recover；
- queue item 的既有 `task_brief` 已由 `kindContractForQueueItem()` 原样选入 manifest，并作为 generated `task.md` 的第一段交给 actor；
- Wave1 已有 round-bound `focus_coverage`，Wave2 已有 human-readable `synthesis.md`，Final 已有 current-lineage `composition_handoff`；
- C5 已分别持久化 normalized multiline `reason` 与 `requested_scope`，并由现有 serializer 写入 profile rationale / event。

因此本 change 是跨 phase 的 Agent-facing contract 加固，不是 Engine 数据模型变更。新增 requirement 见 PHS-009、URC-004、POF-004、PRP-016、STM-009、DEW-026、RWP-022、WAI-012、WTS-013、CDP-007、REI-007。

## Goals / Non-Goals

**Goals:**

- 让一次已接受的 HITL1 baseline 和任意多次已接受 rerun amendment 在换会话后仍可直接恢复。
- 让当前执行者只需 baseline + newest complete revision 即可得到 current active intent，同时保留每轮 immutable history。
- 在真实 enqueue、coverage、synthesis、Final composition decision point 交付最小必要语义，避免全文复制。
- 复用现有 topic-state recovery、round binding、task brief、coverage、synthesis 与 Final lineage contract。

**Non-Goals:**

- 不对自由文本做 Engine 解析、语义比较、质量评分或 Gate 判定。
- 不新增 runtime file、profile/topic/finding 字段、queue kind、command、state、event、receipt 或 transition。
- 不把 presentation-only Final revision、未接受草稿或聊天全文写入 research-intent history。
- 不追溯迁移 legacy bundle，也不修改 rerun limit、C5、topic-state、work-unit submit 或 Final publication authority。

## Decisions

### 1. 一个 host file 内分离 baseline、current 与 history

采用以下固定所有权，而不是新建 `user-intent.md` 或 feedback log：

| Reader question | Direct Source of Record | Derived/read-only projection |
| --- | --- | --- |
| HITL1 最初接受了什么研究控制？ | `rb_plan.md## Constraints > ### User Research Controls` | Topic-local Seed enrichment/body |
| 后续每轮接受了什么变化？ | `rb_plan.md## Decisions` newest-first revision history | matching Topic direction |
| 现在仍有效的 amendment 是什么？ | newest complete revision 的 cumulative active amendments | task brief、Wave1 focus coverage、Wave2 coverage section |
| 哪些要求已有当前证明？ | submitted work + existing `focus_coverage` / finding owners | Wave2 / Final narrative |
| 报告如何面向当前读者呈现？ | current-lineage `composition_handoff` | current Final version |

`accepted revision` 的 “accepted” 只表示它忠实记录一个已经由 HITL2 / C5 合法接纳的决定；revision prose 本身不授予 route、mutation 或 Gate authority。

每条 revision 使用 PHS-009 的七项完整形状与固定 Agent-readable labels：

```markdown
### Rerun intent revision: <target_rerun_count>

- Target rerun count: <N>
- This-round delta: <added / changed / withdrawn>
- Affected canonical Topics: <UID + title, or explicit proposed title>
- Superseded or withdrawn requirements: <items, or none>
- Accepted Agent interpretation: <bounded current interpretation>
- Current active amendments relative to HITL1 baseline: <complete set, or none>
- Accepted user wording:
  > <every accepted non-empty wording line is prefixed with `> `>
  >
  > <every accepted empty wording line is retained as `>`>
```

前六个 label/value 各占一个 bounded bullet line，`none` 必须显式；只有 `Accepted user wording` 可以 multiline。逐行 blockquote containment 是 host-file safety 约束，不是第二份编码或 parser：用户原话中的 `## Progress`、`## Decisions`、checkbox-looking 行或其他 Markdown 结构始终留在 quote 内，不能伪装成 canonical section/entry。读取者把 quoted content 视为 accepted wording；Engine 不解析或去引号。`current active amendments` 是相对 HITL1 baseline 的完整集合，而不是仅写 delta。这样正常恢复无需 replay 所有历史；旧条目仍回答“当时接受了什么”。撤回 B 的第二轮示例为：顶部写 `delta: A -> A2; withdraw B` 与 `current active amendments: [A2]`，下方第一轮仍保留 `[A, B]`。

**Alternative: 每轮只追加 delta。** 拒绝。恢复必须重放所有历史并正确解释替换/撤回，容易在长任务中重新激活旧要求。

**Alternative: 改写 controls snapshot 为最新值。** 拒绝。会丢失 HITL1 baseline，也无法解释多轮打磨轨迹。

### 2. Rerun writer 放在 recovery preflight 之后、candidate baseline 之前

REI-007 的安全顺序为：

```text
accepted route-bound HITL2/C5 rationale
  -> operate-topic-state inspect (owner preflight)
  -> accepted workspace? exact recover, then inspect again
  -> compute target_rerun_count
  -> write/reuse one complete Decisions revision
  -> re-read rb_plan.md and verify complete current entry
  -> fresh operate-topic-state inspect
  -> build retained add/update/direction/layout candidate
  -> existing topic-state apply/recover
  -> existing style handoff when returned
  -> existing rerun_count increment and rerun-ready Gate
```

owner preflight 不能省略：若已有 accepted topic-state workspace，先改 plan 会制造 hash drift 并妨碍 exact recovery；每次 committed recover 后重新 inspect，直到确认没有另一个 accepted workspace。post-revision inspect 也不能省略：candidate 必须基于已经包含 current revision 的 plan。`mutate_layout` 继续使用该 post-revision inspect 返回的 `expected_plan_sha256`；add/update/direction 继续由 apply 时读取的 current plan 和 prepared manifest 绑定，不新增 CAS 字段。

Revision 的幂等规则只依赖 Agent 可读的 target count 与 accepted rationale：

- complete、同 target、同 accepted meaning：reuse；
- interrupted incomplete target draft：在任何 topic candidate 产生前修完整并 re-read；
- 两个 complete conflict/duplicate：保留原 bytes，停止于 plan ambiguity，不按文件顺序选 winner；
- older complete entries：永不修改。

这不是新 recovery controller。已存在的 topic-state workspace 仍是唯一 deterministic recovery owner；revision 写入只发生在无 workspace 的 Agent-owned narrative window。

**Alternative: 把 revision 加入 topic-state input/schema 并原子提交。** 拒绝。它会让 Engine 接收/解析 Agent 语义、扩大 transaction schema，并把 narrative history 变成 mutation authority。

**Alternative: 在 topic-state apply 后再写 revision。** 拒绝。崩溃会留下已生效 direction 却没有 durable accepted-intent history。

### 3. 固定 Markdown shape，但不新增 parser 或 Zod schema

Revision heading/labels 是 Agent-readable completeness contract，不是 machine schema。Apply 只修改 phase/playbook Markdown 和 delta/main specs；不在 `schema/` 或 `engine/` 增加 parser。既有 Zod contracts 继续覆盖 profile rationale、C5 request/event、queue/work-unit、focus coverage 与 finding index；本 change 不创建新的 structured runtime value，所以无需新增 Zod schema，也没有隐藏的 state transition table。

现有 `transitions.chain.json`、Gate definitions 和 lifecycle windows 完全不变。若 Apply 发现必须由 Engine 判断 revision completeness 或 current meaning，必须先把该新 product/authority decision写回 change，并重新审查 scope；不得顺手加 parser。

### 4. Topic 与 delegated projection 只携带 bounded explanation / coordinates

Initial Seed materialization 在 control 实际影响 Topic 时使用既有 `enrich_seed`：优先落到 `search_guardrails`、`evidence_route`，必要时补充 `hypothesis`、`in_scope` 与 initialization body 的 research/delivery relevance。不适用则不投影，信息不足则用既有 explicit gap。完整 controls 原文不复制到 Seed。

Rerun direction 继续是 six-field current-round projection。`rationale_excerpt` 解释“这个 Topic 为什么受 current revision 影响”，所以不同 Topic 可以不同；它不是 verbatim hash、current revision 副本或跨 Topic 相等约束。

每个 Wave 在自己真正创建 delegated queue item 时 author `task_brief`：

```text
relevant canonical seed coordinate(s)
+ controls baseline coordinate when present
+ newest current Decisions revision coordinate on rerun
+ assigned matching direction coordinate/read rule
+ Phase-derived bounded task objective
+ stale/future/invalid/legacy direction is not current instruction
```

Wave0 不能依赖 Seed Topics 预写未来任务；Wave1 初始/补充 demand 与 Wave2 targeted-evidence demand 各自在 enqueue 点写。Engine 已原样传递 `queueItem.task_brief -> manifest.task_brief -> task.md`，因此不改 work-unit schema 或 renderer。Actor 通过既有 `bundle_dir` 读取 source coordinate，避免 N 份用户原话扇出。

**Alternative: 把完整用户原话放进 `action` 或 payload。** 拒绝。`action` 描述 queue demand；payload/manifest 会形成第二持久化副本并误导 authority。

### 5. Requirement、execution 与 evidence 保持三层

Wave1 的 current focus commitment 只从这些正面来源形成：

- round 0：applicable controls baseline + current canonical Seed projection；
- rerun N：baseline + newest complete revision N + matching direction N。

`focus_coverage` 仍只证明 Phase Agent 声明的 commitment 与 current-round submitted refs / visible limitation 之间的关系。旧 revision、旧 direction、旧 submitted work 或 filename 不能产生 current commitment，也不能证明 current coverage。存在 legal supplementary repair 时先执行，只有既有 external/user/missing-contract 边界才能记录 limited。

Wave2 pure synthesis 读取 current intent、focus coverage、carried-target receipt、finding index 与 verified backing，在 `synthesis.md` 写一个 presentation-tolerant Current Intent Coverage section。它列 current delta、affected Topics、covered/limited outcome 与 source/commitment/finding coordinates，但不复制全文，也不进入 `finding-index.yaml` 或 Gate。

Final 同时读取 research-intent owners 和 composition owner。research intent 决定不能遗漏的研究义务/限制；`composition_handoff` 决定 reader/view/foreground/compression。缺少 handoff 时 controls 不能补造 delivery semantics；压缩偏好也不能隐藏 hard control 或 limitation。presentation-only feedback只产生下一版 immutable Final，不写 Decisions。

### 6. post-Final 复用现有 multiline reason

`post-final-recovery.md` 只改变 Agent authoring instruction：focus-bearing `reason` 使用 POF-004 的两个现有 HITL2 labels，`requested_scope` 仍单独填写。现有 C5 normalizer/serializer 已支持 multiline string，并分别持久化 reason/scope，因此不加 `focus` object、不改 ProfileSchema、不改 event/workspace。

这里保留一条隐私/最小化边界：只保留与本轮 research expansion 直接相关的 accepted wording，不复制整个 Final conversation。下游任务只收到 coordinate，不收到全文。

### 7. Constitutional review

**Semantic precision.** 新增的唯一 reader-facing 概念是 “Rerun intent revision”。它只回答当前 amendment 与历史变化，不回答 Topic identity、permission、coverage、evidence 或 delivery view；正常停止点是 baseline + newest complete revision。

**Simple reliable control.** direct Source of Record 仍在一个既有 host file；最短闭环是 accepted rationale -> revision -> existing topic-state -> existing Wave/Final readers。净效果是避免一个新文档、一个 schema family、一个 parser/Gate、一个同步协议和一个 recovery owner。

**Helper-oriented responsibility.** User 决定新增/替换/撤回的研究语义；Agent 在合法 HITL/rerun boundary 内解释、写 revision、形成 topic/task/coverage/synthesis projection并执行普通 repair；Engine 继续只判定现有 lifecycle、schema、hash、round、provenance、receipt 与 Gate facts。`human-directed` 或 user prose 不创造 permission。

## Risks / Trade-offs

- **[Revision completeness 不是 Engine verdict]** -> Phase 在 candidate 前 re-read；focused Markdown contract tests 锁定顺序/字段，real Agent-flow case 验证两轮语义行为。Deterministic PASS 不宣称 Agent 理解正确。
- **[写 revision 后、topic-state 前崩溃]** -> complete same-target entry is reused；incomplete draft 在无 workspace 时修复；不追加 duplicate。
- **[已有 topic-state workspace 与 plan 写冲突]** -> 首先 inspect/exact recover，并在每次 committed recover 后重新 inspect；只有确认无 accepted workspace 才写 revision，然后做 post-revision fresh inspect。
- **[append-only history 增长]** -> 每轮仅一条 bounded revision，normal reader只读顶部；不增加压缩、归档或 truncation 协议。
- **[完整用户措辞破坏 host-file 结构或向下游扩散]** -> revision 中逐行 blockquote containment，原文只留在 controls/revision/C5 accepted request；Seed、task、coverage、synthesis 用解释或 coordinate。
- **[旧 bundle 没有 revision]** -> 继续现有 profile/direction compatibility，不反推/迁移历史；新 contract 对后续合法 rerun 生效。
- **[current revision 与 direction 语义不一致]** -> Agent 从同一 accepted rationale/current revision形成两者；Engine 只验证 direction structure/round。真实 Agent evidence负责语义 claim，不增加 substring Gate。
- **[Wave2 section 被误当 authority]** -> 文档和 tests 明确它只引用 current coverage/IDs；finding、submitted backing 与 Gate owners不变。
- **[预计无需 production JS 的假设失效]** -> Apply 在首次 `.mjs` target edit 前停止，把无法复用的具体证据、Source of Record、最小机制和新增验证写回 design/tasks，再重新 plan review。

## Migration Plan

1. Apply 先登记 existing-capability requirement IDs 并通过 plan checks，再更新 phase/playbook Markdown；不创建 runtime migration。
2. 用静态 Markdown integration tests 锁定 revision shape/blockquote containment、writer ordering、per-Wave source coordinates、no-verbatim-fan-out 与 Final owner precedence。
3. 用现有 production C5 / topic-state paths扩展 integration 和 deterministic E2E，证明 multiline durability、两轮 history byte preservation 与既有 round/recovery contract未回归。
4. 增加一个注册的 real-Agent two-rerun playbook；默认只允许一次有明确 hard cap 的 authenticated Subject execution，不自动重试。真实 runtime/tool 不可用时记录 `NOT_RUN`，不以 fixture PASS 代替；`FAIL`/`ERROR` 保留原始证据并回到普通 repair/replan task，不能作为完成证据。
5. 验证后通过 supported spec-sync route 把 11 份 delta 同步到 existing main-spec owners，并逐项重读比较。
6. Rollback 只需回退 framework/spec instruction changes。已经写入 bundle 的 Decisions entries 仍是普通 append-only Markdown，旧 reader 会忽略其新约定而不会破坏 schema、Gate 或 lifecycle。

无待定 product decision；若实现证据推翻“不改 production JS”，按上述 risk boundary 回到本 change 重新决策。
