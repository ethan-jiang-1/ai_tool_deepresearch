## 0. Review Markers（feedback lifecycle）

- [x] 0.1 在首次 target edit 前完成 openspec-feedback:plan-review —— 通读 proposal/design/tasks/verification-plan/semantic-closure 全件做整体连贯性审查 + 风险主导审查（重点：D1 新措辞是否意外收窄显式指名豁免、D1 两文件同句是否与既有列表其余行风格一致、D2 guidance 行的 key 命名与末句非许可声明是否对齐既有三条惯例），并运行任务 1.1 的 plan 模式检查作基线。发现转为普通未勾选任务（列出受影响对象/reader question、authoritative owner、smallest repair、independently observable done condition），marker 仅在审查完成且无 open finding 时勾选。
- [x] 0.2 归档前完成 openspec-feedback:closeout-review —— 复核 change 范围实际 diff（`git diff`/`git status` 仅含 AGENTS.md、README.md、openspec/config.yaml 与 change 工件）、全部验证证据；重估 semantic-closure `not_applicable` 记录对照实际 diff 是否成立（无 cataloged fact family 触碰）；确认豁免条款原文未动、config.yaml YAML 合法；无 open finding 且全部任务完成后勾选。（2026-08-31 完成：diff 面恰为 3 个声明落点（AGENTS.md/README.md 各一行替换、config.yaml +6 行 guidance）+ change 工件 + plan 状态更新（C1 收尾遗留，plan 轨道文件）；not_applicable 成立；豁免条款 intro 行原文未动（git diff 确认仅目标行变化）；YAML 经 strict validate + finalizer 套件 10/10 证明合法。流程瑕疵如实记录：apply 期曾用一次 `python3` 翻转 tasks checkbox，违反仓库 "no Python" 硬规则——产物内容正确无修复面，此后一律 `node -e`；非 change 缺陷，不另立修复任务。）

## 1. Apply 前置检查

- [x] 1.1 运行 `node openspec/governance/check-project-reqs.mjs --mode plan`（预期 PASS——本 change 无新 requirement ID）；`node openspec/governance/check-verification-routing.mjs --change align-reading-scope-and-doc-locks-preflight --mode plan`（预期 PASS，2 claims）；`node openspec/governance/check-semantic-closure.mjs --change align-reading-scope-and-doc-locks-preflight --mode plan`（预期 PASS，not_applicable record）。Done condition：三者输出记录且与预期一致。
- [x] 1.2 盘点受影响锁与断言：`node scripts/list-doc-locks.mjs AGENTS.md`、`node scripts/list-doc-locks.mjs README.md`、`node scripts/list-doc-locks.mjs openspec/config.yaml`（区分 basename 误报与真实断言；确认 run-contract-surfaces-doc-lock 的硬规则行断言不落在本次改写行）；grep `tests/` 中引用 "Do Not Read" 文本的用例（预期零，2026-08-31 propose 期已实测，apply 期复核）。Done condition：清单已列出，受影响断言的更新（如有）落在 2.1/3.1 或登记为无。

## 2. Do-Not-Read 措辞对齐（proposal 1 / design D1）

- [x] 2.1 `AGENTS.md` 与 `README.md` 的 Do-Not-Read 行原位替换为 design D1 新句（两文件同句）：`- \`.exp-bundles/\`, and any lowercase \`dpt_rb_*/\` or \`dpt_disp_*/\` run-bundle directory anywhere in the repository (run bundles are runtime state, not task context)`；列表 intro 行（豁免条款）与其余行不动。Done condition：两文件 `git grep -n "anywhere in the repository"` 各恰一处且同句；`node --test tests/integration/md/verification-routing-knowledge-surfaces.test.mjs` 全绿；`node --test tests/integration/deep-research-harness-entry-contract.test.mjs` 全绿。（2026-08-31 实测：两文件各恰一处且同句（AGENTS.md:44 / README.md:45）；knowledge-surfaces 5/5；entry-contract 2/2。）

## 3. doc-locks preflight 指令行（proposal 2 / design D2）

- [x] 3.1 `openspec/config.yaml` `operations.apply.guidance` 列表末尾追加 design D2 文本（`doc-locks-preflight/apply:` key + 非许可声明，YAML 形态与既有三条同构）。Done condition：`node --test tests/integration/governance/change-feedback-finalizer.test.mjs` 全绿；`openspec instructions apply --change align-reading-scope-and-doc-locks-preflight --json` 返回的 operationGuidance 含全部既有三条 + 新一条（4 条）；`openspec validate align-reading-scope-and-doc-locks-preflight --strict` PASS。（2026-08-31 实测：finalizer 10/10；guidance 4 条含 doc-locks-preflight/apply；strict PASS。）

## 4. 全量验证与收尾

- [x] 4.1 全量 `npm test`（干净环境）预期 0 fail；若满载环境出红，按 `tests/README.md`「Full-Suite Failure Triage」规则孤立复跑定性并记录；`npm run governance:check` PASS。Done condition：两次输出记录备查。（2026-08-31 实测：2882/2882 pass，0 fail / 0 cancelled，~156s；governance:check 12 PASS / 3 SKIPPED(requires --change)。）
- [x] 4.2 收尾硬性检查 A：`node openspec/governance/check-project-reqs.mjs --mode archive --change align-reading-scope-and-doc-locks-preflight` 必须 PASS。Done condition：PASS 输出记录。（2026-08-31 实测：676 registered / 57 retired / 0 orphan，exit 0。）
- [x] 4.3 收尾硬性检查 B：`node openspec/governance/check-project-specs.mjs` 必须 PASS。Done condition：PASS 输出记录。（2026-08-31 实测：82 main specs，0 violations，exit 0。）
