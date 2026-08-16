# Active Plans — 活跃 plan/分析文档列表

> 最后更新: 2026-08-16 | `_backlog/plans/` — 活跃 plan 在此，完成移入 [`../_done/_closed_plans/`](../_done/_closed_plans/)。
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
| `hitl1-bounded-clarification-alignment` | 在既有 HITL1 内加入可选、有限的主动反问与对齐快照：保留“你先研究”的自主出口，不新增 checkpoint、状态机或语义 Gate。 | active（设计验证待开始） |
| `semantic-fact-closure-openspec-governance` | 防止 Engine 同一确定性事实被多处各自解释：建立可增长的事实家族目录、每 change 的 closure record、OpenSpec apply/archive checker 闭环；CI 当前明确不在范围内。 | active（共同理解完成，ready to propose Change A） |
| `seven-topic-seven-subagent-concurrency-investigation` | delegated concurrency control：当前无结构化 cap owner；下一步以 single ceiling（候选 12）使批量 claim 按当前独立可执行 demand、余量和上限计算。 | active（调查完成，ready to propose） |
| `topic-research-emphasis/` | 研究主题共同基线之上的差异化追加投入：P1 已归档，确认既有 carrier 与 rerun guidance；`progressive/` 将 P2 的可追溯覆盖和后续读者投影拆成独立 OpenSpec slice。 | active（P2 ready to propose） |
| `gate-schema-progressive-gate-schema-queue-remediation` | 长程执行总线：两个有界 OpenSpec change 已归档为 `v0.75` / `v0.76`；后续保留 audit observation 和严格的第三-change 触发条件。 | active（Phase 3 observation pending） |
| `bug-200-204-gate-and-queue-remediation` | BUG-200--204 的收敛分诊：关闭 current-head 已覆盖的 BUG-200；以两个 OpenSpec change 分别修 Gate/recovery contract 与递归 queue repair；不将 gate audit 拆为独立生命周期，也不让无 submitted evidence 的 topic 伪造完成。 | ready for OpenSpec proposals |
| `gate-schema-capability-audit` | 全面 Gate quality audit（重开 2026-08-07）：per-gate gap map 与语义质量审计未完成；BUG-201/202/204 的确定性闭环已由 `bug-200-204-gate-and-queue-remediation` change 1 收敛，其余内容质量 concerns 仍待审计。 | active（审计未闭环） |
| `iterative-final-delivery-versioned-output` | Final 交付可迭代打磨（与用户反复敲打、就地重写，不新增 checkpoint）+ 版本化 Final 输出命名（`final.md` → `final-v1.md`、`final-v2.md` …）。触发自 `enterprise-safe-ai-harness-v2` 技术深入版交付。 | active（设计验证待开始） |
| `cleanup-effect-verification` | 2026-08-16 四路深挖分析底稿（单文件，Part I/II）：678 commits 失败模式分类、清理效果分层验证（FM-3 结构性修复 / FM-1 内容漂移无机器检查 / 无 CI·hook）、恢复指令↔代码 M1-M10、权威漂移 B1-B5、路由热点 H1-H8、修复映射与不变量候选。 | active（分析底稿；修复清单待转 OpenSpec change） |
| `guidance-drift-cleanup-machine-guards` | 把深挖发现的漂移收敛为 **3 个 OpenSpec change + 1 deferred**：C1 事实校准（散文说真话+入口单一源+AGENTS≡CLAUDE 守卫）、C2 恢复反馈直达（Engine 自带下一步）、C3 文档-代码漂移守卫（checker+`--check-prefix`，hook 决定=不做）。C4 phase 闭包去重 deferred。 | active（C1 CLS-064 ✅、C2 CLS-065 ✅、C3 CLS-066 ✅ 全部归档；C4 deferred，待关闭） |

---

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
