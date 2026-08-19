# Proposal: fix-transaction-guards-and-wave0-reference-balance

## Why

真实 run（`dpt_rb_enterprise-ai-transformation-six-cases`）暴露了四个同源的引擎确定性守卫缺陷：work-unit 事务把事务窗口内**任何**并发 bundle 写入都归责为 "mutated undeclared targets"（BUG-234），其产生的双 suspect orphan 让 `recover-transaction` 互相阻塞、run 永久卡死且无合法恢复路径（BUG-233）；Wave0 共享 reference 收敛按 `topic_slug` 字典序逐一物化，floor 达成后 5/9 topic 零覆盖（BUG-232）；post-final 第一次 rerun 在 final 阶段合法更新 non-primary 文件后，lineage append 证明永假，第二次 rerun 被 `accepted_lineage_drift` 永久阻塞（BUG-236）。四者的共同根因是**确定性守卫/证明的作用面与它应守护的合法变更面不一致**：事务守卫对非 authority 内容负责、恢复入口被自己的 orphan 规则锁死、收敛规则只看计数不看分布、final lineage 见证把合法可变的 non-primary 呈现面当作不可变证据。

来源：`_backlog/bugs/BUG-232-wave0-shared-reference-materialization-topic-imbalance.md`、`_backlog/bugs/BUG-233-work-unit-two-orphan-transaction-deadlock.md`、`_backlog/bugs/BUG-234-work-unit-transaction-concurrent-write-false-positive.md`、`_backlog/bugs/BUG-236-post-final-recovery-second-rerun-blocked-by-nonprimary-final-drift.md`（用户显式指定的四个 bug 卡片；BUG-236 经分析后由用户确认并入本 change）。

## What Changes

