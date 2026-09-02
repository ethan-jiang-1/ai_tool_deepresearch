# Closed Plans Index — 已完成 plan 归档

> 最后更新: 2026-08-31（含补登记对账节） | `_backlog/_done/_closed_plans/` — 已完成 plan 的归档目录。
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
| CLS-047 | 2026-08-05 | bug-187-199-systemic-remediation-plan.md | C1-C4 OpenSpec routes archived; E1 host UX and E2 current-head Actor tracks classified as bounded host/Actor residuals. Case-164 native checks passed while its Supervisor timeout remained separate; case-232 honestly finalized NOT_RUN for missing host search capability. |
| CLS-048 | 2026-08-05 | residual-bug-systemic-remediation.md | C1 and C2 archived; BUG-195--197 closed from retained native current-playbook-matched evidence; BUG-188/193 host-owned; C2 selection omission left C3 unadmitted and BUG-192/198 unobserved. |
| CLS-049 | 2026-08-06 | rename-framework-to-deep-research-harness.md | Reusable system fixed as Deep Research Harness at `DEEP_RESEARCH_HARNESS/`; single legacy `DPT_FRAMEWORK` alias, `BUNDLE_ENTRY.md` entry precedence, and explicit current run bundle root delivered via the same-named OpenSpec change (apply `27f307332`, archive `e73ba1790`). |
| CLS-050 | 2026-08-06 | two-level-specs-categorization.md + two-level-specs-categorization.primary-sources.md | 84 个主 spec 迁移到七域嵌套 capability path（agent/engine/bundle/research/verification/workflow/governance），`openspec/specs/README.md` catalog + config 契约 + taxonomy/discovery 两个 checker 落地；经 `rebaseline-capability-taxonomy` change archive（2026-08-06）。primary-sources 为 OpenSpec v1.7.0 capability-path 研究底稿。 |
| CLS-052 | 2026-08-06 | experiment-progressive-follow-up-plan.md | Closed as an external re-entry record: future host capability, fresh profile selection, objective, and budget are required before a new bounded plan may exist. |
| CLS-053 | 2026-08-06 | silent-autonomous-execution.md | Closed as a current-head reproduction record: no deterministic root or fresh `agent_flow_e2e` observation supports a change; canonical Harness links updated after rebaseline. |
| CLS-055 | 2026-08-08 | bug-205-211-feedback-and-evaluator-remediation.md | 一次完整 real-actor run 暴露的 7 个确定性摩擦点（BUG-205..211）；两个 OpenSpec change 归档（v0.77 `make-feedback-name-contract-roots` + v0.78 `make-evaluator-and-cli-behavior-direct`）后全部 fixed。 |
| CLS-056 | 2026-08-10 | centralize-project-guidance-under-openspec.md | 两个受治理 OpenSpec change 完成 canonical guidance topology、root adapters、ownership pruning 和静态 topology coverage；stable skill assets 未修改。 |
| CLS-057 | 2026-08-10 | centralize-project-guidance-under-openspec-progressive-plan.md | Change A/Change B archive、P5 observation、proposal polish、Apply/closeout evidence 与 backlog closure tracker。 |
| CLS-058 | 2026-08-10 | engine-gap-supersede-bypass-misreport.md | BUG-212/213 为已修复的历史 Engine 缺陷；`2026-08-09-close-work-unit-semantic-contract-drift`（`ea02a29af`）已关闭两项 gap，run-state 描述保留为未复核的 incident context。 |
| CLS-059 | 2026-08-12 | systemic-active-bug-remediation.md | BUG-216--219 经两项最小 OpenSpec change 全部修复：guidance/test drift 由 `repair-agent-guidance-contract-drift`（`65fdb829a`）关闭，public schema/reference-format contract 由 `harden-agent-authored-contracts`（`ab2f17c49`，v0.88）关闭。 |
| CLS-060 | 2026-08-12 | active-bugs-220-224-primary-source-research.md | BUG-220--224 的 current-head primary-source 分诊已由后续有界 change 验证并完成：220 保留 exact regression，221--223 修复，224 作为 accepted grammar 澄清。 |
| CLS-061 | 2026-08-12 | bug-220-224-wave-reference-closeout-remediation.md | `repair-wave1-reference-closeout-feedback`（`5503cc37b`，v0.89）已 archive；完成 Wave1 depth-review-first closeout、root-first feedback、supplementary review sync，并保留一个 resolver/consumer/derived projection 形状。 |
| CLS-062 | 2026-08-15 | current-contract-signal-cleanup.md + current-contract-signal-cleanup/ | 19 个 current-only cleanup execution batch 均 governed-archived；最终 C8 为 `2026-08-15-align-current-guidance-contract-guards`（`9030fa785`）。未来若采用四项 Markdown regression-guard 加强建议，须另建有界 change，不重开本计划。 |
| CLS-063 | 2026-08-15 | final-report-composition/ | HITL2 composition handoff、Readiness/Final terminal contract 与 deterministic proofs 已由 `2026-08-15-final-report-composition` 归档；后续 case-137 的一次 bounded real-Agent run 以 `agent_timeout`、no-evidence quarantine 收口，不声明 Agent-behavior PASS。 |
| CLS-064 | 2026-08-16 | guidance-drift-cleanup-machine-guards.md | FM-1/FM-2 漂移收敛三个 change 全部归档：C1 `2026-08-16-repair-current-guidance-contract-drift`（散文说真话+入口单一源+AGENTS≡CLAUDE 守卫+不变量简报）、C2 `2026-08-16-make-work-unit-recovery-feedback-direct`（五面反馈统一+repair_kind 连字符+supersede 压平+RA-M3/L2/L3/L4+决策表）、C3 `2026-08-16-add-doc-code-drift-guards`（内容漂移 checker+`--check-prefix`+exit-code 静态扫描；hook 决定=不做）。C4 phase 闭包去重保持 deferred（触发条件未满足）。分析底稿 `cleanup-effect-verification.md` 随附同目录（C4 触发时取用 H7 等依据）。 |
| CLS-065 | 2026-08-16 | midrun-burden-reduction-and-residual-drift.md | 第二轮"残留漂移 + 负担轴"两个 change 全部归档：C1 `2026-08-16-repair-residual-recovery-spelling-drift`（R1/R2 repair_kind 连字符化+决策表扫描面扩展含值位置断言+R4/R5/R6 指针/下一跳/全名）、C2 `2026-08-16-reduce-mid-run-context-burden`（wave §9 压缩为 shared 指针、§7 前导段指针化、anti-cheating 双 13/孤儿 12 修复、manifest.shared 移除无闭包条目、consistency-validator 新 `phase_local_anti_cheating_duplication` 检查类、check-content-drift 禁止句对照；静态删 432 行、否定行 456→403）。C3 引擎级 once-per-run loading 保持 deferred（触发=一次真实 run 成本观察或用户明确要求）。参照资料 `machine-checks-catalog.md` 与 `midrun-reading-burden-audit.md` 随附同目录（C3 触发时取用分类种子与检查对照）。 |
| CLS-066 | 2026-08-16 | agent-guidance-conflict-drift-remediation.md | Coding-agent 视角 guidance 冲突/断点/漂移修复：C1 `2026-08-16-harness-entry-doc-consistency`（F-02 collision 三说法统一 hex6、F-04 WNC-010 bootstrap 例外显式标注、F-05 RUN.md 非研究阅读 carve-out+RUE-002 delta、F-07 surface 清单改目录指针、F-10 harness AGENTS/CLAUDE 消歧）、C2 `2026-08-16-repair-guidance-terminology-pointer-drift`（F-01 Gate 五面正名、F-06 C2/C3/C5 glossary、F-03 双枚举术语、F-08 引用格式+错引用更正、F-09 归档命名、F-12 runtime coordinate 转绿回归）、C3 `2026-08-16-repair-work-unit-recovery-vocabulary-and-drift-guards`（F-03 词汇单一源+决策表 10 行+锁定派生、F-11 四类 drift-guard checker 接入 finalizer、F-13 fixture 修复+symlink 写入事故恢复）。全量 `npm test` 2909/2909 0 fail；三个 finalizer 各 12/12/16 checks。 |
| CLS-067 | 2026-08-16 | agent-guidance-conflict-drift-findings.md | 上游 findings 底稿：F-01~F-13 全部闭合（F-01~F-11 原始发现 + C1/C2 过程中新增 F-12/F-13），每条含证据坐标、agent 拿错风险与修复方向；V-01~V-05 已验证自洽项供对照。修复证据见 CLS-066。 |
| CLS-068 | 2026-08-17 | coding-agent-friendliness-review-remediation.md | coding-agent 视角全仓库体检（操作面 8/10、引擎 6/10、治理 6/10）的 P0+P1 修复：Change A `2026-08-16-repair-doc-and-governance-drift-and-machine-gaps`（F-01/F-02/F-04~F-08/F-12~F-19：文档漂移清零 + RET-006 指针化 + check-all + guidance-ID 校验 + H1 检查 + model 去 MUST + finalizer 第 17 步）与 Change B `2026-08-17-cleanup-engine-surface-and-disambiguate-repair-kinds`（F-03/F-09~F-11/F-20~F-23：死代码 retire + enum 收敛 + CLI 常量化 + god-module 导航 + repair_directive 消歧）均 finalizer 17 步归档；全量 `npm test` 2955/2955 0 fail（基线 2913→2955）。F-11 残余：其余 27 处 CLI 路径字面量机械替换 deferred（常量 `CLI_OPERATE_WORK_UNIT`/`CLI_OPERATE_QUEUE` 已建立并用于两处 rerun 构建器）；P2（CLI exit 统一、god-module 拆分、spec 长度治理）保持 deferred。 |
| CLS-069 | 2026-08-17 | bug-225-231-run-contract-surface-remediation.md | BUG-225..231（`dpt_rb_ai-transformation-organization` 真实 run 7 个活跃 bug）以**一个** OpenSpec change `2026-08-17-repair-run-contract-surfaces`（`0e97d0774`）收口：文档/示例/definition 文案对齐 + claim stdout JSON 回归锁（SUD-008）+ run-scoped 脚本 `_scripts/` 落点；零引擎裁决逻辑改动。全量 `npm test` 2975/2975 0 fail；finalizer 17/17 checks 归档。 |
| CLS-070 | 2026-08-19 | rerun-feedback-carry-through-design-analysis.md | Rerun 反馈 carry-through 的实战分析与机制复核；结论被 user-intent carry-through 实施计划吸收。 |
| CLS-071 | 2026-08-19 | user-intent-carry-through-design-analysis.md | HITL1 与多轮 rerun 用户意图承接的系统设计分析；由 `strengthen-user-intent-carry-through` 落地。 |
| CLS-072 | 2026-08-19 | user-intent-carry-through-implementation-plan.md | 最小侵入 OpenSpec 实施计划；已完成 apply、验证、归档并保留 native Agent-flow 残余风险。 |
| CLS-073 | 2026-08-25 | regression-suite-parallel-speedup.md | 回归提速计划完成：WS-A 并行安全化（7 文件 13 处 `uniqueSnapshotRoot` + 12 处 bundle 名空间竞态修复，change `2026-08-22-parallelize-regression-suite` archive，串行 542s / 并行 165-168s 全绿）、WS-B bundle 实例化去 spawn（`cloneBundleTemplate` + 6 文件 87 处 per-test NEW_BUNDLE spawn → 每文件 1 模板，change `2026-08-22-de-spawn-bundle-instantiation` archive，串行 500s / 并行 136-139s）、WS-E 的 repo 内部分回归运行工具化（change `2026-08-22-regression-run-tooling` archive：canonical find 排除 `.test-*` disposable 目录、`test:shard`/`test:quick`、并行 139s / 串行 489s、2804/2804 全绿）。WS-C（CLI 矩阵瘦身）与 WS-D（e2e 重链）经数据驱动 ROI 重估 deferred-low-ROI（WS-B 后 gate 全族仅 69s；e2e 成本为生产 CLI spawn 本质）。 |

