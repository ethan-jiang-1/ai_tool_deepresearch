## Why

Sanctioned rerun 在一份已经正常完成过 Wave0/Wave1 的 bundle 上新增 Topic 时，没有把新 Topic 送回正常 Topic pipeline，而是让 Agent 落入一条增量断链：seed 过薄、Wave0 demand/provenance 入口不显眼、claim/submit 反馈要求猜内部 binding、reference UID 与旧 reader 漂移、count 与 format 重复做内容启发式、depth review 重抄 ledger、丢失 declaration 无合法恢复、supplementary source claim 又被单 work-unit 假设拒绝。

这不是九个互不相干的补丁点。正常首次运行已经具备可工作的 seed enrichment、queue/work-unit、submit、reference materialization、depth review 和 gate 路径；rerun 新 Topic 应像正常 Topic 一样执行。九个 BUG 共同暴露的是：rerun 没有回到正常 producer path，而历史 gate/submit 还叠加了重复 authority、过严表现规则和不透明 rejection。

更上位的系统性问题是：当前所有正式 Gate CLI 掌握 rule、schema、authority、producer 和 checkpoint 血缘，却通常只返回 `passed`、松散 `inspect[]` 和泛化 `advice[]`。Markdown Controller 不知道合法写入面时只能猜字段、猜文件、猜命令；Agent连续修一个错再暴露下一个错，是Engine信息保留和Gate contract设计问题。继续逐BUG补failure message只会让严苛Gate与补丁一起增长。本Change因此同时治理全部十个正式Gate CLI：删除没有blocking依据的规则，并让每个primary failure返回Engine已知的合法修复hint。

来源：

- `_backlog/bugs/BUG-081-add-topic-generates-minimal-seed-skeleton.md`
- `_backlog/bugs/BUG-082-rerun-new-topic-wave0-no-work-unit-provenance.md`
- `_backlog/bugs/BUG-083-queue-claim-returns-empty-on-active-window.md`
- `_backlog/bugs/BUG-084-work-unit-submit-impossible-to-satisfy-manually.md`
- `_backlog/bugs/BUG-085-wave1-gate-reference-format-rejects-uid.md`
- `_backlog/bugs/BUG-086-isCountable-requires-core-content-capture.md`
- `_backlog/bugs/BUG-087-depth-review-source-claims-need-ledger-cache-trails.md`
- `_backlog/bugs/BUG-088-output-declarations-not-recoverable.md`
- `_backlog/bugs/BUG-089-submit-rejects-source-ref-not-in-output-files.md`

## What Changes

