## 0. Review Markers（feedback lifecycle）

- [x] 0.1 在首次 target edit 前完成 openspec-feedback:plan-review —— 通读 proposal/delta/design/tasks/verification-plan/semantic-closure 全件做整体连贯性审查 + 风险主导审查（重点：D1 扫描面收窄是否遗漏现实漂移面、D4 测试自扫描转义约束的可执行性、not_applicable closure 论证是否成立）+ 运行任务 1.1 的 plan 模式检查基线。发现转为普通未勾选任务（列出受影响 requirement/reader question、authoritative owner、smallest repair、independently observable done condition），marker 仅在审查完成且无 open finding 时勾选。
- [x] 0.2 归档前完成 openspec-feedback:closeout-review —— 复核 change 范围实际 diff、全部工件与验证证据；重估 semantic-closure `not_applicable` 记录对照实际 diff 是否成立（无 cataloged family 触碰）；确认零运行时行为变更声明成立（`git status` 仅含 checker/测试/main spec/registry/change 工件）；无 open finding 且全部任务完成后勾选，随后以 finalizer 作为唯一归档终态。

## 1. Apply 前置检查

- [x] 1.1 运行 `node openspec/governance/check-project-reqs.mjs --mode plan`（**预期 exit 1 且报告恰为 `Unregistered IDs: RET-011`**——先例 `2026-08-30-align-post-final-recovery-surfaces` tasks §1.1 同型，修复即任务 3.2 的 registry 同步）；`node openspec/governance/check-semantic-closure.mjs --change 2026-08-31-add-code-impl-registry-guard --mode plan`（预期 PASS，not_applicable record）；`node openspec/governance/check-verification-routing.mjs --change 2026-08-31-add-code-impl-registry-guard --mode plan`（预期 PASS，6 claims）。Done condition：三者输出记录且与预期一致。
- [x] 1.2 盘点受影响锁与断言：`node scripts/list-doc-locks.mjs openspec/specs/governance/requirement-traceability/spec.md`；grep `tests/` 中断言 `check-spec-req-ids`/`req-registry` 扫描行为的既有用例清单（确认无用例假设「governance 目录恰好 N 个 checker」这类会被新文件打破的计数断言）。Done condition：清单已列出，受影响断言的更新（如有）落在 4.2 或登记为无。

## 2. Checker 实现（RET-011 的 coverage 载体）

- [x] 2.1 新建 `openspec/governance/check-code-impl-ids.mjs`，按 design D1-D3：三覆盖面（`DEEP_RESEARCH_HARNESS/`、`openspec/governance/`、`tests/` 递归 `*.mjs`，目录缺失则跳过该面）；行规则 = 含 `@impl` 子串的行；token 提取 `[A-Z]{3}-\d{3}` 且排除 `/^BUG-\d+$/`；registry 用 `yaml` 包解析 `<root>/openspec/governance/req-registry.yaml`，缺失 exit 1 fail-closed；registered 判定 `registered.has(id)`（`[DEPRECATED]` 可解析）；violation 输出 `  <repo-rel-path>: <ID> not registered in req-registry.yaml (register via lifecycle or correct the @impl tag)` + exit 1；clean 输出 `check-code-impl-ids: clean (S files, K @impl lines, M tokens validated).` + exit 0；usage 错误 exit 2；文件头 `// @impl RET-011`。Done condition：文件存在；`node openspec/governance/check-code-impl-ids.mjs a b`（两个 positional）exit 2；此时**不**声称真实树 green（RET-011 未注册，留待 4.1）。
- [x] 2.2 接线零改动核验：`git diff --name-only` 确认 `check-all.mjs` 无改动；`ls openspec/governance/check-code-impl-ids.mjs` 存在即满足 `check-*.mjs` 命名自动发现前提（端到端断言在 4.2 用例 6）。Done condition：`git diff --name-only -- openspec/governance/check-all.mjs` 输出为空。

## 3. Spec 与 registry 落地（governance/requirement-traceability）

