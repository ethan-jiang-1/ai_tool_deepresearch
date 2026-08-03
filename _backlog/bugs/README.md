# Active Bugs — 活跃 bug 列表

> 最后更新: 2026-07-31 | `_backlog/bugs/` — 活跃 bug 在此
>
> **bug 编号权威在 `_done/_fixed_bugs/`，新 bug = 最大编号 + 1。** 本文件只列活跃 bug。

## 修完一个 bug 的步骤

1. `git mv bugs/BUG-<NNN>-<slug>.md _done/_fixed_bugs/BUG-<NNN>-<slug>.md`
2. 更新 `_done/_fixed_bugs/README.md`（加表格行 + 更新 Next available bug ID）
3. 更新本文件（删掉该 bug）
4. 更新 `../_done/README.md`（计数 +1）

---

## 活跃列表

> **当前优先级：没有已验证的活跃 framework implementation defect。** BUG-099/104/106 是旧 swarm
> incident 留下的 residual observation，等待 fresh current-head Phase-Agent `agent_flow_e2e`；当前 real-actor
> canary 是 host-scoped `NOT_RUN`，不能替代这一观察。BUG-175 等待 exploratory_map 质量阈值的政策决定。它们都不能替代新的 bundle direct root。

| Bug | Severity | Phase | 简述 |
|-----|----------|-------|------|
| [BUG-099](BUG-099-stop-no-agent-halted-at-wave0.md) | P2 | wave0 | historical `stop: no` halt observation；无 current-head Phase-Agent reproduction，real-actor canary 为 `NOT_RUN` |
| [BUG-104](BUG-104-enter-phase-context-pollution.md) | P2 | 跨 phase | historical repeated-rendering/context-pressure hypothesis；尚无 current-head causal evidence |
| [BUG-106](BUG-106-stop-no-violation-repeats-agent-reports-instead-of-executes.md) | P2 | wave0→wave1 | historical report-instead-of-execute observation；无 current-head Phase-Agent reproduction |
| [BUG-175](BUG-175-count-floors-as-absolute-gate-blockers.md) | P2 | wave0 | `exploratory_map` per-topic=10、shared=`4 + 1 * topic_count`；count-floor-only Gate failure 可在 fatigue threshold 后 degraded handoff，剩余问题是默认阈值校准 |
| [BUG-187](BUG-187-hitl1-capability-probe-opaque-to-user.md) | P3 | hitl1 | HITL1 §3d capability probe 对用户不可见——中性 probe search/curl fallback 暴露为会话噪音，`research_access` plumbing 与用户 HITL 决策混在 `rb_profile.yaml` |
| [BUG-188](BUG-188-subagent-wait-no-progress-visibility.md) | P3 | wave0 | sub-agent wait 无进度可见性——TUI 静态 "Waiting" 指示器与 agent freeze 无法区分；sub-agent 实际在活跃工作但用户无感知 |
| [BUG-189](BUG-189-shared-ref-count-floor-delegated-bypass.md) | P1 | wave0 | `shared_ref_count_floor` 把 Phase-Agent 直接产出的 reference 文件判为 `delegated_bypass` 不计入阈值；Phase Agent 无合法路径让 reference 计入 gate coverage |
| [BUG-190](BUG-190-source-identity-kind-naming-obscure.md) | P2 | wave0 | `source_identity.kind` discriminator 应为 `submitted_work` 而非直觉的 `work_unit`；error message 不列出合法值，每次浪费 1-3 个 repair cycle |
| [BUG-191](BUG-191-wave0-projection-ordinal-scaling.md) | P1 | wave0 | `return_map_current_candidate_omission` 要求每个 ordinal 位置都有 projection entry——85 sources 要手写 85 条 entry，O(N) 不可扩展 |
| [BUG-192](BUG-192-degraded-gate-triggers-de-facto-hitl.md) | P2 | wave0→wave1 | degraded gate pass + fatigue 组合触发 Agent 编造"跳过 wave1"选项并主动提 A/B choice——`stop: no` 违规 |
| [BUG-193](BUG-193-wave1-subagent-wait-no-progress-sibling.md) | P3 | wave1 | wave1 复现 BUG-188 同一 pattern——sub-agent wait 无进度可见性；确认 active-poll 契约 vs 阻塞 host wait 跨 phase 一致 |
| [BUG-194](BUG-194-wave1-assignment-mode-payload-location.md) | P2 | wave1 | `operate-queue.mjs enqueue` 拒绝 task card——`assignment_mode` 在顶层而非 payload 内；phase 指令模板含糊 |
| [BUG-195](BUG-195-wave1-source-claims-cache-trail-refs-missing.md) | P0 | wave1 | `dpt-evidence-extractor` 的 `source_claims[]` 缺 `cache_trail_refs`——dry-submit 报 `missing_cache` + `fail_and_replace`，5 个 topic 中 3 个命中 |
| [BUG-196](BUG-196-work-done-receipt-no-status-transition.md) | P1 | wave1 | `work_done` receipt 事件不把 work unit 从 `claimed` 转走——dry-submit 在 sub-agent 完成后仍返回 `return_to_actor` |
| [BUG-197](BUG-197-wave1-queue-blocks-reenqueue-after-failure.md) | P0 | wave1 | work-unit fail 后无法对同一 topic 重新 enqueue——`assignment contract rejected: primary Wave1 assignment receipt shape is invalid or duplicated`，无 gate repair 路径 |
| [BUG-198](BUG-198-phase-agent-direct-search-no-subagent.md) | P2 | wave2 | Phase Agent 在 `work_unit_required_for_new_evidence` 阶段直接 WebSearch——应 spawn sub-agent 而非主 agent 搜索；degraded mode 导致 contract 遗忘 |
| [BUG-199](BUG-199-synthesis-no-evidence-citations.md) | P1 | final | `final/synthesis-2026-08-03.md` 声称 evidence-backed 但全文 0 处证据引用；wave1 topic 01/03/05 证据文件在磁盘但 work unit failed 未 submit |

