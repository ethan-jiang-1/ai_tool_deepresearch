# Active Bugs — 活跃 bug 列表

> 最后更新: 2026-07-29 | `_backlog/bugs/` — 活跃 bug 在此
>
> **bug 编号权威在 `_done/_fixed_bugs/`，新 bug = 最大编号 + 1。** 本文件只列活跃 bug。

## 修完一个 bug 的步骤

1. `git mv bugs/BUG-<NNN>-<slug>.md _done/_fixed_bugs/BUG-<NNN>-<slug>.md`
2. 更新 `_done/_fixed_bugs/README.md`（加表格行 + 更新 Next available bug ID）
3. 更新本文件（删掉该 bug）
4. 更新 `../_done/README.md`（计数 +1）

---

## 活跃列表

> **当前优先级：没有已验证的活跃 P1 implementation defect。** 先通过真实 bundle 让 work-unit、evidence-production 与 Gate 路径稳定、可重复运行；只对由该运行产生的 fresh direct root 提出下一个 change。下表的 P2/P3 卡不能替代这项运行证据。

| Bug | Severity | Phase | 简述 |
|-----|----------|-------|------|
| [BUG-099](BUG-099-stop-no-agent-halted-at-wave0.md) | P2 | wave0 | deferred operability：`stop: no` phase agent 在 wave0 主动停下，当前可由一次用户续跑恢复，不阻塞核心 bundle contract 可达性 |
| [BUG-104](BUG-104-enter-phase-context-pollution.md) | P2 | 跨 phase | enter-phase 每次渲染完整 shared context 造成累积 context 压力 |
| [BUG-106](BUG-106-stop-no-violation-repeats-agent-reports-instead-of-executes.md) | P2 | wave0→wave1 | deferred operability：agent 输出总结而未执行下一 phase，当前可由一次用户续跑恢复 |
| [BUG-143](BUG-143-hitl1-research-access-host-surface-gap.md) | P2 | hitl1 | HITL1 将 Claude 的 WebSearch/WebFetch 名称当成隐含能力入口，缺少 Codex 等价 search/fetch Adapter，导致 access Gate 在 Setup 前阻断 |
| [BUG-146](BUG-146-wave0-reference-return-map-contract-collision.md) | P2 | wave0 | Rich shared reference 只满足 reference contract，却被 Wave0 inspect 当成 return-map 文档强制缺失五个 entry 字段，阻断 closeout |
| [BUG-148](BUG-148-concurrent-work-unit-submit-lock-surface.md) | P2 | wave0 | 并行 formal submit 遇到单锁只返回裸 `.lock`/`EEXIST`，没有 structured retry，导致 claimed lease 过期级联 |
| [BUG-150](BUG-150-wave0-inspect-help-treated-as-bundle.md) | P2 | wave0 | `inspect-wave0-output --help` 被当成 bundle 路径，返回误导性的 topic-registry 业务 blocker 而不是调用错误 |
| [BUG-151](BUG-151-wave0-supplement-live-source-array-provenance-drift.md) | P2 | wave0 | supplementary append 改变历史 source.yaml 的 live cardinality，inspect 要求把新候选错误归属给旧 work ID |
| [BUG-152](BUG-152-wave0-topic-state-projection-upsert-concatenates-entries.md) | P2 | wave0 | topic-state projection upsert 粘连相邻 entry，导致合法 Seed Topic projection 被解析成缺字段 |
| [BUG-153](BUG-153-operate-topic-state-opaque-validation.md) | P1 | hitl1, seed-topics | operate-topic-state apply Zod 校验失败只返回 "Invalid input"，无字段级错误详情，Agent 必须 grep Engine 源码才能发现 schema |
| [BUG-154](BUG-154-seed-body-duplication-after-edit.md) | P2 | seed-topics | seed topic 文件经 Agent Edit 后残留旧 template pending 内容，body 出现重复段落（enrichment + old ghost） |
| [BUG-155](BUG-155-plan-hostfile-sections-missing.md) | P2 | hitl1 | phase-hitl1.md 引用的 `plan-hostfile-sections.mjs` CLI 不存在，对应模块只在 `engine/helpers/` 下 |
| [BUG-156](BUG-156-enter-phase-output-overload.md) | P2 | 跨 phase | enter-phase 拼接所有 shared 文件输出 36KB+，continuation cue 被淹没，每次 phase 切换需额外 Read |
| [BUG-157](BUG-157-research-style-params-stale-pre-topic.md) | P2 | hitl1 | research_style_params 在 topic_count=0 时首次计算，topic-state apply 后仅靠 follow_up 字符串提醒重算 |
| [BUG-158](BUG-158-operate-topic-state-context-dependent-schema.md) | P1 | hitl1, seed-topics | operate-topic-state apply 的 JSON schema 随 context 字段切换（hitl1/seed_topics/wave_projection），零可发现性 |
| [BUG-159](BUG-159-advance-status-ordering-contract.md) | P3 | setup, seed-topics | advance-status 必须在 gate 前运行，但 phase 文档只记录 enter-phase 后的执行顺序，导致每 phase 多 1 次 repair |
| [BUG-160](BUG-160-no-help-output-for-engine-clis.md) | P3 | 跨 phase | operate-topic-state 和 operate-queue CLI 无 --help/usage 输出，拒绝 --help 为 invalid_invocation |
| [BUG-162](BUG-162-wave1-artifact-return-map-parser-collision.md) | P1 | wave1 | `inspectWaveArtifactReturnMaps` 对 wave1 `evidence-summary.md`/`question-list.md` 套用 Seed return-map 语法，标准已提交 artifact 因字段缺失被阻断（Wave1 版 BUG-134；`return-map.mjs:1087-1093`） |
| [BUG-170](BUG-170-wave0-subagent-deadlock.md) | P1 | wave0 | **CCDS4** dpt-source-intake sub-agent 在 work_started/fetch_batch_started 停滞，不产出 result.json；Phase Agent 被迫手动写所有 artifact |
| [BUG-171](BUG-171-claim-actor-reason-code-opaque.md) | P1 | wave0 | **CCDS4** operate-work-unit claim 的 reason_code 必须精确匹配 enum，错误信息虽列出合法值但埋在 nested JSON 深处 |
| [BUG-172](BUG-172-reference-yaml-frontmatter-rejected.md) | P2 | wave0 | **CCDS4** reference .md 文件的 YAML frontmatter 被 inspect 拒绝——只允许纯 prose body，与 seed_topics 格式矛盾 |
| [BUG-173](BUG-173-cache-trail-requirements-undocumented.md) | P2 | wave0 | **CCDS4** cache trail 要求（websearch.json+page.md+meta.json 每个 dir）在 task.md 中被合同语言淹没 |
| [BUG-174](BUG-174-phase-agent-subagent-result-collision.md) | P2 | wave0 | **CCDS4** Phase Agent 提前 submit 后，sub-agent 完成时遭遇 "already submitted"——更丰富的 sub-agent 产出被丢弃 |
| [BUG-175](BUG-175-count-floors-as-absolute-gate-blockers.md) | P2 | wave0 | **CCDS4** per_topic=10 + shared_ref=9 是硬 blocker，无 degradation 路径；exploratory_map 实际需要 59 个 source 条目 |
| [BUG-176](BUG-176-seed-projection-entry-ref-validation.md) | P2 | wave0 | **CCDS4** projection entry refs 必须指向已存在的文件——命名细微差异（1 vs 01）导致所有 projection apply 级联失败 |
| [BUG-177](BUG-177-timeout-preflight-ambiguous-recommendations.md) | P3 | wave0 | **CCDS4** timeout-preflight 对相似状态的 work unit 给出矛盾建议（submit vs wait），无诊断解释 |
| [BUG-178](BUG-178-check-reentry-phase-owned-reference-audit-gap.md) | P2 | wave0→wave1 reentry | check-reentry 仍要求 Phase-owned submitted-backed reference 直接出现在 delegated ledger，阻断合法 closeout 后的 reentry audit |

