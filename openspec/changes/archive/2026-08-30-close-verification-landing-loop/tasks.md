## 1. 计划审查

- [x] 1.1 openspec-feedback:plan-review — 审查本 change 的 proposal、delta spec（CHF-004 修订）、design、tasks 与 verification-plan：确认窄幅修订边界（一次 canonical 调用、无 selection/retry）与既有禁令的相容性、rebaseline 断言对齐现行 main spec、防教条退场条件成立。（审查以三轮 polish 完成：Pass 1 修复 4 处含既有 slice(-9) 断言与封闭枚举触点；Pass 2 复述面排查无；Pass 3 自查编辑目标无内容锁冲突。）

## 2. Rebaseline 过时锁（实现 RUE-004/RUE-006 现行断言义务，无 requirement 变更）

- [x] 2.1 重写 `tests/integration/md/canonical-harness-vocabulary-contract.test.mjs` 首则：三个精确短语断言替换为实质断言（`## 0. Execution Brief` 存在、身份句 `本 Harness 就是项目的 Deep Research Harness` 存在、entry-selection 指针三件在指针块内且不复述程序），保留 CLAUDE.md symlink 等价断言；其余各则不动。
- [x] 2.2 重写 `tests/engine/static-regression.test.mjs` 的 RUE-004 describe：英文精确短语断言替换为实质断言（`DEEP_RESEARCH_HARNESS/RUN.md` 路由存在、`research` / `deep-research` 禁用枚举存在于根 AGENTS.md Execution Brief 的"此刻不要"列），`@impl RUE-004` 注释保留。
- [x] 2.3 负向证明（RUE-004/RUE-005 现行断言义务）：把两个锁的实质判断提取为测试内小型 matcher 函数（如 `hasExecutionBrief` / `hasIdentityClaim` / `hasPointerTriad` / `hasShortcutSuppression`），各加一条对受控"旧措辞/缺实质"样本的断言证明 matcher 返回 false（不修改生产文档；证明锁在实质缺失时会红）。

## 3. Finalizer 回归套件前置（实现 CHF-004 修订）

- [x] 3.1 在 `openspec/governance/finalize-change-archive.mjs` 的 drift-guard 循环后、native archive 前插入 `regression_suite` 检查（实现 CHF-004 修订）：扩展 `CheckSchema` id 枚举与 `RootCodeSchema` code 枚举；`runStep(runCommand, 'npm', ['test'], planningRoot)`，非零即 `makeBlocked`（code `regression_suite_failed`，owner `npm test (package.json scripts)`，repair 为 `{ command: 'npm test' }`），零则 `addCheck(checks, 'regression_suite')`；不添加重试/过滤/参数。
- [x] 3.2 扩展 `tests/governance/change-feedback-finalizer.test.mjs`：fake runner 下 (a) npm 步骤失败 → blocked `regression_suite_failed` 且 checks 序列在全部结构检查之后（尾部为 `guidance_requirement_ids`，不含 `regression_suite`）；(b) 成功 → 到达 native archive；(c) 同步更新既有成功路径 `slice(-9)` 尾部序列断言以包含 `regression_suite`；(d) 源码静态断言：finalizer 源中恰有一次 `'npm'` 调用、args 恰为 `['test']`、无 retry/selection 标记。
- [x] 3.3 扩展 `tests/integration/governance/change-feedback-finalizer.test.mjs`：fixture root 增加最小套件（`package.json` 含 `"test": "node --test tests/smoke.test.mjs"` + 恒过 smoke 测试，红哨兵时替换为失败文件）；新增红哨兵（完整链 blocked 于 `regression_suite_failed`，checks 尾部无 `regression_suite`）与绿哨兵（`regression_suite` 以 passed 出现在 checks、root.code 非 `regression_suite_failed`；native archive 边界的具体终值按实测钉死为单一确定断言）。

## 4. 锁可发现性与文档同步

- [x] 4.1 新增 `scripts/list-doc-locks.mjs`：导出纯函数核心（输入 tests 文件路径集合与目标文档路径，输出引用该文档的测试文件及相邻断言行摘录）+ CLI 壳（`node scripts/list-doc-locks.mjs <repo-relative-doc-path>`）；只读、无生成物。
- [x] 4.2 新增 `tests/engine/list-doc-locks.test.mjs`（unit）：对受控 fixture 文件集验证引用抽取与摘录形状（含"无引用时输出空"）。
- [x] 4.3 `tests/README.md` 增加一句：改治理文档措辞前先运行 `node scripts/list-doc-locks.mjs <doc-path>` 查锁。
- [x] 4.4 `openspec/operations/change-feedback-loop.md` Closeout Review 段增加一句：归档机械前置含 canonical `npm test` 退出码 0，红灯按 finalizer 的 `regression_suite_failed` 根处理（直接重跑 + 同一 finalizer 命令重跑）。

## 5. 全量验证（收尾硬性 done condition）

- [x] 5.1 运行 `npm test` 全量绿（含 rebaseline 后的 3 个原失败点与新增测试）。
- [x] 5.2 运行 `npm run governance:check` 全 PASS。
- [x] 5.3 运行 `node openspec/governance/check-project-reqs.mjs --mode archive --change close-verification-landing-loop` 必须 PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired，且无待转 reservation）。
- [x] 5.4 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）。

## 6. 归档审查

- [x] 6.1 openspec-feedback:closeout-review — 复核实际 diff 与 verification 证据：CHF-004 delta 与实现一致（blocked 根含失败摘要、`{command:'npm test'}` repair、finalizer rerun；恰一次 `'npm' ['test']` 调用、无 selection/retry，静态锁在案）；负向证明成立（两锁 matcher + 旧措辞样本失配断言）；防教条退场条件在 proposal/design；diff 范围与任务一一对应（8 改 3 增，另含 closeout 期间发现并修复的 `change-feedback-loop-archive.test.mjs` fixture 补最小套件——同类根因、同类修复）；delta/main 已同步并逐字节比对一致；全量 2861/2861 绿、governance 10 项 PASS、reqs/specs 归档检查 PASS。
