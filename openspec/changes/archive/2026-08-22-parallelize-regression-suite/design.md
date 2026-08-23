## Context

- 当前状态：6 个 CLI integration 测试文件共 13 处 `snapshotBundle(source, root)` 调用点
  全部传 `root = dirname(bundle)`，而 bundle 都位于 `tests/.test-bundles/`，因此快照恒写到
  同一个固定路径 `tests/.test-bundles/.baseline-snapshot`。`snapshotBundle` 语义是
  `rmSync(root) + cpSync(source, root, {errorOnExist:true})`，`restoreBundle` 是
  `rmSync(target) + cpSync(snapshot, target, {errorOnExist:true})`——两个文件并行时互相
  rm/cp 同一路径，产生确定性竞态（实测并行 159s 但 3 文件 ~40 用例失败，单独跑全过；
  串行 605s 全绿）。
- 安全范式已存在：e2e 文件（`rerun-round-continuity` 等）与
  `wave1-focus-coverage-contract.test.mjs` 传各自 `createTempRoot()` 的
  `os.tmpdir()` mkdtemp 根，快照路径本就 per-run 唯一，并行安全——无需改动。
  本 change 是把其余 6 个 CLI 文件拉齐到同一范式。
- 约束：`deterministic-chain-harness.mjs` 是测试专用 helper（非框架代码），可加只读 helper，
  但 `snapshotBundle`/`restoreBundle` 签名不变；生产 Harness/Engine 不动。

## Goals / Non-Goals

**Goals:**

- `npm test`（默认并行）全绿 0 fail，wall ≤ ~200s（本机 8 核）；连续 2 次并行无 flake。
- 消除跨文件固定共享磁盘路径：每个快照根对 (文件, bundle) 唯一。
- 快照/恢复语义与测试断言完全不变——只换路径。
- 清理面闭环：`.snap-*` 瞬态目录随既有 after() 清理，不累积。
- 记录其余共享写入面的排查证据（单文件使用 or 需要修）。

**Non-Goals:**

- 不删用例、不改测试类、不改 `npm test` 命令/发现/超时（WS-C/WS-E 另立 change）。
- 不做 in-process CLI 重构（WS-B）。
- 不改 `handoff-witnessing-lifecycle` 的「失败保留 bundle 供诊断」设计（`cleanupAfterTest(pass)`
  是刻意行为）；只保证其快照根唯一。
- 不改生产 Harness/Engine/CLI/Gate/schema/requirement。

## Decisions

### D1 每文件唯一快照根（主决策）

在 `tests/e2e/helpers/deterministic-chain-harness.mjs` 增加只读 helper：

```js
export function uniqueSnapshotRoot(bundle, token) {
  return join(dirname(bundle), `.snap-${token}-${basename(bundle)}`);
}
```

6 个文件的 13 处调用点改为：

```js
sharedSnapshot = snapshotBundle(sharedBundle, uniqueSnapshotRoot(sharedBundle, '<file-token>'));
```

file-token（每文件常量）：`wave0`（2 处）、`queue-validation`（7 处）、`wave2`、`hitl2`、
`readiness`、`handoff-witnessing`。

理由与备选：

- **备选 (a) 每文件 `os.tmpdir()` mkdtemp**：隔离最强，但 bundle 仍在 `tests/.test-bundles/`，
  快照却在 /tmp，调试时位置割裂；崩溃残留不可见。作为 D1 失败后的回退方案保留。
- **备选 (b) 只按 bundle basename 派生**（`.snap-<basename>`）：basename 含实例化随机后缀，
  跨文件碰撞概率极低但非零；`<token>` 前缀把碰撞概率归零，且让目录名可读（故障时一眼看出
  属于哪个文件）。
- 文件内多站点安全性：node:test 默认文件内用例串行执行；同一文件多个站点（wave0 2 处、
  queue-validation 7 处）各自 bundle basename 不同 → 根不同；即使将来开文件内 concurrency 也不冲突。
- 已核实不需要改：`wave1-focus-coverage-contract` 与全部 e2e 文件的快照根是 per-run 唯一的
  tmpdir（`createTempRoot()`），无跨文件共享路径；保持原样。

### D4 bundle 名空间竞态（验证期发现，2026-08-22 并行第 2 次跑）

