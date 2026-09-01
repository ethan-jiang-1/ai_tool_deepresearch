# Tasks: 2026-09-01-slim-rrm-requirements

## 1. 首次目标编辑前

- [x] 1.1 openspec-feedback:plan-review: 按 `openspec/operations/change-feedback-loop.md` 审查 proposal 分组表与 design 映射的完备性（59 场景全数映射、9 段散文全数落位）；每个 actionable finding 登记为普通未完成 task。完成判据：review 执行且无未处置 finding。

## 2. 生成 delta 并核对

- [x] 2.1 运行装配脚本生成 `specs/research/research-return-map/spec.md` delta（`## REMOVED Requirements` 旧块原文 + `## ADDED Requirements` 8 新块）。验证：脚本输出"行集守恒校验通过 + 59/59 场景映射 + 未知场景 0"。
- [x] 2.2 人工抽审 3 个新块（N2/N5/N6）：标题语义、散文段落完整性、场景顺序。验证：抽审记录于本 task 勾选说明。
      抽审记录（2026-09-01）：N2（110 行）标题=Wave0 候选仅来自 submitted contribution reader 及其声明序数，8 场景全为 Wave0 身份/序数/漂移/legacy 主题；N5（88 行）标题=root-short-circuit 顺序与依赖症状掩蔽，10 场景全为 parent/prerequisite masking 与 seed-set 边界主题；N6（154 行，结构锁 160 上限内）标题=Wave0 覆盖绑定精确坐标并将 omission 合并为一个有序 root，17 场景全为 coverage/disposition/batching 主题。三块散文段落完整、场景保持原相对顺序、与标题语义一致。

## 3. 主 spec 替换与结构锁

- [x] 3.1 用 delta 替换主 spec 的 RRM-007 块（REM→删、ADD→插；程序化执行 + 逐字回验）。验证：`git diff` 仅显示标题行增删；新 8 块与 delta 逐字一致。
- [x] 3.2 创建 `tests/engine/rrm-slim-structure-locks.test.mjs`（`@impl RRM-007`）：断言（a）旧标题已不存在；（b）8 个新标题各恰一次；（c）行集守恒（把新 8 块去掉标题行、拼回旧标题行后与 archive 中旧块逐字一致——以 delta 文件为对照）；（d）每个新 requirement 块 ≤ 160 行；（e）59 个 `#### Scenario:` 仍在且仅出现一次。验证：`node --test` 全绿。
- [x] 3.3 复核既有锁定面：`list-doc-locks` 列出的 RRM 相关测试 + `rrm-spec-truth-sync-text-locks.test.mjs` 全部运行通过。

## 4. 全量验证

- [x] 4.1 `npm test` 全量 0 fail。
- [x] 4.2 `npm run governance:check` 全绿。

## 5. 收尾检查与归档

- [x] 5.1 openspec-feedback:closeout-review: 确认行集守恒、无语义改写、无 chat-only finding。完成判据：review 执行且无未处置 finding。
- [x] 5.2 运行 `node openspec/governance/check-project-reqs.mjs --mode archive --change 2026-09-01-slim-rrm-requirements` 必须 PASS。
- [x] 5.3 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS。

> 归档与提交不是 tasks.md 可勾选项：全部任务勾选后，由受治理 finalizer
> `node openspec/governance/finalize-change-archive.mjs --change 2026-09-01-slim-rrm-requirements`
> 执行唯一支持的最终归档转换（含 npm test 机械前置），随后 git 单提交。