### 本批次模型与归因说明（2026-07-29）

本批次由当前 Coding Agent 会话发现/推进：运行时可见身份为 Codex，模型族标识为
GPT-5；精确 deployment/model ID 未暴露。Wave0 delegated actor 的具体模型也没有写入
work-unit receipt/ledger，因此不能把每个 actor 行为归因到某个更细型号。各卡新增的
“模型与归因备注”把可由更强 Agent guidance 避免的执行错误，与必须修 framework
contract/evaluator/writer 的确定性缺陷分开记录；本批次不因模型怀疑而修改框架代码。

### 弱模型执行问题挂起 → `_done/_suspened_bugs/`（2026-07-29）

经代码核实，BUG-144/145/147/149/161/163 共 6 个的触发点是**弱模型执行问题**（强模型按既有 contract 不会触发），不是确定性 framework 缺陷，已移至 [`../_done/_suspened_bugs/`](../_done/_suspened_bugs/)，留作 actor-guidance 参考，不作为活跃 implementation defect 处理：

| Bug | 弱模型触发点（非框架缺陷） |
|-----|----------------------------|
| BUG-144 | 误把 optional shared reference 放进 `required_receipts`（task-card 构造错误；Engine fail-closed 正确） |
| BUG-145 | 把 JSONL 行分隔写成字面量 `\n` 而非真实换行（卡片自评"最像弱模型/执行纪律不足"） |
| BUG-147 | result.json 非原子写入，dry-submit 读到瞬时 partial 并报 `invalid_result`（重读即合法） |
| BUG-149 | 把已知 404 的 `openspec.dev/docs/concepts` 当 primary source 且未进 `cache_trails` |
| BUG-161 | actor 把 evidence particle 返回 parent 而非写 durable 文件（contract 已规定 actor owns writes） |
| BUG-163 | 同一 role 下 i0001/i0002 成功写 bundle，i0003/i0005 却臆造"contract 禁止 durable 写"——模型自造约束 |

