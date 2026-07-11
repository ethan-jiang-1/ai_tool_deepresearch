## Context

本 change 由同一个 incident 的三个视角共同触发：

- `_backlog/plans/human-override-and-state-mutability.md` 说明当前框架把 autonomous Agent 与明确在场的人类指令混成同一条 lane，导致人类 authority 也被 anti-cheating guardrail 一律锁死。
- `_backlog/plans/breakpoint-recovery-persistence-model.md` 说明恢复质量取决于中断前已经物化的 data、intent 和 progress；当前 work-first、persist-as-side-effect 的形状让未完成意图只能靠 chat 重建。
- `_backlog/bugs/BUG-079-out-of-gate-addendum-no-canonical-footprint.md` 说明当 sanctioned route 不可达时，Agent 会创建真实但 Engine-invisible 的平行结构，造成 topic identity、artifact、profile、status、queue 和 trace drift。

它们不是三件互不相干的需求，而是一条因果链：

```text
authority context is unclear
  -> Agent lacks a legal helper action
  -> work escapes the canonical path
  -> intent and progress are not materialized before work
  -> Engine cannot audit or recover the real run
```

此前两个 proposal 方向的问题，是从链条中间挑一个症状增加 reentry/evaluator 概念。当前设计回到链条两端：先明确谁判断、谁执行、什么必须先落盘，再决定后续最少需要哪些 runtime changes。

## Goals / Non-Goals

**Goals:**

- 让当前 change 在设计上完整罩住两个 plan 与 BUG-079，而不是只把它们列作背景。
- 把 `simple-reliable-control.md` 提升为 Charter 之后的渐进演进评审入口，统一 net simplification 与 helper posture。
- 建立 autonomous 与 explicit human-directed 的 authority-context 区分，并进一步区分 human-directed 位于既有 HITL 还是 out-of-band maintenance/debug，同时不提前新增无法可靠认证的 lane state。
- 明确 helper responsibility：用户决定语义与授权，Agent 完成已授权机械工作，Engine 保持 deterministic authority。
- 采用 `materialize-before-work` 与 `canonical-or-blocked` 作为后续 persistence、scope change、recovery 和 authorized repair 的共同设计义务。
- 给出可逐步实施的依赖顺序，避免一次性重写，也避免各 follow-up change 再次独立发明自己的状态与控制链。
- 让 ACS-001、ACS-003、`COMMANDS.md` 与现有 static regression 保持一致。

**Non-Goals:**

- 本轮不实现 arbitrary state jump、post-final reopen、authorized repair CLI、topic progress schema、crash sweep 或 canonical integrity Engine rule。
- 本轮不把 human-directed context 写成新的 persisted lifecycle state、session mode 或 authority token。
- 本轮不声称 Engine 能从共享 filesystem 或 Agent 提交的 flag 中认证“这句话一定来自人类”。
- 不正式化当前 ad-hoc `addendum/` namespace，也不将其描述为 accepted runtime path。
- 不实现 `_backlog/todos/todo-helper-not-tool.md` 中的 persona、memory 或 generic helper system。
- 不用 guideline prose 标记 BUG-079、P1/P2/P3 或 human override 为 runtime-fixed。

## Decisions

### 1. 当前 change 是基础契约，不是假装完成 runtime 修复

本 change 的 apply surface 有意保持窄：guidance、现有 Agent-facing docs、既有 ACS requirements 和既有 static regression。它的系统性来自完整接住结果义务、消除设计冲突并固定后续依赖，而不是一次提交所有 runtime 机制。

归档后能够成立的是：

- 后续 recovery/override/addendum change 有一套共同的设计准入和责任边界；
- Agent-facing command contract 不再把普通机械工作推给用户；
- automated pipeline 与 out-of-band human-directed collaboration 不再在文档里混为一谈；
- 两个 plan 与 BUG-079 的 obligation 有明确 coverage 和 staged landing path。

归档后不能声称的是：

- post-final 已能合法重入；
- 任意 node 已能 state-seed；
- user intent/progress 已自动 materialize；
- orphan temporary files 已能 sweep；
- canonical drift 已被 Engine 自动检测。

**Alternative considered:** 把所有 runtime 能力放进一个超大 apply。拒绝，因为 persistence、canonicality 与 authorized mutation 的 Source of Record 和风险不同；一次实现会迫使方案先发明通用 controller，再用大量条件兼容历史路径。

### 2. 提升 `simple-reliable-control.md` 的地位，但不改变 authority order

该 guideline 从“主要约束 checker/gate/recovery 复杂度”扩展为 Charter 之后的 repo-wide incremental-evolution review entrypoint，负责两个问题：

1. 这个 change 是否让控制形状净简化？
2. 这个 change 是否让 Agent 在确定性边界内更像 helper，而不是把机械工作交还用户？

