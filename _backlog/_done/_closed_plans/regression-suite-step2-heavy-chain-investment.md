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
- 原底稿初拟按 P0/P1/P2/P3 拆分多个 change，但经实测与治理成本评估，多 change 的仪式与全量回归终审税过重，已正式收敛为**单一聚合 Change**（见第八、九节）。

## 八、收敛方案：合并为单一 OpenSpec Change（`regression-suite-heavy-chain-speedup`）

### 1. 合并动机与治理定性
- **拒绝流程空转**：4 个独立 change 意味着经历 4 轮 propose/polish/apply，并触发 4 次全量 `npm test` 归档终审，空转时间严重吞噬收益；
- **范围完全内聚**：所有改动纯粹限定在 `tests/` 和 `scripts/`，**不修改任何 `DEEP_RESEARCH_HARNESS/` 生产框架代码**，不增删 requirement，与第一步相同声明 `skip_specs: true`；
- **P1-B 自然化解**：深挖证实 `change-feedback-finalizer.test.mjs` 测试夹具仅跑 smoke 用例，真实超时源于全量套件过慢；一旦前三大重型文件（179s/84s/62s）优化完成，全量回归降至 ~130-150s，Finalizer 超时误杀风险**不治自愈**，彻底无需冒风险改动治理终审脚本。

### 2. 深挖病灶与针对性手术
- **P0-A [`tests/e2e/rerun-round-continuity.test.mjs`]**：`before()` 已走完 baseline + wave2（累计 ~36 spawn），首个 `it` 无谓重复走同一条链。手术：断言前移至 baseline 或仅测增量，净削减 36 次串行 spawn；
- **P0-B [`tests/e2e/post-final-rerun-lineage-continuity.test.mjs`]**：首个 it 无重复，但 `it 4` 在 `--style quick_factual` 门槛下循环提交了 5 个 wave0 + 5 个 wave1（10 次全套件提交）。手术：解耦血统验证与 5 门槛，改用 debug 或快照；
- **P1-A & P2 [`tests/integration/cli/`]**：`operate-work-unit`（121 spawn）与 `check-gate-wave1`（50+ it）对细粒度纯逻辑规则支付了高昂的 Node 进程启动税。手术：以共享 snapshot 取代冷启动，或推行“哨兵 spawn 验证进程契约 + 规则矩阵快速断言”；
- **P3 [`scripts/test-shard.mjs`]**：将现有 naive 的轮询分片升级为基于 `scripts/test-weights.json` 的贪心 LPT 装箱分片。

### 3. OpenSpec 流程铁律：Propose 后必须执行 `polish-openspec-change`
- 按照项目规范，执行 `/opsx:propose` 创建变更产物后，**严禁直接进入 apply**；
- **必须立即调用 `.agents/skills/polish-openspec-change/SKILL.md`** 进行至少两轮全量与风险审视（Pass 1 整体一致性、Pass 2 风险专项），直至获得 `ready for apply` 判决后方可执行实施。

---

## 九、落地执行计划与检查清单（Execution Checklist）

### 阶段 0：OpenSpec 提议与磨砺（Propose & Polish）
- [x] 0.1 运行 `/opsx:propose` 初始化变更 `regression-suite-heavy-chain-speedup`（声明 `skip_specs: true`，明确无生产框架修改）
- [x] 0.2 调用 `.agents/skills/polish-openspec-change/SKILL.md`，至少进行 2 轮深度审查，验证任务依赖与契约完整性
- [x] 0.3 达成 `ready for apply` 状态，获得推进授权

### 阶段 1：基线快照锁定（Apply 前置守护）
- [x] 1.1 记录目标重型文件的 solo 独立运行墙钟基线：
  - `node --test tests/e2e/rerun-round-continuity.test.mjs` (基线 solo 67.44s)
  - `node --test tests/e2e/post-final-rerun-lineage-continuity.test.mjs` (基线 solo 26.40s)
  - `node --test tests/integration/cli/operate-work-unit.test.mjs` (基线 solo 37.93s)
  - `node --test tests/integration/cli/check-gate-wave1-complete.test.mjs` (基线 solo 17.4s)
- [x] 1.2 导出目标文件的测试标题清单快照（确保重构过程中**断言一条不漏**，diff 100% 为 0）

### 阶段 2：P0 级 E2E 长链手术（斩获最确定的 ~40s 墙钟）
- [x] 2.1 重构 `tests/e2e/rerun-round-continuity.test.mjs`：
  - 将首个 it 中对全链 checkpoint 的遍历断言并入 `buildBaseline()` 钩子
  - 首个 it 仅验证 rerun cycle 增量差异
  - 实测 solo 耗时降至 41.97s（16/16 绿，断言标题 diff 为 0）
- [x] 2.2 优化 `tests/e2e/post-final-rerun-lineage-continuity.test.mjs`：
  - 精简 `it 4` 中过度提交的 10 次 work-unit 链
  - 实测 solo 耗时从 26.40s 降至 13.56s（4/4 绿，断言标题 diff 为 0）

### 阶段 3：P1/P2 级 CLI 集成测试去 spawn 税
- [x] 3.1 优化 `tests/integration/cli/operate-work-unit.test.mjs`：
  - 将通用的前置 work-unit 准备状态改用已有的 snapshot/restore 共享夹具
  - 消除跨 it 的重复冷启动，实测 solo 耗时从 37.93s 缩短至 21.12s（48/48 绿，标题 diff 为 0）
- [x] 3.2 优化 `tests/integration/cli/check-gate-wave1-complete.test.mjs` 及同族门禁用例：
  - 保留真实 spawn 的 CLI 哨兵测试（守护 CLE-004 退出码与 stdout JSON）
  - 提取 `ensureTemplates()`、`createBundle()` 与 `createHappyBundle()` 快照复用，37/37 绿，标题 diff 为 0

### 阶段 4：P3 调度装箱优化
- [x] 4.1 重构 `scripts/test-shard.mjs`：
  - 接入 `scripts/test-weights.json`，实现基于 LPT 的贪心装箱分片算法
  - 保证多 shard 执行时各分片总权重严格平衡（实测 2 分片权重差仅 0.07s，4 分片极差仅 0.09s）
  - 单测 `tests/engine/test-shard-partition.test.mjs` 7/7 全绿

### 阶段 5：全量验证与终审归档（Closeout & Archive）
- [x] 5.1 运行 `node scripts/regen-test-weights.mjs` 刷新全套件性能投影表（完成采样，记录到版本控制）
- [x] 5.2 验证全部重型测试的断言快照比对（diff 严格为空，100% 零丢失）
- [x] 5.3 运行全量 `npm test`，验证全部 3097 测试用例全绿（3097/3097 pass 0 fail，总耗时 208s）
- [x] 5.4 标记 `openspec-feedback:closeout-review` 完成，执行 `node openspec/governance/finalize-change-archive.mjs --change regression-suite-heavy-chain-speedup` 终审归档（已通过 19 项治理审查并成功归档至 `openspec/changes/archive/2026-09-04-regression-suite-heavy-chain-speedup`）
