# Active Plans — 活跃 plan/分析文档列表

> 最后更新: 2026-09-04（`regression-suite-runtime-profiling-and-speedup` 完成关闭（CLS-085）：change `regression-suite-tooling-speedup` 归档，finalizer 19/19；新增活跃 plan `regression-suite-step2-heavy-chain-investment`。此前 2026-09-01：`spec-drift-audit-remediation-and-requirement-slimming` 完成关闭（CLS-084）：8 个 OpenSpec change 全管线归档——C1/C2 漂移清零、C3a–C3e 五批 requirement 瘦身、C4 防复发 guard；finalizer 均 19/19，全量 npm test 2967/2967 0 fail。当日无其他活跃 plan。此前 2026-08-31：新增活跃 plan `cleanup-wave2-carving-test-guards-and-ledger`——第二波打扫，四路审计回填期。同日：`drift-resync-locks-hygiene-and-work-unit-deepening` 完成关闭（CLS-082）。此前：`test-signal-and-guidance-wording-hygiene` 完成关闭（CLS-081）。此前：`control-surface-drift-density-and-module-boundaries` 已完成关闭；spec-semantic-drift-remediation 于 2026-08-31 完成关闭（CLS-079）） | `_backlog/plans/` — 活跃 plan 在此，完成移入 [`../_done/_closed_plans/`](../_done/_closed_plans/)。
>
> **plan 没有编号，文件名即标识。完成后文件名不变，位置即状态。**

## 完成一个 plan 的步骤

1. `git mv plans/<name>.md _done/_closed_plans/<name>.md`
2. 更新 `_done/_closed_plans/README.md`（加一行）
3. 更新本文件（删掉该 plan）
4. 更新 `../_done/README.md`（计数 +1）

---

## 活跃列表

| Plan | 简述 | 状态 |
|------|------|------|
| [`regression-suite-step2-heavy-chain-investment`](regression-suite-step2-heavy-chain-investment.md) | 回归套件第二步投资计划：P0 e2e 全链去重（rerun-round-continuity 同链爬两遍 / post-final 同族复核）、P1 operate-work-unit 121 spawn 点 + finalizer 注入（独立 change）、P2 同族批量、P3 加权分片；tooling 已到顶（1061 CPU-s / 8 核下限 ≈133s），目标 P2 后 ~120-140s | 计划已成文；执行待用户指令 |

## 最近关闭 (2026-09-04)

| Plan | 关闭依据 |
|------|----------|
| `regression-suite-runtime-profiling-and-speedup` | CLS-085：A/F 路线经 change `regression-suite-tooling-speedup` 落地归档（finalizer 19/19，含归档自跑全量回归闸）——runner wrapper c8 + NODE_COMPILE_CACHE + 权重表；实测修正三个推断（并发非主杠杆、LPT 被探针证伪、C 路线前提已落地）；墙钟 281.8s→中位 ≈226s 全绿。D/E 投资转 `regression-suite-step2-heavy-chain-investment`。 |

## 最近关闭 (2026-09-01)

| Plan | 关闭依据 |
|------|----------|
| `spec-drift-audit-remediation-and-requirement-slimming` | CLS-084：八个有界 OpenSpec change 全部归档（C1 return-map 真相同步、C2 phase-content 坐标重同步、C3a–C3e 五批 requirement 瘦身——六大 spec 巨无霸清零且文本逐字节守恒、C4 `check-spec-section-references` 防复发 guard 接入 check-all）；全量 npm test 2967/2967 0 fail，finalizer 均 19/19。 |

### 参照资料（非 plan，供后续 change 引用）

- `user-intent-carry-through-design-analysis.md`、`rerun-feedback-carry-through-design-analysis.md`、`user-intent-carry-through-implementation-plan.md` — 已随 `strengthen-user-intent-carry-through` 完成并移入 [`../_done/_closed_plans/`](../_done/_closed_plans/)。
- `machine-checks-catalog.md` 与 `midrun-reading-burden-audit.md` 已随 `midrun-burden-reduction-and-residual-drift` plan 归档至 `../_done/_closed_plans/`，C3 触发时取用。

---

## 最近关闭 (2026-08-31)

| Plan | 关闭依据 |
|------|----------|
| `drift-resync-locks-hygiene-and-work-unit-deepening` | CLS-082：四个有界 OpenSpec change 全部归档（C1 残渣 re-sync doc-only、C2 词汇锁+checker+死代码清除+preflight 字段+actor_guidance、C3 指针化+registry 账本、C4 engine 切缝+不变量网）；八份深挖 + 用户评审确立"spec prose 不点名实现 .mjs"规则；配套度量快照工具随行归档；终局统计见 plan §10.8（30/30 台账归零、词汇锁+checker 生效、submit 2439→1048）。遗留 6 项登记于 plan §10.9。 |