并行第 2 次跑出现 1 个失败（operate-queue-validation QIV-002，`ENOENT
.../dpt_disp_shared_3/rb_queue.json`）：5 个文件都以字面量 `'shared'` 调用
`createBundle('shared')`，而 `new-disposable-bundle.mjs` 只追加 **1 位 hex 后缀**
（`randomInt(0,16)`，16 值空间，且被 `new-disposable-bundle.test.mjs` 的
`[0-9a-f]$` 断言锁为契约）。并行时 5 个文件同时落盘同名 bundle，一旦后缀撞车，
后到者的 `--force` 会删除先到者正在使用的 bundle → 中途 ENOENT。

处置（D4）：把 5 个文件的共享 bundle 字面量改为**每文件独立名**
（`'shared'` → `'shared-wave0'` / `'shared-wave2'` / `'shared-hitl2'` /
`'shared-readiness'` / `'shared-queue-validation'`，共 12 处）。名称不同 → 目录名必不同，
撞车概率归零（与后缀空间无关）。已核实：
- 这些文件的 createBundle 之后都**覆写 plan_basename**（'test' 等固定值），与 bundle 名解耦，
  改名不影响任何 plan/profile 断言；wave0 的 `plan_basename: "${name}"` 随新名，
  无 gate/断言比对该值。
- 其余字面量（'pass'、'malformed' 等）经查均包 `unique()` 或为单文件固定子目录，不构成
  跨文件同名，无需改。
- 不扩大 `new-disposable-bundle` 的 hex 后缀空间：那是被契约测试锁定的命名形状，且加宽只是
  概率性缓解（非零 flake），每文件独立名才是确定性修法。

### D5 术语扫描 vs 临时目录删除竞态（验证期发现，并行 B）

并行 B 次跑出现 1 个失败：`agent-experiment-autorun-terminology.test.mjs` 的
`testSources('tests')` 递归遍历整个 `tests/`（含 `tests/.test-tmp/`），而
`claude-deepseek.test.mjs` 等套件并行地在 `.test-tmp/ldc-*` 建临时框架副本并在 after()
删除 → 扫描读到半删目录 ENOENT。

处置：`testSources` 跳过 `.test-` 前缀目录（.test-tmp/.test-bundles/.test-chain-tmp）。
语义上也正确：这些是 disposable 运行时输出，不是「测试源码」，本就不应被术语扫描覆盖。
同类扫描仅此一处（已 grep 核实）。

> 观察（不改）：`continuation-initiation-contract.test.mjs` 的 inventory walk 也遍历
> tests/ 且无 `.test-` 跳过；它只读路径不读内容、从未实测 flake，且其 claim 声明 walk
> 「mirrors find」（find 本就不跳过 .test-tmp），故本 change 不动它，留作后续观察项。

### D2 清理闭环

- 每个文件的既有 after()/cleanup 列表追加对应 `uniqueSnapshotRoot(...)`，保证 `.snap-*`
  随 bundle 一起删除（快照是瞬态中间产物）。
- `handoff-witnessing-lifecycle` 保持「失败保留」：`cleanupAfterTest(pass)` 失败分支同时保留
  快照根，供诊断；通过分支一并删除。

### D3 其余共享写入面排查（先证据后修）

| 路径 | 已确认使用者 | 处置 |
| --- | --- | --- |
| `tests/engine/.test-chain-tmp/` | 仅 `transition-chain.test.mjs` | 单文件，无需改 |
| `tests/.test-tmp/fake-claude.mjs` | 仅 `claude-deepseek.test.mjs` | 单文件，无需改 |
| `tests/.test-tmp/<fixture-base>` | `run-gate-with-monitor`（gate-wrapper）、`verify-bundle-health`（health-verifier）等 | 每文件固定子目录名互不相同；apply 时逐个确认无跨文件同名 |

排查中发现任何跨文件同名固定路径 → 按 D1 同样原则修，并在 tasks 记录。

## Risks / Trade-offs

- 并行真正并发写 `tests/.test-bundles/`：快照名现每文件唯一（D1），共享 bundle 名现每文件
  独立（D4），跨文件同名面归零；残余风险来自排查中尚未发现的固定共享路径——D3 是兜底。
- 并行 wall 可能略高于 159s 实测（失败用例只做了部分工作），验收口径为 ≤ ~200s。
- 若修完后并行仍偶发 flake：回退到备选 (a)（每文件 tmpdir mkdtemp），并逐个文件定位。
- 快照/恢复语义、断言、用例数量零变化——diff 只动路径参数、bundle 字面量与一个 helper。
