# 回归提速：并行安全化 + 子进程裁剪 + 用例矩阵瘦身

> 状态: active（测量完成，方案待评审）| 2026-08-22
> 承接: `slow-test-suite-audit-and-remediation`（closed 2026-08-22，WS1-6 + WS7 part 1 已归档）
> 定位: 不沿用前两轮「去重导入 / 共享基线 / 释放等待」的思路，从执行模型与成本结构重新出发。

## TL;DR

1. **根因发现（新路径）**：`npm test` 默认并行执行测试文件，但 7 个 CLI integration 测试共用同一固定快照路径
   `tests/.test-bundles/.baseline-snapshot`（`snapshotBundle(x, dirname(x))`），并行时互相
   `rmSync + cpSync` 撕扯。本机实测：并行 159s wall，但 3 个文件约 40 个用例失败；这 3 个文件**单独跑全部通过**
   （28/28、31/31、1/1）。「canonical 只能串行 ~650-822s」的真正原因是**竞态逼出来的**，不是执行策略选择。
   上一轮审计把「不并发」当作前提，这正是被绕开的最大杠杆。
2. **最大杠杆不是删用例，是把并行从「不可信」变成「默认可信」**：修掉共享快照路径后，全量从
   ~11-14 分钟（串行）降到 ~2.5-3 分钟（并行），8 核机器 ~4-5x。
3. **第二杠杆是子进程裁剪**：382 次 `spawnSync('node', …)`（93 个文件）；单次成本 node 冷启动 42ms /
   CLI 冷启动 220-230ms / bundle 实例化 ~620ms，合计 ~100-150s 纯进程开销。
4. **第三杠杆才是用例数**：gate 的 CLI 层矩阵（wave0/1/2 = 28/35/31 场景）与 unit 层（`gate-helpers-*`）
   裁决矩阵大量重叠；CLI 层的义务是「接线证明」（参数→bundle→verdict→JSON→exit code），不需要每 gate 全矩阵。

## 现状测量（2026-08-22，本机 8 核，node v22.23.1）

| 指标 | 数值 |
|---|---|
| 测试文件 | 292（engine 87 / integration 158 / e2e 14 / schema 18 / governance 7 / experiments_env 4 / host_tools 3） |
| leaf 用例 | ~2800（node 汇总；串行 canonical 口径 2798） |
| 子进程 spawn | 382 次 / 93 个文件 |
| 上一轮审计基线 | 3028/3028，822.455s（43 个 >3s 用例合计 357.6s） |
| 第二轮后 canonical 串行 | 2798/2798，649.9s（基线 757.0s） |
| **本 session 串行实测**（`--test-concurrency=1`） | **605s，2799/2799 全绿**（确认并行失败 = 竞态而非回归） |
| **本 session 并行实测** | **159s wall，2800 用例，3 文件 ~40 失败（均单独跑通过）** |
| leaf CPU 和（并行 TAP 累计） | 893s（≈串行等价） |

Top-30 最贵文件 ≈ 570s（占 leaf CPU 的 ~64%）：

| 文件 | leaf CPU | 特征 |
|---|---|---|
| e2e/rerun-round-continuity | 100.5s | 16 叶 × ~6.3s；restoreBundle 大快照 + 每叶多条 CLI spawn |
| integration/cli/check-gate-wave1-complete | 51.2s | 35 场景 × ~4 次 spawn（NEW_BUNDLE + gate + inspect） |
| e2e/post-final-rerun-lineage-continuity | 39.5s | 4 叶长链 |
| integration/governance/change-feedback-finalizer | 35.5s | 8 叶 × 4.4s（上一轮已重构仍最贵之一） |
| integration/cli/operate-work-unit（inspect 组） | 29.3s | 33 叶；该文件全量 72 次 spawn |
| integration/host_tools/run-agent-experiment | 28.9s | 25 次 spawn（fake claude + 启动器） |
| integration/cli/operate-topic-state（projection 组） | 25.5s | 15 叶 |
| integration/cli/check-gate-hitl1-recorded | 18.2s | 19 次 spawn |
| e2e/reference-evidence-map-rerun、wave1-focus-coverage-rerun | 各 ~16.5s | 长链 |
| integration/cli/check-gate-wave2-complete | 11.9s | 31 场景（并行下 20 个因竞态失败） |

## 成本结构

1. **子进程 spawn ≈ 100-150s**：382 次 × ~300-620ms（node 42ms 冷启动 + CLI 模块加载 zod/yaml/框架 +
   实际工作）。bundle 实例化（`new-disposable-bundle` / `instantiate-run-bundle`）单次 ~620ms。
