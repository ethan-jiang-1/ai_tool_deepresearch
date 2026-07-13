## Why

Sanctioned rerun 在已有正常研究历史上执行 `add_topic` 时，没有把“新增 Topic”送回正常 Topic pipeline，而是在五个相邻 contract surface 上暴露断点：新 seed 过薄；Wave0 没有明确建立正常 delegated provenance；错误 claim/actor-preflight 看起来像空队列；generated envelope/submit/path 反馈迫使 Agent 猜字段甚至写错 `<bundle>/<bundle>`；进入 Wave1 后，historical reference 的 UID/legacy binding 与 `_INDEX.md` 父表错误又被多套 reader 放大。

这些均是 rerun 后新增 Topic 才暴露的问题，正常首次运行已有完整 seed enrichment、Wave0/Wave1 queue/work-unit/submit、reference materialization 和 gate 路径，不应另建 rerun execution mechanism。来源为 `_backlog/bugs/BUG-081-add-topic-generates-minimal-seed-skeleton.md`、`_backlog/bugs/BUG-082-rerun-new-topic-wave0-no-work-unit-provenance.md`、`_backlog/bugs/BUG-083-queue-claim-returns-empty-on-active-window.md`、`_backlog/bugs/BUG-084-work-unit-submit-impossible-to-satisfy-manually.md` 和 `_backlog/bugs/BUG-085-wave1-gate-reference-format-rejects-uid.md`。

## What Changes

- 把 rerun 收敛为 direct-fact classification，而不是第二套执行机制：`existing topic + valid coverage` 复用 historical coverage；`new topic + no coverage` 进入正常 Topic pipeline；`supplement` 进入正常 supplementary demand。不会新增 rerun controller、state、gate branch、CLI 或第二 authority。
- 让 canonical topic-state 在创建新 seed projection 时一次生成完整、可 enrich/回填的 seed skeleton：保留 canonical UID/intent frontmatter，包含 seed-topics 初始化 sections，并预埋当前 accepted Wave0/Wave1/Wave2 token。不会新增另一套 `__FILL_*__` 或通用 token 协议。
- 补齐 Wave0 的分类与 producer guidance：存量合法 submitted coverage 不重复派发；rerun `action:add` 使用首次运行相同的 queue demand、role-bound actor probe、`operate-work-unit claim`、真实 actor execution、dry-submit repair、formal submit 和 ledger/gate 路径。
- 让 queue/work-unit claim 反馈明确区分 delegated demand、missing actor observation、unnecessary fallback 与真正 empty queue；历史 batch 不应阻断合法新 demand 进入下一 batch。不会增加 fallback queue、availability state 或 claim authority。
- 让 generated work-unit task 提供 canonical absolute `bundle_dir`、immutable beacon binding、copy-ready exact result starter 与 contract-derived checklist；bundle-relative ref 只解析一次，错误 nested root 的 read/inspect/rejection path 必须零写入。Submit 仍保持严格 actor/provenance binding，repair 只回到同一个 dry-submit/formal-submit checkpoint。
- 让 historical reference 的 `related_topic_uid` 与 legacy `related_topic` 通过 canonical UID/current/previous-layout resolver 的一个 thin adapter 解析；dual fields 必须一致。Gate、inspect 与 file observability 消费同一个结果，不要求为 rerun 批量改写已覆盖 reference。
- 保持 `reference/_INDEX.md` 八列表的 accepted blocking contract；无效/缺失父表先返回一个 `reference_index_table_invalid` 根因并 mask 逐文件缺行级联，父表有效后真实 missing/wrong-layer row 继续阻塞。Rerun 新 Topic 仍由正常 Wave1 materialization 更新 reference 与 index。
- 增加 focused regression 与 controlled real-Agent evidence：覆盖完整新 seed、历史 batch 后 claim、claim 根因发现性、canonical absolute bundle root、beacon immutability、nested-path no-write、result starter/dry-submit repair、UID/legacy reference binding、index parent short-circuit，以及 rerun 新 Topic 通过真实 Wave0/Wave1 normal path。
- 本 change 修改 `DPT_FRAMEWORK/` 行为，需要版本提升到 **v0.28**；apply 阶段同步 `CHANGELOG.md` 与 `DPT_FRAMEWORK/RUN.md` 横幅。