- **事务变更检测收窄到 work-unit authority 面**（BUG-234）：`withWorkUnitTransaction` 的 before/after 快照从「整 bundle 递归」收窄为 work-unit authority 面（`_work_units/**` 减 lock/current-journal + 根 `rb_output_declarations.jsonl`）。事务窗口内其他进程对 `_cache/`、`_scripts/`、`_diagnostics/`、`reference/`、`artifacts/` 等非 authority 路径的并发写入不再被归责为 undeclared target，不再把合法 submit/recover 标为 `suspect`，不再污染 `rollback_proven`。callback 对 authority 面内未声明目标的写入仍然 fail-closed 为 `suspect`。
- **多 orphan 依赖序恢复**（BUG-233）：`recover-transaction` 在存在其他 unresolved orphan journal 时仍可执行（recovery 事务的唯一操作目标是 journal 文件，不再被 orphan 检查全有或全无地阻塞）；对「journal 文件被另一个 unresolved orphan（recover 尝试 wrapper）声明为 mutation target」的目标，恢复按依赖序先结清 wrapper；多 orphan 的 inspect 反馈给出确定的第一个可恢复坐标，消除互踢死锁与手改 journal 的被迫旁路。
- **Wave0 共享 reference 收敛跨 topic 平衡**（BUG-232 主体）：`evaluateWave0ReferenceConvergence` 的物化候选选择从「全局字典序取首个」改为跨 topic 轮转——优先选择当前已物化投影数最少的 topic（并列按 `topic_slug` 字典序决胜负），再取该 topic 内 `source_ordinal` 最小的未投影候选。floor 仍是计数，但物化引导在 topic 间平衡，每个有 submitted 候选的 topic 在 floor 内获得覆盖。
- **`accepted :warning:` 计数口径修正**（BUG-232 附带）：`isCountable` 的 acceptance 判定把模板文档化的 `accepted :warning:`（带内联诚实标记、YAML 引号形式）视为 accepted 家族值，与 `bundle/reference-flat-format` accepted spec 场景「the reference is accepted」及 `shared-reference-template.md` 的取值表一致；`EXCLUDED` 与其他值仍不可计数。
- **Final lineage 见证收窄到 primary series**（BUG-236）：C5 `post_final_reentry` 事件绑定的 `final_inventory_sha256` 改为基于 canonical primary series 条目（base + contiguous revisions）的 primary-scoped digest，并带显式 basis 标记；non-primary final 文件（`final/topics/*.md` 等，经 `persist-final-report` 合法更新）的漂移不再阻塞 newer-final append 证明与后续 rerun。对只绑定了 legacy 全树 digest 的存量事件：先尝试既有全树 append 证明；因 non-primary 漂移不可用时，回退到结构性 primary-series append 证明（移除最高 contiguous revisions 后 retained primary series 必须结构有效），并以诊断形式暴露回退。primary series 本身的任何内容变更仍被完整见证。
- **不产出**：不引入批量 orphan 清扫器、不授权按 age/glob 删除 journal、不改变 lock/journal schema 版本、不改变 Agent 手改 journal 的禁止规则、不做 wave1/wave2 收敛的 per-topic floor 语义变更（wave1 收敛本就是 per-topic 评估，无同一缺陷）、不改 `ACCEPTED_SOURCE_STATUSES`（wave1 source_claims 是另一 surface，明确排除）、不改变 persistence 操作契约与 receipt 面（`_diagnostics/artifact-persistence/` 只读消费，如消费）、不改变 C3 pipeline 其余环节与 `publish-final-report` 分配规则。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `agent/delegated-work-units` | `openspec/specs/agent/delegated-work-units/spec.md` "Submit SHALL expose a bounded integrity preflight and transaction disposition"（DEW-023，含 mutation manifest、orphan/suspect 边界、`recover-transaction` 唯一恢复入口段） | Modify | 事务 undeclared 检测的 ownership 面（整 bundle → work-unit authority 面）与多 orphan 下 recovery 可用性是 requirement 级行为变更 |
| `research/research-wave-gate-implementation` | 同文件 "Wave0 shared-reference convergence SHALL evaluate submitted backing before a floor verdict"（RWG-022） | Modify | 收敛 materialization 结果的候选选择语义新增跨 topic 平衡要求；现有 requirement 未约束选择顺序 |
| `research/evidence-extraction` | `openspec/specs/research/evidence-extraction/spec.md` isCountable requirement（EEX-001） | Modify | acceptance_status 的 accepted-family 解析加入文档化的 `accepted :warning:` 形式 |
| `research/post-final-recovery` | `openspec/specs/research/post-final-recovery/spec.md` "Post-final recovery SHALL expose one direct eligibility and request contract"（POF-001，含 Final inventory digest 基准与 newer-final append 证明段） | Modify | C5 事件的 inventory 见证基准从全树 digest 改为 primary-series scoped digest（legacy 事件回退兼容），non-primary 合法漂移不再阻塞 delivery lineage；与 `bundle/artifact-persistence-recovery` 的 non-primary 更新授权消除冲突 |
| `bundle/artifact-persistence-recovery` | `openspec/specs/bundle/artifact-persistence-recovery/spec.md` "Final Markdown publication SHALL admit backing and protect the primary version series" | Verify-only | non-primary `persist-final-report` 更新授权不变；本 change 使 POF lineage 证明与该既有授权一致 |
| `bundle/reference-flat-format` | 同文件 "Reference metadata values SHALL be writable as valid YAML…" 场景已规定 `accepted :warning:` 引号形式 "the reference is accepted" | Verify-only | 本 change 使引擎计数行为与该既有 accepted 场景对齐，不修改该 spec |
| `agent/work-unit-provenance-gate` | `openspec/specs/agent/work-unit-provenance-gate/spec.md` Wave0 共享 reference authority 分类 | Verify-only | 收敛选择顺序不改变 authority 分类与 backing 契约 |
| `engine/check-inspect-feedback` | `openspec/specs/engine/check-inspect-feedback/spec.md` recover-transaction 反馈形状（CHI-004） | Verify-only | 复用既有 `attempt_disposition` + `next` 形状与 CLI 动词拼写，不改反馈词汇表 |
| `research/research-styles` | `openspec/specs/research/research-styles/spec.md` `wave0_shared_ref_total` 计算 | Excluded | floor 数值计算与 profile 参数不变 |
| `agent/agentic-queue` | queue 需求与 supplementary 路由 | Excluded | 不触及 queue 语义 |

### New Capabilities