| CLS-074 | 2026-08-25 | agent-legibility-harness-audit-and-hardening.md | 借鉴 DSH「borrowing-harness-idea」三问框架自评并关残余缺口：Change A `agent-legibility-static-hardening` 归档（`where-new-behavior-goes.md` 归属表 + Control Map change-placement 路由 + GCO-008 sync，finalizer 17/17 checks）；入口链双副本初判非 gap（ACR + guard 已覆盖 byte-sync），**后经用户决策采纳 symlink 方案**，由后续 change `2026-08-25-entry-chain-single-source-symlink` 落地（ACR-002/ACR-004 改为「单一 `AGENTS.md` + `CLAUDE.md` symlink + `check-entry-chain.mjs` 形态检查」+ guard test 更新，17/17 checks，`npm test` 2826/2826）；Change B 审计不触发 no-change 关闭（13 个 `check-*.mjs` 负例覆盖充分、skill 三目录 host 特定分工非漂移）。 |
| CLS-075 | 2026-08-27 | final-report-aux-subdir-naming-and-readme-contract.md | 补齐主报告↔辅助子目录命名关系 + final/README 引导契约，change `final-auxiliary-directory-contract`（`a11f48f4b`，finalizer 17/17 checks）已归档：ARP-005 让 canonical Final inventory 把 `final/final_v<N>/`、`final/final_<feature>_v<N>/` 识别为版本绑定 `auxiliary`（非 primary、不进 allocation/witness），孤儿版本语法目录 `orphan_auxiliary_directory` blocker，版本脱钩目录保持 `supplementary`；CDP-008 让 `phase-final.md` 固化同名辅助目录、版本自包含、历史只读与 `final/README.md` 系列索引（经非 primary persist 并带 Evidence Map）。单元 16/16、md parity 5/5、final 回归 131/131、e2e 6/6 全绿。 |
| CLS-076 | 2026-08-28 | post-final-rerun-dig-list-intake.md | Post-Final 迭代场景舒适化（rerun 挖掘接力 + final 内容整理）：以 `dpt_rb_chinese-ai-inference-chips-vs-nvidia` 三天 4 rerun + 2 整理 + 1 落地反馈深挖的完整史为 canonical 样本定位缺口（两类意图→路由不可发现、dig-list 无契约且跨轮漂移、final/README 手工漂移）。**C1 落地**：change `2026-08-28-add-post-final-dual-intent-intake` 归档（finalizer 17/17 checks）——ACS-006 COMMANDS.md 意图路由映射（evidence-expanding→post-final-recovery playbook / presentation→phase-final 就地 refinement，混合→最小澄清，navigation only）+ POF-005 playbook「Intake From A Dig List」节（最新清单→分层 scope→用户修正→条目 id 进现有字段→死坑默认排除→non-authority）+ doc-lock 回归 `tests/engine/post-final-intent-intake-docs.test.mjs`（8 断言，全量相关回归 24/24 绿）。C2/C3 未随行（摩擦复现可按原案重启）；C5 的 spec 义务已由 CDP-008 拥有（属执行缺口）；C4 Engine 级不启动。 |

