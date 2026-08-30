## 0. Review Markers（feedback lifecycle）

- [x] 0.1 在首次 target edit 前完成 openspec-feedback:plan-review —— 通读 proposal/delta/design/tasks/verification-plan 全件做整体连贯性审查 + 风险主导审查（重点：A2 分类边界、POF-006 与 check-reentry 实现的相符性）+ 运行 plan 模式检查基线。发现转为普通未勾选任务，marker 仅在审查完成且无 open finding 时勾选。
- [x] 0.2 归档前完成 openspec-feedback:closeout-review —— 复核 change 范围实际 diff、全部工件与验证证据；semantic-closure `affected` 记录对照实际 diff 重估（family/resolver/established_by/consumers）；无 open finding 且全部任务完成后方可勾选，随后以 finalizer 作为唯一归档终态。

## 1. Apply 前置检查

- [x] 1.1 运行 `node openspec/governance/check-project-reqs.mjs --mode plan`（预期 exit 1 且报告恰为 `Unregistered IDs: POF-006`——修复即任务 2.3 的 registry 同步）；`node openspec/governance/check-semantic-closure.mjs --change 2026-08-30-align-post-final-recovery-surfaces --mode plan`（PASS——record 的 catalog_additions 声明即满足 plan 时点，global catalog 写入是 2.2 的 apply 义务）；`node openspec/governance/check-verification-routing.mjs --change 2026-08-30-align-post-final-recovery-surfaces --mode plan`（PASS，3 claims）。Done condition：三者输出与 2026-08-30 polish 期实测基线一致并记录（已满足）。
- [x] 1.2 运行 `node scripts/list-doc-locks.mjs openspec/specs/research/post-final-recovery/spec.md` 与 `node scripts/list-doc-locks.mjs DEEP_RESEARCH_HARNESS/command_playbook/post-final-recovery.md`；另 grep `tests/` 中断言 `operation_failed`/`PostFinalRecoveryCrashError`/exit 码的既有用例清单。Done condition：锁与断言清单已列出，受影响断言的更新落在 4.x。

## 2. Spec 与 registry 落地（research/post-final-recovery）

- [x] 2.1 按 delta 落地 POF-006 到 main spec（ADDED requirement 全文 + 2 scenario），main spec 头部 `> req:` 追加 POF-006。Done condition：POF-006 heading 在 main spec 存在；头部含 6 个 ID。
- [x] 2.2 将新 fact family `lifecycle.reentry-checkpoint-targeting`（bounded question：post-final 入口诊断应目标哪个检查点、各合法 `--at` 形式读作什么）写入 `openspec/governance/semantic-fact-families.yaml`。Done condition：catalog 含该 family 且 `check-semantic-closure --mode plan` PASS。
- [x] 2.3 同步 `openspec/governance/req-registry.yaml`：新增 POF-006 一条。Done condition：registry 含 POF-006 且 `check-project-reqs --mode plan` exit 0。
- [x] 2.4 `DEEP_RESEARCH_HARNESS/command_playbook/post-final-recovery.md` 指针化：§1.5 规范性描述收敛为对既有 spec requirement（"Post-final rerun intake guidance structures scope formation from a diagnostics dig-list"）的指针，保留 §1.5 标题与 inspect/操作命令；§4 末段收敛为对 POF-006 的指针。Done condition：§1.5/§4 不再复述规范性规则；锚标题保留；`npm run governance:check` 的 content-drift/pointer-targets PASS。

## 3. A2 代码修复（cli/operate-post-final-recovery.mjs）

- [x] 3.1 核对 helper 全部 throw 点与既有测试断言（`grep -rn "PostFinalRecoveryCrashError\|operation_failed" tests/ DEEP_RESEARCH_HARNESS/engine/helpers/post-final-recovery.mjs`），确认分类边界：`ZodError` → exit 2 `invalid_configuration`（不变）；其余 → closed blocked result（`verdict: 'blocked'`、`reason_code: 'operation_failed'`、`reason: error.message`，schema 默认填充）+ exit `1`。Done condition： throw 点清单与分类结论记录在本任务完成备注。
- [x] 3.2 修改 CLI catch 块实现上述分类。Done condition：`git diff` 仅覆盖 catch 块；`node DEEP_RESEARCH_HARNESS/cli/operate-post-final-recovery.mjs`（无参数）仍 exit 2。

## 4. 测试

- [x] 4.1 在 `tests/integration/cli/post-final-recovery.test.mjs` 新增用例：terminal final fixture 的 `rb_status.json` 写入非法 JSON → `inspect` → 断言 exit `1` + stdout JSON `verdict: 'blocked'`、`reason_code: 'operation_failed'`。先写用例确认修复前为红（exit 2），再落 3.2 转绿。Done condition：该用例绿且修复前提交前可复现红。
- [x] 4.2 复核 `tests/integration/cli/exit-code-convention.test.mjs` inventory（无参数 → exit 2 不变）与 `check-reentry.test.mjs`；若 1.2 清单中有其他受影响断言，同 change 更新。Done condition：相关测试全绿。

- [x] 4.3 修复被本 change 暴露的第二个 list-doc-locks 盲点实例：`tests/engine/post-final-intent-intake-docs.test.mjs`（POF-005 锁）断言 playbook 复述规范性 intake 规则——dedup 后按 post-dedup 现实重写为"spec 持有规则 + playbook 保留操作序列与指针"，intent 不变（8/8 绿）。与 C1 发现的动态路径盲点同类，两处盲点一并作为后续工作登记。Done condition：该套件 8/8 绿（已验证）。

## 5. 验证与收尾硬性检查

- [x] 5.1 运行 `npm run governance:check`。Done condition：全部 check PASS。
- [x] 5.2 运行 `node openspec/governance/check-project-reqs.mjs --mode archive --change 2026-08-30-align-post-final-recovery-surfaces` 必须 PASS。Done condition：退出码 0。
- [x] 5.3 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS。Done condition：退出码 0。
- [x] 5.4 全量 `npm test` 退出码 0。Done condition：直接重跑确认非偶发后退出码 0。