- [x] 3.1 按 delta 落地 RET-011 到 `openspec/specs/governance/requirement-traceability/spec.md`：ADDED requirement「Requirement IDs in code implementation tags resolve against the registry」全文 + 4 个 scenario（unregistered fail / BUG- excluded / deprecated resolvable / registry-missing fail-closed），插入位置在 RET-010 requirement 之后；main spec 头部 `> req:` 行追加 `RET-011`（保持数字序，符合 RET-004）。Done condition：RET-011 的 `### Requirement:` heading 在 main spec 存在且标题不含 ID 前缀；头部含 11 个 ID；`grep -c "### Requirement:" spec.md` 较改动前 +1。
- [x] 3.2 同步 `openspec/governance/req-registry.yaml`：在 RET-010 行后新增 `RET-011: requirement-traceability — Requirement IDs in code implementation tags resolve against the registry`（格式对齐相邻行）。Done condition：registry 含 RET-011，且 `node openspec/governance/check-project-reqs.mjs --mode plan` **exit 0**（1.1 的预期 exit 1 由此任务闭合）。

## 4. 测试

- [x] 4.1 首次真实树 green 基线：`node openspec/governance/check-code-impl-ids.mjs`（repo root）→ exit 0。口径注意：checker 的 `S files` 是扫描的全部 `.mjs` 数（大于携带 `@impl` 的 644）、`M tokens` 是出现次数口径（不等于跨面去重 404 的 unique 计数）；本任务只断言 0 violation、三面均有扫描计数、`BUG-018` 不出现于违例，S/K/M 实测值全文记录备查。Done condition：exit 0，输出全文记录在本任务完成备注。
- [x] 4.2 新建两个测试文件（node:test + node:assert/strict；tmpdir fixture + `spawnSync` 真实 checker；`after()` 清理；**文件头注释声明 design D4 转义约束：测试源码不得出现字面 `@impl <未注册ID>`，fixture tag 行一律字符串拼接构造**；两个文件的拆分使每个 asset path 的 route identity 一致——`tests/governance/code-impl-ids-guard.test.mjs` 承载真实树用例（fixture: none）：real-tree clean、spawn `check-all.mjs` 输出含 `check-code-impl-ids` PASS 行；`tests/governance/code-impl-ids-fixture-contract.test.mjs` 承载 fixture 用例（fixture: fixture_backed）：unregistered fail（断言 stderr 点名 file+token+修复方向）、BUG- 排除、deprecated 可解析、registry 缺失 fail-closed），6 个用例一一对应 verification-plan 的 6 个 claim。Done condition：两个文件 `node --test` 各自全绿（2/2 与 4/4），且 `git diff --name-only -- openspec/governance/check-all.mjs` 仍为空。

- [x] 4.3 在既有 `tests/integration/md/spec-sync-locks.test.mjs` 的 RET-007~010 标题清单中断言追加 RET-011 的 requirement 标题（house 惯例：新 requirement 落 main spec 即加文本锁，POF-006 先例同型；正向断言不破坏 RET-006 锁）。Done condition：该套件在 3.1 落地后全绿，且删除 main spec 中 RET-011 heading 时该用例变红（锁非恒真，人工验证一次后还原）。

## 5. 验证

- [x] 5.1 运行 `npm run governance:check`。Done condition：全部 check PASS，输出含 `check-code-impl-ids` 的 PASS 行（自动发现端到端证据）。
- [x] 5.2 运行 `node openspec/governance/check-verification-routing.mjs --change 2026-08-31-add-code-impl-registry-guard --mode assets`。Done condition：PASS，6 个 claim 的 asset 路径均存在且在 unit 类 owned boundary（`tests/`）内。

## 6. 收尾硬性检查（归档前置）

- [x] 6.1 运行 `node openspec/governance/check-project-reqs.mjs --mode archive --change 2026-08-31-add-code-impl-registry-guard` 必须 PASS。Done condition：退出码 0。
- [x] 6.2 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS。Done condition：退出码 0。
- [x] 6.3 全量 `npm test` 退出码 0。Done condition：直接重跑确认非偶发后退出码 0。
