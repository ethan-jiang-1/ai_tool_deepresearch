# Tasks: close-lifecycle-bypass-detection-gap

> 依赖顺序执行；每个 task 的 done condition 在行内给出。实施只改
> `DEEP_RESEARCH_HARNESS/`、`tests/` 与文中列出的 Markdown；planning artifacts
> 不再改（除非 closeout review 产生正式 finding task）。

## 1. Plan review 与治理前置（先于任何 target edit）

- [x] 1.1 `openspec-feedback:plan-review` — 对本 change 全部 planning artifacts（proposal/specs×5/design/semantic-closure/verification-plan）做一次 plan review：核对每个 requirement 有 design 决策与 task 承接、authority 边界与宪法 triad 一致、semantic-closure 覆盖全部 affected families。Done: review 完成；任何 finding 转为下方普通未完成 task（列受影响 requirement、authoritative owner、smallest repair）；无 finding 则记录"无 finding"于本任务勾选说明。**Review 记录 (2026-09 apply)：无 open finding。范围审查按 change-feedback-loop.md Apply Review 清单完成——5 个 requirement 均有 owner capability 与有界 outcome；新检查只读直接事实、单一合法补救边界、无语义判断/恢复控制器；verification claims 均标注 simulated_agent_actions/无 Agent 理解声明；semantic-closure 全 bare file coordinate（无 #fragment）、roles 经 polish 修正（consumers=verdict consumers）。preflight 修复：verification-plan 重写为 verification-routing/v1（5 claims，e2e 元组修正）、semantic-closure 补 verification 字段，check-verification-routing/check-semantic-closure --mode plan 双 PASS；check-project-reqs --mode plan 报 5 个未注册新 ID 为 7.2 规定时序的预期中间态；doc-locks 已盘点（COMMANDS.md/start-research/continue-run-bundle/phase-wave1/wave2/final/rb_plan.tmpl 共 7 处既有锁，受影响断言在 5.x 同 change 内更新）。**
- [x] 1.2 确认 catalog addition `lifecycle.plan-progress-presentation-integrity`（bounded_question 见 change 的 semantic-closure.yaml `catalog_additions`）**仅声明于 change 记录且尚未写入全局 catalog**，并运行 `node openspec/governance/check-semantic-closure.mjs --change close-lifecycle-bypass-detection-gap --mode plan` 必须 PASS（plan 模式强制 addition 不在 catalog）。Done: checker PASS（2026-09 确认 PASS；写入全局 catalog 挪至 2.1 首步、assets 模式复跑挪至 7.2）。@impl CPT-006, PHS-010

## 2. Engine：integrity 投影与 audit 扩展（CPT-006）

- [x] 2.1 **首步（先于本任务其他改动）**：将 catalog addition `lifecycle.plan-progress-presentation-integrity` 写入 `openspec/governance/semantic-fact-families.yaml`（满足"第一个依赖该 family 的 target edit 前"时序）。随后在 `DEEP_RESEARCH_HARNESS/engine/helpers/phase-status-audit.mjs` 的 `PHASE_STATUS_AUDIT_OUTCOMES` 追加 `premature_final_present`、`plan_progress_tamper_suspected`；按 design D1 实现 `evaluateLifecycleIntegrity` 纯函数（Zod `IntegritySchema`）：premature 判定复用 `final-report-series.mjs` canonical 分类 + `handoff-helpers.mjs` admission + `inspectPostFinalHandoffStage` 阶段 + legacy compatibility + prior-lineage admitted delivery 证据链（替换 loose `hasFinalFiles`）；progress tamper 用 PHS-009 canonical locator 抽取 canonical `- [x] <gate>` 行并对账 trace `gate_attempt(passed=true)`+route-bound witness，Engine 写 `failed` 而 gate passed 记 advisory staleness 不入 outcomes。Done: 新增 `tests/engine/helpers/phase-status-audit-integrity.test.mjs` 覆盖：词表封闭性、premature 命中/四证据链豁免（current-lineage legal entry、prior-lineage admitted delivery（含 rerun 进行中）、post-final 中间态、legacy）、tamper 命中/Engine 翻转无报/staleness 不入 outcomes，全部通过。@impl CPT-006, CDP-009, PHS-010
- [x] 2.2 重排 `auditPhaseStatus` 返回：premature 分支 outcome 从 `status_drift` 改为 `premature_final_present`（canonical 精确化后），所有返回路径挂 `integrity` 对象；lifecycle window passed 而 presence/tamper 命中时 top-level outcome 取命中项。`auditPhaseStatus` 当前唯一代码消费者是 `cli/audit-phase-status.mjs`（已核实），重分类影响面 = 断言 premature 场景的既有测试（`tests/integration/cli/audit-phase-status.test.mjs`、`tests/integration/cli/handoff-witnessing-lifecycle.test.mjs`、`tests/e2e/final-refinement-continuity.test.mjs` 等，以 `grep -rn "premature" tests/` 为准逐一核对翻转）。Done: 上述集成测试新增用例——bug 形态 bundle（premature final + 手勾 wave1/wave2-complete + 无 gate pass）一次 audit 同时报两个新 outcome 并各给唯一 remediation；全文件与被翻转用例通过。@impl CPT-006

## 3. Engine：enter-phase integrity 摘要（CPT-009）

