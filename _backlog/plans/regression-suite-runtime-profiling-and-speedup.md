# 回归套件耗时剖析与提速路线（现状反映 + 方案底稿）

> 2026-09-03 | 触发：`close-lifecycle-bypass-detection-gap` 的治理 finalizer
> 内部跑全量 `npm test`，默认 60s 超时被杀，实际需 3~4.5 分钟。本文件把实测
> 情况钉死，给出把墙钟压进 1~2 分钟的候选路线。**这是情况反映与方案底稿，
> 不是已批准的实施计划**；真正的改动（package.json / scripts / 重型测试文件
> 重构）仍按生命周期走对应流程。

## 一、实测数据（2026-09-03，本机 arm64 / 8 核 / Node v22.23.1）

| 口径 | 数值 |
|---|---|
| 全量墙钟（两次完整运行） | 258.9s / 187.6s（波动主要来自机器负载） |
| 测试规模 | 3007 tests / 563 个顶层 suite / **319 个测试文件** |
| 运行方式 | `find … | xargs -0 node --test --test-concurrency=4`（单 runner，文件级进程隔离） |
| 裸 `node -e ""` 启动 | ~20ms ×3 |
| audit CLI 全 import 图加载+执行 | ~30ms ×3 |
| 测试内 spawnSync/execFileSync 调用点 | **532 处**（循环内实际进程数更高） |
| 单次 spawn 实测 | audit ~90ms；bundle instantiate ~400ms |
| 显式 sleep/setTimeout | 仅 9 处（**不是 sleep 绑定**） |
| 8 路并行逐文件计时合计（串行基准近似） | **1181s**；Top10 占 38%、Top20 占 53% |

最慢文件 Top 10（8 路并行下计时，绝对值膨胀 ~2×，仅用于排名）：

| 文件 | 计时 | 说明 |
|---|---|---|
| `tests/e2e/rerun-round-continuity.test.mjs` | 79.1s | 23 个 it、41 处链式 runNode/enterPhase 调用点 |
| `tests/integration/governance/change-feedback-finalizer.test.mjs` | 52.6s | 3 次真实 `finalize-change-archive` 集成 |
| `tests/e2e/post-final-rerun-lineage-continuity.test.mjs` | 52.3s | 生产 CLI 全链 |
| `tests/integration/cli/operate-work-unit.test.mjs` | 50.9s | 113 处 spawn 调用点（全仓第一） |
| `tests/integration/host_tools/run-agent-experiment.test.mjs` | 43.3s | |
| `tests/integration/cli/handoff-witnessing-lifecycle.test.mjs` | 40.9s | 65 处 spawn 调用点 |
| `tests/integration/cli/check-gate-wave0-complete.test.mjs` | 39.2s | |
| `tests/integration/cli/check-gate-wave1-complete.test.mjs` | 37.4s | |
| `tests/integration/cli/operate-topic-state-projection.test.mjs` | 27.3s | |
| `tests/integration/cli/operate-queue-validation.test.mjs` | 21.1s | |

>10s 的文件 36 个；>20s 的 11 个。验证：全部文件单跑 0 fail。

## 二、成本结构（按证据强度分级）

**实测结论**

1. **主因是 spawn-heavy 的集成/e2e 套件**：测试通过 `spawnSync` 驱动生产
   CLI（gate、enter-phase、work-unit、instantiate-run-bundle），每个 spawn
   是一个完整 Node 进程，其中 bundle 实例化内含全量 Zod validate-bundle
   （~400ms/次）。重型文件的测试是**串行长链**（一个 it 里几十次顺序
   spawn），无法被 test runner 的文件级并发拆开。
2. **文件级并发只有 4，机器并行度是 8**：`--test-concurrency=4` 直接把
   可用并行度砍半。这是最大的"免费"损失。
3. **319 个文件 = 319 个 runner 子进程**：进程隔离税实测很小（裸启动
   20ms + import 图 30ms），**不是**主要矛盾——推翻"模块图太重"的直觉。

**推断（待实施前复核）**

