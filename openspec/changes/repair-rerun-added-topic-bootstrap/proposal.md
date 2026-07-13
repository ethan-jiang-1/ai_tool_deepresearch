## Why

Sanctioned rerun 在一份已经正常完成过 Wave0/Wave1 的 bundle 上新增 Topic 时，没有把新 Topic 送回正常 Topic pipeline，而是让 Agent 落入一条增量断链：seed 过薄、Wave0 demand/provenance 入口不显眼、claim/submit 反馈要求猜内部 binding、reference UID 与旧 reader 漂移、count 与 format 重复做内容启发式、depth review 重抄 ledger、丢失 declaration 无合法恢复、supplementary source claim 又被单 work-unit 假设拒绝。

这不是九个互不相干的补丁点。正常首次运行已经具备可工作的 seed enrichment、queue/work-unit、submit、reference materialization、depth review 和 gate 路径；rerun 新 Topic 应像正常 Topic 一样执行。九个 BUG 共同暴露的是：rerun 没有回到正常 producer path，而历史 gate/submit 还叠加了重复 authority、过严表现规则和不透明 rejection。

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
- 让 dry-submit/submit 与本 Change 触碰的 inspect/gate rejection 返回 Engine 已知的 contract lineage：`missing_fact`、`write_to`、`rerun`。这是既有 checker 的只读反馈坐标，不建设 generic repair controller、全局 lineage state 或第二 validator。
- 让 historical reference 的 `related_topic_uid` 与 legacy `related_topic` 通过一个 canonical resolver adapter 解析；八列 `_INDEX.md` 先验证 parent，再检查 row，避免一处 parent error 放大成几十条症状。
- 简化 Wave1 gate：`isCountable` 只判断 authority-selected reference 的 accepted status + parseable source URL；semantic section availability 由共享 `reference_format` 独立拥有；Key Facts 数量、固定 prose 长度、heading case/level/order 等表现偏好不再 blocking。删除 blocking `key_facts_min_lines` 重复规则。
- 简化 depth review：submitted ledger rows 是 source claims、accepted URLs、cache/degraded refs 的唯一 authority；Engine 从 `reviewed_work_unit_refs[]`、Wave0 source authority 和 profile 派生 cache mapping、novelty 与 floor。`depth-review.yaml` 只保留不可推导的 Phase judgment，旧复制字段兼容读取但不再决定 pass/fail。
- 为已经 submitted 但 bundle ledger row 丢失的 work unit 增加一个狭窄、显式、可审计的 declaration recovery：submit 持久化 exact Engine-owned recovery witness；现有 work-unit owner 提供 `recover-declaration`，仅恢复缺行，不重做研究、不完成 queue、不接受新 result。Gate 仍只认 bundle ledger，并在缺行时先报一个 parent root。
- 消除 supplementary submit 的 single-WU 假设：`source_claims[].source_ref` 可指向当前 output，或同 canonical Topic、compatible Wave1 contract 的 prior hash-valid submitted output；filesystem-only、cross-topic、unsubmitted 和模糊匹配继续 fail closed。当前 attempt 的新 cache/degraded refs 仍由当前 result 声明。
- 增加 focused regression 与一个 rerun `action:add` controlled real-Agent canary through Wave1，覆盖九个断点、正常首次运行无退化、真实 receipt/result/cache/trace，禁止手写 authority。
- 本 Change 修改 `DPT_FRAMEWORK/` 行为，目标版本为 **v0.28**；apply 阶段同步 `CHANGELOG.md` 与 `DPT_FRAMEWORK/RUN.md`。

最短合法闭环：已记录 rerun 语义 -> topic-state 原子提交完整 seed -> direct facts 分类 -> 新 Topic 回到正常 Wave0/Wave1 work-unit pipeline -> Engine 从 ledger/direct authority 计算 -> 最早根因反馈 `missing_fact/write_to/rerun` -> Agent 修复同一授权 surface -> 重跑同一 checkpoint。

Direct Source of Record：`rb_plan.md#/topic_registry`、UID-bound seed、`rb_queue.json`、`_work_units/_index.json` + manifest/beacon/receipt/result、Engine-written `rb_output_declarations.jsonl`、submitted source/cache declarations、reference metadata + canonical topic resolver、accepted `_INDEX.md` table、profile/Wave0 source authority和existing inspect/gate evaluator。Recovery witness 只保存不可推导的 exact submitted row，不是 gate authority。