- 把 rerun 收敛为 direct-fact classification，而不是第二套执行机制：`existing topic + valid coverage -> reuse`；`new topic + no coverage -> normal Topic pipeline`；`supplement -> normal supplementary demand`。不新增 rerun controller、mode、state、gate exception 或 provenance namespace。
- 让 canonical topic-state 的现有 renderer 为任何 `seed_binding:new` 生成完整、可 enrich/回填的共享 seed skeleton；Topic mutation 仍只拥有 plan + seed，不跨 owner 自动写 queue/work-unit/ledger。
- 让 Wave0/Wave1 Markdown 在增量入口重新使用正常 queue -> role probe -> work-unit claim -> real actor work -> dry-submit/submit -> ledger -> materialization -> inspect/gate 路径；合法 historical coverage 复用，orphan file 不追认。
- 让 queue/work-unit claim 明确区分 delegated owner mismatch、missing actor observation、unnecessary fallback 和真正 empty window；历史 batch 只做回归证明，不为 BUG 标题重写正确 allocator。
- 让 generated work-unit envelope 提供同一个 canonical absolute bundle root、immutable beacon binding、contract-derived Result JSON Starter 与 checklist；错误 nested root 的 existing-authority read 零写入。Strict actor/receipt/provenance binding 保留。
- 治理全部十个正式 Gate CLI，而不只Wave1现场：每个independent primary failure统一输出top-level `hints[]`，包含stable `rule_id`、`missing_fact`、authorized `write_to`和exact same-Gate `rerun`；pass时为空。Invalid input、definition/binding、handoff/status preflight、topic-state prerequisite和rule failure都走同一failed-result builder。现有`inspect/advice`兼容保留，但不再是唯一导航。
- 为每条active blocking Gate rule补静态`blocking_basis` enum与`repair.owner/write_to`契约，由`schema/contracts/gate-definition.mjs`中的一个Zod schema统一解析，并扩展GSK-011 active-rule/preflight no-bypass audit。Runtime loader、consistency validator、post-final rerun guard、work-unit hygiene validator与audit共享这个parser；post-final仍可hash raw bytes，但语义读取不保留`JSON.parse`旁路。Definition外的invocation/config/binding/handoff/status/routing/durability root由检测事实的现有helper直接返回同一structured finding，不建设中央root catalog。Rule的checked authority由existing `target`或check-specific `targets/fields/sources`描述；它们都不自动等于可写面。Status/trace/ledger/index/receipt/hash必须指向合法Engine operation或missing-contract boundary，不能建议手改。
- 泛化现有`wave-contract-findings.mjs` structured finding，而不新建平行failure object；从checker边界投影`failed_rule_ids/hints/inspect/advice`。Dynamic `write_to`模板必须在当前evaluation context解析成exact coordinate，`rerun`由checkpoint projector生成；wrapper不得从error string、legacy `failure_message`或target path反推hint。Structured root/masking决定primary顺序，退役error-string regex priority和inspect-prose attempt-trend fallback。不新增persistent lineage graph、generic repair controller或第二verdict。
- 把Gate definition的`failure_message`降为兼容展示并纳入非矛盾审计：不能与repair metadata冲突，不能建议手改Engine authority。Wave inspect的missing bundle、definition/config failure也输出统一JSON与`hints[]`；未知bundle只给required-argument command template，不伪造absolute path。
- 让 historical reference 的 `related_topic_uid` 与 legacy `related_topic` 通过一个 canonical resolver adapter 解析；八列 `_INDEX.md` 先验证 parent，再检查 row，避免一处 parent error 放大成几十条症状。
- 简化 Wave1 gate：`isCountable` 只判断 authority-selected reference 的 accepted status + parseable source URL；semantic section availability 由共享 `reference_format` 独立拥有；Key Facts 数量、固定 prose 长度、heading case/level/order 等表现偏好不再 blocking。删除 blocking `key_facts_min_lines` 重复规则；question-list四个semantic sections仍required，但固定顺序/heading表现不再blocking。
- 简化 Wave2 ledger section gate：六个semantic sections继续required且non-empty，历史`ledger_fixed_sections` rule id可兼容保留，但checker不再要求固定顺序、exact case或H2 level；missing section只返回一个semantic root。
- 简化 depth review：submitted ledger rows 是 source claims、accepted URLs、cache/degraded refs 的唯一 authority；Engine 从 `reviewed_work_unit_refs[]`、Wave0 source authority 和 profile 派生 cache mapping、novelty 与 floor。`depth-review.yaml` 只保留不可推导的 Phase judgment，旧复制字段兼容读取但不再决定 pass/fail。
- 为已经submitted但bundle ledger row丢失的work unit增加狭窄、显式、可审计的declaration recovery。Normal/late submit的prepare/dry-submit保持side-effect-free且不预计算final ledger hash；existing transaction lock内reload/revalidate并应用canonicalization后，生成唯一Engine submission timestamp、构造ledger row/hash并写入index/status/queue terminal surfaces，使normal row由现有direct owners确定重建。Late-submit只在现有index保存不可推导的reason/prior status/superseded retry IDs，不复制整行或建立shadow ledger。`recover-declaration`只恢复与既有index/status hash完全相同的原row，不重做研究、不完成queue、不接受new result、不改hash。Legacy证据不能复现原hash则block。Gate仍只认bundle ledger，并在缺行时先报一个parent root。
- 消除 supplementary submit 的 single-WU 假设：`source_claims[].source_ref` 可指向当前 output，或同 canonical Topic、same wave/kind 且role被当前kind contract的`prior_submitted_output_roles`明确授权的prior hash-valid submitted output；Wave1默认只授权`evidence_summary`。Filesystem-only、cross-topic、wrong-kind/role、unsubmitted和模糊匹配继续fail closed。当前attempt的新cache/degraded refs仍由当前result声明。
- 增加 focused regression 与一个 rerun `action:add` controlled real-Agent canary through Wave1，覆盖九个断点、正常首次运行无退化、真实 receipt/result/cache/trace，禁止手写 authority。
- 本 Change 修改 `DPT_FRAMEWORK/` 行为，目标版本为 **v0.28**；apply 阶段同步 `CHANGELOG.md` 与 `DPT_FRAMEWORK/RUN.md`。

最短合法闭环：已记录 rerun 语义 -> topic-state 原子提交完整 seed -> direct facts 分类 -> 新 Topic 回到正常 Wave0/Wave1 work-unit pipeline -> Engine 从 ledger/direct authority 计算 -> 所有正式Gate从shared root finding输出一个最近hint -> Agent修复authorized surface -> 重跑同一Gate checkpoint。

Direct Source of Record：`rb_plan.md#/topic_registry`、UID-bound seed、`rb_queue.json`、`_work_units/_index.json` + manifest/beacon/receipt/result、Engine-written `rb_output_declarations.jsonl`、submitted source/cache declarations、reference metadata + canonical topic resolver、accepted `_INDEX.md` table、profile/Wave0 source authority，以及active Gate definitions和检测definition外root的existing helper contracts。Checker/helper读取这些direct authorities后产生shared root findings；GSK-011只审计closure/no-bypass，不另存preflight truth。Findings与`hints[]`都只是feedback projection，不是runtime authority。Declaration recovery不增加ledger副本；normal重建使用现有direct owners，late-submit只补不可推导的minimal context。

