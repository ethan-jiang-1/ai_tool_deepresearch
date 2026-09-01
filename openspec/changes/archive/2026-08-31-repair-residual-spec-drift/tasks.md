# Tasks: repair-residual-spec-drift

- [x] 0.1 openspec-feedback:plan-review —— 于首次 target edit 前完成（2026-08-31 polish Pass 1-2：全件连贯性 + 风险主导复核（CHI-004 新句 ↔ :334-348 requirement ↔ RUN.md 决策表 10 值行一致性；CDP 整块程序化提取防誊写风险）；`openspec validate --strict` 绿、`git diff --check` 干净、list-doc-locks 盘点无涉改文本锁（user-facing-language-docs 仅扫 workflow node 且方向一致）、无测试锁定被删旧句）。Done condition 达成：ready for apply，无遗留 pending task。
- [x] 0.2 openspec-feedback:closeout-review —— 归档前完成（2026-08-31）：change 范围实际 diff 复核（4 main spec + 3 Purpose + guidance/catalog + 1 锁测试 + change 工件；`git status` 证实 `DEEP_RESEARCH_HARNESS/` 0 文件改动，semantic-closure not_applicable 成立）；delta↔main 整块逐字同步由 `residual-spec-drift-text-locks.test.mjs` 第 6 测试验证；验证证据：锁测试 6/6、governance:check 全绿、npm test 2889/2889 exit 0、reqs archive + project-specs exit 0；无 open finding。

## 1. Apply 前置检查

- [x] 1.1 运行并记录基线：`node openspec/governance/check-project-reqs.mjs --mode plan`；`node openspec/governance/check-semantic-closure.mjs --change 2026-08-31-repair-residual-spec-drift --mode plan`；`node openspec/governance/check-verification-routing.mjs --change 2026-08-31-repair-residual-spec-drift --mode plan`。Done condition 达成（2026-08-31）：三查全 PASS（676 registered / 0 orphan；semantic-closure plan valid；verification-routing 4 claims valid）。
- [x] 1.2 运行 `node scripts/list-doc-locks.mjs` 于四个涉改 main spec 与 `openspec/guidance/models/invariants-brief.md`。Done condition 达成（2026-08-31）：四个 spec 的锁面均为 `tests/integration/governance/check-project.test.mjs` 的 basename 级通用锁（非内容锚定）；grep 证实无测试锁定被删旧句；`user-facing-language-docs` 仅扫 workflow node 且其禁止式措辞要求与本次编辑方向一致，无红锁风险。

## 2. engine/check-inspect-feedback（CHI-004，A1/A2/A3）

- [x] 2.1 按 delta 修改 main spec（2026-08-31）：程序化整块拼接（`/tmp/apply-c1.mjs`）+ 文本锁测试验证。Done condition 达成：`git diff` 仅显示该 requirement 块替换；块内不再出现 "`semantic_boundary`"、5 值枚举清单、旧拼写禁令；disposition 五值列举存在。

## 3. agent/delegated-work-units（DEW-012，A4/A5）

- [x] 3.1 按 delta 修改 main spec（2026-08-31）。Done condition 达成：`git diff` 仅显示 DEW-012 块替换；旧句（autofill/nonce 授权/containment-only-for-nonce）全部消失，retention 注记在位。

## 4. agent/agentic-queue（AGQ-007/AGQ-027，A8/A12）与研究/content-delivery（A13）

- [x] 4.1 按 delta 修改 main spec（2026-08-31；拼接缺陷——双段 delta 段界头行混入 main——已在拼接后当即发现并修复，diff 复核通过）。Done condition 达成。
- [x] 4.2 按 delta 修改 main spec（2026-08-31）。Done condition 达成：CDP 块仅两处句级替换，其余逐字一致。

## 5. 直接编辑（无 delta：Purpose / guidance / catalog，A9/A10/A11/A14/C1）

- [x] 5.1 `openspec/specs/engine/gate-skeleton/spec.md` Purpose "9 个" → 10/10（2026-08-31）。Done condition 达成。
- [x] 5.2 `openspec/specs/research/canonical-topic-state/spec.md` Purpose 补只读 `schema` 操作（2026-08-31）。Done condition 达成。
- [x] 5.3 `openspec/specs/research/research-wave-gate-implementation/spec.md` Purpose 补 `setup-ready`（2026-08-31）。Done condition 达成。
- [x] 5.4 `openspec/guidance/models/invariants-brief.md` :23 改导出指针 + 补真相源 `work-unit-repair-vocabulary.mjs`（2026-08-31）。Done condition 达成。
- [x] 5.5 `openspec/specs/README.md` research-return-map Engine 列改 "Deterministic inspection verifies projection readiness (RRM-006/007)"（2026-08-31）。Done condition 达成。

## 6. 回归锁与验证

- [x] 6.1 新增 `tests/engine/residual-spec-drift-text-locks.test.mjs`（2026-08-31；含 delta↔main 整块逐字同步断言，解析器正确处理段界与内联 `> req:` 行）。Done condition 达成：6/6 全绿。
- [x] 6.2 运行 `npm run governance:check`（2026-08-31）。Done condition 达成：全 PASS、exit 0。
- [x] 6.3 运行全量 `npm test`（2026-08-31）：2889/2889 pass 0 fail，exit 0。Done condition 达成。

## 7. 收尾硬性检查（归档前置）

- [x] 7.1 运行 `node openspec/governance/check-project-reqs.mjs --mode archive --change 2026-08-31-repair-residual-spec-drift`（2026-08-31）：PASS，exit 0。Done condition 达成。
- [x] 7.2 运行 `node openspec/governance/check-project-specs.mjs`（2026-08-31）：PASS，exit 0。Done condition 达成。
- [x] 7.3 归档转场与提交：本勾选表示 §1–§6 全部就绪；勾选后立即依次执行 `node openspec/governance/finalize-change-archive.mjs --change 2026-08-31-repair-residual-spec-drift`（唯一归档转场）与 git commit（change 归档 + main spec/guidance/catalog + 锁测试一个提交），执行结果以归档后的 change 目录与提交哈希为证；计划快照 Post-C1 追加至 plan §10。