### CCDS4 批次（2026-07-29）

BUG-153 至 BUG-160 共 8 个 bug 来自 **CCDS4**（Claude Code + DeepSeek v4[1m]）对
`dpt_rb_ai-agent-dev-methods-comparison` bundle 的 HITL1→seed-topics 运行。这是一次
真实的 exploratory_map 研究（AI Coding 方法论全景对比），运行至 seed-topics queue
drain 阶段。8 个 bug 均为 framework DX/contract 层面的确定性缺陷，不是模型特定行为：

| # | 类别 | 简述 |
|---|------|------|
| BUG-153 | P1 校验反馈 | operate-topic-state Zod 校验错误不透明 |
| BUG-154 | P2 模板设计 | seed body Edit 后残留重复 pending 段落 |
| BUG-155 | P2 CLI 缺失 | plan-hostfile-sections.mjs CLI 不存在 |
| BUG-156 | P2 输出设计 | enter-phase 输出 36KB+，cue 被淹没 |
| BUG-157 | P2 参数一致性 | research_style_params topic_count=0 时预计算 |
| BUG-158 | P1 Schema 可发现性 | context 字段切换四种不同 schema，零文档 |
| BUG-159 | P3 文档契约 | advance-status 前置条件未写入 phase §5 |
| BUG-160 | P3 CLI 可用性 | operate-topic-state/queue 无 --help |

> BUG-099/104/106 不在 Wave execution/gate remediation 范围内，由 [`silent-autonomous-execution`](../plans/silent-autonomous-execution.md) 计划承接，均 deferred 于核心 work-unit / evidence / Gate 运行路径稳定之后。BUG-129/130/131/142 已移至 `../_done/_suspened_bugs/`：它们分别等待当前真实反例、产品策略决定或有效 current-head Agent-flow observation，不是活跃 implementation defect。

**Next available bug ID: BUG-179**

## BUG-132–137 接手地图

这些卡来自两次真实 bundle run，不是一个可用“补几个 Markdown”关闭的单一问题。
所有 framework 修复都必须先走 OpenSpec propose/explore，再按批准 task apply；当前
bundle 的 evidence、ledger、receipt、trace 不能为方便修复而手改。

| Workstream | Bugs | 建议入口 | 不能误关的边界 |
| --- | --- | --- | --- |
| Seed projection completeness | BUG-132 (closed) | `work-unit-projection.mjs`、`return-map.mjs` | `make-wave0-candidate-projection-complete` 已归档：一个当前 source-array position 对应一个 exact candidate coordinate，不新增 evidence authority。 |
| Wave1 reference materialization | BUG-133 / BUG-136 / BUG-137 (fixed) | `phase-wave1.md`、reference convergence/index sync、existing queue demand | v0.55 closes canonical identity, index synchronization, and true-deficit objective without a new controller or evidence authority. |
| Wave2 return-map scope | BUG-134 (fixed) | `inspect-wave2-output.mjs`、`inspectWaveArtifactReturnMaps` | v0.56 移除错误 phase-artifact parser branch；Seed Topic Wave2 projection 检查与 artifact contracts 保持独立 |
| Terminal lifecycle | BUG-135 (fixed) | `advance-status.mjs`、RunState schema | v0.57 在现有 terminal transaction 中原子写入 `completed`；不重定义中间 state 或 post-final recovery |

