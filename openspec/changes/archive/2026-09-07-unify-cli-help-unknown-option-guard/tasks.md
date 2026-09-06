# Tasks — unify-cli-help-unknown-option-guard

## 1. 共享守卫 helper（Engine）

- [x] 1.1 实现 CLE-001 的 guarded-batch 条款：新增 `DEEP_RESEARCH_HARNESS/engine/helpers/cli-args.mjs`，导出纯函数 `parseGuardedArgs({ args, options, usage })`，返回 `{ kind: 'help' }` / `{ kind: 'ok', values, positionals }` / `{ kind: 'invalid', reason }`（`--` 分隔符之前存在 `--help`/`-h` token 即 help；options 声明原样转发 `node:util` `parseArgs`；解析异常 reason 取 `error.message`）；done：`node --input-type=module -e "await import('./DEEP_RESEARCH_HARNESS/engine/helpers/cli-args.mjs')"` 可加载、零新依赖
- [x] 1.2 实现 CLE-004 的 helper 回归：`tests/engine/helpers/cli-args.test.mjs`（unit，镜像 engine/helpers 布局）断言三类结果、help token 判定与 `--` 边界、default/boolean 透传、`ERR_PARSE_ARGS_UNKNOWN_OPTION` reason 透出；done：`node --test tests/engine/helpers/cli-args.test.mjs` 全绿

## 2. 六个受影响 CLI 接入

- [x] 2.1 `reconcile-plan-progress.mjs` 接入 `parseGuardedArgs`（CLE-001）：help → stdout Usage + exit 0，未知选项 → stderr `invocation error` + Usage + exit 2，missing-bundle 既有 exit 2 不变；done：2.4 静态锁通过 + 手工 `node … --help` 与 `node … --nope` 复测 exit 0/2
- [x] 2.2 `audit-phase-status.mjs` 接入（CLE-001）：同上映射（2 = invocation error，与头注释一致）；done：静态锁 + 手工复测
- [x] 2.3 `check-reentry.mjs` 接入（CLE-001）：同上映射（2 = config error，与头注释一致），领域输出路径（fd 1 JSON）不动；done：静态锁 + 手工复测
- [x] 2.4 `log-event.mjs` 接入（CLE-001/CLE-003 收窄条款）：help → stdout Usage + 0；未知选项 → stderr `invocation error` + Usage + 2；well-formed 后的日志/trace 写失败仍静默 exit 0；done：静态锁 + 手工复测三条路径
- [x] 2.5 `validate-work-unit-hygiene.mjs` 接入（CLE-001/CLE-003）：help → 0，未知选项 → 2，域内 0/1 不变；头注释无 Usage 行，新写一行 `Usage: node DEEP_RESEARCH_HARNESS/cli/validate-work-unit-hygiene.mjs [--root <path>] [--json]`；done：静态锁 + 手工复测
- [x] 2.6 `apply-research-style.mjs` 接入（CLE-001/CLE-003）：help → 0，未知选项 → 2，缺参仍退 1（recorded exception）；done：静态锁 + 手工复测
- [x] 2.7 核对/补齐 6 个文件头注释的 Usage/Exit codes 行与实现一致：`log-event` 头注释 "Always exits 0" 改写为收窄后表述；`reconcile-plan-progress`/`validate-work-unit-hygiene`/`apply-research-style` 头注释无 exit code 行的补一行；其余漂移按 CLE-003 "drift is recorded, not hidden" 记录进本 change 的 apply notes；done：6 个头注释逐一核对并留痕

## 3. 既有回归扩展与文档

- [x] 3.1 扩展 `tests/integration/cli/exit-code-convention.test.mjs`（CLE-004，沿用其既有 spawnSync 先例）：新增 6 CLI 的 `--help`（exit 0、stdout 含 `Usage:`、无 `node:internal`）与未知选项（exit 2、stderr 含 `invocation error` + `Usage:`）运行时探针；新增 batch 静态锁（6 源码 import `engine/helpers/cli-args.mjs` 且不再直接调 `node:util` `parseArgs`，漂移时失败并指名文件）；done：新增断言全绿且回退任一文件到裸 parseArgs 时失败
- [x] 3.2 同步更新 `exit-code-convention.test.mjs` 的 `CLI_CONVENTION_INVENTORY`：6 个 CLI class 文案改为 guarded batch 描述；`log-event` 的 `/always-0/` 字面检查放宽为"除 invocation 拒绝 `exit(2)` 外全部字面 exit 为 0"；保留 `validate-workflow-package.mjs` 既有断言及其依赖的 COMMANDS.md 原文行（"` is a reconciled tri-state surface`"、"Known doc/code drift" 不含该项）；done：该测试文件全量绿
- [x] 3.3 同步 `DEEP_RESEARCH_HARNESS/COMMANDS.md`（L53/L70 锚点）与 `DEEP_RESEARCH_HARNESS/cli/README.md`（L78/L79/L85 锚点）：新增 guarded batch 条目、改写 log-event 例外为"诊断/日志结果 always-0 + invocation 拒绝 code-2"、标注 "batch 已统一、其余 utility 仍例外"；done：3.2 的文档断言（含新增 batch 文档锁）通过

