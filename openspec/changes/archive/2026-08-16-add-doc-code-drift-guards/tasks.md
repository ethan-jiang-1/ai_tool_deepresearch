# Tasks: add-doc-code-drift-guards

## 1. Planning 收尾(apply 前;目标文件保持不动)

- [x] 1.1 创建 `verification-plan.yaml`:四类 test class——`unit`(checker 规则 truth table:路径/CLI/gate 覆盖判定)、`integration`(对真实文档跑 checker;exit-code 静态扫描扩展;`--check-prefix` CLI 查询)、`deterministic_e2e`/`agent_flow_e2e` not selected 写明理由
- [x] 1.2 创建 `semantic-closure.yaml`:`status: not_applicable`(本 change 不改任何 runtime fact——checker/查询接口/finalizer 接线是 governance 工具,不改变确定性事实;reason 写清);`node openspec/governance/check-semantic-closure.mjs --change add-doc-code-drift-guards --mode plan` 必须 PASS
- [x] 1.3 运行 polish-openspec-change 至少两轮(Pass 1 整体一致性 + 至少一轮 risk-led:checker 排除面假阳性风险、gate 表覆盖的现存缺口、`--check-prefix` 与 plan/archive 模式互不干扰、finalizer 接线失败模式),直到 `openspec validate --strict` + `git diff --check` 通过;决定不了的升级用户
- [x] 1.4 三原则 design review 复核(语义边界 / Source of Record / 最短闭环 / net simplification / 责任边界)
- [x] 1.5 `openspec-feedback:plan-review` 在首个 target edit 前完成 plan review:通读 proposal、delta、design、tasks、verification-plan、semantic-closure;核对语义角色与排除面;每个 finding 转普通任务。Done:plan-mode 四项治理检查绿 + 无未决 finding(@impl RET-001, RET-006)

## 2. 内容漂移 checker(apply)

- [x] 2.1 实现 `openspec/governance/check-content-drift.mjs`:路径检查(仓库相对 + harness 相对坐标,反引号路径存在性;排除 bundle-runtime 前缀 / `<...>` 占位符 / deprecated 锚点;排除面显式 allowlist 自文档化)
- [x] 2.2 CLI 名/动词检查:prose 中 `cli/<tool>.mjs` 存在性(路径检查覆盖)+ `COMMANDS.md` 索引动词词面出现在工具源码
- [x] 2.3 gate 清单检查(H8):`shared-gate-rules.md` 表行 gate 名 ↔ `schema/gate_definitions/gate-*.definition.json` 双向覆盖
- [x] 2.4 对真实文档跑 checker,分诊全部现存漂移:修散文(以当前树为准)或修正 checker 排除规则;无法判定冲突的升级用户
- [x] 2.5 unit 测试 `tests/governance/check-content-drift.test.mjs`(fixture 化规则 truth table)+ integration 测试 `tests/integration/governance/check-content-drift.test.mjs`(对真实文档断言零报错)

## 3. propose 减税与 exit-code 静态扩展(apply)

- [x] 3.1 `check-project-reqs.mjs` 加 `--check-prefix <ABC>`:注册 → exit 0 打印映射/ID/三态;缺失/非法 → exit 2 usage;不影响 plan/archive 模式
- [x] 3.2 `--check-prefix` 测试(`tests/integration/governance/check-project.test.mjs` 扩展或新测试):ACR 前缀查询成功、未知前缀 exit 2
- [x] 3.3 exit-code 静态扫描扩展(`tests/integration/cli/exit-code-convention.test.mjs`):对每个 inventoried CLI 提取源码 `process.exit(N)` 字面量,断言与 class 声明一致(tri-state class 必有 exit(2) 字面量;binary class 不得有)
- [x] 3.4 finalizer 接线:`finalize-change-archive.mjs` 在 semantic-closure 之后串入 `check-content-drift`(失败即 block,与既有 checker 并列)

## 4. 验证与收尾

- [x] 4.1 `npm test` 相关子集绿:`tests/governance/`、`tests/integration/governance/`、`tests/integration/cli/exit-code-convention`、`tests/integration/md/`
- [x] 4.2 全量治理检查绿:check-project-reqs `--mode plan`、check-project-specs、check-verification-routing `--mode plan`、check-semantic-closure `--mode plan`、check-content-drift(自身零报错)
- [x] 4.3 收尾检查 1:`node openspec/governance/check-project-reqs.mjs --mode archive --change add-doc-code-drift-guards` 必须 PASS
- [x] 4.4 收尾检查 2:`node openspec/governance/check-project-specs.mjs` 必须 PASS
- [x] 4.5 `openspec-feedback:closeout-review` 归档前完成 closeout review:change-scoped diff 复核(checker + finalizer + check-project-reqs + 4 个测试文件 + shared-gate-rules 补行 + 2 个 spec requirement);checker 排除面与实际扫描复核——383 条引用零报错,allowlist 3 类(required-absent 3 条、规范放置目标 3 条、do-not-edit 1 条)全部有理由;gate 覆盖修复(rerun-ready 表行补入);verification 证据:governance unit 37/37、governance integration 35/35、exit-code 33/33、md 340/340、finalizer 单测 9/9;delta/main 同步完成(RET-001 + RET-006)。Done:无未决 finding(@impl RET-001, RET-006)
- [x] 4.6 archive:`node openspec/governance/finalize-change-archive.mjs --change add-doc-code-drift-guards` 成功(调用前勾选本任务);`_backlog/plans/guidance-drift-cleanup-machine-guards.md` 勾选 C3 检查项并登记 CLS 编号