4. 部分重型文件每个 it 重新 instantiate 模板 bundle，而 harness 已有
   `snapshotBundle/restoreBundle`——存在"一次实例化、多次快照恢复"的
   重构空间。
5. finalizer 集成测试（52.6s）里真实调用 `finalize-change-archive.mjs`，
   其 mechanical prerequisite 含回归套件；测试如何满足该前提（stub 还是
   真跑子集）决定了它能不能被瘦身——**门禁语义不能削弱，只能给测试提供
   受控注入点**。

## 三、目标与非目标

- **目标**：全量墙钟 ≤ 120s（1~2 分钟）；finalizer 的 60s 级默认超时不再
  误杀（或 finalizer 自身的回归前提显式可配置超时）。
- **非目标**：不减少测试覆盖与断言强度；不改 verification-routing 四类
  证明边界；不为速度把 integration/e2e 降级为 unit。

## 四、候选措施（按预期收益/成本排序）

| # | 措施 | 预期收益 | 成本/风险 | 验证 |
|---|---|---|---|---|
| A | `--test-concurrency` 提到 8（或 `os.availableParallelism()`），试 6/8/10 取最优 | 墙钟 ~÷2：259s → ~130s | 一行改动；spawn 子进程可能过订，需实测 6/8/10 | 连跑 3 次取中位数 |
| B | 本地/CI 启用已有 `scripts/test-shard.mjs` 8 路分片并行 | 墙钟 ≈ 最慢分片；与 A 二选一或叠加 | 分片间负载不均（重文件聚簇）→ 按计时分桶 | 全量绿 + 墙钟对比 |
| C | 重型 Top 文件共享 fixture：一次 instantiate + `snapshotBundle/restoreBundle`，替代逐 it 实例化 | Top 文件（79s/52s/50s 级）预计各降 30~50% | 中；注意测试间状态隔离语义，逐文件评估 | 逐文件前后计时 + 断言不变 |
| D | finalizer 集成测试受控注入：允许测试向 finalizer 注入 stub 回归前提（生产默认不变），并保留至少一个真跑守护用例 | 52.6s 文件大幅缩减 | 中；触碰归档门禁语义，**必须单独走 OpenSpec change 评审** | 门禁用例仍在 + 该文件计时 |
| E | 长链 e2e（rerun-round-continuity 等）链内步骤合并/裁剪重复前置 | 视链长 20~40% | 高（e2e 叙事整体性）；最后再做 | e2e 全绿 + 计时 |
| F | `NODE_COMPILE_CACHE`（Node 22.1+） | 小（import 图实测便宜），顺手 | 低 | 计时对比 |
| G | 高 spawn 文件把"纯契约级断言"从 spawnSync 改为直接 import helper 调用 | 大，但逐文件工作量大；只在断言语义等价处做 | 高风险：绕过 CLI 层会削弱"生产入口"证明，**默认不做**，仅在 CLI 外壳与 helper 断言可完全等价时逐案评估 | 双跑对比 |

**建议推进序**：A + B（一行/零逻辑改动，预计已进 2 分钟档）→ 量剩余差距
→ C（3~5 个 Top 文件）→ D/E 按需再评估。

## 五、验证方法

1. 基线与每次改动后：`npm test` 连跑 3 次取中位墙钟；`node --test` 全绿。
2. 治理 finalizer：`node openspec/governance/finalize-change-archive.mjs
   --change <fixture>` 在 stub 注入下计时，且真跑守护用例不缺席。
3. 任何措施不得使 `openspec validate --strict`、六个 governance checker
   转红。

## 六、备注

- 本文件仅为 profiling 反映与候选路线；A/B 属纯 tooling（可走 `skip_specs`
  小 change 或按用户指示直接做），C/D/E 触及测试与归档门禁语义，实施前应
  按 `verification-routing` 与 change-feedback-loop 评审。
- 附：逐文件计时原始数据见 `/tmp/per-file-timing.txt`（8 路并行口径，
  易失，重构时需重测）。