## 4. 验证与治理收尾

- [x] 4.1 全量回归：项目标准 test 入口跑 `tests/`（重点 `tests/integration/cli/` 全部既有 CLI 测试 + `tests/engine/`），确认无回归；done：全绿
- [x] 4.2 verification-plan 资产落地核对：`tests/engine/helpers/cli-args.test.mjs` 与 `tests/integration/cli/exit-code-convention.test.mjs` 均存在且与 `verification-plan.yaml` claims 一致；done：`node openspec/governance/check-semantic-closure.mjs --change unify-cli-help-unknown-option-guard --mode assets` PASS
- [x] 4.3 归档前治理检查一：`node openspec/governance/check-project-reqs.mjs --mode archive --change unify-cli-help-unknown-option-guard` 必须 PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired；本 change 复用 CLE-001/003/004，无新 requirement ID）
- [x] 4.4 归档前治理检查二：`node openspec/governance/check-project-specs.mjs` 必须 PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）

## 5. Feedback lifecycle reviews（归档 finalizer 要求）

- [x] 5.1 openspec-feedback:plan-review — 计划工件 ↔ 实现 coherence review：proposal 范围/非目标、design D1–D6、delta spec CLE-001/003/004 逐条对照实际 diff；finding 必须转为普通未完成 task
- [x] 5.2 openspec-feedback:closeout-review — change-scoped diff、工件与验证证据 closeout review：全量回归、治理检查、semantic-closure 角色分类、delta/main 同步复比；finding 必须转为普通未完成 task

## Apply Notes

- 2.7 头注释核对留痕：`reconcile-plan-progress`（补 Exit codes 行）、`validate-work-unit-hygiene`（补 Usage + Exit codes 行，原缺）、`apply-research-style`（补 Exit codes 行）、`log-event`（"Always exits 0" 改写为收窄表述）；`audit-phase-status`/`check-reentry` 头注释与实现本就一致，未改动。除上述已修复项外未发现其它头注释/实现漂移。
- 3.2 静态锁负验证：以合成源码验证正则对回退裸 `parseArgs` 的 import 必然命中（reverted-flagged=true），对 guard 写法不误报（guarded-clean=true）。
- 既有 `exit-code-convention.test.mjs` 的 `/always-0/` 字面检查按设计 D5 放宽为"除 code-2 invocation 拒绝外全部字面 exit 为 0"，与 delta spec CLE-004 收窄后的 log-event 例外一致。
- **5.1 plan-review 留痕**（marker 为 finalizer 要求补建，review 为真实执行）：proposal 范围/非目标逐条核对——6 CLI + helper + log-event 收窄 + 文档 + 测试全部落地；validate-bundle/gate CLI/host_tools 未触碰；无长帮助文本（hygiene 仅补一行既有形态 Usage）。design D1（classifier 签名/返回形状）、D2（log-event 三路径）、D3（exit 映射 12 条探针全中）、D4（stdout Usage / stderr invocation error 统一通道）、D5（unit 落 tests/engine/helpers、扩展既有 exit-code 回归）、D6（文档锚点与头注释）逐条对照 diff 无偏差。**无未决 finding。**
- **5.2 closeout-review 留痕**：全量回归 3183 pass / 0 fail（npm test exit 0）；`check-project-specs` PASS、`check-project-reqs --mode archive` PASS、`check-semantic-closure --mode assets` PASS、`openspec validate --strict` PASS；delta→main 同步后 re-comparison 通过（新内容 4 处命中、3 处旧表述清零、CLE-002 未动、结构完整）；semantic-closure 角色分类复核（consumers=repair-run-bundle.md 为 verdict consumer；两份文档 overlap:derived；未使用 #fragment）。工作树中与本 change 无关的遗留文件（repo 根 `_tmp_*.json`、`_audit_final3.json`）不属于本 change diff，提交时按 scope 排除。**无未决 finding。**