## 最近关闭 (2026-07-31)

以下记录已移入 [`../_done/_fixed_bugs/`](../_done/_fixed_bugs/)：

| Bug | 结案依据 |
|-----|----------|
| BUG-143 | `connect-hitl1-research-access-by-semantic-capability` 已 archive（`44bf1fe58`）：DPT 的 semantic adapter、same-URL binding 和 honest unavailable path 已交付；selected host 的 available claim 保持 `NOT_RUN`。 |
| BUG-146 / BUG-162 / BUG-172 / BUG-178 | `converge-artifact-contract-evaluators` 已 archive：reference、Wave artifact、Seed projection 与 reentry 使用各自正确的 evaluator/authority scope。 |
| BUG-151 / BUG-152 / BUG-154 / BUG-157 / BUG-176 | `make-canonical-topic-state-projections-coherent` 已 archive：canonical writer、current contribution、template body、style freshness 和 projection navigation 都有单一合法路径。 |
| BUG-150 / BUG-153 / BUG-155 / BUG-156 / BUG-158 / BUG-159 / BUG-160 / BUG-171 / BUG-173 / BUG-177 / BUG-183 / BUG-184 | `make-agent-operation-contracts-direct` 已 archive（`177275226`）：Engine 直接 feedback、bounded entry、generated Completion Contract 与 batch omission feedback 已收敛；BUG-184 的 coverage policy 本身仍是独立用户决策。 |
| BUG-148 / BUG-174 / BUG-179 / BUG-180 / BUG-181 / BUG-182 / BUG-185 / BUG-186 | `make-work-unit-attempt-recovery-explicit` 已 archive（`9d87b5b52`）：attempt ownership、contention、integrity recovery、successor lineage 和 submit preflight 已有唯一 legal path。 |
| BUG-170 | `align-real-actor-canary-checkpoint-boundaries` 已 archive（`116e4087d`）：actor-only canary 不再把未建立的 Phase Gate 当作 handoff failure；host/model completion 保持 `NOT_RUN`，不添加 controller。 |

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

> BUG-099/104/106 不在 Wave execution/gate remediation 范围内，由 [`silent-autonomous-execution`](../plans/silent-autonomous-execution.md) 承接。现行 Chain/Queue/Work Unit contract 与 actor/Gate canary checkpoint 已收敛；残余问题只等待有效 current-head Phase-Agent observation，不再以“核心路径先稳定”为 reopen 条件。BUG-129/130/131/142 已移至 `../_done/_suspened_bugs/`：它们分别等待当前真实反例、产品策略决定或有效 current-head Agent-flow observation，不是活跃 implementation defect。

**Next available bug ID: BUG-187**

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