Apply 时同步：

- `simple-reliable-control.md` 的 frontmatter role/scope、顶部用途、Purpose、Standing 和 change-review section；
- `project-charter.md` 现有 complexity-brake、Guidance Conflict Resolution、Quick Router、Reading Order 与 Related Guidance；
- `guidelines/README.md` 现有 reading order、precedence、decision route 与 guidance map。

Proposal/design 保留对两个 plan、BUG-079 和 incident 的逐项 coverage；charter-level guideline 只吸收抽象后的稳定原则，不复制 backlog 路径、事故细节或临时 follow-up 名称。这样既不忘记来源，也不把长期指导写成历史记录集合。

它仍然服从 `AGENTS.md`、OpenSpec、accepted specs、executable contracts 和 runtime truth。Promotion 提升的是设计方向的可见性，不是把 guideline 变成新 Source of Record。

**Alternative considered:** 新建 helper guideline。拒绝，因为会产生第二个演进入口，并让 simplicity 与 helper responsibility 分裂成两套评审语言。

### 3. 用三个轴统一系统模型

后续相关 change 必须同时回答三个轴，而不是各自只修一个文件：

| Axis | 问题 | Stable responsibility |
|---|---|---|
| Authority context | 当前是无人值守 autonomous execution，还是人明确在场的 maintenance/debug collaboration？ | Agent 从 conversation context 判断；Engine 不猜语义 |
| Action responsibility | 谁决定，谁执行，谁裁决？ | 用户决定新语义/风险/权限；Agent 执行已授权机械工作；Engine 裁决 deterministic contract |
| Persistence/canonicality | 决定和工作如何在中断前成为可恢复事实？ | 先写 accepted canonical Source of Record，再做内容工作；没有 canonical path 就阻塞 |

这三个轴解释了为什么单独增加 reentry condition 不够：即使能移动 node，如果 intent 没落盘、topic 没 canonical identity、artifact write 不 crash-safe，恢复仍然失败；反过来，只有进度 state 而没有合法 human-directed action，用户仍然只能手改。

### 4. Authority source 与 interaction placement 是两个维度

第一维是 authority source：

- `autonomous`：Agent 根据既有 goal、spec 和 Engine feedback 自主推进，没有新的用户指令。
- `human-directed`：用户明确给出新的语义决定、修正目标或调试/维护指令。

第二维是 interaction placement：

- `in-run HITL`：HITL1/HITL2 是 accepted lifecycle 内承接 human-directed decision 的位置。
- `out-of-band maintenance/debug`：用户在 autonomous lifecycle 之外明确进入恢复、调试或修正协作；它不是额外 lifecycle checkpoint。

#### Autonomous behavior

- `RUN.md` 交权后，非 HITL lifecycle step 默认是 autonomous。
- anti-cheating、gate、transition、receipt 和 trace contract 继续 fail closed。
- Agent 不因自己认为用户“可能会同意”而扩大权限或绕过 transition。

#### Human-directed behavior

- 在 HITL1/HITL2 中，人类决定属于 accepted in-run authority boundary，不应被描述为 Agent 自驱决定。
- 在 out-of-band maintenance/debug 中，用户已经明确在场，但该对话本身不自动创建 runtime mutation capability，也不是 Final-owned repair loop。
- Agent 应读取直接状态、运行现有 diagnostics、解释前置条件，并执行现有 contract 已允许且已授权的机械动作。
- 若目标需要当前不存在的 mutation/reentry contract，Agent 必须说明缺口；未来 authorized-repair change 再定义合法 Engine path。

本轮不新增 `lane: human_directed` 字段。共享 filesystem、CLI flag 或 Agent 写入的 artifact 都不能单独证明“人类本人授权”；若未来需要 machine-authenticated authority，必须先选择可信 host signal。当前设计只承诺 explicit、durable、auditable，不假称 cryptographic authentication 已解决。

**Alternative considered:** 立即增加 `--human-override --reason`。拒绝，因为 Agent 自己也能传 flag；在没有可信 authority signal 时，这只是一个新后门形状，不是真正的 lane separation。

### 5. Helper flow 是责任分配，不是 helper subsystem

统一协作闭环：

```text
user goal
  -> Agent inspects direct runtime truth and existing legal paths
  -> Engine/check returns prerequisite, blocker, and legal next action
  -> Agent explains only the smallest decision boundary
  -> user decides new semantics / destructive action / permission expansion when needed
  -> Agent materializes the accepted intent through an existing canonical contract
  -> Agent executes authorized reversible mechanical work
  -> Engine audits and the Agent reruns the same checkpoint
```

如果用户目标、现有权限、accepted contract 和 direct facts 已经决定下一步，Agent 不应只输出命令让用户自己跑。若无合法路径，helper behavior 是把缺失 contract 说清楚，而不是手写 status/trace 或自建 namespace。