## 最近关闭 (2026-08-31)

| Plan | 关闭依据 |
|------|----------|
| `test-signal-and-guidance-wording-hygiene` | CLS-081：两个有界 OpenSpec change 全部归档——C1 `2026-08-31-harden-test-lane-signal-hygiene`（tests/README triage 规则 + check-all aggregation deflake + `test:clean` 口径契约锁）、C2 `2026-08-31-align-reading-scope-and-doc-locks-preflight`（Do-Not-Read 任意位置 run-bundle 语义对齐 + `doc-locks-preflight/apply` guidance 行）。全量 npm test 2882/2882 pass 0 fail，finalizer 均 19/19 全绿。 |

## 最近关闭 (2026-08-31)

| Plan | 关闭依据 |
|------|----------|
| `control-surface-drift-density-and-module-boundaries` | C1 `pointerize-gate-chain-prose-add-guard`（gate chain prose pointer 化 + 防再发 guard）、C2 `restructure-control-surface-prose-walls`（七段散文墙表格化/原子化 + owner 指针）、C4 直接 housekeeping、C3 测量报告→ `extract-topic-schema-projection`（canonical-topic-state 抽 topic-schema-projection）；C5 accepted 不动。全量 npm test 各 change 2877/2874/2874 pass 0 fail，finalizer 19/19 全绿。 |

## 最近关闭 (2026-08-17)

| Plan | 关闭依据 |
|------|----------|
| `bug-225-231-run-contract-surface-remediation` | CLS-069：BUG-225..231 由**一个** OpenSpec change `2026-08-17-repair-run-contract-surfaces`（`0e97d0774`）完整收口——claim stdout JSON 回归锁（SUD-008）、WNC-010 例外边界澄清（enter-phase 仍是合法 loader）、envelope 示例、Wave1 floor 文案、setup 状态窗口、finding-index 契约文档、`_scripts/` 落点；零引擎裁决逻辑改动。propose → polish（3 轮）→ apply → finalizer 17/17 归档；全量 `npm test` 2975/2975 0 fail。七张 bug 卡随行移入 `_done/_fixed_bugs/`。 |

## 最近关闭 (2026-08-16)

| Plan | 关闭依据 |
|------|----------|
| `agent-guidance-conflict-drift-remediation` + `agent-guidance-conflict-drift-findings` | CLS-066/CLS-067：F-01~F-13 全部闭合——C1 `2026-08-16-harness-entry-doc-consistency`、C2 `2026-08-16-repair-guidance-terminology-pointer-drift`、C3 `2026-08-16-repair-work-unit-recovery-vocabulary-and-drift-guards` 三个 change 均 propose→polish→apply→archive（finalizer 12/12/16 checks）；全量 `npm test` 2909/2909 0 fail；F-11 四类 drift-guard checker 已接入 finalizer 归档序列。 |
| `midrun-burden-reduction-and-residual-drift` | CLS-065：C1 `2026-08-16-repair-residual-recovery-spelling-drift`（repair_kind 连字符化 + 决策表扫描面扩展 + R4/R5/R6）与 C2 `2026-08-16-reduce-mid-run-context-burden`（wave §9/§7 指针化 + anti-cheating 结构修复 + 两个检查类，静态删 432 行）均已 archive。C3 引擎级 once-per-run loading 保持 deferred（触发=一次真实 run 成本观察或用户明确要求），不阻塞本 plan 关闭。参照资料 `machine-checks-catalog.md` / `midrun-reading-burden-audit.md` 保留在 `plans/` 供 C3 触发时取用。 |

## 最近关闭 (2026-08-15)

| Plan | 关闭依据 |
|------|----------|
| `current-contract-signal-cleanup` | 19 个 current-only cleanup execution batch 均已 governed-archived 并提交；最终 C8 archive 为 `2026-08-15-align-current-guidance-contract-guards`（`9030fa785`）。后续若采纳审计提出的 Markdown regression-guard 加强建议，必须另建有界 OpenSpec change。 |
| `final-report-composition/` | CLS-063：HITL2 composition handoff、Readiness/Final terminal contract、deterministic proofs 与 case-135/136 quarantine 已由 `2026-08-15-final-report-composition` 归档；随后 case-137 的唯一 bounded real-Agent run 由 `2026-08-15-fast-final-composition-evidence` 以 no-evidence quarantine 收口，不声明 Agent-behavior PASS。 |

---

## 最近关闭 (2026-08-12)