| CLS-077 | 2026-08-28 | rerun-limit-raise-and-scope-pruning.md | Rerun 上限 10→32 + 剔除 pivot（新 bundle）+ 差异化投入收口（自然语言 emphasis + HITL2 可见性 HIU-007）；两个 OpenSpec change 全闭环归档（2026-08-28-raise-rerun-limit-and-fix-removal-guidance、2026-08-28-surface-declared-focus-at-hitl2，各 17/17 finalizer，全量 2851/2851）。 |
| CLS-078 | 2026-08-28 | commands-md-cli-surface-coverage-and-copyable-contracts.md | 真实 r6 run 实操复盘：COMMANDS.md 缺 `operate-queue` 生命周期与 `complete` 的 result schema；缺三套 copyable 模板（queue result / wave0-2 投影包 / Evidence Map 三列头）+ 五条 gotcha（`concrete_ref_missing`、`-rN` 唯一后缀、大输出 EAGAIN、gate `--current-node`、persist 父目录）。七项均纯文档补全、零引擎改动。落地：change `2026-08-28-commands-md-coverage-and-copyable-contracts`（COMMANDS.md +50 行）+ 平行修复 `2026-08-28-cli-readme-queue-coverage`（cli/README.md +2 行，operate-queue 生命周期/exit-code 语义），均 finalizer 归档、确定性回归全绿。 |

