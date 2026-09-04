# Tasks: registry-hygiene-and-guard-extensions

## 1. R3 registry 卫生(预研已定案)

- [x] 1.1 DEPRECATED 描述预研:76 条 retired 行(live 前缀)0 事实性错误;15 死前缀注记与 replacement 指针已核对 → 无行需修
- [x] 1.2 old→new 对账表文档(17 迁移对 + 15 死前缀回声 F3 数据)落 change 归档;验证 = 文档与 registry 后继指针一致(机器抽查)

## 2. R4(a) §-guard 扩展

- [x] 2.1 `check-spec-section-references.mjs` 增规则 3(workflows 树内裸 `§X.Y` 自引用 + 跨文件 `.md §X.Y`);单测负向(缺引用→fail + 根因);验证 = tests/governance/ 下新负向测试绿
- [x] 2.2 workflows 全库首扫定标:修复全部 FAIL 到 0(修文档);验证 = checker 手动跑 0 violations

## 3. R4(b) nav 符号 checker

- [x] 3.1 `check-engine-nav-symbols.mjs`(全形态声明正则 + fail-closed 首根因);单测含真假符号 fixture;验证 = 测试绿
- [x] 3.2 DEEP_RESEARCH_HARNESS 全库首扫:0 幽灵成为断言(接入 check-all 自动);验证 = 手动跑 PASS + governance:check 含新 checker

## 4. 集成验证与收尾

- [x] 4.1 全量 `npm test` + `governance:check` 全绿(由 finalizer 门承载 npm test);验证 = 0 fail
- [x] 4.2 openspec-feedback:plan-review — guard 规则与首扫定标策略复审
- [x] 4.3 openspec-feedback:closeout-review — 两 checker 完整性 + 对账表一致性复审
- [x] 4.4 归档收尾:check-project-reqs --mode archive PASS + check-project-specs PASS
