## Context

- 现状：`npm test` = `find tests/ -name '*.test.mjs' -print0 | xargs -0 node --test`。
  `find` 会进入 `tests/.test-tmp/`、`tests/.test-bundles/`、`tests/engine/.test-chain-tmp/`
  （统称 `.test-` 前缀 disposable 目录）；WS-A 期间实测 `tests/.test-tmp/profiling/probe.test.mjs`
  被 canonical 发现并执行。tests/README.md 已声明这些目录「disposable local test output；
  do not treat as fixtures」——canonical 发现应排除。
- `continuation-initiation-contract.test.mjs` 的 inventory walk 自称「mirrors find, skips
  symlinks」；find 排除 `.test-` 后，walk 必须同步排除才保持一致。
- 无 CI 配置（无 `.github/workflows`）；分片能力做成 repo 内脚本最通用。

## Goals / Non-Goals

**Goals:**

- canonical `npm test` 排除 `.test-*` disposable 目录，发现集合不变（2799 文件）。
- `test:shard <n> <m>` 确定性分片：n 路并行 wall ≈ 全量并行 / n。
- `test:quick`：秒-十几秒 triage 快车道（schema + helpers + md 文本锁）。
- inventory walk 与 canonical find 一致。

**Non-Goals:**

- 不改测试语义/断言/用例数/test class（验证路由不变）。
- 不做 CI 配置（repo 外，记录即可）。
- 不做 WS-C 矩阵瘦身 / WS-D e2e 优化（ROI 重估后暂缓，见计划文档）。

## Decisions

### D1 canonical find 排除 `.test-` 前缀目录

`-not -path '*/.test-*'`：一个 glob 覆盖 `.test-tmp` / `.test-bundles` / `.test-chain-tmp`
及未来任何 disposable 目录。`*/.test-*` 要求路径含 `/ .test-` 段，正常测试文件
（`tests/foo.test.mjs`）不含 `/.test-`，不受影响。验证：改后全量发现数仍 2799。

### D2 `scripts/test-shard.mjs`（纯函数 + CLI）

- `export function shardFiles(files, n, m)`：入参为排序后文件列表、总 shard 数 n（>=1）、
  0-based shard 序号 m（0 <= m < n）；返回 `files.filter((_, i) => i % n === m)`。
  确定性（输入排序后输出唯一）；n=1 返回全量；m 越界返回空数组。
- 递归发现：`readdirSync` + `lstatSync` 跳过 symlink（与 canonical find 不跟符号链接一致），
  跳过 `.test-` 目录，收集 `*.test.mjs`，整体 `sort()`。
- CLI：`node scripts/test-shard.mjs <n> <m>`（m 1-based，转 0-based 后调用 shardFiles）；
  `spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' })`，退出码继承子进程。

### D3 `test:quick` = schema + md（find 方式）

`find tests/schema tests/integration/md -name '*.test.mjs' -print0 | xargs -0 node --test`——
毫秒-秒级 schema/文档锁，triage 用途；package.json 注释标明「非验证替代品」。
（实测 node v22.23.1 的 `node --test <dir>` 不接受目录参数，故与 canonical 一致用 find。
`tests/helpers` 无测试文件，不纳入。）

### D4 inventory walk 同步

`continuation-initiation-contract.test.mjs` 的 `discoveredTestFiles` 循环顶部加
`if (entry.startsWith('.test-')) continue;`（文件与目录均跳过），与 D1 的 find 一致；
其 owned-suite 成员断言不受影响。

## Risks / Trade-offs

- find 排除模式误伤合法文件：`*/.test-*` 只匹配 `.test-` 前缀目录段；已核对 tests/ 下无
  合法 `.test-` 前缀测试文件。
- shard 负载不均：按排序后文件交替分片，重文件（rerun-round 79s）落入单 shard 会造成
  该 shard 偏慢；wall 上界 ≈ 单 shard 内最重文件之和。可接受（比单机全量并行已好），
  未来可按大小加权分片（不在本 change）。
- `test:quick` 被误当验证替代：命名与注释均强调 triage 性质。
