## Why

`npm test` 默认并行执行测试文件，但 6 个 CLI integration 测试文件通过
`snapshotBundle(x, dirname(x))` 共用**同一个固定快照路径** `tests/.test-bundles/.baseline-snapshot`，
并行时互相 `rmSync + cpSync` 撕扯同一目录，产生确定性竞态。本机实测（2026-08-22，8 核，
node v22.23.1）：并行 159s wall 但 3 个文件约 40 个用例失败；这 3 个文件**单独跑全部通过**
（28/28、31/31、1/1），串行全量（`--test-concurrency=1`）605s 全绿 2799/2799——证明是竞态而非回归。
上一轮 `slow-test-suite-audit-and-remediation`（closed 2026-08-22）把「不并发」当前提，全部优化都在
串行框架内，共享基线改法反而埋下了这个雷。完整测量与方案见
`_backlog/plans/regression-suite-parallel-speedup.md`。

## What Changes

- 修掉 6 个测试文件（13 处调用点）的共享快照路径竞态，让默认并行执行成为可信模式
  （605s 串行 → ~160-200s 并行）：
  - `tests/integration/cli/check-gate-wave0-complete.test.mjs`（2 处）
  - `tests/integration/cli/operate-queue-validation.test.mjs`（7 处）
  - `tests/integration/cli/check-gate-wave2-complete.test.mjs`（1 处）
  - `tests/integration/cli/check-gate-hitl2-recorded.test.mjs`（1 处）
  - `tests/integration/cli/check-gate-readiness-passed.test.mjs`（1 处）
  - `tests/integration/cli/handoff-witnessing-lifecycle.test.mjs`（1 处）
  - 改法：快照根从 `dirname(bundle)`（恒等于 `tests/.test-bundles/.baseline-snapshot`）改为
    **每文件唯一根**（`join(BUNDLES_DIR, '.snap-<file-token>-<bundle-basename>')`，file-token 为每文件常量）。
    `deterministic-chain-harness.mjs` 的 `snapshotBundle(source, root)` 签名不变，仅调用点传唯一 root。
- 核实并记录：`wave1-focus-coverage-contract.test.mjs` 与全部 e2e 文件已用
  `createTempRoot()`（os.tmpdir mkdtemp 唯一根），快照路径本就 per-run 唯一，**无需改动**。
- 修掉共享 bundle 名空间竞态（验证期发现）：5 个文件以字面量 `'shared'` 直接建 bundle，
  而 `new-disposable-bundle.mjs` 的 1 位 hex 后缀只有 16 值空间（契约测试锁定），并行时
  同名 + `--force` 互删 → ENOENT flake（并行第 2 次跑实测）。改为每文件独立名
  （`'shared-wave0'` 等，12 处），跨文件同名面归零。
- 验证并记录其余共享写入面（`tests/engine/.test-chain-tmp/`、`tests/.test-tmp/fake-claude.mjs`、
  `tests/.test-tmp/<fixture-base>`）均为单文件使用，无跨文件竞态。
- 确认 `handoff-witnessing-lifecycle` 失败保留 bundle 供诊断是**刻意设计**（`cleanupAfterTest(pass)`），
  保留不动；仅确认并行全绿后不再累积。
- 不改 `npm test` 命令/发现/超时/skip；不改任何测试类声明；不改生产 Harness/Engine 代码。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. 这是 verification-only 的测试执行安全修复：不改变任何 capability 的 requirement 或
可观测行为，故 `.openspec.yaml` 声明 `skip_specs: true`（delta-spec 不适用：无行为变化，
只有测试夹具的磁盘路径组织变化）。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `verification/verification-routing` | `openspec/specs/verification/verification-routing/spec.md`（6 reqs，`openspec list --specs --json`） | Verify-only | 四类 test_class、claim 路由与证明边界完全不变；并行化不改变任何 proof 的 class 或 authority。 |
| `verification/integration-tests` | `openspec/specs/verification/integration-tests/spec.md`（INT-001「每个 test case 用独立临时目录」） | Verify-only | 本 change 让集成测试更符合隔离精神（快照根从跨文件固定路径改为每文件唯一路径）；不修改契约文本。 |
| `verification/test-fixtures` | `openspec/specs/verification/test-fixtures/spec.md`（TEF-001） | Verify-only | `tests/fixtures/` 不动；只动 `tests/.test-bundles/` 运行时快照路径（untracked 一次性输出）。 |
| `agent/delegated-work-units` | `openspec/specs/agent/delegated-work-units/spec.md` | Excluded | 生产 work-unit 引擎/队列行为不动；本 change 只改测试夹具快照路径与共享 bundle 字面量名。 |

## Impact

- 影响面：6 个 `tests/integration/cli/*.test.mjs`（wave0/wave2/hitl2/readiness/
  queue-validation 的快照调用点 13 处 + 共享 bundle 字面量改名 12 处；handoff 快照 1 处）
  + `tests/e2e/helpers/deterministic-chain-harness.mjs` 一个只读 helper（签名不变）。
- 不新增依赖；Node >=20 纯 ESM。
- 验收：`npm test`（默认并行）全绿 0 fail，wall ≤ ~200s；`--test-concurrency=1` 串行 ≤ 605s；
  连续 2 次并行全绿（flake 面 = 0）。