（无——所有变更落在既有 capability 的 requirement 上。）

### Modified Capabilities

- `agent/delegated-work-units`：DEW-023 requirement 内——(a) 事务 undeclared-target 守卫的作用面收窄为 work-unit authority 面，非 authority 并发写不再产生 suspect / 污染 rollback 证明；(b) recovery 事务在多 unresolved orphan 并存时保持可用，journal 被其他 orphan 声明为 target 时按依赖序先恢复 wrapper，多 orphan inspect 给出确定可执行坐标。
- `research/research-wave-gate-implementation`：RWG-022 requirement 内——materialization 候选选择 SHALL 跨 topic 轮转平衡（最少已投影数优先、确定性 tie-break），不选择 source relevance。
- `research/evidence-extraction`：EEX-001 requirement 内——`acceptance_status` 解析把文档化的 `accepted :warning:` 引号形式归入 accepted 家族。
- `research/post-final-recovery`：POF-001 requirement 内——(a) C5 事件绑定的 Final inventory 见证基准改为 canonical primary series 条目的 primary-scoped digest（显式 basis 标记）；(b) pre-load admission 与 newer-final append 证明按事件 basis 消费对应 digest；(c) legacy 全树绑定事件在全树证明因 non-primary 漂移不可用时回退结构性 primary-series 证明，回退被诊断暴露；(d) non-primary 漂移不再构成 `accepted_lineage_drift` 阻塞；(e) primary series 内容变更仍被完整见证。

## Impact

- 代码：`DEEP_RESEARCH_HARNESS/engine/work-unit-transaction.mjs`（`listBundleFiles` 作用面、`unresolvedOrphanJournals`/`inspectWorkUnitTransaction` 多 orphan 投影、`recoverWorkUnitTransaction` 依赖序与豁免、`withWorkUnitTransaction` orphan 检查选项）；`DEEP_RESEARCH_HARNESS/engine/helpers/wave0-reference-convergence.mjs`（候选选择）；`DEEP_RESEARCH_HARNESS/engine/helpers/ref-count.mjs`（`isCountable` accepted 家族）；`DEEP_RESEARCH_HARNESS/engine/helpers/final-report-series.mjs`（primary-scoped digest 计算与 schema 字段）；`DEEP_RESEARCH_HARNESS/engine/helpers/handoff-helpers.mjs`（`proveNewerFinalAppend` 双基准 + 回退、`inspectNewerFinalStage` 诊断）；`DEEP_RESEARCH_HARNESS/engine/helpers/post-final-recovery.mjs`（C5 事件绑定 primary-scoped digest + basis 标记）。
- 测试：`tests/engine/work-unit-transaction.test.mjs`（既有 undeclared 用例迁移到 authority 路径 + 新增非 authority 并发写与多 orphan 恢复用例）、`tests/integration/cli/operate-work-unit.test.mjs`（多 orphan CLI 反馈坐标）、`tests/engine/helpers/ref-count.test.mjs`（`:warning:` 计数）、`tests/engine/helpers/post-final-recovery.test.mjs`（append proof 双基准/回退 truth table）、`tests/integration/cli/post-final-recovery.test.mjs`（两次连续 rerun + non-primary 修改场景）、新增 `tests/engine/helpers/wave0-reference-convergence.test.mjs`（纯选择函数 truth table）、`tests/integration/cli/check-gate-wave0-complete.test.mjs`（多 topic 平衡消费）。
- 兼容性：work-unit journal/owner schema 版本不变；`inspect`/`submit` 反馈形状（CHI-004）不变；并行 delegated fetch 写 `_cache/` 与并行 submit 恢复为合法负载；C5 事件新增 basis 标记字段（legacy 事件无该字段按全树基准解释），`FinalReportInventorySchema` 新增 primary-scoped digest 字段；存量 mid-lifecycle bundle（含 BUG-236 实测 bundle）经 legacy 回退恢复合法路径。
- 明确排除：不修 BUG-147（result.json 非原子写，weak-model 面）；不改 wave1 收敛；不改 `ACCEPTED_SOURCE_STATUSES`；不加新的 repair_kind；不改 persistence 操作/receipt 契约。
