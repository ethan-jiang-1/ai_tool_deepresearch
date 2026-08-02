# Closed Plans Index — 已完成 plan 归档

> 最后更新: 2026-08-03 | `_backlog/_done/_closed_plans/` — 已完成 plan 的归档目录。
> 接收来自 [`../../plans/`](../../plans/) 的 plan。`_` 前缀 = coding agent 默认忽略。
>
> **plan 完成后文件名不变，位置即状态。** 移入时分配 `CLS-NNN` 序号（Closed），按完成时间递增。

## 接收一个完成的 plan

plan 完成后从 `_backlog/plans/` 通过 `git mv` 移入本目录：
1. 在本文件表格加一行（CLS-NNN + 日期 + 文件名 + 简述），编号 = 当前最大 + 1
2. 更新最后的 "Next available plan ID" 行
3. 更新 `../../plans/README.md`（移除该 plan 的行）
4. 更新 `../README.md`（计数 +1）

---

## 已完成列表

| ID | Date | File | Summary |
|----|------|------|---------|
| CLS-001 | 2026-06-28 | experiment-production-convergence.md | Agent 产出声明原则：declaration-ledger + file-observability |
| CLS-002 | 2026-06-28 | trace-unification-assessment.md | 统一 trace：四份合并为 rb_trace.jsonl |
| CLS-003 | 2026-06-28 | ref-integrity-experiment-family.md | Reference 完整性实验家族设计（Engine 防御全落地） |
| CLS-004 | 2026-07-03 | self-documenting-phase-role-nodes-plan.md | Self-Documenting Phase + Relay Role Nodes — phase Execution Brief + role Role Brief/Handoff；落地 via 2026-07-03-harden-relay-pipeline（§7/§8） |
| CLS-005 | 2026-07-03 | simplify-relay-pipeline.md | 化簡 Relay Pipeline — 思考草稿；原激进简化被 review 否决，§9 保守版落地 via harden-relay-pipeline（superseded，非按原文实施） |
| CLS-006 | 2026-07-04 | subagent-logging-come-alive-plan.md | Sub-agent logging 活过来 + Dockerfile 取证 — beacon 模式 + lifecycle 事件 + forge-resistance；落地 via 2026-07-04-subagent-execution-logging |
| CLS-007 | 2026-07-05 | agent-persistence-and-exit-codes.md | Absorbed by autonomous-command-contract-hardening: exit code stays honest coarse control-flow; encouragement/repair/continuation guidance goes through `advice[]`, structured diagnostics, or Agent-readable Markdown |
| CLS-008 | 2026-07-05 | autonomous-silent-execution-terminology.md | Absorbed by autonomous-command-contract-hardening: phase boundary terms now distinguish transition, handoff, work completion, and witnessing across guidance, command docs, and validators |
| CLS-009 | 2026-07-05 | cli-exit-code-contract.md | Absorbed by autonomous-command-contract-hardening: top-level and CLI docs now expose canonical `0/1/2`, gate/non-gate classes, `log-event.mjs` always-0 exception, and known doc/code drift |
| CLS-010 | 2026-07-05 | no-implicit-human-interaction.md | Absorbed by autonomous-command-contract-hardening: commands are Agent-facing; HITL1/HITL2 are the only interactive in-run checkpoints; Final is terminal non-interactive delivery with post-final feedback routed through HITL2 repair/rerun |
| CLS-011 | 2026-07-08 | formal-run-bugfix-change-split.md | BUG-044~058 split into 4 OpenSpec changes: changes 1-3 delivered (12 bugs resolved, v0.6→v0.8), change 4 deferred (BUG-045/046/052) |
| CLS-012 | 2026-07-08 | fose-run-bugfix-batch-plan.md | FOSE run bugfix batch: 9 bugs (045, 046, 059-065) split into 3 changes — stabilize-work-unit-submit-and-gate-handoff, parallel-delegated-phase-execution-and-reference-materialization, harden-run-entry-and-bundle-map |
| CLS-013 | 2026-07-09 | martin-fowler-run-bugfix-change-split.md | BUG-066~070 切成 2 个 change：stabilize-agent-facing-work-unit-contracts (v0.12) + align-gate-contracts-and-reference-navigation (v0.13)，均已 apply+archive。（BUG-066~070 卡片仍在 `../../bugs/`，待移入 `_fixed_bugs/`） |
| CLS-014 | 2026-07-09 | martin-fowler-run-performance-tuning.md | martin-fowler run 性能调优（128min，~25–30min 契约漂移卡）：A/C1/C2 由 bugfix-split 两 change 覆盖；D(dry-submit)/E(抓取并行)/preflight 由 harden-delegated-preflight-and-fetch-hygiene (v0.14) 落地；B(ii) ledger-relabel 显式放弃。作为独立 change superseded，内容全实现。 |
| CLS-015 | 2026-07-11 | bugs-069-075-openspec-change-slicing.md | BUG-069/071/072/073/074/075 切成 3 个 change：simplify-and-reuse-wave-contract-checks (v0.17) + fail-fast-on-missing-research-access (v0.18) + put-continuation-cues-at-decision-points (v0.19)，均已 apply。遗留：BUG-071 §4.1 bootstrap current_gate 统一 deferred（future normalize-bootstrap-gate-window）；BUG-072/074 LLM 行为待真实 run 观察。 |
| CLS-016 | 2026-07-11 | ux-onboarding-install-setup.md | 安装 baseline 已由现有 package/lockfile/.nvmrc/README/playbook 前置条件锁定，并在 polish-framework-setup-and-user-facing-ux 中加入静态回归保护。 |
| CLS-017 | 2026-07-11 | ux-coding-agent-permissions-setup.md | Human-facing setup/permission UX 落地到 root SETUP.md；Claude Code/Codex 权限说明保持 pre-trigger、risk/opt-in、no command-playbook co-runner 边界。 |
| CLS-018 | 2026-07-11 | ux-user-facing-chinese-first-outside-waves.md | 收窄后的中文用户可见软提示落地：HITL 动态内容、Final terminal delivery、silent non-authorization guard；不改 gate/schema/routing/locale。 |
| CLS-019 | 2026-07-12 | delegated-attempt-timeout-and-redo-postmortem.md | Timeout/REDO 现场复盘完成；主要修复由 v0.14 dry-submit、v0.15 progress-aware timeout preflight、v0.16 audited late-submit 落地。 |
| CLS-020 | 2026-07-12 | delegated-attempt-timeout-and-redo-postmortem-修复计划.md | 两阶段修复切片完成：防误杀与误杀后 audited recovery 已分别由 v0.15/v0.16 落地；pause-aware wall-clock suspension 未纳入该闭环。 |
| CLS-021 | 2026-07-13 | breakpoint-recovery-persistence-model.md | C2+C3+C5：crash-safe sanctioned content、canonical intent/progress/layout、post-final request materialization 全部有 Engine path 与 controlled proof |
| CLS-022 | 2026-07-13 | human-override-and-state-mutability.md | C1+C3+C5：single registry、layout mutation、integrity/reentry safety net、狭窄 post-final rerun 全部落地且有 audit proof；generic override/state-seed 不在本路线 scope |
| CLS-023 | 2026-07-13 | overall-recovery-canonical-state-and-delegation-roadmap.md | 五 change 总控路线完成：C1–C5 全部 archive（v0.22–v0.27），5 个来源全部关闭，controlled proof 全部通过 |
| CLS-024 | 2026-07-15 | tests-e2e-layer.md | Superseded by `formalize-verification-routing`：canonical `unit`/`integration`/`deterministic_e2e`/`agent_flow_e2e` 替代 ordinal layers 与 repo-top-level `tests_e2e/`；`tests/e2e/` + verification-plan/governance 已落地 |
| CLS-025 | 2026-07-15 | seed-backfill-round-continuity.md | 多轮 seed projection authority 落地（v0.29 / `2d8625f01`）：direction resolver、Engine-owned `index.rerun_count`、eligible-rows inspect、wave0/1/2 authority rebuild；原文 token re-injection 方案被 authority-driven append 取代 |
| CLS-026 | 2026-07-16 | gate-bypass-authority-audit.md | 只读 audit：5 个 gate-bypass 口子盘点；真 erosive 根因 = `countReferences` 按 projection 存在计数（非 submit-provenance，BUG-090 脚本能过 floor 的机制）；synthetic degraded pass 实为 bounded 可审计；不提修法 |
| CLS-027 | 2026-07-16 | repair-friendly-framework.md | 被 v0.31 的 direct-fact helper posture 吸收：normalized Wave2 pair facts、global queue quiescence、receipt tolerance 与 same-check repair 已落地；completion manifest、第二套 consistency CLI、repair controller 明确不采用 |
| CLS-028 | 2026-07-16 | subagent-output-contract-enforcement.md | Sub-agent submit 容错闭环已由既有 changes 吸收：dry-submit/repair coordinates、Phase-owned reference materialization、current-round authority、receipt `detail` string/object tolerance 与 receipt/log guidance均已落地；不建 legacy/delta compatibility tree |