Net simplification：删除/合并count内容启发式、blocking Key Facts数量、question-list固定顺序、Wave2 ledger ordered regex authority、depth-review ledger copies、多处raw topic-field reader、invalid index/declaration cascades、current-output-only/implicit-compatible source-ref假设、十个Gate wrapper的opaque/hand-built failure、central root catalog风险、target-string猜修复、error-string root priority和inspect-prose attempt比较；复用normal Topic pipeline、现有queue/work-unit/dry-submit/submit、ledger、topic-layout resolver、现有`wave-contract-findings`、detecting helpers与shared Gate result builder。新增rule repair metadata、kind-contract prior-role字段和一个`recover-declaration` operation；不新增平行failure shape、Gate、persistent hint state、ledger副本、controller或success authority。

责任边界：用户只决定新增 Topic 的语义、风险或权限；Agent 负责已授权的 apply input、enqueue/probe/claim、真实执行、same-candidate repair、submit、reference/depth materialization、declaration recovery 和同一 checkpoint 重试；Engine 负责 identity、schema、receipt、ledger/hash、queue postcondition、direct derivation 和 verdict。`human-directed` 不创造 permission、actor availability、provenance 或 recovery capability。

## Capabilities

### New Capabilities

- 无。复用现有 requirement ID；apply 时只更新已过时的 registry 摘要，不分配新 ID。

### Modified Capabilities

- `canonical-topic-state`: 新 Topic 使用完整共享 seed skeleton；historical binding 继续走 canonical layout resolver。
- `gate-skeleton`: 全十个正式Gate统一root-first `hints[]`、rule blocking/repair metadata、failed-result builder和definition/CLI/inventory防漏审计。
- `check-inspect-feedback`: 所有正式Gate的Markdown Controller优先消费`hints[]`，Agent执行已授权机械修复并重跑同一checkpoint；无合法动作时只暴露最小`missing_contract`边界。
- `research-wave-phase-content`: rerun 只分类，新 Topic 进入正常 Wave0/Wave1；Wave1 加载共享 reference template，depth review 不复制 ledger truth。
- `agentic-queue`: delegated/empty/actor-preflight claim 根因可区分并带一个准确 rerun。
- `delegated-work-units`: canonical bundle root、generated starter、dry-submit repair、可确定重建的declaration recovery与lineage-aware rejection。
- `subagent-node-contract`: supplementary source claim 可引用同 Topic、same wave/kind且role由kind contract明确授权的prior submitted output。
- `agent-output-declaration`: unified submission timestamp、minimal late-accept context和狭窄恢复契约。
- `work-unit-provenance-gate`: missing declaration parent short-circuit、恢复资格诊断和work-unit repair coordinates。
- `evidence-extraction`: countability 只做 accepted + parseable URL，不再做内容/表现启发式。
- `wave1-intake`: depth facts 从 reviewed submitted rows 派生；Phase-owned reference 使用实际加载的共享模板。
- `reference-flat-format`: UID/legacy binding 共用一个 resolver；semantic structure strict、Markdown presentation tolerant；index parent先短路。
- `rerun-topic-integration`: rerun复用normal reference contract；退役固定Key Facts数量与fixed-order presentation blocker，不保留rerun专用质量规则。
- `research-wave-gate-implementation`: 简化 count/depth rule，删除重复 blocker，inspect/gate共享root和contract-lineage feedback。
- `file-observability`: 使用同一 reference binding adapter，不再维护 raw-field identity truth。
- `cli-inspect-output-conventions`: 所有Wave blocking roots输出与formal Gate同源的`hints[]`，保持read-only与现有输出兼容。

## Impact

- Framework implementation：现有topic renderer/layout resolver、queue/work-unit envelope/index/validation/submit/inspect、ledger/provenance/depth/reference/count helpers、一个共享Zod Gate-definition contract及其全部production readers、`wave-contract-findings`、`gate-helpers-core`/handoff helpers、active Gate definitions与closure/no-bypass audit、十个Gate wrappers和Wave inspect；只新增work-unit owner内的狭窄declaration recovery operation，不新增root catalog/controller/daemon/retry tree。
- Agent control surface：十个正式Gate对应的`phase-instantiation.md`、`phase-hitl1.md`、`phase-setup.md`、`phase-seed-topics.md`、`phase-wave0.md`、`phase-wave1.md`、`phase-wave2.md`、`phase-hitl2.md`、`phase-readiness.md`、`phase-rerun.md`，以及`shared-subagent-protocol.md`、`shared-reference-template` requires和必要command playbook wording。只统一failure consumption，不改变phase语义、HITL placement或routing。
- Regression：root `tests/` 下的 focused unit/integration；不在 `DPT_FRAMEWORK/` 放测试。
- Controlled evidence：历史正常前置 fixture + 真实 sanctioned rerun add；新 Topic 的新 evidence/result/receipt/cache/reference/depth review 必须来自真实 Agent/work-unit execution。无真实 actor 为 `NOT_RUN`，不算 PASS。
- Governance/release：更新GSK-002/003/004与EEX-001 registry过时摘要，补齐十Gate definition/CLI/rule closure与preflight no-bypass audit；运行两项governance checks、strict OpenSpec validation、v0.28 release同步。
- 不改变正常首次运行路由、schema/receipt/ledger/provenance fail-closed底线、HITL placement、Wave floors来源或批准依赖；不自动迁移/修改production bundle，不读取归档，不允许post-hoc provenance fabrication。