2. **跨文件共享快照竞态**：使并行不可信 → 被迫串行 → 隐形成本 ~4-5x。这是全仓最大单项。
3. **CLI 层矩阵冗余**：与 unit 层 gate-helpers 矩阵重叠，每场景 ~1.5-2s。
4. **e2e 重链**：rerun-round-continuity 100s 独占 ~11% leaf CPU。
5. 固定等待：已基本清零（仅 2 处 handshake 轮询，属健康模式）——前两轮已解决，本轮不重复。

## 我们真的需要这么多测试吗（系统性审查）

按 verification-routing 四类义务逐层看，冗余是「**层内矩阵**」而非「层间类别」：

- **unit（gate-helpers-checks/core/serial/readers 等，25-46 场景/文件）**：裁决逻辑（masking、hints、
  repair_kind、规则交互、masked 依赖）的正确归属，in-process 毫秒级。**保留不动。**
- **integration/cli（check-gate-* 11 文件，wave0/1/2 三矩阵合计 94 场景，全族 ~180 场景）**：义务是
  「接线证明」——参数→bundle→verdict→JSON→exit code。该接线对每个 gate 同构，每 gate 留代表性子集
  （happy pass / 一条失败路径 / exit-code / JSON 形状 / 一条 inspect↔gate parity）即可。
  **这是「真需要这么多吗」的主要答案：不需要，每 gate 收敛到 ~6-10 场景。**
- **integration/md（100+ 文件，文本/文档锁检查）**：毫秒级，便宜且是 doc-code 契约。保留。
- **deterministic_e2e（14 文件）**：链式证明必须走生产 checkpoint；可做的是变体收敛、快照瘦身、
  每叶 bundle 独立后的文件内并行。
- **governance（7 文件）**：checker 本体 ~1.7s；spawn 15 次/文件可减，义务保留。
- **host_tools（3 文件）**：agent-experiment 启动器本质重（25-30 次 spawn），评估收敛，不硬减。

「用例过多」的真实分布：CLI gate 全族 ~180 场景中，按 unit 矩阵已覆盖估算可安全收敛到 ~60-80 个，
省 ~100 场景 × ~1.5-2s ≈ **150-200s 串行**。

## 方案分档

### WS-A 并行安全化（最高杠杆，先行）
- 修 `snapshotBundle(x, dirname(x))` 单一路径竞态。涉及 7 个文件：
  `check-gate-wave0-complete`（2 处）、`operate-queue-validation`（7 处）、`check-gate-wave2-complete`、
  `check-gate-hitl2-recorded`、`check-gate-readiness-passed`、`wave1-focus-coverage-contract`、
  `handoff-witnessing-lifecycle`。改法：每文件唯一快照根（token 子目录），或直接迁到
  `os.tmpdir()` 的 per-file `mkdtemp`（仿 e2e `createTempRoot`，顺带把 `.test-bundles/` 写面清干净）。
- 排查其余共享写入面：`tests/engine/.test-chain-tmp/`、`tests/.test-tmp/fake-claude.mjs`、`tests/.test-tmp/*`。
- 清理加固：失败中断残留的 `dpt_disp_case-501_*` 等目录（当前已堆积 4 个）需 after() 兜底删除；
  `.test-bundles/` 已 untracked，可确认 .gitignore 语义。
- 验收：`npm test`（默认并行）全绿；连续 2 次无 flake；并行 wall ≈ 160-200s。

### WS-B bundle 实例化去 spawn（估省 ~60-100s 串行）
- gate 类文件每 it() `spawnSync(NEW_BUNDLE)`（~620ms）→ 每文件 before() 实例化一次 + 每 it()
  `fs.cpSync` 克隆（~20-50ms）。克隆目标名必须唯一（`unique()` 已具备），且**不得回到共享快照路径**。
- 收益随场景数线性：wave1-complete 35 场景 ≈ 省 ~20s；全仓 gate/operate 族合计 ~60-100s。

### WS-C CLI 矩阵瘦身 / 金字塔复位（估省 ~150-200s 串行）
- 每 gate 的 CLI 层收敛到 ~6-10 个代表场景；完整矩阵下沉到 unit 层（in-process，毫秒级）。
  符合 verification-routing「Parser and CLI checker use different classes」场景：parser/verdict → unit，
  CLI wiring → integration，同一 change 内分 claim、分 asset。
- operate 类同收敛：`operate-work-unit`（72 spawn）、`operate-queue-*`、`operate-topic-state`。
- 每删一个 CLI 场景，change 内声明承接它的 unit 用例，保证无证明空洞。

### WS-D e2e 重链优化
- `rerun-round-continuity`（100s）：先 profile 每叶 6.3s 构成（restoreBundle 大快照 cpSync 次数 × 体积 /
  每叶 spawn 数）；快照排除 `_cache` 等可重建内容；变体收敛；确认每叶 bundle 独立后可开文件内
  concurrency（node:test per-suite `{ concurrency }`）。
- `post-final-rerun-lineage-continuity`（39.5s）、`change-feedback-finalizer`（35.5s）同理。

