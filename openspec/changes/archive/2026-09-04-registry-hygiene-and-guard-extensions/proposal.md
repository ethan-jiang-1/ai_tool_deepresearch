# Proposal: registry-hygiene-and-guard-extensions

## Why

主 plan R3/R4 收尾:registry `[DEPRECATED]` 描述账本核对 + 对账表(2026-09-04 预研:live 前缀下 76 条 retired 行**零事实性错误**,无行需修);§-guard 两个防复发盲区(phase 节点/playbook 内部 `§X.Y` 自引用、引擎导航注释幽灵符号泛化)。

## What Changes

- **R3(registry 卫生)**:预研定案 = 0 行需修(死家族已注记、replacement 指针已核对、live 前缀 retired 行全部可解析);产出 old→new 对账表(C2 迁移 17 对 + 15 死前缀家族回声 F3 数据)随 change 归档为治理记录。
- **R4(a) §-guard 扩展**:`check-spec-section-references.mjs` 增规则——phase 节点/playbook 内部 `§X.Y` 自引用与 workflows 树内跨文件 `.md §X.Y` 引用必须解析(全库首扫定标)。
- **R4(b) 幽灵符号 checker**:新 `check-engine-nav-symbols.mjs`——对 `DEEP_RESEARCH_HARNESS` 全部 `.mjs` 的 `// Navigation: public API — …` 注释做符号存在性断言(return-map 单文件测试泛化,104 文件 0 幽灵成为机器断言)。
- 无 spec 级行为变化 → `skip_specs: true`。

## Capabilities

### New Capabilities

(无)

### Modified Capabilities

(无)

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `verification/verification-routing` | `verification-routing-contract.mjs` + spec | Excluded | 四类证明边界不变;新 checker 按 check-*.mjs 命名接入,不触碰 routing schema |
| `engine/cli-exit-code-conventions` | spec | Excluded | 新 checker 为治理只读断言,不新增 CLI 退出码面 |
| `governance/spec-lean-tooling` | 假想候选,已核对 catalog 与 registry | Excluded | 纯工具/账本文档扩展,无 observable behavior;故 skip_specs: true,delta-spec 不适用 |

## Impact

- files:`openspec/governance/check-spec-section-references.mjs`(扩展)、新增 `openspec/governance/check-engine-nav-symbols.mjs`、对账表文档(随 change 归档)、tests(guard 扩展负向 + nav 符号全库断言)。
- 不触碰:registry 行(0 需修)、main specs、engine 行为。

## Source of Record / 责任边界 / 化简影响

- **Source of Record**:nav 注释指向的 engine 文件自身(符号存在性=同文件声明);§-guard 指向的 target 文件(标题存在性)。
- **最短闭环**:正则提取 → 存在性断言 → 首个根因 fail;无中间状态。
- **净简化**:两个盲区变机器断言(替代人审);无新控制层——复用 check-*.mjs 自动接入。
- **责任边界**:Agent 修文档漂移;Engine(两个 checker)出确定性 verdict;用户无新决策面。
