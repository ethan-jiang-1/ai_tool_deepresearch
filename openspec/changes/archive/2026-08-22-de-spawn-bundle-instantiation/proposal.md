## Why

串行 leaf CPU 和 ~893s 中，`tests/integration/cli/*` 与个别 e2e 文件在**每个测试**里
`spawnSync('node', [NEW_BUNDLE, ...])` 实例化一次性 bundle：实测单次
`new-disposable-bundle.mjs` 冷启动 ~620ms（node 42ms + 模块加载 + 模板落盘）。top-6
文件合计 ~87 处 per-test 实例化 spawn（wave1-complete 33、hitl1-recorded 17、
setup-ready 14、wave1-target-receipt-gate 9、wave2-closure 8、gate-dynamic-threshold 6），
≈ 48-54s 串行时间（约占全套 605s 的 8%）。这些实例化是**纯 setup**：bundle 是一份
字节可复制的模板（后续测试各自覆写 plan/profile/status），不需要每次重新走 CLI。

## What Changes

- 在 `tests/e2e/helpers/deterministic-chain-harness.mjs` 增加只读 helper：
  - `cloneBundleTemplate(template, name, { targetDir, caseId, patchPlanBasename })`：
    按 `new-disposable-bundle.mjs` 的命名形状（`dpt_disp_${name}_${hexSuffix}`，
    1 位 hex 后缀保持契约）rmSync-then-cpSync 克隆模板；可选把 `rb_plan.md`
    frontmatter 与 `rb_profile.yaml` 的 `plan_basename` 改写为克隆逻辑名。
- 6 个文件改为「每文件 before() 实例化模板一次（唯一保留的 spawn）+ 每测试 cpSync 克隆」：
  - `tests/integration/cli/check-gate-wave1-complete.test.mjs`（33 处 → 1）
  - `tests/integration/cli/check-gate-hitl1-recorded.test.mjs`（17 → 1）
  - `tests/integration/cli/check-gate-setup-ready.test.mjs`（14 → 1，启用
    `patchPlanBasename` 以保持其 basename-consistency 身份检查）
  - `tests/integration/cli/wave1-target-receipt-gate.test.mjs`（9 → 1）
  - `tests/integration/cli/gate-dynamic-threshold.test.mjs`（6 → 1）
  - `tests/e2e/wave1-target-receipt-wave2-closure.test.mjs`（8 → 1，class 仍为
    deterministic_e2e，链式步骤不变）
- 不改断言、不删用例、不改 `npm test` 命令；`--force` 语义（克隆前 rmSync）保持。
- 排除：`check-gate-instantiation-complete` / `instantiate-run-bundle` /
  `new-disposable-bundle`（被测对象就是实例化 CLI 本身，必须保留真实 spawn）。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. verify-only：只改测试夹具的组织方式（实例化一次 + 字节克隆），不改变任何
capability 的 requirement 或可观测行为，故 `.openspec.yaml` 声明 `skip_specs: true`。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `verification/verification-routing` | `openspec/specs/verification/verification-routing/spec.md` | Verify-only | 四类 test_class、claim 路由与证明边界不变；e2e 文件（wave2-closure）保持 deterministic_e2e，其链式生产 checkpoint 步骤未动。 |
| `verification/integration-tests` | `openspec/specs/verification/integration-tests/spec.md`（INT-001 隔离） | Verify-only | 克隆后的 bundle 仍是每测试独立临时目录；契约不变。 |
| `verification/test-fixtures` | `openspec/specs/verification/test-fixtures/spec.md` | Verify-only | `tests/fixtures/` 不动；只动测试运行时的 bundle 生产方式。 |
| `agent/delegated-work-units` | `openspec/specs/agent/delegated-work-units/spec.md` | Excluded | 生产 work-unit/engine/CLI 行为零改动；只改测试 setup 的进程调用方式。 |

## Impact

- 影响面：6 个测试文件（5 integration + 1 deterministic_e2e）+ `deterministic-chain-harness.mjs`
  一个 helper（签名新增，不动既有函数）。
- 收益：串行 ~48-54s；并行下子进程数大幅下降（进程 spawn 面缩小，CPU 争用降低）。
- 不新增依赖；Node >=20 纯 ESM。
- 验收：6 文件聚焦全绿；全套并行连续 2 次全绿；串行 ≤ 542s 基线；每文件 NEW_BUNDLE
  spawn 数从 N 降到 1（grep 证据）。