每张卡末尾的“接手信息”列出已运行的 red loop（或明确记录当前是缺失的 false-pass
seam）、owner、non-goal 与 regression completion criteria。下一位 Agent 应先读相关
卡的这一节，再决定是否将相邻卡放进同一个有界 change。

### 活态重验约定

卡片中的 bundle 证据是发现时的 runtime snapshot；bundle 本身可以在不改 framework
的情况下继续被合法 materialize、repair 或加入 workaround。接手时先重跑卡中命令，
并把当前结果与卡片快照区分开：一个已变绿的 mutable bundle 不能单独关闭“缺少
deterministic repair path / evaluator scope”的 framework bug；相反，不能复现时应先
把历史最小情形做成 disposable fixture，再决定 proposal 的边界。

## 最近关闭 (2026-07-27)

## 最近关闭 (2026-07-29)

| Bug | 结案依据 |
|-----|----------|
| BUG-139 / BUG-140 | `harden-dpt-research-entry-routing` 已 archive：repository-owned DPT entry-first routing 禁止 entry 前 generic shortcut、direct search/fetch 和手工 synthesis；不声称 host matcher/tool suppression。 |
| BUG-141 | `make-wave-gate-verdict-unambiguous` 已 archive（commit `e2c281133`）：blocking failure、clean pass 和 degraded handoff 的 public verdict 互斥。 |

## 最近关闭 (2026-07-28)

| Bug | 结案依据 |
|-----|----------|
| BUG-138 | `fix-seed-topic-projection-materialization` 已 archive（commit `9953435a3`）：route-bound packet writer 原子 materialize owned Seed Topic slots，template 与 command protocol 分离，inspect/gate 共用 direct readiness；验收为静态契约和确定性 production-CLI Wave 链，不保留嵌套 Agent-flow 测试负债。 |
| BUG-132 | `make-wave0-candidate-projection-complete` 已 archive：Wave0 当前 `source.yaml` 的每个已验证数组位置都须有 exact `<work_id>/<ordinal>` entry 或 deferred disposition；65/65 focused checks、7/7 version checks 与 package/governance/strict validation 通过。 |
| BUG-133 / BUG-136 / BUG-137 | `converge-wave1-reference-projections` 已 archive（v0.55）：canonical submitted-backing Wave1 projection convergence、all-family CAS index sync、以及 true-deficit supplementary objective；56 focused unit/integration checks 和 routing/requirements/spec governance 均通过。 |
| BUG-134 | `scope-wave2-return-map-inspection` 已 archive（v0.56）：Wave2 artifact 不再进入 Seed Topic return-map parser；67 focused unit/integration checks、routing assets、requirements/spec governance 与 strict OpenSpec validation 均通过。 |
| BUG-135 | `complete-terminal-readiness-status` 已 archive（v0.57）：normal readiness-to-Final status transaction 原子写入 terminal triple；21 focused integration checks、routing assets、requirements/spec governance 与 strict OpenSpec validation 均通过。 |

## 最近关闭 (2026-07-27)

以下记录已移入 [`../_done/_fixed_bugs/`](../_done/_fixed_bugs/)；总收口、D1 policy 与 I1/I2 的未来触发条件见 [CLS-037](../_done/_closed_plans/evidence-production-and-phase-projection-boundaries.md)：

| Bug | 结案依据 |
|-----|----------|
| BUG-124 | `align-wave0-shared-reference-guidance`（v0.52）修正 Phase Agent guidance/repair feedback，并覆盖合法 submitted shared-reference producer 路径 |
| BUG-125 | `converge-queue-demand-admission` 统一 enqueue/check/claim 的 current-facts admission，并扩展现有 stale repair |
| BUG-126 / BUG-127 | `canonical-seed-authoring` 建立唯一 structured `enrich_seed` writer、canonical binding 与 authoring feedback |
| BUG-128 | D1 明确保留 `claim_verification` 的 `6 + 2 x topics` floor，接受其 eligible-degradation 成本；这是产品 policy 结案，不新增 producer/threshold change |

## 最近关闭 (2026-07-25)

