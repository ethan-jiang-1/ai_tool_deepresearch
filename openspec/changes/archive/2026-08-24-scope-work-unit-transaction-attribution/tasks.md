# scope-work-unit-transaction-attribution

## 0. Apply Gate

- [x] 0.1 `openspec-feedback:plan-review` — 在首次 target edit 前读取
      `openspec/operations/change-feedback-loop.md` 并做 whole-change coherence
      review：核对 proposal/MODIFIED DEW-023 delta/design/tasks/
      verification-plan/semantic-closure 与受影响面（work-unit-transaction.mjs、
      work-unit-submit.mjs 调用方、两个测试文件）一致；`semantic-closure.yaml`
      的 fact/resolver/consumers/overlap 覆盖实际改动面。Done condition：
      review 完成且无未记入 task 的 finding。
- [x] 0.2 Plan-mode governance：
      `openspec validate 2026-08-24-scope-work-unit-transaction-attribution --strict`、
      `node openspec/governance/check-project-reqs.mjs --mode plan`、
      `node openspec/governance/check-verification-routing.mjs --change 2026-08-24-scope-work-unit-transaction-attribution --mode plan`、
      `node openspec/governance/check-semantic-closure.mjs --change 2026-08-24-scope-work-unit-transaction-attribution --mode plan`。
      Done when all exit zero。

## 1. Target Edits

- [x] 1.1 `engine/work-unit-transaction.mjs`：新增 `belongsToOtherWorkUnit`
      纯谓词（`_work_units/<wave>/<work-id>/` 且 work-id ∉ targetWorkIds），
      在 undeclared 过滤中追加应用；`listBundleFiles` 注释更新为归属语义。
      Done when 单元测试绿。
- [x] 1.2 `tests/engine/work-unit-transaction.test.mjs`：新增 holder-child
      双 worker fixture（B 事务打开窗口内父进程追加 A 的
      `_work_units/wave1/<A>/runtime-receipt.jsonl` → B commit 非 suspect、
      A 的 receipt 原样保留、锁释放）；新增同进程 direct-callback 变体；
      新增「B 自身目录未声明写入仍 suspect」。Done when 该文件全绿。
- [x] 1.3 `tests/integration/cli/operate-work-unit.test.mjs`：claim A+B 两个
      Wave1 work unit、追加 A 的 receipt、真实 `operate-work-unit submit` B →
      success、journal committed、`inspect` 有效。Done when 该文件绿。

## 2. Verification

- [x] 2.1 Focused 串行跑 1.2/1.3 及受影响相关测试（
      `work-unit-submit`、`work-unit-actor`、`work-unit-lifecycle`、
      `work-unit-transaction` 既有用例）全部绿。
- [x] 2.2 全量 `npm test` 零 fail；`git diff --check` 干净。Completed 2026-08-24: focused 147/147; full suite 2815/2815; diff-check clean.

## 3. Closeout

- [x] 3.1 `openspec-feedback:closeout-review` — 建立 change-scoped diff 边界
      （本 change 资产 + 三个 target 文件），review 实际 diff 与
      semantic-closure 重新评估；任何 actionable finding 记为普通未完成 task。
      Done when 无 open finding。Completed 2026-08-24: diff 仅限
      work-unit-transaction.mjs 谓词/注释 + 两个测试文件 + change 资产；
      semantic-closure fact/resolver/consumers/overlap 与实际改动面一致；
      无 finding。
- [x] 3.2 Agent-owned spec sync：把 MODIFIED DEW-023 合并进
      `openspec/specs/agent/delegated-work-units/spec.md`（含 `> req:` 头与
      `delta-synced` 标记）；DEW-023 registry 行描述更新（如需要）。
- [x] 3.3 Archive-mode governance + finalizer：
      `node openspec/governance/check-project-reqs.mjs --mode archive`、
      `node openspec/governance/check-project-specs.mjs`、
      `node openspec/governance/check-verification-routing.mjs --change 2026-08-24-scope-work-unit-transaction-attribution --mode assets`、
      `node openspec/governance/check-semantic-closure.mjs --change 2026-08-24-scope-work-unit-transaction-attribution --mode assets`、
      `openspec validate 2026-08-24-scope-work-unit-transaction-attribution --strict`、
      `git diff --check`，随后
      `node openspec/governance/finalize-change-archive.mjs --change 2026-08-24-scope-work-unit-transaction-attribution`。
      Done when 全部零退出且 change 进入 archive。Completed 2026-08-24: reqs archive consistent (665 registered); project specs valid (82); routing assets valid (2 claims); semantic-closure assets valid; strict validate valid; diff-check clean; full suite 2815/2815.
