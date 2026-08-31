## 0. Review Markers（feedback lifecycle）

- [x] 0.1 在首次 target edit 前完成 openspec-feedback:plan-review —— 通读 proposal/design/tasks/verification-plan/semantic-closure 全件做整体连贯性审查 + 风险主导审查（重点：D2 的 `it` 合并（同一次 spawn 双重证明）是否弱化 read-only 证明效力、D3 find 目录口径与 `.gitignore` 的差异边界（`-type d` vs 文件匹配）是否如实陈述、triage 文档是否可能在满载场景外误导读者孤立复跑非测试文件），并运行任务 1.1 的 plan 模式检查作基线。发现转为普通未勾选任务（列出受影响对象/reader question、authoritative owner、smallest repair、independently observable done condition），marker 仅在审查完成且无 open finding 时勾选。（2026-08-31 完成：polish 3 轮（2 编辑轮 + 1 零编辑确认轮）完成整体连贯性审查，3 处修正（proposal Impact 收敛 D3、design D2 改为 it 合并、D3 口径差异如实化）已折入工件，无 open finding；1.1 基线三条 PASS。）
- [x] 0.2 归档前完成 openspec-feedback:closeout-review —— 复核 change 范围实际 diff（`git diff`/`git status` 仅含 tests/README.md、check-all.test.mjs、package.json、tests/engine/test-clean-script-contract.test.mjs 与 change 工件）、全部验证证据；重估 semantic-closure `not_applicable` 记录对照实际 diff 是否成立（无 cataloged fact family 触碰）；确认 RET-007 断言语义零弱化声明成立；无 open finding 且全部任务完成后勾选。（2026-08-31 完成：diff 面恰为 4 个声明落点（+7 README 行 / +13−10 test 重构 / +1 script 行 / 新契约测试 3 用例）；not_applicable 成立；RET-007 2/2 绿且断言重生确认；全部验证证据见各 task 备注。）

## 1. Apply 前置检查

- [x] 1.1 运行 `node openspec/governance/check-project-reqs.mjs --mode plan`（预期 PASS——本 change 无新 requirement ID）；`node openspec/governance/check-verification-routing.mjs --change harden-test-lane-signal-hygiene --mode plan`（预期 PASS，3 claims）；`node openspec/governance/check-semantic-closure.mjs --change harden-test-lane-signal-hygiene --mode plan`（预期 PASS，not_applicable record）。Done condition：三者输出记录且与预期一致。（2026-08-31 实测：676 registered / 0 orphan PASS；vrouting valid 3 claims；closure valid。）
- [x] 1.2 盘点受影响锁与断言：`node scripts/list-doc-locks.mjs tests/README.md`（区分 basename 误报与真实断言）；grep `tests/` 中引用 `check-all.test.mjs` 或断言 check-all spawn 次数的既有用例（确认无「恰好 N 次 spawn / 恰好 3 个 it」类计数假设会被 `it` 合并打破）。Done condition：清单已列出，受影响断言的更新（如有）落在 3.1 或登记为无。（2026-08-31 实测：tests/README.md 真实引用仅 verification-routing-knowledge-surfaces（指针断言，纯增量兼容）；check-all 仅被 code-impl-ids-guard.test.mjs 以路径引用（断言输出含 PASS 行）；无 it/spawn 计数假设，3.1 无需额外同步。）

## 2. tests/README 满载失败 triage 规则（proposal 1.1 / design D1）

- [x] 2.1 在 `tests/README.md`「How to Run」之后新增小节，三要素齐备：(1) 现象——subprocess 密集套件（点名 check-all aggregation）满载并行可能超时级联；(2) 操作——`node --test tests/path/to/file.test.mjs` 孤立复跑失败文件；(3) 定性——孤立绿 = 资源竞争伪影（不判回归、不改被锁行为），孤立红 = 真回归信号。纯增量不改既有行。Done condition：小节存在且三要素齐备；`node --test tests/integration/md/verification-routing-knowledge-surfaces.test.mjs` 全绿；`node --test tests/integration/md/` 相关 doc-lock 套件全绿。（2026-08-31 实测：knowledge-surfaces 5/5 绿；tests/integration/md 全量 410/410 绿。）

## 3. check-all aggregation deflake（proposal 1.2 / design D2）

- [x] 3.1 按 design D2 修改 `tests/integration/governance/check-all.test.mjs`：原 test 1（聚合断言）与 test 3（read-only 快照）**合并为一个 `it`**（before-snapshot → 单次 `run([])` → after-snapshot，同一次调用双重证明；describe 名不变，`it` 数 3 → 2）；`spawnSync` timeout 120000 → 300000；聚合覆盖断言（遍历全部 check-*.mjs 输出行、不含自身）、`--change` 转发、read-only 快照、fixture 建删断言全部保留原语义（RET-007 锁定行为零弱化，对照 design D2 断言清单逐项核对）。Done condition：`node --test tests/integration/governance/check-all.test.mjs` 2/2 绿；`git diff` 逐行审查确认无断言删除/弱化；1.2 盘点出的计数假设（如有）已同步处理。（2026-08-31 实测：2/2 绿；diff 审查确认旧 test 3 的两条 assert 均在合并用例内重生，无断言净删除；1.2 无计数假设需同步。）

## 4. test:clean 清理入口（proposal 1.3 / design D3）

- [x] 4.1 `package.json` 增加 `"test:clean": "find tests -type d -name '.test*' -prune -exec rm -rf {} +"`，`tests/README.md` 同步一行用法（口径以 `.gitignore` `tests/**/.test*` 段为唯一参照）。Done condition：`mkdir tests/.test-clean-probe && npm run test:clean` 后 probe 目录消失、`tests/fixtures/` 内容完好、`git status` 无意外变化。（2026-08-31 实测：probe 目录删除成功；fixtures 完好；git status 仅含本 change 预期文件。）
- [x] 4.2 新建 `tests/engine/test-clean-script-contract.test.mjs`（node:test + node:assert/strict）：断言 script 存在、目标限定 `tests` 子树、匹配 `.test*` 前缀目录、采用 `-prune -exec rm -rf` 形态、`.gitignore` 含 `tests/**/.test*` 锚点行。Done condition：`node --test tests/engine/test-clean-script-contract.test.mjs` 全绿。（2026-08-31 实测：3/3 绿；首轮锚点正则漏了 gitignore 行尾斜杠 `/`，即测即修。）

## 5. 全量验证与收尾

- [x] 5.1 全量 `npm test`（干净环境）预期 0 fail；若满载环境出红，按新 triage 规则孤立复跑定性并记录定性结论；`npm run governance:check` PASS。Done condition：两次输出记录备查。（2026-08-31 实测：2882/2882 pass，0 fail / 0 cancelled，~172s；governance:check 12 PASS / 3 SKIPPED(requires --change)，无异常。）
- [x] 5.2 收尾硬性检查 A：`node openspec/governance/check-project-reqs.mjs --mode archive --change harden-test-lane-signal-hygiene` 必须 PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired）。Done condition：PASS 输出记录。（2026-08-31 实测：676 registered / 57 retired / 0 orphan，exit 0。）
- [x] 5.3 收尾硬性检查 B：`node openspec/governance/check-project-specs.mjs` 必须 PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）。Done condition：PASS 输出记录。（2026-08-31 实测：82 main specs，0 violations，exit 0。）