该 flow 不要求 persona、memory、planner service 或 generic repair controller。它只是明确已有 Agent、Engine、user 三者的责任。

以用户明确要求移动 node 为例：Agent 先读取 `rb_status.json`、trace 与现有 reentry/transition diagnostics，告诉用户目标 node 的直接前置条件、当前缺口和现有合法路径；若现有 contract 已允许且用户决定已记录，Agent 应亲自执行所需命令并复跑检查。若没有合法 mutation/reentry path，Agent 应明确指出缺失的是 Engine contract，而不是把一串手改文件步骤交给用户或声称“同意”本身已经创造 transition authority。

### 6. `materialize-before-work` 与 `canonical-or-blocked` 是共同恢复义务

后续 runtime changes 必须共同满足：

```text
accepted human intent
  -> canonical identity and requested scope
  -> recoverable progress registration
  -> crash-safe data/artifact write
  -> content work
  -> deterministic audit and transition
```

对应来源义务：

- P1：数据过手即存，写入路径 crash-safe，孤儿临时文件可判定。
- P2：状态即意图要存，恢复时能区分 never-started / in-progress / delivered。
- P3：重要用户输入在接收当刻物化，不能等产出物反向证明意图。
- BUG-079：新增 topic/scope 必须进入 canonical identity、artifact、progress、profile 与 trace 可见路径；不得创建 Engine-invisible parallel namespace。
- Human-override plan A/B：topic identity 必须有一个 canonical owner；rename/renumber/authorized repair 应通过原子 Engine operation 更新或派生相关 surfaces，不能继续要求人或 Agent 手工同步 N 处。
- BUG-079 fix D：deterministic advice 只能给当前状态下真实可达的最近动作；若 sanctioned path 不存在，应直接报告缺失 contract，不能输出已知会被同一 preflight 再次挡回的循环建议。

本 change 不选择新的 progress schema，也不宣布 `rb_status.json`、`rb_queue.json` 或 trace 中哪一个将拥有 per-topic progress。后续 P2 change 必须先明确唯一 Source of Record，避免三处双写。

### 7. 优先恢复 canonical path，不默认发明 addendum path

对 post-final 新增 scope，默认设计偏好是修复合法 rerun/reentry，使工作重新经过已有 canonical wave path。只有在 gated rerun 无法表达真实业务需求时，才考虑一等 addendum contract；若新增 addendum，它必须复用 canonical topic identity、progress、artifact 和 audit rules，不得保留一套平行成功 authority。

这不是提前决定 BUG-078 的具体 transition，而是排除最危险的成功形状：真实工作完成了，但 Engine 与恢复工具完全看不见。

### 8. 后续落地按安全依赖分片

| Slice | 覆盖义务 | 依赖与净简化要求 |
|---|---|---|
| Foundation（本 change） | Guideline standing、helper responsibility、context distinction、coverage map、ACS/test alignment | 不改 runtime |
| Durability | P1 crash-safe writes 与 orphan finalize/discard | 优先复用现有 atomic-write helper；不得给每类 artifact 各造一套 journal |
| Visibility safety net | BUG-079 canonical integrity audit 与 impossible-advice detection | 优先扩展现有 audit/inspect/check feedback path；只有现有 ownership 不匹配时才新增 CLI |
| Canonical materialization | P2/P3 intent、single-source topic identity、atomic rename/renumber 与 progress 在 work 前落盘 | 必须先选唯一 identity/progress Source of Record，删除/避免平行 addendum authority 和跨 N surface 手工同步 |
| Authorized repair | human-directed audited mutation、reentry/state-seed | 依赖 integrity audit 与 canonical materialization；必须解决 authorization signal、mutation boundary 与 rollback |

Durability 与 visibility safety net 可以独立先行；authorized repair 必须最后，因为没有审计网和 canonical truth 的 override 只会更快制造 drift。

### 9. ACS-001 与 ACS-003 一起修改

ACS-001 定义 Agent-facing audience 与 action responsibility；ACS-003 已要求 static regression 验证 Agent-facing positive markers。只修改 ACS-001 而不更新 ACS-003/test 会造成 accepted contract 与 verification drift。

因此本 change：

- 在 ACS-001 中加入 Agent-owned ordinary execution、repairable blocker、autonomous/human-directed authority distinction、HITL/out-of-band placement distinction 与 no-ad-hoc-authority 边界；
- 在 ACS-003 中要求现有 validator/test 只在顶层 `COMMANDS.md` audience contract 验证这些新增 positive markers；其他 scanned surfaces 继续只做 drift/phrase-class 检查，避免复制整段原则；
- 只扩展 `tests/engine/command-contract-docs.test.mjs` 的现有 marker list，不增加 validator、phrase class 或新的 test harness。