### WS-E 进程级（repo 外，记录即可）
- CI 按文件 shard 并行（8 核 × 4 shard ≈ 40s）；PR 快车道 = unit + schema + md；全量 nightly。
- 若采纳，`package.json` 可加 `test:fast` / `test:shard:N` 脚本。

## OpenSpec change 切分建议（沿用 WS 模式，每个有界、可独立验收）

1. `parallelize-regression-suite`（WS-A + WS-B；改 7 个测试文件 + `deterministic-chain-harness.mjs` 签名）
2. `trim-cli-gate-matrices`（WS-C；每 gate 收敛清单 + unit 承接清单，跨 ~10 个 CLI 文件）
3. `slim-e2e-chains`（WS-D；可选，profile 后再定）

## 验收标准

- 串行（`--test-concurrency=1`）：≤ 649.9s 且 0 fail；
- 并行（`npm test` 默认）：全绿 0 fail，wall ≤ 200s（本机 8 核）；
- 连续 2 次并行全绿（flake 面 = 0）；
- 每 change 的 verification-plan 声明 test_class 与 claim 承接无空洞（CLI 场景下沉 unit 时一一对应）。

## 风险与不变量

- 不删 unit 层裁决矩阵（真实义务）；只收敛 CLI 层接线矩阵。
- 不把「in-process 调 CLI main」伪装成 integration：按 routing spec，调用生产 CLI/subprocess 才路由
  integration；若某处改 in-process 必须同步改 class 声明为 unit。
- 并行化后 `.test-bundles` 写入并发度上升：所有 bundle 名必须唯一；**禁止再引入固定共享路径**。
- 不引入新依赖（Node >=20，纯 JS ESM）。

---

## 执行记录（2026-08-22）

### 已完成并归档

- **WS-A 并行安全化** → change `2026-08-22-parallelize-regression-suite`（archive）：
  修 7 个文件共享 `.baseline-snapshot` 竞态（13 处 `uniqueSnapshotRoot`）+ `'shared'` bundle 名空间
  竞态（12 处每文件独立名）+ 术语扫描 `.test-` 跳过。实测：串行 542s、并行 165-168s 全绿。
- **WS-B bundle 实例化去 spawn** → change `2026-08-22-de-spawn-bundle-instantiation`（archive）：
  `cloneBundleTemplate` helper + 6 个文件 87 处 per-test NEW_BUNDLE spawn → 每文件 1 处模板。
  实测：串行 500s、并行 136-139s 全绿。

### 已完成并归档（续）

- **回归运行工具化**（WS-E 的 repo 内部分）→ change `2026-08-22-regression-run-tooling`（archive）：
  canonical `test` 的 find 排除 `.test-*` disposable 目录（发现集合不变，292 文件 / 2804 叶）；
  新增 `scripts/test-shard.mjs`（确定性分片，`test:shard <n> <m>`，wall ≈ 全量并行 / n）与
  `test:quick`（schema+md triage 车道，6s）；inventory walk 与 canonical find 同步。
  实测：并行 139s、串行 489s，2804/2804 全绿。

### WS-C / WS-D ROI 重估（数据驱动，暂缓）

- **WS-C（CLI 矩阵瘦身）**：WS-B 后 check-gate 全族仅 **69s**（wave1 13s / wave0 13s / wave2 7s…），
  收敛到每 gate ~8 场景最多省 ~30-40s；且 200 个场景多是为具体 BUG/契约回归逐条添加的证明
  （如 1j raw markup、15a dual historical），逐场景 unit 承接核对成本高、证明空洞风险大。→ **deferred-low-ROI**。
- **WS-D（e2e 重链）**：rerun-round-continuity 79s（14 叶 × ~5.6s）、post-final 39s、finalizer 35s
  的成本经 profile 是**生产 CLI spawn 本身**（每叶走完整链 = e2e 证明本质；bundle 仅 56K，恢复非瓶颈；
  finalizer 测试必须真跑 finalizer）。无 WS-B 式机械优化点。→ **deferred**（除非未来接受框架级
  CLI 启动瘦身，那是生产面 change）。

### 建议的剩余动作（按价值排序）

1. **把并行当作 canonical**：WS-A/B 后默认 `npm test` 并行已 0 flake（连续多轮验证），
   串行 500s 只是测量口径，不是体验。CI/本地都用默认并行即可（~136s）。
2. **回归运行工具化**（本计划 WS-E 的 repo 内部分）：`test` 脚本 find 排除 `.test-tmp/.test-bundles`；
   新增 `test:shard:N:M`（文件分片，N 路并行 wall ≈ 136/N）与 `test:fast`（unit 层快车道）。
3. **CI 分片**（repo 外）：仓库无 `.github/workflows`，CI 在外部；如需进一步压墙钟，按文件分片
   到 N 台 worker。
