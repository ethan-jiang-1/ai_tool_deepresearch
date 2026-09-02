# Tasks: 2026-09-01-slim-rwg-requirements

## 1. 首次目标编辑前

- [x] 1.1 openspec-feedback:plan-review: 审查分组映射完备性（51 场景序号区间覆盖、23 散文段全落位、M3 替换唯一性）。完成判据：review 执行且无未处置 finding。

## 2. delta 生成与抽审

- [x] 2.1 运行 `assemble-delta.mjs` 生成 delta。验证：脚本输出 "delta OK: 3 blocks removed, 7 added, conservation 100%"。
- [x] 2.2 人工抽审 3 个新块（A2/B2/C3）：标题语义、散文完整性、场景归属 + M3 替换行复核。验证：抽审记录于本 task 勾选说明。
      抽审记录（2026-09-01）：A2（57 行/4 场景）=focus-coverage 降级边界；B2（133 行/7 场景）=共享纯收敛结果与掩蔽；C3（123 行/9 场景）=adapter 单一 target 级 direct-output 操作。M3 替换经 ADDED 段内断言验证（旧措辞不存在、新措辞与 convergence 接管说明存在）。三块尺寸 147/63/81（同批其他块 55/133/83/98 亦 ≤160）。

## 3. 主 spec 替换与结构锁

- [x] 3.1 用 delta 反向替换主 spec（程序化 + 逐字回验）。验证：7 新块与 delta 逐字一致；3 旧标题消失；M3 行已按替换更新。
- [x] 3.2 创建 `tests/engine/rwg-slim-structure-locks.test.mjs`（`@impl RWG-002`、`// @impl RWG-003`、`// @impl RWG-010`）：旧标题不存在、7 新标题各恰一次、delta/main 逐字一致、每块 ≤160 行、51 场景唯一。验证：`node --test` 全绿。
- [x] 3.3 复核既有锁定面：`list-doc-locks` 列出的 RWG 相关测试全部运行通过。

## 4. 全量验证

- [x] 4.1 `npm test` 全量 0 fail。
- [x] 4.2 `npm run governance:check` 全绿。

## 5. 收尾检查与归档

- [x] 5.1 openspec-feedback:closeout-review: 确认行集守恒（含 M3 豁免）、无语义改写、无 chat-only finding。完成判据：review 执行且无未处置 finding。
- [x] 5.2 运行 `node openspec/governance/check-project-reqs.mjs --mode archive --change 2026-09-01-slim-rwg-requirements` 必须 PASS。
- [x] 5.3 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS。

> 归档与提交不是 tasks.md 可勾选项：全部任务勾选后，由受治理 finalizer
> `node openspec/governance/finalize-change-archive.mjs --change 2026-09-01-slim-rwg-requirements`
> 执行唯一支持的最终归档转换（含 npm test 机械前置），随后 git 单提交。
