## Why

WS-A（并行安全化）与 WS-B（去 spawn）后，默认并行 `npm test` 已 0 flake、wall ~136s，串行
500s。剩余可确证改进是回归**运行工具化**（WS-E 的 repo 内部分）：

1. canonical `test` 脚本的 `find tests/ -name '*.test.mjs'` 会扫入 disposable 输出目录
   （`tests/.test-tmp/`、`tests/.test-bundles/`、`tests/engine/.test-chain-tmp/`，前缀 `.test-`）。
   这些不是测试源码，任何落入其中的 `*.test.mjs`（如临时探针、被拷入的副本）都会被误执行——
   正确性隐患（WS-A 期间实测过 `tests/.test-tmp/profiling/probe.test.mjs` 被 canonical 发现）。
2. 仓库无 CI 配置（无 `.github/workflows`）；把「按文件分片并行」做成 repo 内 `test:shard`
   脚本后，本地/外部 CI 都能把 wall 压到 ~136/N。
3. 缺一个毫秒-秒级 triage 快车道（schema + helpers + md 文本锁），便于 PR 期快速筛查。

## What Changes

- `package.json` `test` 脚本：`find tests/ -name '*.test.mjs' -not -path '*/.test-*' -print0
  | xargs -0 node --test`——canonical 发现排除 disposable 目录（`.test-` 前缀）。
- 新增 `scripts/test-shard.mjs`（纯 Node，无依赖）：递归发现 `tests/**/*.test.mjs`
  （跳过 symlink 与 `.test-` 目录），排序后按 `index % n === m` 分成 n 个 shard；CLI
  `node scripts/test-shard.mjs <n> <m>`（m 为 1-based）spawn `node --test <shard 文件>`
  并继承退出码。导出纯函数 `shardFiles(files, n, m)` 供单测。
- 新增 `tests/engine/test-shard-partition.test.mjs`：单测 `shardFiles` 的
  不相交 / 覆盖全 / 确定性 / 边界（n=1、m 越界、空列表）。
- `package.json` 新增 `test:shard`（`node scripts/test-shard.mjs`）与 `test:quick`
  （`node --test tests/schema tests/helpers tests/integration/md`，triage 快车道，
  非验证替代品）。
- `tests/integration/cli/continuation-initiation-contract.test.mjs` 的 inventory walk
  增加 `.test-` 目录跳过，与新的 canonical find 保持「mirrors find」一致（其断言
  「九个 owned suites 属于 canonical 发现集合」不受影响）。
- 不改任何测试语义、断言、用例数量、test class。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. verify-only：只改回归运行脚本与发现路径（canonical 集合在排除 disposable 后
保持不变），不改变任何 capability 的 requirement 或可观测行为，故 `skip_specs: true`。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `verification/verification-routing` | `openspec/specs/verification/verification-routing/spec.md` | Verify-only | 四类 test_class、claim 路由不变；`test:shard`/`test:quick` 只是运行方式，不改变证明边界；canonical 全量集合在排除 `.test-*` 后不变。 |
| `verification/integration-tests` | `tests/integration/` 布局 | Verify-only | inventory walk 与 find 同步排除 disposable 目录，owned suites 断言不变。 |
| `agent/delegated-work-units` | `openspec/specs/agent/delegated-work-units/spec.md` | Excluded | 生产 work-unit 引擎行为零改动；只改回归运行脚本与发现路径。 |

## Impact

- 影响面：`package.json`（3 个 script 条目）、新增 `scripts/test-shard.mjs`、
  新增 `tests/engine/test-shard-partition.test.mjs`、`continuation-initiation-contract.test.mjs`
  1 行 walk 跳过。
- 不新增依赖；Node >=20 纯 ESM。
- 验收：`npm test`（新 find）全量 2799 全绿；`test:shard 4 1..4` 各 shard 绿且并集 = 全量；
  `test:quick` 绿；`test-shard-partition` 单测绿。
