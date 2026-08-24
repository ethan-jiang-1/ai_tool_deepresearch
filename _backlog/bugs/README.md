# Active Bugs — 活跃 bug 列表

> 最后更新: 2026-08-24 | `_backlog/bugs/` — 活跃 bug 在此
>
> **bug 编号权威在 `_done/_fixed_bugs/`，新 bug = 最大编号 + 1。** 本文件只列活跃 bug。

## 修完一个 bug 的步骤

1. `git mv bugs/BUG-<NNN>-<slug>.md _done/_fixed_bugs/BUG-<NNN>-<slug>.md`
2. 更新 `_done/_fixed_bugs/README.md`（加表格行 + 更新 Next available bug ID）
3. 更新本文件（删掉该 bug）
4. 更新 `../_done/README.md`（计数 +1）

---

## 活跃列表

> BUG-200--204 已按 current-head evidence 和归档 remediation changes 结案。
> BUG-099/106 已按 2026-08-08 分诊移入 [`../_done/_suspended_bugs/`](../_done/_suspended_bugs/)（弱模型执行产物，非确定性框架缺陷）。
> BUG-225..231 已按 2026-08-17 结案并移入 [`../_done/_fixed_bugs/`](../_done/_fixed_bugs/)。
> BUG-232/233/234/236 已按 2026-08-19 结案并移入 [`../_done/_fixed_bugs/`](../_done/_fixed_bugs/)。

| Bug | Severity | Phase | 简述 |
|-----|----------|-------|------|
| [BUG-238](BUG-238-wave0-deferred-contribution-partial-projection-collision.md) | P2 | Wave0 | Wave0 deferred contribution 在部分显式投影后触发 `projection_deferred_contribution_collision`；Engine 行为与 accepted 原子整贡献规则一致，残余为 playbook DX 澄清，待下一 change。 |
| [BUG-239](BUG-239-wave1-submit-suspect-on-concurrent-receipt-write.md) | P2 | Wave1 | 并发 delegated receipt 写入导致另一 work-unit submit 事务误报 undeclared mutation 并进入 suspect，需 recover-transaction 后重试。 |

> BUG-237 已随 `2026-08-24-enforce-seed-initialization-body-completeness` 结案并移入
> [`../_done/_fixed_bugs/`](../_done/_fixed_bugs/)，见下方「最近关闭 (2026-08-24)」。

## 最近关闭 (2026-08-24)

| Bug | 结案依据 |
|-----|----------|
| BUG-237 | `2026-08-24-enforce-seed-initialization-body-completeness`：seed-topics-ready gate 对 current-marker seed 新增确定性模板占位检测（同一 `seed_initialization_structure` rule），拒绝「frontmatter enriched + body pending」半完成状态；phase task card/§3.1/§4 与 seed-topic-template 收紧显式 gap 形式；unit + gate CLI 集成 + 文档锁测试锁定；真实 bundle `dpt_rb_ai-coding-evolution` 五个 seed 初始化正文按 run contract 修复后通过新 evaluator（STM-010）。 |

## 最近关闭 (2026-08-19)

| Bug | 结案依据 |
|-----|----------|
| BUG-232 | `2026-08-19-fix-transaction-guards-and-wave0-reference-balance`：wave0 共享 reference 物化改为跨 topic 平衡选择（最少已投影 → `topic_slug` → 最低 retained ordinal），提取纯函数 `selectBalancedCandidate` 并以 round-robin 真值表 + CLI 集成测试锁定（RWG-022） |
| BUG-233 | 同上：多 orphan 场景收敛到单一确定性 recover 坐标（wrapper 依赖优先，`firstRecoverableOrphan` 按 v2-shape/started_at/tx_id 排序），recover 自身以 `orphanBlocking: 'none'` 运行解除互踢死锁（DEW-023） |
| BUG-234 | 同上：事务 authority surface 收窄到 `_work_units/**`（排除 lock 与当前 journal）+ 根 `rb_output_declarations.jsonl`；并发非授权写入（`_cache/`、`_scripts/`、`reference/`、`artifacts/`）不再误判 suspect（DEW-023） |
| BUG-236 | 同上：C5 事件改绑 primary-series digest（`final_inventory_basis: primary_series`），`proveNewerFinalAppend` 按 basis 证明 append；legacy 全树事件经 structural primary-series fallback 恢复——第二次 rerun 不再被 non-primary 漂移永久阻塞（POF-001） |

