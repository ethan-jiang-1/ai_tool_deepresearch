# 回归套件第二步投资计划：重型链路分解与 spawn 成本削减

> 2026-09-04 | 承接 `regression-suite-runtime-profiling-and-speedup.md`（第一步
> profiling 底稿，其 A/F 路线已由 change `regression-suite-tooling-speedup`
> 落地：10/10 任务完成）。本文件基于 apply 全程的完整实测与结构解剖，回答
> "继续投资投在哪几个"。**这是计划底稿，实施仍逐项走 OpenSpec
> propose→polish→apply。**

## 一、现状（第一步 tooling 落地后）

| 口径 | 数值 |
|---|---|
| 入口 | `npm test` → `scripts/run-tests.mjs`（c8 + NODE_COMPILE_CACHE；arg-order LPT 已被 R1 探针证伪并回退） |
| 墙钟 | 6 次全量 209.7~276.4s，中位 ≈226s（共用机器外部负载为已知噪声源） |
| 基线对比 | 改动前 c4 = 281.8s → 中位改善 ≈-20%，全部 3076/3076 全绿 |
| 硬约束 | 总 CPU 仅 1061 CPU-s（user 793.9 + sys 267.6），8 核理论打包下限 ≈133s |
| 结论 | **tooling 已到顶。剩余差距（226s→120s）只能靠削减测试自身的 spawn 串行工作量** |

## 二、集中度：钱在哪

逐文件权重（`scripts/test-weights.json`，8 路争抢口径，只看相对排名）：

- **Top16 文件 ≈ 全套件 49%**；Top3 ≈ 21%；
- **>10s 的文件 43 个 ≈ 76%**；
- 单 runner 的 tail（最重文件落单收尾）叠加过订抖动，解释了 60% 利用率。

前两名是同一 harness 家族的 e2e 长链；第三名是 spawn 调用点最多的 CLI 集成。

## 三、重点投资对象（按 收益×证据强度 排序）

### P0-A `tests/e2e/rerun-round-continuity.test.mjs` —— 同一条生产链被完整爬两遍

8 路口径 179s（全场第一，占 11%）；安静 solo 60.4s。结构解剖（apply 前完成）：

- `before()` 钩子 `buildBaseline()`：instantiate + **6 checkpoint × 3 spawn**
  （gate+enterPhase+advanceStatus ≈ 18 spawn）+ `reachWave2` 再 ~15 spawn
  ≈ **33 个串行 spawn**；
- 第一个 it `traverses the full rerun chain`：restore 后**把同一条链重走一遍**
  + 完整 rerun cycle ≈ **36 spawn**；
- 其余 ~20 个聚焦 it 已经是合理分解形态（restore + 1~3 spawn），不动。

**投资动作**：全链遍历只保留一次证明。方案：把"走全链"的断言并入
`buildBaseline()`（钩子内即断言，其终态就是现有 baseline snapshot），第一个
it 改为只覆盖钩子未断言的 rerun-cycle 增量部分；或等价重构。**断言一条不删，
只消除重复遍历。**
**预期**：该文件 -40~60%（争抢口径 -70~100s；wall 收益 -15~30s）。

### P0-B `tests/e2e/post-final-rerun-lineage-continuity.test.mjs` —— 同族复核

8 路口径 84s（第二，累计 17%）；solo 25.3s。同属 deterministic-chain-harness
家族。**投资动作**：先做 30 分钟结构复核确认是否同样存在"钩子建链 + 首个
it 重走链"，是则同 P0-A 方案处理，否则跳过（避免为改而改）。
**预期**：若有同构重复，-30~50%。

### P1-A `tests/integration/cli/operate-work-unit.test.mjs` —— spawn 调用点之最

8 路口径 62s（第三，累计 21%）；solo 24.9s；**121 处 spawn 调用点**（全仓第
一）。**投资动作**：逐 it 清点 spawn 序列，把"为到达同一状态而重复执行的前置
CLI 调用"合并或下放共享 fixture（仓库已有 `cloneBundleTemplate`/
`uniqueSnapshotRoot` 基建）；纯契约级断言是否可脱离 spawnSync 仅在断言语义
完全等价时逐案评估（G 路线默认不做）。
**预期**：-20~30%。