Net simplification：删除/合并 count 内容启发式、blocking Key Facts 数量、depth-review ledger copies、多处 raw topic-field reader、invalid index 的 row cascade、missing declaration 的 output/cache/count/bypass cascade、current-output-only source-ref 假设和 opaque first-error guessing；复用正常 Topic pipeline、现有 queue/work-unit/dry-submit/submit、ledger、topic-layout resolver和gate evaluator。唯一新增持久 surface/CLI 是 declaration recovery witness + `recover-declaration`，因为 exact accepted row 含不可从剩余 direct facts可靠重建的动态 hash input；它同时删除手写 hash/ledger 猜测路径，且失败时只有一个显式动作。

责任边界：用户只决定新增 Topic 的语义、风险或权限；Agent 负责已授权的 apply input、enqueue/probe/claim、真实执行、same-candidate repair、submit、reference/depth materialization、declaration recovery 和同一 checkpoint 重试；Engine 负责 identity、schema、receipt、ledger/hash、queue postcondition、direct derivation 和 verdict。`human-directed` 不创造 permission、actor availability、provenance 或 recovery capability。

## Capabilities

### New Capabilities

- 无。复用现有 requirement ID；apply 时只更新已过时的 registry 摘要，不分配新 ID。

### Modified Capabilities

- `canonical-topic-state`: 新 Topic 使用完整共享 seed skeleton；historical binding 继续走 canonical layout resolver。
- `research-wave-phase-content`: rerun 只分类，新 Topic 进入正常 Wave0/Wave1；Wave1 加载共享 reference template，depth review 不复制 ledger truth。
- `agentic-queue`: delegated/empty/actor-preflight claim 根因可区分并带一个准确 rerun。
- `delegated-work-units`: canonical bundle root、generated starter、dry-submit repair、declaration witness/recovery durability与lineage-aware rejection。
- `subagent-node-contract`: supplementary source claim 可引用同 Topic 的 prior compatible submitted output。
- `agent-output-declaration`: exact submitted declaration witness和狭窄恢复契约。
- `work-unit-provenance-gate`: missing declaration parent short-circuit、恢复资格诊断和work-unit repair coordinates。
- `evidence-extraction`: countability 只做 accepted + parseable URL，不再做内容/表现启发式。
- `wave1-intake`: depth facts 从 reviewed submitted rows 派生；Phase-owned reference 使用实际加载的共享模板。
- `reference-flat-format`: UID/legacy binding 共用一个 resolver；semantic structure strict、Markdown presentation tolerant；index parent先短路。
- `research-wave-gate-implementation`: 简化 count/depth rule，删除重复 blocker，inspect/gate共享root和contract-lineage feedback。
- `file-observability`: 使用同一 reference binding adapter，不再维护 raw-field identity truth。
- `cli-inspect-output-conventions`: affected blocking roots 暴露 `missing_fact/write_to/rerun`，保持read-only与现有输出兼容。

## Impact

- Framework implementation：现有 topic renderer/layout resolver、queue/work-unit envelope/index/validation/submit/inspect、ledger/provenance/depth/reference/count helpers、Wave inspect/gate CLIs；只新增 work-unit owner 内的狭窄 declaration recovery operation，不新增 controller/daemon/retry tree。
- Agent control surface：`phase-seed-topics.md`、`phase-wave0.md`、`phase-wave1.md`、`shared-subagent-protocol.md`、`shared-reference-template` requires和必要command playbook wording。
- Regression：root `tests/` 下的 focused unit/integration；不在 `DPT_FRAMEWORK/` 放测试。
- Controlled evidence：历史正常前置 fixture + 真实 sanctioned rerun add；新 Topic 的新 evidence/result/receipt/cache/reference/depth review 必须来自真实 Agent/work-unit execution。无真实 actor 为 `NOT_RUN`，不算 PASS。
- Governance/release：更新 EEX-001 registry摘要以移除已废弃启发式描述；运行两项 governance checks、strict OpenSpec validation、v0.28 release同步。
- 不改变正常首次运行路由、schema/receipt/ledger/provenance fail-closed底线、HITL placement、Wave floors来源或批准依赖；不自动迁移/修改production bundle，不读取归档，不允许post-hoc provenance fabrication。