> 全量 `node --test` 3015/3015 0 fail；`openspec validate --strict`、governance checker 全绿；
> 4 份 delta spec 已同步 main specs 并 finalizer 17/17 归档。

## 最近关闭 (2026-08-17)

| Bug | 结案依据 |
|-----|----------|
| BUG-225 | `2026-08-17-repair-run-contract-surfaces`（`0e97d0774`）：claim stdout JSON 回归锁（SUD-008，wave0 delegated + wave1 fallback 两路径）+ `result_hash` 基准文档化 |
| BUG-226 | 同上：WNC-010 例外边界澄清（例外只豁免 advance-status 同步；enter-phase 仍是合法 loader）——phase 文档、`check-phase-node-structure.mjs` 机器 checker、`harness-entry-doc-consistency` 测试同步修正 |
| BUG-227 | 同上：envelope Available 示例单样本 `not_attempted` → `round_budget_not_attempted` + 文档锁 |
| BUG-228 | 同上：gate definition failure_message 声明 profile 阈值来源与 submitted-backing 计数口径 + 文档锁 |
| BUG-229 | 同上：phase-setup.md §3/§5/§6 与 PRP-003 delta 改为 pre-gate bootstrap 窗口语义 |
| BUG-230 | 同上：shared-schemas.md 标注 ledger/synthesis 必填 + resolution 非空 origin_refs + 文档锁 |
| BUG-231 | 同上：bundle `_scripts/` scaffold + README/BUNDLE_MAP/playbook/AGENTS+CLAUDE 落点规则 + gitignore 补丁移除 |

> 全量 `npm test` 2975/2975 0 fail；`openspec validate --strict`、六项 governance checker 与
> `git diff --check` 全绿；5 份 delta spec 已同步 main specs 并 finalizer 17/17 归档。

## 最近关闭 (2026-08-19)

| Bug | 结案依据 |
|-----|----------|
| BUG-235 | 用户指示归档；保留 post-final reentry `enter-phase` handoff 的真实 ERROR 与残余修复方向，未宣称代码已修复。 |

## 新增 (2026-08-17)

以下 6 个 bug 来自一次完整 real-actor Deep Research run
（`dpt_rb_ai-transformation-organization`，HITL1→Wave0→Wave1→Wave2→HITL2→Final，
当前为 pi/Codex 执行器、无 sub-agent 工具、全部委托走 phase_agent_fallback）。
Phase Agent 全程以「读引擎源码 + 试错 + 自我修复」绕过这些摩擦点完成交付；6 个均为
current-head 确定性框架/契约缺陷，附复现路径与实账影响。**本批 6 个 bug 已于 2026-08-17 随
`2026-08-17-repair-run-contract-surfaces` 全部修复并移入
[`../_done/_fixed_bugs/`](../_done/_fixed_bugs/)。**

非框架缺陷的 run 级观察（环境与 Agent 执行，不在此列）：

- **搜索表面中文本地化**（环境）：本机出口 IP 被 Bing 判定为中国区，`mkt/setlang/enus`
  参数无效，英文查询返回中文无关结果；英文文章级证据只能靠 `site:` 查询 + curated
  已知 URL 收集。websearch.json 如实记录了 degraded，但流程上无提示。
- **执行器自身脚本错误**（Agent 责任）：`.wu1-exec.mjs` 的 `cfg.max_sources || 0`
  短路 bug；以及因 BUG-225（claim 输出非合法 JSON）被迫用 grep 提取 work_id，
  在 claim 输出含历史 work id 时取错行，把补充证据写进已提交的
  `wu-w1-b000-deep-i0001/0002`（已从 ledger 逐字段重建 result.json + 重抓 cache leaf
  恢复，并验证 stableStringify hash 与 ledger `result_hash` 一致；hash 基准本身
  也无文档，见 BUG-225 附带建议）。
- **supplementary wave1 source_ref 授权**（Agent 责任为主）：首次把
  `_cache/wave1/primary/{topic}` 当 source_ref 被 `source_ref_not_authorized` 拒绝；
  反馈文本已明确列出合法选项（current assigned output 或 prior same-topic
  evidence_summary），属于 Agent 未先读 task.md 的 Cache And Source Facts 所致，
  非框架缺陷。

