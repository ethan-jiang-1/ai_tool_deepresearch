# Closed Plans Index — 已完成 plan 归档

> 最后更新: 2026-07-11 | `_backlog/_done/_closed_plans/` — 已完成 plan 的归档目录。
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
| CLS-006 | 2026-07-04 | subagent-logging-come-alive-plan.md | Sub-agent logging 活过来 + provenance 取证 — beacon 模式 + lifecycle 事件 + forge-resistance；落地 via 2026-07-04-subagent-execution-logging |
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

Closure boundary for CLS-007..010: this change did not implement runtime exit-helper unification, code-2 semantic migration, a JS lifecycle walker, chat interceptor, environment-variable control, same-turn chat halt prevention, or fake evidence/trace handling.

**Next available plan ID: CLS-019**