以下记录已移入 [`../_done/_fixed_bugs/`](../_done/_fixed_bugs/)；完整的 authority/disposition 边界见 [`../_done/_closed_plans/delegated-work-operability-and-gate-truth.md`](../_done/_closed_plans/delegated-work-operability-and-gate-truth.md)：

| Bug | 结案依据 |
|-----|----------|
| BUG-114 / BUG-115 | `make-delegated-work-contracts-constructible` 已归档；真实 actor 行为保留为 `NOT_RUN`，不作伪造证明 |
| BUG-116 / BUG-119 / BUG-122 | 新鲜 disposable-bundle queue evidence 与 current focused regressions 未复现历史 defect |
| BUG-117 | provenance Gate 的 fail-closed 是正确的 integrity boundary，不建立 degraded bypass |
| BUG-118 | `make-terminal-work-replacement-direct` 已归档，提供 terminal snapshot -> successor demand -> normal claim 路径 |
| BUG-120 | `make-wave-producer-contract-and-closeout-direct` 已交付 Wave1 reference guidance；真实 `case-225` 保留为独立内容验证，不作为未修 bug |
| BUG-121 | 高 attempt 下修正 direct fact 后，当前 Gate evaluation 未复现 stale verdict |
| BUG-123 | supplementary Wave1 `claim -> submit -> Gate` 已通过，新增 immutable row 满足新 source，而非修改历史 declaration |

## 最近关闭 (2026-07-24)

BUG-100–102、105、107–113（共 11 个）随 Wave execution and gate remediation 三个 OpenSpec change 全部 archive 关闭，已移入 [`../_done/_fixed_bugs/`](../_done/_fixed_bugs/)：

| Bug | Change | Commit | 收口 |
|-----|--------|--------|------|
| BUG-100 / 101 / 102 | `make-pre-wave-readiness-feedback-direct` | `542f7833a` | pre-Wave readiness（access probe / topic-state apply / seed YAML）前移到唯一合法 producer 路径 |
| BUG-105 / 107 / 108 / 111 / 112 | `make-wave-producer-contract-and-closeout-direct` | `d65fe538a` | producer 契约 + dry-submit→formal submit + Phase-owned closeout；canonical/rich/backing 分离诊断 |
| BUG-109 / 110 / 113 | `simplify-wave-gate-feedback-and-degradation-policy` | `6e47de3ea` | 最小独立根因投影 + 共享 metadata-backed degradation policy；BUG-110 既有 fail-closed 正确，仅回归锁定 |

完整 review context：[`../_done/_closed_plans/wave-execution-and-gate-remediation.md`](../_done/_closed_plans/wave-execution-and-gate-remediation.md)。

## 最近关闭 (2026-07-20)

| Bug | Change | 简述 |
|-----|--------|------|
| BUG-092 | `restore-section-scoped-seed-projection-contract` (v0.35, `af5e6018c`) | Wave inspect 改为目标 section 隔离校验，并逐条绑定 current-round row/finding；原跨 section false pass 已有 unit、CLI integration 与 deterministic E2E 证据 |
| BUG-093 | `centralize-seed-topic-authoring-contracts` (v0.36, `29c90d0c1`) | Shared seed/return-map authoring contracts and renderer parity close the real definition-drift issue; headers and historical bundles remain unchanged, and consumed tokens are normal terminal state |
| BUG-094 | `centralize-seed-topic-authoring-contracts` (v0.36, `29c90d0c1`) | Canonical rerun direction is atomically published and structurally checked; legacy presentation remains tolerated and guidance semantics stay Agent-owned |
| BUG-095 | `harden-bundle-creator-arguments` (v0.37, `7ad92777b`) | disposable/production creator 在写入前严格解析 argv；`--help` 零写入，非法参数早期拒绝，literal target path 以 argument vector 验证 |

---

## 最近批量修复 (2026-07-15)

BUG-081 … BUG-089 随 `repair-rerun-added-topic-bootstrap` archive（`80d0c9e83`，v0.28）关闭：

