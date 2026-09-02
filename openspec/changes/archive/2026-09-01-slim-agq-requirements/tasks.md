# Tasks: 2026-09-01-slim-agq-requirements

## 1. 首次目标编辑前

- [x] 1.1 openspec-feedback:plan-review: 审查分组映射完备性（16 场景、13 散文段全落位）。完成判据：review 执行且无未处置 finding。

## 2. delta 生成与抽审

- [x] 2.1 运行 `assemble-delta.mjs` 生成 delta。验证：脚本输出 "conservation 100%"。
- [x] 2.2 人工抽审 3 个新块（D1/D2/D3）：标题语义、散文完整性、场景归属。验证：抽审记录于本 task 勾选说明。
      抽审记录（2026-09-01）：D1 主段=paired/supplementary demand 绑定与 assignment_mode 语义；D2 主段=未认领项的单一审计修复（clone/trace/identity）；D3 主段=批量 claim 零部分分配且 task card 不预声明 work identity。三块场景归属 6/9/1 与散文主题一致。

## 3. 主 spec 替换与结构锁

- [x] 3.1 用 delta 反向替换主 spec（程序化 + 逐字回验）。验证：3 新块与 delta 逐字一致；旧标题消失。
- [x] 3.2 创建 `tests/engine/agq-slim-structure-locks.test.mjs`（`// @impl AGQ-009` 等）：旧标题不存在、3 新标题各恰一次、delta/main 逐字一致、每块 ≤160 行、16 场景唯一。验证：`node --test` 全绿。
- [x] 3.3 复核既有锁定面：`list-doc-locks` 列出的 AGQ 相关测试全部运行通过。

## 4. 全量验证

- [x] 4.1 `npm test` 全量 0 fail。
- [x] 4.2 `npm run governance:check` 全绿。

## 5. 收尾检查与归档

- [x] 5.1 openspec-feedback:closeout-review: 确认行集守恒、无语义改写、无 chat-only finding。完成判据：review 执行且无未处置 finding。
- [x] 5.2 运行 `node openspec/governance/check-project-reqs.mjs --mode archive --change 2026-09-01-slim-agq-requirements` 必须 PASS。
- [x] 5.3 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS。

> 归档与提交不是 tasks.md 可勾选项：全部任务勾选后，由受治理 finalizer
> `node openspec/governance/finalize-change-archive.mjs --change 2026-09-01-slim-agq-requirements`
> 执行唯一支持的最终归档转换（含 npm test 机械前置），随后 git 单提交。