> 既有卡片交集：canonical Wave1 文件名算法与单候选 inspect（本次再次命中，归属
> BUG-221，`v0.89` 已修复）；本批 BUG-225/228 与该卡相关但为不同缺陷。

> BUG-220..224 来自 `dpt_rb_enterprise-safe-ai-harness` 的原始 real-actor 观察，
> 已由 `repair-wave1-reference-closeout-feedback`（`v0.89`，提交 `5503cc37b`）完成闭环，
> 并移入 [`../_done/_fixed_bugs/`](../_done/_fixed_bugs/)。BUG-212--219 也已归档。

## 最近关闭 (2026-08-12)

| Bug | 结案依据 |
|-----|----------|
| BUG-220 | Current field-level Wave2 `finding_id` feedback 加入 exact regression；不需要 runtime change。 |
| BUG-221 | `v0.89` 将 Wave1 submit 后 guidance 收敛为 valid depth review -> inspect -> exact-target closeout；不公开 locator implementation constants。 |
| BUG-222 | `v0.89` 使具体 submitted-backing/depth-review root 优先于 synthetic Topic guard，并遮蔽派生 floor symptom。 |
| BUG-223 | `v0.89` 修复 supplementary-row 分类与 public depth-review primary repair 投影。 |
| BUG-224 | `v0.89` 保留 accepted single-contribution packet grammar，并澄清 multiple explicit entries 和 sequential deferred applies。 |

## 新增 (2026-08-08)

以下 7 个 bug 来自一次完整 real-actor Deep Research run
（`dpt_rb_enterprise-ai-harness-platforms`，HITL1→Wave0→Wave1→Wave2→HITL2→Final）中
Phase Agent 实际遇到的、必须修复才能继续的确定性摩擦点（BUG-205..211）。均为
current-head 观察，附复现路径。source: CCDS4 (Claude Code + DeepSeek v4)。

## 已修复 (2026-08-08)

BUG-205..211 已移入 [`../_done/_fixed_bugs/`](../_done/_fixed_bugs/)（编号 BUG-205..211，保留原编号）。
7 个 bug 全部 fixed，归属两个归档 change：`make-feedback-name-contract-roots`（v0.77，
BUG-206/207/208/210/211）+ `make-evaluator-and-cli-behavior-direct`（v0.78，BUG-205/209）。

## 最近关闭 (2026-08-07)

以下记录已移入 [`../_done/_fixed_bugs/`](../_done/_fixed_bugs/)：

| Bug | 结案依据 |
|-----|----------|
| BUG-200 | current-head supplementary contribution projection 已覆盖；无需新 change。 |
| BUG-201 / BUG-202 | `align-gate-contract-descriptors-and-terminal-recovery-tests` 已归档为 `v0.76`。 |
| BUG-203 | `remove-recursive-queue-failure-repair` 已归档为 `v0.75`。 |
| BUG-204 | 已重分类为陈旧 terminal fixture contract drift，并在 Change B / `v0.76` 关闭。 |

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

### 弱模型执行问题挂起 → `_done/_suspended_bugs/`（2026-07-29）

经代码核实，BUG-144/145/147/149/161/163 共 6 个的触发点是**弱模型执行问题**（强模型按既有 contract 不会触发），不是确定性 framework 缺陷，已移至 [`../_done/_suspended_bugs/`](../_done/_suspended_bugs/)，留作 actor-guidance 参考，不作为活跃 implementation defect 处理：

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

> BUG-099/106 不在 Wave execution/gate remediation 范围内，由 [`silent-autonomous-execution`](../plans/silent-autonomous-execution.md) 承接。现行 Chain/Queue/Work Unit contract 与 actor/Gate canary checkpoint 已收敛；残余问题只等待有效 current-head Phase-Agent observation，不再以“核心路径先稳定”为 reopen 条件。BUG-129/130/131/142 已移至 `../_done/_suspended_bugs/`：它们分别等待当前真实反例、产品策略决定或有效 current-head Agent-flow observation，不是活跃 implementation defect。

**Next available bug ID: BUG-241**

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