Requirement traceability 也保持边界清楚：ACS-001/ACS-003 的 normative implementation 是 `COMMANDS.md` 与现有 static regression；guideline/Charter/index tasks 只标为“支持”这些 requirements 的设计上下文，不声称 net simplification 本身已经成为新的 accepted capability，也不因此分配新 ID。

### 10. 三问是 admission summary，不替代详细安全纪律

`simple-reliable-control.md` 的 canonical `Change Admission Test` 收束为：

1. 最短合法闭环和直接 Source of Record 是什么？
2. 这个 change 删除、合并或避免了哪份复杂度？若只增加，为什么是不可避免的确定性底线？
3. 哪个决定确实需要用户，用户决定后哪些机械步骤由 Agent 完成？

现有 direct authority、state ownership、short-circuit、same-check repair、fail-closed、testability、truthfulness 和 compatibility retirement 仍保留为详细 disciplines。简化的是重复评审入口，不是删除安全内容。

`project-charter.md` 的 `Guideline Change Checklist` 继续保留其特有的 authority/layer 检查，但其中与 complexity、mechanism pre-approval 和 gradual convergence 重叠的问题应合并为一个指向 `simple-reliable-control.md` `Change Admission Test` 的入口。这样 Charter 检查“guidance 有没有越权”，Simple Reliable Control 检查“方案是否简单且 helper-oriented”，两者不再维护两份近似 checklist。

## Risks / Trade-offs

- [基础契约被误认为 BUG 已修复] -> Proposal、guideline 和 tasks 均明确 current apply 与 follow-up runtime obligations；归档不得关闭两个 plan 或 BUG-079。
- [human-directed context 被当成 Agent 可自授 override] -> 本轮不提供 override flag/state；未来 change 必须先解决 authorization signal 与 audit boundary。
- [两种上下文演变成全局 mode state] -> 当前只做语义和文档区分；任何 persisted mode 需要独立 Source-of-Record 论证。
- [guideline promotion 形成新 authority] -> Charter、README 与 guideline 同时保留 accepted specs/executable/runtime precedence。
- [三问过度删减安全检查] -> 明确三问只替换重复 checklist，Non-Negotiable Disciplines 与 verification requirements 保留。
- [staged roadmap 变成永久不落地] -> Proposal/design 的 Source Coverage 固定每个 obligation 的 follow-up slice；后续 proposal 必须引用对应来源与依赖，不得宣布无关。
- [existing static test 变得更脆] -> 只检查少量稳定 audience markers，不增加 prose-quality regex 或 blocking phrase taxonomy。
- [gated rerun 与 formal addendum 长期双轨] -> 默认优先 canonical rerun；若 addendum 获批，design 必须说明删除或统一哪条成功 authority。

## Migration Plan

1. 重构 `simple-reliable-control.md`，提升 standing，加入统一模型和三问 admission summary，同时删除重复 review 内容。
2. 最小更新 `project-charter.md` 与 `guidelines/README.md` 的现有入口，保持 authority order。
3. 更新 `DPT_FRAMEWORK/COMMANDS.md` 的 audience contract，区分 autonomous pipeline 与 out-of-band maintenance/debug，并明确 Agent-owned mechanical action。
4. 扩展现有 command-contract docs regression 的 stable markers，使 ACS-001/ACS-003 与实现一致。
5. 严格验证 change、requirement registry、main specs 和 focused regression。
6. 后续 runtime changes 按 Durability / Visibility / Canonical Materialization / Authorized Repair 分片提出；每个 change 引用本 proposal 的 coverage table，但重新定义自己的 concrete specs/tasks。

Rollback 只涉及 guidance、command docs 和 static marker assertions，无 runtime data migration。

## Open Questions

以下问题有意保留给对应 runtime change，当前 change 不伪造答案：

1. **Authorization signal**：什么 host-level 或 user-origin signal 能让 Engine 区分真实 human-directed authorization 与 Agent 自行传 flag？若只能做到 auditable 而非 authenticated，应如何明确 threat model？
2. **Mutation boundary**：authorized repair 允许哪些 state/profile/registry/transition 变化，哪些证据与已交付 provenance 即使有人授权也不可改？
3. **Progress Source of Record**：per-topic/per-wave progress 应由现有 queue、status、registry、独立 ledger 中哪一个拥有，如何避免双写？
4. **Canonical post-final route**：优先修复 gated rerun 是否足以覆盖所有新增 scope；正式 addendum 是否还有不可替代的业务语义？
5. **Integrity owner**：canonical footprint audit 应扩展 `audit-phase-status`、`inspect-bundle` 还是复用更底层的 shared evaluator，哪一个 ownership 最直接？
6. **Crash-safe scope**：现有 writer 中哪些已经正确 atomic，哪些需要 shared journal/sweep；如何避免为每类 artifact 复制恢复逻辑？
