# Tasks: 2026-09-01-spec-section-reference-guard

## 1. 首次目标编辑前

- [x] 1.1 openspec-feedback:plan-review: 按 `openspec/operations/change-feedback-loop.md` 审查 checker 规则边界与 autorun 改写语义。完成判据：review 执行且无未处置 finding。

## 2. checker 与 autorun 改写

- [x] 2.1 落地 `openspec/governance/check-spec-section-references.mjs`（已随 proposal 起草）；确认 check-all 自动发现。验证：直接运行输出 PASS（当前库零违例）。
- [x] 2.2 autorun L120 一句改写：用 delta 整块替换 `verification/experiment-agent-autorun` 块（SHALL be retired → SHALL NOT appear (retired)）。验证：程序化回验块逐字一致；主 spec 不再含 'SHALL be retired'。

## 3. fixture 测试与验证

- [x] 3.1 创建 `tests/governance/check-spec-section-references.test.mjs`：fixture root（坏：缺失 § 坐标 + SHALL be retired → exit 1 双根因；好：有效引用 → exit 0）。验证：`node --test` 全绿。
- [x] 3.2 复核既有锁定面：autorun spec 的 `list-doc-locks` 测试全部运行通过（改写若失配同 change 更新并注明）。

## 4. 全量验证

- [x] 4.1 `npm test` 全量 0 fail。
- [x] 4.2 `npm run governance:check` 全绿（新 checker 已在序列中）。

## 5. 收尾检查与归档

- [x] 5.1 openspec-feedback:closeout-review: 确认 checker 规则边界、autorun 改写语义不变、无 chat-only finding。完成判据：review 执行且无未处置 finding。
- [x] 5.2 运行 `node openspec/governance/check-project-reqs.mjs --mode archive --change 2026-09-01-spec-section-reference-guard` 必须 PASS。
- [x] 5.3 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS。

> 归档与提交不是 tasks.md 可勾选项：全部任务勾选后，由受治理 finalizer
> `node openspec/governance/finalize-change-archive.mjs --change 2026-09-01-spec-section-reference-guard`
> 执行唯一支持的最终归档转换（含 npm test 机械前置），随后 git 单提交。