---

## 补登记对账（2026-08-30）

以下 23 个条目在 2026-08 下旬已物理迁入本目录，但未按流程登记（无 CLS 编号、无行）。
本节为对账记录，不虚构编号与关闭依据；完整考证（含 CLS 分配）如需要另立工作。
配套说明：`topic-research-emphasis/`、`gate-schema-capability-audit/` 等为 plan 目录；`*.primary-sources.md`、`machine-checks-catalog.md`、`midrun-reading-burden-audit.md`、`slow-test-suite-audit-and-remediation-research/` 为已登记 plan 的附件或参考资料。

| File/Dir | 备注 |
|---|---|
| bug-200-204-gate-and-queue-remediation.md | 未登记迁入 |
| cleanup-effect-verification.md | 未登记迁入 |
| current-contract-signal-cleanup/ + .md | 未登记迁入 |
| experiment-progressive-run-strategy/ + .md | 未登记迁入 |
| gate-schema-capability-audit/ + .md | 未登记迁入 |
| gate-schema-progressive-gate-schema-queue-remediation.md | 未登记迁入 |
| hitl1-bounded-clarification-alignment.md | 未登记迁入 |
| isolate-hitl1-capability-probe.md | 未登记迁入 |
| iterative-final-delivery-versioned-output.md | 未登记迁入 |
| machine-checks-catalog.md | 参考资料（随 midrun plan 迁入） |
| midrun-reading-burden-audit.md | 参考资料（随 midrun plan 迁入） |
| semantic-fact-closure-design-assessment-2026-08-09.md | semantic-fact-closure 系列文档 |
| semantic-fact-closure-openspec-governance.md | semantic-fact-closure 系列文档 |
| semantic-fact-closure-progressive-rollout-plan-2026-08-09.md | semantic-fact-closure 系列文档 |
| seven-topic-seven-subagent-concurrency-investigation.md | 未登记迁入 |
| slow-test-suite-audit-and-remediation-research/ | 附件目录 |
| slow-test-suite-audit-and-remediation.md | 未登记迁入 |
| topic-research-emphasis/ | 未登记迁入（plan 目录） |
| two-level-specs-categorization.primary-sources.md | 附件（CLS-050） |
| two-level-specs-categorization.md | 未登记迁入 |

