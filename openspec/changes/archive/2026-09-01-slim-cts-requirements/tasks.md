# Tasks: 2026-09-01-slim-cts-requirements

## 1. 首次目标编辑前

- [x] 1.1 openspec-feedback:plan-review: 按 `openspec/operations/change-feedback-loop.md` 审查分组映射完备性（66 场景、32 散文段全数落位；脚本未映射即失败已内置）。完成判据：review 执行且无未处置 finding。

## 2. delta 生成与抽审

- [x] 2.1 运行 `assemble-delta.mjs` 生成 delta。验证：脚本输出 "conservation 100%, scenarios mapped: 66"。
- [x] 2.2 人工抽审 3 个新块（B3R2/B4R2/B4R4）：标题语义、散文完整性、场景归属。验证：抽审记录于本 task 勾选说明。
      抽审记录（2026-09-01）：B3R2（101 行/16 场景）首段=add_topic 完整 canonical skeleton 与 accepted wave-specific placeholders，与标题"输入绑定与物化"一致；B4R2（147 行/12 场景）首段=apply seam 仅收 `context: wave_projection` 严格投影形态，与"唯一严格写缝"一致；B4R4（97 行/10 场景）首段=唯一 layout 操作为 sanctioned-rerun `mutate_layout`，与"layout+post-final 有界"一致。三块散文完整、场景组内保持原相对顺序。

## 3. 主 spec 替换与结构锁

- [x] 3.1 用 delta 的 REMOVED/ADDED 反向替换主 spec（程序化 + 逐字回验）。验证：7 新块与 delta 逐字一致；2 旧标题消失。
- [x] 3.2 创建 `tests/engine/cts-slim-structure-locks.test.mjs`（`@impl CTS-003`、`// @impl CTS-004`）：旧标题不存在、7 新标题各恰一次、delta/main 逐字一致、每块 ≤160 行、66 场景唯一。验证：`node --test` 全绿。
- [x] 3.3 复核既有锁定面：`list-doc-locks` 列出的 CTS 相关测试全部运行通过。

## 4. 全量验证

- [x] 4.1 `npm test` 全量 0 fail。
- [x] 4.2 `npm run governance:check` 全绿。

## 5. 收尾检查与归档

- [x] 5.1 openspec-feedback:closeout-review: 确认行集守恒、无语义改写、无 chat-only finding。完成判据：review 执行且无未处置 finding。
- [x] 5.2 运行 `node openspec/governance/check-project-reqs.mjs --mode archive --change 2026-09-01-slim-cts-requirements` 必须 PASS。
- [x] 5.3 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS。

> 归档与提交不是 tasks.md 可勾选项：全部任务勾选后，由受治理 finalizer
> `node openspec/governance/finalize-change-archive.mjs --change 2026-09-01-slim-cts-requirements`
> 执行唯一支持的最终归档转换（含 npm test 机械前置），随后 git 单提交。