最短合法闭环是：已记录的 rerun 语义决定 → topic-state 原子提交 registry + 完整 seed → 按 direct facts 分类 coverage → 新 Topic 进入正常 Wave0/Wave1 queue/work-unit/submit/materialization → shared reference resolver/index evaluator → 同一个 inspect/gate。Direct Source of Record 是 `rb_plan.md#/topic_registry`、UID-bound seed、`rb_queue.json` / `_work_units/_index.json`、Engine-resolved absolute bundle root、manifest/beacon/runtime receipt、Engine-written `rb_output_declarations.jsonl`、reference metadata、accepted `_INDEX.md` table 和现有 gate verdict。

Net simplification：复用现有 renderer、topic-layout resolver、queue、actor-preflight、work-unit envelope、dry-submit、formal submit、Wave gates 和 file observability；把 competing path roots、hard-coded reference field readers、inspect/gate duplicate interpretation 和 parent-failure row cascade 收敛为共享 pure evaluators与本地短路。避免 rerun-aware gate exception、自动跨 owner enqueue、手写 provenance、submit-minimal 旁路、第二 reference identity map、mass rewrite、dependency engine 和新的 persisted state。

责任边界保持不变：用户只决定 rerun 的新 Topic 语义；Agent 负责 retained apply input、topic-state apply、normal enqueue/probe/claim/执行/submit、reference/index materialization 与 same-check repair；Engine 负责 canonical mutation、identity/binding、queue/work-unit/receipt/ledger、strict index structure 和 gate verdict。`human-directed` 不创造 claim permission、actor availability、provenance 或 reference authority。

## Capabilities

### New Capabilities

- 无。复用现有 requirement ID 和 capability，不修改 `openspec/governance/req-registry.yaml`。

### Modified Capabilities

- `canonical-topic-state`: 新 UID-bound seed 使用完整 shared skeleton；historical reference binding 通过同一 pure layout resolver 的 thin adapter 解析。
- `research-wave-phase-content`: rerun 只做 coverage 分类；新增 Topic 走正常 Wave0/Wave1 producer path，存量 coverage 复用。
- `agentic-queue`: delegated claim rejection、actor-preflight 与 empty window 返回不同根因和一个最近动作；历史 batch 保持现有 allocator。
- `delegated-work-units`: generated envelope 提供 exact result starter、contract checklist 与 canonical absolute bundle root；fallback/repair 使用 dry-submit；错误 root read path 零写入。
- `reference-flat-format`: UID/legacy metadata 是一个 binding contract；八列 `_INDEX.md` 保持严格，父表错误先短路 row cascade；Agent 执行正常 materialization/repair。
- `research-wave-gate-implementation`: Wave1 gate/inspect 共享 reference binding/index evaluator，历史覆盖按 UID 解析，新 Topic 仍走正常 gate contract。
- `file-observability`: 使用同一 reference binding adapter，UID-only reference 不再被误报为 dangling/unregistered，dual conflict 只报一个根因。
- `cli-inspect-output-conventions`: Wave0/Wave2 的 reference advisory 也消费同一 adapter，不再把 legacy `related_topic` 硬编码成唯一 raw field。

## Impact

- Framework implementation: 现有 `canonical-topic-state.mjs`、`topic-layout.mjs`、queue/work-unit envelope/index/submit helpers、reference/gate helpers、Wave contract evaluator、Wave inspect CLIs 和 file observability helper；不新增 owner、resolver namespace、validator authority 或 submit success path。
- Agent control surface: `phase-seed-topics.md`、`phase-wave0.md`、`phase-wave1.md`、`shared-subagent-protocol.md` 及必要的现有 command playbook wording；新 Topic 与首次运行使用同一 Agent Flow。
- Regression tests: canonical topic-state、queue/work-unit、path/no-write、submit helper、reference binding/index、Wave1 inspect/gate shared result、file observability 与正常 first-run compatibility。
- Controlled evidence: 从历史 normal-run fixture 进入真实 sanctioned rerun，新增 Topic 通过真实 add、Wave0/Wave1 normal queue/work-unit/submit/reference/index/gate；fixture 只提供历史前置事实，不冒充新 Topic Agent 产出。PASS 必须来自真实 trace/verdict；无真实 actor 为 NOT_RUN。
- Release surfaces: `CHANGELOG.md`、`DPT_FRAMEWORK/RUN.md` 更新到 v0.28。
- 不改变正常首次运行路由、actor/provenance binding、Wave gate floors、八列 index contract、rerun lifecycle state machine、HITL placements 或批准依赖集合；不自动迁移 production bundle、不移动 historical paths、不允许 post-hoc provenance fabrication。