### P1-B `tests/integration/governance/change-feedback-finalizer.test.mjs` —— finalizer 真跑 ×3

8 路口径 45s；单次真实 `finalize-change-archive` 集成，其 mechanical
prerequisite 含回归子集。**投资动作**（即原底稿 D 路线，**触碰归档门禁语义，
必须独立 change 评审**）：受控注入点允许测试注入 stub 回归前提，同时保留
≥1 个真跑守护用例；顺带评估 finalizer 自身 60s 级默认超时的显式可配置化
（tooling 落地后是否仍误杀）。
**预期**：该文件 -50%+；finalizer 误杀风险消除。

### P2 同族长链批量处理（P0 模式验证后复制）

| 文件 | 8 路口径 | 已知结构 |
|---|---|---|
| `integration/cli/handoff-witnessing-lifecycle.test.mjs` | 50s | 65 spawn 调用点；已有 prefix-snapshot 复用 |
| `integration/cli/check-gate-wave1-complete.test.mjs` | 49s | 共享实例化已就位 |
| `integration/cli/check-gate-wave0-complete.test.mjs` | 49s | 同上（双 hook 结构） |
| `integration/host_tools/run-agent-experiment.test.mjs` | 34s | 待解剖 |
| `integration/cli/operate-topic-state-projection.test.mjs` | 33s | 待解剖 |

**投资动作**：套用 P0/P1 验证过的模式（链去重、前置合并），逐文件
solo-baseline → 改 → 断言不变 → 对比。

### P3 系统性 tooling 尾巴（可与上述并行的小投资）

1. **加权分片调度**：R1 探针证明 `node --test` 对参数做字典序排序，但
   `test:shard` 走的是显式文件清单——给 `test:shard` 增加"按权重 LPT 分桶"
   模式（`lptOrder` 已实现并有单测，直接复用），8 shard 并行可压 tail。
   纯 tooling，不改测试。**预期 wall -10~15%**。
2. `NODE_COMPILE_CACHE` 目录换 `workspace` 内固定路径已做；无进一步空间。

## 四、明确不做

- **G 路线默认不做**（把 spawnSync 断言换成直接 import helper）：削弱
  "生产入口"证明，仅在断言语义完全等价处逐案评估；
- 不删除任何断言、不降低覆盖、不把 integration/e2e 降级为 unit；
- 不为采样精度继续投入（启动 load 门在共用机器上不可执行，已由用户授权
  以证据收尾）。

## 五、方法论（每个投资项统一执行）

1. 改前：`node --test <file>` solo 计时 + 断言清单快照（it 标题全列表）；
2. 改后：断言清单 diff 为空（只允许合并重复，不允许消失）+ 全文件绿；
3. `node scripts/regen-test-weights.mjs` 刷新权重表（第二步的常备定位工具）；
4. 全量 `npm test` 绿 + 墙钟对比（附 load 记录，仅作参照不作门）；
5. 逐项走 OpenSpec propose→polish→apply；P1-B 因触碰门禁语义必须独立 change。

## 六、预期与决策点

| 里程碑 | 预计墙钟（中位） | 累计投入 |
|---|---|---|
| 现在 | ≈226s | — |
| P0-A + P0-B | ≈180~195s | 1 个 change |
| + P1-A + P1-B | ≈150~165s | +1~2 个 change |
| + P2 批量 + P3 分片 | ≈120~140s | +1 个 change |

≤120s 在 P2 完成后进入射程但不保证；若 P2 后仍 >120s，剩余空间只有两类：
G 路线逐案评估（语义风险）与 spawn 成本的 engine 侧优化（如 CLI 预热/快照
启动，属生产代码改动）。**建议投资到 P2 为止重估**，避免为最后 10~20s 引入
语义风险。

## 七、与既有 change 的关系

- 第一步 `regression-suite-tooling-speedup`：已 10/10 完成（c8+cache+wrapper+
  权重表）；`lptOrder` 与权重表是 P3 分片调度的直接输入；
- 本计划 P0/P1/P2 每项独立小 change；P1-B 单独评审门禁语义。