| CLS-079 | 2026-08-31 | spec-semantic-drift-remediation.md | 治理机器锁不住的语义漂移集中修复：三个有界 OpenSpec change 全部归档（C1 req 身份完整化 7f5c164d2、C2 post-final 面收敛 a6c92ffa4、C3 派生 gate 审计扩展），finalizer 均 18/18；修正深挖报告误判两处（dig-list 非孤本、deadline_at 非冲突）；发现 list-doc-locks 动态路径盲点两例并按 closeout 规则修锁 |

| CLS-080 | 2026-08-31 | control-surface-drift-density-and-module-boundaries.md | 五 finding 全部处置：C1 gate 链序 pointer 化 + 防再发 guard（`pointerize-gate-chain-prose-add-guard`）、C2 控制面散文墙结构化（`restructure-control-surface-prose-walls`）、C3 测量报告→`extract-topic-schema-projection`、C4 直接 housekeeping、C5 accepted 不动。全量 npm test 各 change 2877/2874/2874 pass 0 fail，finalizer 19/19 全绿。 |

| CLS-081 | 2026-08-31 | test-signal-and-guidance-wording-hygiene.md | 两个有界 OpenSpec change 全部归档：C1 `2026-08-31-harden-test-lane-signal-hygiene`（tests/README 满载失败 triage 三要素规则、check-all aggregation it 合并 3→2 + timeout 300s（RET-007 断言零弱化）、`npm run test:clean` + 静态口径契约锁）；C2 `2026-08-31-align-reading-scope-and-doc-locks-preflight`（根 AGENTS/README Do-Not-Read 对齐任意位置小写 run-bundle 目录语义、config apply-guidance 追加 `doc-locks-preflight/apply` 行）。全量 npm test 2882/2882 pass 0 fail，finalizer 均 19/19 全绿。来源：coding-agent 全仓可读性评估会话用户确认摩擦点 #6/#5b/#5a/#4-便宜变体；#3 engine 提取与 #4 checker 版为明确非目标。 |
| CLS-082 | 2026-08-31 | drift-resync-locks-hygiene-and-work-unit-deepening.md | 四个有界 OpenSpec change 全部归档：C1 `2026-08-31-repair-residual-spec-drift`（14 项 spec 侧残渣 re-sync：CHI-004 恢复词汇导出指针化、gate-hint 示例更正、DEW-012 双代真相收敛、AGQ-027/007、CDP final_delivery 归一、三处 Purpose + invariants-brief + catalog）；C2 `2026-08-31-lock-closed-vocabularies-and-clear-residue`（WORK_UNIT_ATTEMPT_DISPOSITIONS 五值 zod 锁、WORK_UNIT_CANDIDATE_PROJECTION_ACTIONS 提升、新治理 checker `check-spec-enum-restatements.mjs`（治理 16→17，实测定标 0 误报）、死代码清除、DEW-014 `preflight_candidate_projection` 补齐、`actor_guidance` 改名）；C3 `2026-08-31-hygiene-pointer-rewrite-and-registry-truth`（RWP 三 requirement 指针化、GSK-009 去重、RRM-008/CTS-012 注册、RWP-005/008 弃用、AGO-006 对齐；场景墙表格化缓期并登记理由）；C4 `2026-08-31-deepen-work-unit-submit-seams`（S1-S12+S13 不变量网先行、submit 四缝切分 2439→1048、transaction 三层拆分 838→427、公开导出面零变化）。附:8 份并行只读深挖 + 用户评审确立"spec prose 不点名实现 .mjs"规则。全量 npm test 0 fail，finalizer 均 19/19。遗留：场景墙表格化、H5、CHI-004 决策表测试、`.mjs` 全仓清扫（284 处）等 6 项登记于 plan §10.9。配套度量工具 `drift-resync-metrics-snapshot.mjs` 随 plan 归档。 |
| CLS-084 | 2026-09-01 | spec-drift-audit-remediation-and-requirement-slimming.md | 八个有界 OpenSpec change 全部归档（来源：六路 spec↔code 漂移审计落地）：C1 `2026-09-01-sync-return-map-spec-truth`（RRM-003 指针化真相同步、伪函数名清除、退役散文过去化、return-map.mjs 幽灵注释清零）；C2 `2026-09-01-resync-wave-phase-content-coordinates`（§3.3→§3.4、死段名 Rerun-Aware Behavior、"SHALL add" 语态、wave2 documentation-token 语义）；C3a–C3e 五批 requirement 瘦身（RRM 1→8、CTS 2→7、RWG 3→7+M3 措辞、AGQ 1→3、DWU 7→15；全部文本逐字节守恒，142+66+51+28+16 场景零丢失；六大 spec 巨无霸清零，最大块 587→≤160）；C4 `2026-09-01-spec-section-reference-guard`（新治理 checker：§ 坐标可达性 + 现在时退役散文禁令，check-all 自动发现，治理 17→18；首扫清零 autorun L120）。每 change 均 propose→polish→apply→verify→archive→commit 全管线，finalizer 均 19/19，全量 npm test 2967/2967 0 fail。方法论教训存 `_backlog/_scratch/`。 |

**Next available plan ID: CLS-085**