| Plan | 关闭依据 |
|------|----------|
| `active-bugs-220-224-primary-source-research` + `bug-220-224-wave-reference-closeout-remediation` | CLS-060/CLS-061：`repair-wave1-reference-closeout-feedback` 已 archive（提交 `5503cc37b`，`v0.89`）；BUG-220 回归保护、BUG-221--223 Wave1 closeout repairs、BUG-224 accepted-grammar 澄清均已完成。 |

## 最近关闭 (2026-08-06)

| Plan | 关闭依据 |
|------|----------|
| `experiment-progressive-follow-up-plan` | CLS-052：仅等待 future selected-host capability、fresh profile selection 和新预算；没有当前可执行的 Harness change，归档为 external re-entry record。 |
| `silent-autonomous-execution` | CLS-053：没有 fresh current-head `agent_flow_e2e` reproduction 或 deterministic root；taxonomy rebaseline 后更新 canonical Harness link，归档为 external-reproduction record。 |
| `rename-framework-to-deep-research-harness` | CLS-049：reusable system 定为 Deep Research Harness（`DEEP_RESEARCH_HARNESS/`），单一 legacy `DPT_FRAMEWORK` alias、`BUNDLE_ENTRY.md` entry precedence 与 explicit current run bundle root 均由同名 OpenSpec change 交付（apply `27f307332`、archive `e73ba1790`）。 |
| `two-level-specs-categorization` | CLS-050：84 主 spec 迁移到七域嵌套路径 + `openspec/specs/README.md` catalog + config 契约 + taxonomy/discovery 两个 checker，经 `rebaseline-capability-taxonomy` change archive（2026-08-06）；primary-sources 研究底稿随行。 |

## 最近关闭 (2026-08-05)

| Plan | 关闭依据 |
|------|----------|
| `residual-bug-systemic-remediation` | CLS-048：C1、C2 均已 archive；BUG-195--197 有 retained native PASS/current-playbook hash 的 no-reproduction closure；BUG-188/193 以 host-owned boundary 关闭；BUG-192/198 的唯一 C2 assurance selection 未启动，故 C3 不适用且不作合规/修复声称。 |
| `bug-187-199-systemic-remediation-plan` | CLS-047：C1-C4 已归档；E1 classified 为 host UX residual；E2 的 case-164 requalified BUG-195/196/197 without a current deterministic root, while case-232 reached Wave2 but honestly finalized `NOT_RUN` because the selected host exposed no real search capability. |

## 最近关闭 (2026-08-03)

| Plan | 关闭依据 |
|------|----------|
| `experiment-progressive-run-plan` | P0-P5 的 bounded execution、root-cause repairs 和 policy review 均已闭合；future-triggered work 已移至 `experiment-progressive-follow-up-plan`，不会使本轮保持 active。 |
| `experiment-progressive-run-strategy` | 仅保留 Phase 0 历史测量和报告附件；静态 Wave/tier 路线已被完成的 profile-driven plan 取代，故整体归档。 |

## 最近关闭 (2026-08-01)

| Plan | 关闭依据 |
|------|----------|
| `session-drift-guardrail-analysis/` | CLS-044：唯一建议 `establish-openspec-change-feedback-loop` 已完整 archive（`c57b27eff`）；风险导向 Agent review、durable finding tasks、operation guidance 与 governance finalizer 已落地，Tier-A/Tier-B validator 等被否决路径未另建 change。 |

---

## 最近关闭 (2026-07-31)

| Plan | 关闭依据 |
|------|----------|
| `framework-contract-remediation-openspec-sequence` | CLS-042：C1--C5、lifecycle feedback-loop 和 BUG-170 actor/Gate canary boundary alignment 均已 archive；C5 available claim 与真实 Actor completion 均诚实保留为 `NOT_RUN`，BUG-175/184 保持 accepted policy residual，不添加 controller。 |
| `framework-contract-feedback-and-control-structure-analysis` | CLS-043：诊断已由 CLS-042 的 C1--C5、lifecycle feedback-loop 与 BUG-170 alignment 完成收敛；31 张修复卡已结案，BUG-175 保持独立活跃的质量政策决定。 |

---

## 最近关闭 (2026-07-27)

## 最近关闭 (2026-07-29)

| Plan | 关闭依据 |
|------|----------|
| `dpt-routing-and-wave-contract-integrity` | CLS-041：三个有界 change 均已 archive；BUG-139/140 的 repository-owned entry contract、BUG-141 的 Wave verdict，以及 Wave1 direct closeout feedback 已完成。BUG-142 的 real Agent-flow classification 仍单独 pending。 |

## 最近关闭 (2026-07-28)