| Bug | 简述 | 收口 |
|-----|------|------|
| BUG-081 | `add_topic` seed 骨架过薄 | 完整 canonical seed renderer + wave tokens |
| BUG-082 | rerun 新 topic 缺 Wave0 work-unit provenance | 走 normal queue → claim → submit → gate |
| BUG-083 | claim 混淆 delegated / empty / fallback | root-first claim diagnostic |
| BUG-084 | submit 交叉校验难手工满足 | Result Starter + dry-submit roots + repair surface |
| BUG-085 | reference_format 拒 `related_topic_uid` | 统一 UID/legacy binding adapter |
| BUG-086 | isCountable 与模板 section 不一致 | count 只读 accepted + parseable URL |
| BUG-087 | depth-review 重抄 ledger cache trails | Engine 从 reviewed submitted rows 派生 |
| BUG-088 | output declarations 不可恢复 | `recover-declaration` hash-identical 恢复 |
| BUG-089 | submit 拒 prior submitted source_ref | same topic/wave/kind authorized prior role |

后续 `seed-backfill-round-continuity` 处理多轮 projection authority（非上述编号关闭范围）。`formalize-verification-routing` 只定测试路由，不关业务 bug。

### 最近批量修复 (2026-07-13)

BUG-079 / BUG-080 随 C1–C5 路线全部 archive 后关闭：
- **BUG-079**: C1 可检测隐形 topic/drift，C3/C5 使新增 scope 只能 canonical-or-blocked，case-317 证明无 addendum 成功路径。历史 addendum 的 adopt 需通过 C3 `migrate_legacy`，不由 C5 自动处理。
- **BUG-080**: 合法 rerun 路径（C5→C3→phase-rerun→seed-topics→wave0→wave1→wave2）已恢复，Agent 走正常 pipeline 时逐 topic seed backfill 和 reference 物化自然执行。add_topic seed body 质量属 Agent guidance 持续改进范围，非 Engine 结构性缺口。

### 最近批量修复 (2026-07-08)

### 第三批 (2026-07-08) — 3 个 OpenSpec change，9 个 bug

| Bug | Change | 简述 |
|-----|--------|------|
| BUG-045 | harden-run-entry-and-bundle-map | deep-research skill 覆盖框架入口路由 |
| BUG-046 | parallel-delegated-phase-execution-and-reference-materialization | Wave0 串行 claim，无并行 |
| BUG-059 | stabilize-work-unit-submit-and-gate-handoff | CLI `--help` 创建垃圾目录 |
| BUG-060 | stabilize-work-unit-submit-and-gate-handoff | sub-agent/Engine contract 系统性 mismatch |
| BUG-061 | harden-run-entry-and-bundle-map | START_FROM_HERE.md 误导性名字和定位 |
| BUG-062 | parallel-delegated-phase-execution-and-reference-materialization | Phase Agent 被动等待不轮询 |
| BUG-063 | stabilize-work-unit-submit-and-gate-handoff | Gate failure 手动修复级联跳过 wave2 |
| BUG-064 | parallel-delegated-phase-execution-and-reference-materialization | Wave1 reference 文件未产出 |
| BUG-065 | parallel-delegated-phase-execution-and-reference-materialization | Wave2 cross-reference 从未产出 |

### 第二批 (2026-07-08) — 3 个 OpenSpec change，12 个 bug

| Bug | Change | 简述 |
|-----|--------|------|
| BUG-044 | stabilize-runtime-position-and-queue | work-unit submit 后 queue stale |
| BUG-047 | simple-gate-quality-loop | stop:no 在 gate fatigue 后浮出水面 |
| BUG-048 | simple-gate-quality-loop | gate 不可通过时无降级推进路径 |
| BUG-049 | simple-gate-quality-loop | Agent 在 gate 卡住后跳过 wave1/wave2 |
| BUG-050 | simple-gate-quality-loop | content_dedup 假阳性 |
| BUG-051 | simple-gate-quality-loop | 手动改 ledger 触发级联 distrust |
| BUG-052 | harden-run-entry-and-bundle-map | Agent 默认使用 Python 而非 Node.js |
| BUG-053 | simple-gate-quality-loop | gate provenance chain 太脆弱 |
| BUG-054 | restore-wave-depth-contracts | Wave1 sub-agent 不做深度发掘 |
| BUG-055 | restore-wave-depth-contracts | Wave2 跳过 cross-topic synthesis |
| BUG-056 | stabilize-runtime-position-and-queue | queue slug derivation 阻止补充 task |
| BUG-057 | stabilize-runtime-position-and-queue | rb_status.json 缺少 current_node |
| BUG-058 | restore-wave-depth-contracts | Wave1 cache trails 太薄 |
