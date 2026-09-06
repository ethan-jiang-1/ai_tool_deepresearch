## 1. 块感知 Progress writer（gate-helpers-plan-progress.mjs）

- [x] 1.1 扩展 `## Progress` 段解析：在 canonicalSectionContent 定位的段内识别基线块与 `### Rerun cycle <N> (spawned <ISO ts>)` 子块（块头格式 Engine 独占写入），返回块清单与当前块（最后一个 cycle 块，无则基线块）；验证：`tests/engine/helpers/plan-hostfile-sections.test.mjs` 新增用例覆盖基线块/单 cycle/双 cycle/坏块头解析
- [x] 1.2 `writePlanProgress(bundlePath, gateName)` 改为块感知翻转：在当前块内 `- [ ] <gate>`/`- [x] <gate>` 幂等翻成 `- [x] <gate> (<ts>)`，块内无该 gate 时在块内 append；返回值保持 `committed | unchanged | failed` 三态、失败不改字节；验证：单测覆盖块内翻转、跨块不串、append、幂等时间戳刷新
- [x] 1.3 `rerun-ready` 特殊路径：先翻转当前块 `rerun-ready`，再**仅当该块 `rerun-ready` 由本 pass 从未勾翻为已勾（transition 语义）且 `### Rerun cycle <N+1>` 不存在时**追加 `### Rerun cycle <N+1> (spawned <ts>)` + 7 行未勾 gate（seed-topics-ready / wave0-complete / wave1-complete / wave2-complete / hitl2-recorded / readiness-passed / rerun-ready），序号 = 现有 cycle 块数 + 1；验证：单测覆盖首次 spawn、连续两次不同 cycle 的 spawn 序号递增、同 cycle 重复 pass 只刷新时间戳不重复 spawn（幂等守卫）、翻转与 spawn 的原子先后

## 2. 通用 gate-attempt 接入（gate-helpers-attempt-audit.mjs）

- [x] 2.1 `writeGateAttempt` 通用分支：`check.passed === true` 时 best-effort 调用 `writePlanProgress(bundlePath, check.gate)`（try/catch，失败仅记 log，不改 result/exit code/checkpoint/trace）；**写顺序约束**：Progress 写必须发生在 `writeCheckpointManifest` 之前（该函数对 `rb_plan.md` 记录 sha256/size/mtime，先写才能让 checkpoint hash 覆盖翻转后字节，与 setup-ready staged 顺序一致）；`setupReadyStaged` 分支保持现状不动；验证：`tests/integration/cli/check-gate-progress-flip.test.mjs`（新）——instantiation gate CLI pass 后 rb_plan.md 当前块对应行被勾、同次 pass 的 checkpoint manifest 中 `hashes['rb_plan.md'].sha256` 等于翻转后文件的 sha256（Progress 写失败时 verdict/exit code 不变由 try/catch + 既有 gate 失败路径测试覆盖）
- [x] 2.2 清理 `check-gate-setup-ready.mjs` 中未使用的 `writePlanProgress` 直接 import（line 20，经 staged 路径间接使用）；验证：`node --check` 通过且 `dead-export-regression.test.mjs` 不新增告警

## 3. audit：按块 tamper + stale advisory（phase-status-audit.mjs）

- [x] 3.1 `evaluatePlanProgressTamper` 按块绑定 witness：基线块行沿用 consumedGates 规则；cycle 块行要求存在该 gate 的 passed `gate_attempt`（route-bound consumption）且 `ts >= 块 spawn ts`；块头无法解析的已勾行按 tamper 证据 fail-closed；验证：`tests/engine/helpers/phase-status-audit-integrity.test.mjs` 新增用例（cycle 内无 witness 勾选 → tamper；有 witness 但早于 spawn → tamper；坏块头 → tamper）
- [x] 3.2 `evaluateLifecycleIntegrity` 输出 stale advisory：按「attempt 发生时所在块」判定——consumed gate（passed `gate_attempt` + route-bound consumption，含 ts）若其 pass 时所在块（spawn ≤ ts < 下一块 spawn，或最后一个块）的行未勾 → 新增非 blocking `advisory` 字段（`{ kind: 'stale_progress', gate, block }`），不进 `outcomes`、不改 blocking 语义与 exit code；互斥出口（readiness vs rerun）未经过的一侧无 witness、不构成 stale；验证：`tests/integration/cli/audit-phase-status.test.mjs` 新增场景——冻结 Progress 的 bundle（勾选落后于 trace）audit 仍 `passed` 但输出 advisory stale
- [x] 3.3 `COMMANDS.md` audit-phase-status 行与 README 同步说明 advisory 字段与 blocking outcomes 的边界；验证：`list-doc-locks.test.mjs` / `command-contract-docs.test.mjs` 既有 doc-lock 用例通过