- [x] 3.1 `DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs` 在成功 entry 输出上追加 bounded `integrity`（outcomes+surfaces+audit 指引），仅非 passed 时输出；passed 静默；entry verdict 与 witness 不变。Done: `tests/integration/cli/enter-phase.test.mjs` 新增两用例——漂移 bundle entry 输出含 `integrity.outcomes` 且不改变 load_complete/current_node；干净 bundle 输出无该字段。@impl CPT-009

## 4. Wave gate：premature blocking root（RWG-023）

- [x] 4.1 在 `phase-status-audit.mjs`（或其导出的共享面）暴露 `evaluatePrematureFinalPresence(bundlePath)` 薄封装，接线 `check-gate-wave0-complete.mjs`、`check-gate-wave1-complete.mjs`、`check-gate-wave2-complete.mjs`：既有规则评估前调用，命中即 blocking failure，primary advice 给唯一合法补救（移出 canonical 命名到非权威诊断位置，实现定为 `final/attic-<原名>` 并锁测试），不得建议 bypass/surfacing/status edit，不得改动文件。Done: 三个 gate 各新增集成用例（`tests/integration/cli/check-gate-wave*-complete.test.mjs` 既有文件或新文件）：植入 premature 文件 → gate 失败且 root/advice 正确、文件字节不变；移出后 root 清除；post-final 中间态、rerun 进行中的旧 lineage 已 admitted 文件、legacy bundle 均不误报。@impl RWG-023

## 5. 指令面与文档（SWE-007 / PHS-010 / CDP-009）

- [x] 5.1 更新 `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave1.md`、`phase-wave2.md`、`command_playbook/start-research.md`、`command_playbook/continue-run-bundle.md`：疲劳阈值/换策略/合成 final 内容前必须消费最新 integrity 判定；向用户报告"研究完成"必须引用 terminal status + integrity `passed`，无 backing 不得宣告；resume 入口（continue-run-bundle）指向 `cli/audit-phase-status.mjs` 作为一条命令读取完整性真相的入口。新增 doc-lock 测试 `tests/integration/md/lifecycle-bypass-guidance.test.mjs`（沿用既有 static guidance validation 模式，如 `no-phase-bypass-advice.test.mjs`）断言这些义务存在且不存在无 backing 的完成宣告指引。Done: doc-lock 测试通过。@impl SWE-007
- [x] 5.2 更新 `DEEP_RESEARCH_HARNESS/rb_templates/rb_plan.md.tmpl` 的 Progress 说明与相关 README/phase 文档：checkbox 只能由 Engine 在 gate pass 时翻转；手勾即篡改证据且不构成完成。断言并入 `tests/integration/md/lifecycle-bypass-guidance.test.mjs`。Done: doc-lock 测试通过。@impl PHS-010
- [x] 5.3 更新 `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-final.md`（或 delivery 相关 phase/playbook 段落）：premature 文件非交付证据、阻断 wave gate、唯一补救为移出 canonical 命名、移出后仍是历史非权威材料；`DEEP_RESEARCH_HARNESS/COMMANDS.md` **新增** `cli/audit-phase-status.mjs` 条目（已核实现无）并写明新 outcome 语义。断言并入 `tests/integration/md/lifecycle-bypass-guidance.test.mjs`。Done: doc-lock 测试通过。@impl CDP-009

## 6. 端到端与全量回归

- [x] 6.1 新增 `tests/e2e/lifecycle-bypass-detection.test.mjs`（deterministic_e2e，真实 production CLI + disposable bundle）：合法 wave0→enter wave1→植入 `final/final.md` + 手勾两个 Progress 行→wave1 gate 失败于 `premature_final_present`→audit 同时报 `plan_progress_tamper_suspected`→enter-phase 输出 integrity 摘要→Agent 移出文件并取消手勾→gate rerun 通过（其他规则满足时）→audit integrity 清洁；全程无任何引擎侧文件改写。Done: e2e 通过。@impl CPT-006, CPT-009, RWG-023, CDP-009, PHS-010
- [x] 6.2 全量回归：`node --test` 全绿（基线 3015+ 新增）、`openspec validate close-lifecycle-bypass-detection-gap --strict` PASS、`git diff --check` 干净。Done: 三项全绿并在本任务记录计数。

## 7. Closeout：同步与治理归档前置

- [x] 7.1 `openspec-feedback:closeout-review` — archive 前收口 review：对照 5 个 delta spec 逐条核对实现与测试证据、semantic-closure roles/consumers 与实际调用一致、无 finding 留在 chat。Done: review 完成；finding 转普通 task 修复后重跑；无 finding 则勾选并记录。
- [x] 7.2 同步 main specs：把 5 个 delta 按 archive 规则同步进 `openspec/specs/<domain>/<capability>/spec.md`（含 `> req:` 行追加新 ID 与 `> delta-synced:` 标注），并在 `openspec/governance/req-registry.yaml` 登记 CPT-009、RWG-023、CDP-009、PHS-010、SWE-007；随后复跑 `node openspec/governance/check-semantic-closure.mjs --change close-lifecycle-bypass-detection-gap --mode assets` 必须 PASS（catalog 行已在 2.1 写入，全部声明坐标文件已存在）。Done: 同步完成且 assets PASS、下方 7.3/7.4 PASS。@impl CPT-006, CPT-009, RWG-023, CDP-009, PHS-010, SWE-007
- [x] 7.3 运行 `node openspec/governance/check-project-reqs.mjs --mode archive --change close-lifecycle-bypass-detection-gap` 必须 PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired）。Done: PASS。
- [x] 7.4 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingReq）。Done: PASS。