Closure boundary for CLS-007..010: this change did not implement runtime exit-helper unification, code-2 semantic migration, a JS lifecycle walker, chat interceptor, environment-variable control, same-turn chat halt prevention, or fake evidence/trace handling.

| CLS-029 | 2026-07-17 | deep-research-iterative-refinement-positioning.md | HITL1/silent/HITL2 协作节奏落地：`simplify-iterative-research-interaction` change 完成 propose→apply→archive 全周期（commit `a081e4bc6`）；silent contract 从"忽略用户消息"收敛为"不主动打扰"；HITL 两端接受自然语言由 Agent 映射到现有 enum |
| CLS-030 | 2026-07-17 | codex-playbook-runner.md | coding-Agent runner 与 subject Agent 进程分离：`codex`/`claude` CLI 已原生支持独立 `codex exec` 式 spawn，plan 的核心机制诉求已由平台满足 |
| CLS-031 | 2026-07-20 | seed-topic-projection-contract-repair.md | Change A (`restore-section-scoped-seed-projection-contract`, v0.35, `af5e6018c`) and Change B (`centralize-seed-topic-authoring-contracts`, v0.36, `29c90d0c1`) both archived; BUG-092/093/094 now have factual closure evidence |
| CLS-032 | 2026-07-21 | agent-output-linter.md | Broad linter/registry 方案经 review 收窄为 Engine-resolved direct-contract reuse；`reuse-delegated-output-contracts-at-submit` 完成 propose→apply→archive（v0.38，52/52 tasks，case-164 native PASS） |
| CLS-033 | 2026-07-21 | research-access-and-actor-contract-delivery.md | HITL1 bounded fetch fallback + role/direct-output/fetch contract 送达真实 work-unit actor；两个 change archive：`allow-bounded-hitl1-fetch-surface-fallback`、`deliver-work-unit-role-contracts-to-actors`（联合关闭 BUG-096/098；BUG-097 保持独立真实-Agent 诊断） |
| CLS-034 | 2026-07-23 | research-question-closure-and-evidence-judgment/ | 直接吸收 user-knowledge-hang / evidence-quality / explore-exploit 三份输入；HITL1 host-file snapshot 贯通 Seed/Wave/Final + Wave1→Wave2 问题交接；两个 change archive：`capture-user-research-controls`、`bind-wave1-target-receipts-to-wave2-findings` |
| CLS-035 | 2026-07-24 | wave-execution-and-gate-remediation.md | Wave producer/closeout + pre-Wave readiness + root-first Gate feedback 与 fail-closed degradation policy；三个 change archive：`make-pre-wave-readiness-feedback-direct`（`542f7833a`）、`make-wave-producer-contract-and-closeout-direct`（`d65fe538a`）、`simplify-wave-gate-feedback-and-degradation-policy`（`6e47de3ea`）；覆盖 BUG-100–102、105、107–113。supporting indexes 同目录 `wave-execution-and-gate-remediation/`；real-Agent search/fetch 仍 `NOT_RUN` |
| CLS-036 | 2026-07-26 | delegated-work-operability-and-gate-truth.md | BUG-114–123 的归因与收敛完成：两个 OpenSpec change archive，queue/Gate 候选均无 fresh red；BUG-120 的 guidance-delivery 缺陷已结案，真实 `case-225` 保留为独立内容验证 |
| CLS-037 | 2026-07-27 | evidence-production-and-phase-projection-boundaries.md | 三个 bounded changes 已 archive：canonical seed authoring、queue demand admission、Wave0 shared-reference guidance。D1 保留 `claim_verification` 的 `6 + 2 x topics` floor 并接受 eligible-degradation 成本；BUG-124--128 结案。BUG-129/130 保留为分别由当前真实反例触发的 I1/I2，BUG-131 为 accepted residual risk。 |
| CLS-038 | 2026-07-28 | seed-topic-projection-materialization.md | BUG-138 的单一 writer / Seed Topic template-protocol boundary / shared readiness 收敛已由 `fix-seed-topic-projection-materialization` archive（commit `9953435a3`）完成；嵌套 Agent-flow canary 被移除，验收保留静态契约与确定性生产 CLI Wave 链。 |
| CLS-039 | 2026-07-28 | wave-projection-and-lifecycle-convergence.md | Four bounded changes archived (v0.54--v0.57): Wave0 candidate projection, Wave1 reference convergence, Wave2 return-map scope, and terminal lifecycle truth. BUG-129/130 remain counterexample-gated; BUG-131 remains accepted policy risk. |
| CLS-040 | 2026-07-28 | deferred_conversation-capture-host-capabilities.md | Completed host-capability research: framework-owned Codex app-server, Claude Agent SDK, and stream-json integrations can own a ledger; externally launched native-client sessions remain best-effort observation only. No framework implementation task remains. |
| CLS-041 | 2026-07-29 | dpt-routing-and-wave-contract-integrity.md | Archived routing entry hardening, Wave0 verdict disambiguation, and Wave1 direct closeout feedback. BUG-142's real Agent-flow classification remains separately pending. |
| CLS-042 | 2026-07-31 | framework-contract-remediation-openspec-sequence.md | C1--C5、lifecycle feedback-loop 与 BUG-170 actor/Gate canary boundary alignment 均已 archive；C5 available claim 和真实 Actor completion 保持 honest `NOT_RUN`，BUG-175/184 为 accepted policy residual。 |
| CLS-043 | 2026-07-31 | framework-contract-feedback-and-control-structure-analysis.md | 系统性 contract/feedback/control-shape 诊断已由 CLS-042 的 C1--C5 与 BUG-170 alignment 吸收；BUG-175 保持独立 active quality-policy decision。 |
| CLS-044 | 2026-08-01 | session-drift-guardrail-analysis/ | 唯一建议 `establish-openspec-change-feedback-loop` 已 archive：operation guidance 推送 review、finding 进入 tasks、governance finalizer 闭合 archive；Tier-A/Tier-B validator、SessionStart hook 与 guidance 搬迁均明确不采用。 |
| CLS-045 | 2026-08-03 | experiment-progressive-run-plan.md | P0-P5 的 bounded progressive execution、case-local repair 和 policy review 已结束；future-triggered host access、fresh real-actor requalification 与 profile-led refresh 移至独立 dormant intake plan，不保留自动运行。 |
| CLS-046 | 2026-08-03 | experiment-progressive-run-strategy.md + experiment-progressive-run-strategy/ | Phase 0 的历史测量与 57 个报告附件；静态 Wave/tier 路线已被 CLS-045 的 profile-driven completed round 取代，保留为证据而非活跃执行指令。 |

**Next available plan ID: CLS-047**