## 4. reconcile 工具 + 文档

- [x] 4.1 新增 `DEEP_RESEARCH_HARNESS/cli/reconcile-plan-progress.mjs --bundle <path>`：读 `rb_trace.jsonl`（route-bound `gate_attempt` witnesses，与 audit 同一判定，不读 checkpoint）+ 现有 Progress 基线清单（缺失时回退 manifest 生命周期列表），按 1.x/3.x 同一 witness 规则重建 Progress（基线块 + 从 rerun-ready witnesses 派生的 cycle 块，块头带 spawn ts），原子写（temp+rename），输出 `committed | unchanged | failed` + 摘要；不跑 gate、不写 trace/checkpoint/status；**幂等**：同一 bundle 连续两次运行，第二次必须 `unchanged`（重建过程确定性、基线分隔空行不重复插入）；基线块 `rerun-ready` 由第一个 rerun-ready witness（spawn cycle 1 者）勾选；验证：`tests/integration/cli/reconcile-plan-progress.test.mjs`（新）——对构造 bundle（含两轮 rerun trace）重建后结果与预期块/勾选一致、再跑 audit 无 tamper、二次运行 `unchanged`；另对 `dpt_rb_harness-agent-selection-project-execution-pilot` 的临时副本做 dry 检查（不写回原 bundle），重建结果通过 audit 且无 tamper
- [x] 4.2 `COMMANDS.md` 注册 reconcile 命令 + `repair-run-bundle.md` 生命周期审计表补一行「presentation 修复（可选、非 authority）」；验证：doc-lock/命令契约用例通过，修复指引明确 reconcile 不创造 gate 语义、且对生命周期中段的存量 bundle 须在**下一次 gate pass 之前**执行（否则新 pass 会勾进基线块）

## 5. 测试收尾与验证

- [x] 5.1 deterministic_e2e（`tests/e2e/plan-progress-rerun-cycles.test.mjs`，新）：构造最小 bundle fixture，按现实生命周期序列驱动（writer 与 gate CLI 同一 Engine writer；配套合法 trace）——基线：seed-topics → wave0 → wave1 → wave2 → hitl2 → rerun-ready（spawn `### Rerun cycle 1`）；cycle 1：seed-topics → wave0 → wave1 → wave2 → hitl2 → rerun-ready（spawn `### Rerun cycle 2`）；cycle 2：seed-topics → wave0 → wave1 → wave2 → hitl2 → readiness-passed（结束）；断言：基线块除互斥出口 readiness-passed（未经过）外全勾、cycle 1/cycle 2 块按序勾选、cycle 2 的 rerun-ready 未勾（无第二次 rerun）、无重复块；reconcile 归一化后结构一致、二次运行 `unchanged`，audit `passed` 无 tamper/advisory；验证：`node --test tests/e2e/plan-progress-rerun-cycles.test.mjs` 通过（分类按 accepted `verification-routing`）
- [x] 5.2 全量回归与校验：`npm test`（`node scripts/run-tests.mjs`）全绿 3152/3152；`openspec validate plan-progress-rerun-cycle-growth --type change --strict`（注意 CLI 不接受 `--change` option）通过；`node openspec/governance/check-project-reqs.mjs --mode plan`、`check-verification-routing.mjs --mode plan`、`check-semantic-closure.mjs --mode plan` 均通过；`rb_plan.md.tmpl` 保持 10 行基线清单不变（git diff 为空）；验证：命令退出码 0

## 6. 反馈闭环评审（change-feedback-loop）

- [x] 6.1 openspec-feedback:plan-review — apply 前 scoped review（polish 技能 Pass 1 全 change 一致性 + Pass 2 风险导向，逐条核对 proposal/specs/design/tasks/verification-plan/semantic-closure 并按证据修正）：块感知 writer 与 cycle 块解析、`writeGateAttempt` 通用接入与 checkpoint hash 写序、rerun-ready 按位置绑定（spawner 不见证自己块）、reconcile 幂等/空行重建、存量 bundle 须在下一次 gate pass 前 reconcile；无未决的语义/权限/范围问题；验证：polish 两轮 review 后 `openspec validate --strict` / `check-project-reqs` / `check-semantic-closure` 全绿
- [x] 6.2 openspec-feedback:closeout-review — apply 后 scoped review 无开放发现：实现与 spec/design 逐条对账（全 gate pass 翻转、rerun-ready 增长 cycle 块、audit 按块 tamper + non-blocking stale advisory、reconcile 工具 + 文档）；verification-plan 6 条 claim 均有对应测试且通过；`npm test` 3152/3152 全绿、`openspec validate --strict` 通过；无影响实现或验证的未决问题；验证：本文件全部任务 `- [x]` + finalizer `review_marker_unmet`/`task_incomplete` 不出现