| Plan | 关闭依据 |
|------|----------|
| `seed-topic-projection-materialization` | CLS-038：`fix-seed-topic-projection-materialization` 已 archive（commit `9953435a3`）；BUG-138 的 authority-bound writer、template/protocol 分离和 shared readiness 已交付，确定性 CLI Wave chain 为验收资产，嵌套 Agent-flow canary 已移除。 |
| `wave-projection-and-lifecycle-convergence` | CLS-039：四个 bounded OpenSpec change 已 archive（v0.54--v0.57）；BUG-132--137 均有 archived/fixed disposition，BUG-129/130 保持 current-counterexample trigger，BUG-131 保持 accepted policy residual risk。 |
| `deferred_conversation-capture-host-capabilities` | CLS-040：research note 已给出完成决策：仅 framework-owned Codex app-server、Claude Agent SDK 或 stream-json integration 可建立完整 exchange ledger；独立 native client 只能 best-effort 观察，无剩余 DPT implementation task。 |

## 最近关闭 (2026-07-27)

| Plan | 关闭依据 |
|------|----------|
| `evidence-production-and-phase-projection-boundaries` | CLS-037：三个 bounded OpenSpec change 已 archive；D1 已决定保留 `claim_verification` shared-ref floor 并接受 eligible-degradation 成本。BUG-124--128 结案；I1/I2 作为 BUG-129/130 的独立 dormant current-counterexample trigger 留在活跃 bug，P1 是 accepted residual risk，不是后续 change。详尽交接卡已移至 [`../_done/_closed_plans/evidence-production-and-phase-projection-boundaries.md`](../_done/_closed_plans/evidence-production-and-phase-projection-boundaries.md)。 |

---

## 最近关闭 (2026-07-24)

下列三个 plan 的 OpenSpec change 均已 archive，已移出 `plans/`：

| Plan | 关闭依据 |
|------|----------|
| `wave-execution-and-gate-remediation` | 三个 change 全 archive：`make-pre-wave-readiness-feedback-direct`（`542f7833a`）、`make-wave-producer-contract-and-closeout-direct`（`d65fe538a`）、`simplify-wave-gate-feedback-and-degradation-policy`（`6e47de3ea`）；覆盖 BUG-100–102、105、107–113。review context 留在 [`../_done/_closed_plans/wave-execution-and-gate-remediation.md`](../_done/_closed_plans/wave-execution-and-gate-remediation.md) |
| `research-access-and-actor-contract-delivery` | 两个 change archive：`allow-bounded-hitl1-fetch-surface-fallback`、`deliver-work-unit-role-contracts-to-actors`；已移入 `../_done/_closed_plans/`（CLS-033） |
| `research-question-closure-and-evidence-judgment` | 两个 change archive：`capture-user-research-controls`、`bind-wave1-target-receipts-to-wave2-findings`；吸收 user-knowledge-hang / evidence-quality / explore-exploit 三份输入；已移入 `../_done/_closed_plans/`（CLS-034） |

## 最近关闭 (2026-07-26)

| Plan | 关闭依据 |
|------|----------|
| `delegated-work-operability-and-gate-truth` | Change 1/2 已 archive；Change 3/4 无 fresh red，BUG-120 的 guidance-delivery 缺陷已结案；真实 `case-225` 保留为独立内容验证（CLS-036） |

## 最近关闭 (2026-07-21)

| Plan | 关闭依据 |
|------|----------|
| `agent-output-linter` | 原 broad linter 方案经打磨收窄为 direct-contract reuse；`reuse-delegated-output-contracts-at-submit` 完成 propose→apply→archive，v0.38、52/52 tasks、case-164 native PASS（CLS-032） |
| `deep-research-iterative-refinement-positioning` | `simplify-iterative-research-interaction` change 完整周期（propose→apply→archive），commit `a081e4bc6`；HITL1/silent/HITL2 协作节奏落地（CLS-029） |
| `codex-playbook-runner` | `codex`/`claude` CLI 已原生支持独立进程 spawn，plan 核心机制诉求由平台满足（CLS-030） |
| `repair-friendly-framework` | 原 manifest/consistency/repair-controller 方案被 direct-fact、root-first、same-check helper posture 取代；v0.31 落地 normalized Wave2 pair facts、global queue quiescence 与 receipt repair tolerance（CLS-027） |
| `subagent-output-contract-enforcement` | dry-submit repair matrix、Phase-owned reference materialization、current-round authority、receipt detail tolerance 与 receipt/log guidance 已由 v0.14–v0.16、v0.29、v0.31 等 changes 吸收（CLS-028） |
| `tests-e2e-layer` | plan 自标 Superseded；`formalize-verification-routing` archive 落地 canonical 四类 taxonomy（CLS-024） |
| `seed-backfill-round-continuity` | OpenSpec change tasks 全勾 + 实现 commit `2d8625f01` / v0.29（CLS-025）；原文 token re-injection 方案被 authority-driven rebuild 取代 |
