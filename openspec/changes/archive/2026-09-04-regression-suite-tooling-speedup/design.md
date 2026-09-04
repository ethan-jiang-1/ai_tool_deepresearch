# Design: regression-suite-tooling-speedup

## 实测记录（2026-09-04，本机 arm64 / 8 核 / Node v22.23.1）

本会话实测是 proposal「Why」的数据来源，apply 前不再复测（第二步 change
开工时重测）：

| 配置 | 墙钟 | 备注 |
|---|---|---|
| c4 基线（现 package.json） | 281.8s | 全绿 |
| c8 | 239.0s | 全绿；c4→c8 仅 -15% |
| c8 + NODE_COMPILE_CACHE | 232.5s / 220.9s | 全绿；缓存收益 ~-3%，两次同配置差 5% = 机器噪声水位 |
| c10 + cache | 233.2s | 与 c8 持平 → 槽位过订已饱和 |
| **总 CPU 计量**（c8+cache） | **1061.5 CPU-s**（user 793.9 + sys 267.6） | 8 核理论打包下限 ≈ 133s |
| 逐文件计时（8 路口径） | 324 文件合计 1591.4s | Top12 与底稿排名一致 |
| 异常样本 | 2209.4s + 2 fail | 共用机器外部负载（load avg 112）所致，弃用 |

推论：c8 下平均利用 ~4.8 核（60%），浪费主要在调度尾部与过订抖动；
纯 tooling 的合理验收线是 **≤150s**（133s 下限 + 噪声裕量），120s 需要
第二步的 spawn 量削减配合。

## 方案

### 1. `scripts/run-tests.mjs`（编排 wrapper，Source of Record）

```
discoverTests()        复用 test-shard.mjs 的 discovery 语义（跳 .test-*、跳 symlink）
loadWeights()          读 scripts/test-weights.json → {path: seconds}
lptOrder(files, w)     权重降序；无权重文件按原相对序垫后；稳定排序
spawn node --test --test-concurrency=os.availableParallelism() <files...>
                       env: NODE_COMPILE_CACHE=<repo>/.cache/v8-compile-cache
                       stdio: inherit；process.exit(child.status)
```

- 不解析、不判定测试输出：退出码与 stdio 直传，闭环仍是 `node --test`。
- 唯一自有参数 `--dry-run`：跳过 spawn，打印排序后文件总数与前 5 个文件
  （供 T5 验证权重表生效），不产生任何 pass/fail 输出。
- 其余参数原样透传给 `node --test`（附加在 wrapper 自身 flags 之后，后者的
  `--test-concurrency` 覆盖前者），保住 README 记录的串行测量模式
  `npm test -- --test-concurrency=1 --test-reporter=tap`。
- discovery 从 `scripts/test-shard.mjs` **import 复用**（该脚本已导出分区
  函数；discovery 函数目前私有——将其导出属于最小改动，且让 `test` 与
  `test:shard` 共享同一事实源，消除两份 find 语义的漂移风险）。
- `package.json`：`"test": "node scripts/run-tests.mjs"`；`test:shard`、
  `test:quick` 不动。

### 2. `scripts/regen-test-weights.mjs` + `scripts/test-weights.json`

- regen：与 proposal 同口径（8 路并行逐文件计时，bash 内建 `time`，跳过
  `.test-*`），输出 `{path: seconds}` 降序 JSON，写
  `scripts/test-weights.json` 并排序格式化，便于 diff review。
- 权重过期策略：wrapper 对缺权重文件垫后（保持相对序），regen 是手动
  按需操作，不进 test 流程（不给回归加计时税）；README 记录重生成时机
  （新增 >5s 重文件或 Top 排名明显漂移时）。

### 3. `.gitignore`

`/.cache/`（compile cache 目录；目录名带 node 版本子目录以隔离 ABI 变化，
由 Node 自身管理写并发，无需清锁逻辑）。

## 风险与对策

- **R1 调度序假设——已裁决：不成立（2026-09-04 apply 探针）**。10 文件按
  `f1..f10` 参数序传入、`--test-concurrency=3`，实际启动序为
  `f1, f10, f2, f3, ..., f9` = **字典序**：`node --test` 对文件参数做字典序
  排序后再调度，arg-order LPT 不可行。按 T4 预设回退分支执行：wrapper 不
  施加排序（`lptOrder` 纯函数与单测保留，供未来分片调度器复用），保留
  c8+cache（已实测 -17%~-21%），验收线回退为 **≤240s**。权重表仍生成
  （T5），作为第二步定位重文件与潜在分片调度的输入。
- **R2 共用机器负载噪声**：验收协议强制记录 `vm.loadavg`；1 分钟 load >2
  时样本作废重跑。已观测 load 112 导致 10× 膨胀的实证。
- **R3 权重表漂移**：只降调度收益不破坏正确性（claim 钉住文件集合不变）。
- **R4 并发加压风险**：c8 下 spawn 子进程过订曾产生有据可查的 30s 超时
  失败（deterministic-chain-harness.mjs 因此把默认 spawn timeout 提到
  180s）；本 change 不降低并发超时预算，不引入新的过订来源（并发度从 4→8
  与已实测三跑全绿一致）。
- **R5 兼容性**：`npm test` 是 finalizer 与 CI 的入口契约——wrapper 必须在
  无 `test-weights.json`（首次 clone、regen 前）时可用：降级为发现序。
  该降级路径进单测。

## 与第二步的边界

第二步 change（章程：用户指示"长测试掰开看必要性、分解测更合理"）已具备
的开案证据：`tests/e2e/rerun-round-continuity.test.mjs` 的 `before()` 钩子
（~33 串行 spawn）与首个 it（再走同一条全链，~36 spawn）构成**同一条生产
链在同一文件内被完整遍历约两遍**；后续 20 个聚焦 it 已是合理分解形态
（restore 快照 + 1~3 spawn）。本 change 交付的逐文件计时数据
（`scripts/test-weights.json` 及 regen 流程）同时是第二步定位重文件的
常备工具。
