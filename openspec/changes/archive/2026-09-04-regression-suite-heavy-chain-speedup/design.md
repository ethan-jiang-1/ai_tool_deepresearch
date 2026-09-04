# Design: regression-suite-heavy-chain-speedup

## Context

第一步 tooling 加速完成后，全量回归套件（319 个测试文件，3076+ 测试用例）墙钟中位约为 226s。Profiling 与权重表（`scripts/test-weights.json`）揭示了极度陡峭的长尾分布：
- `tests/e2e/rerun-round-continuity.test.mjs` 争抢口径 178.8s（solo 60.4s）；
- `tests/e2e/post-final-rerun-lineage-continuity.test.mjs` 84.2s（solo 25.3s）；
- `tests/integration/cli/operate-work-unit.test.mjs` 61.7s（solo 24.9s，121 处 spawn 调用点）。

由于 8 路并发下各 worker 同时频繁触发 `spawnSync`，导致严重的进程超订与系统调度、文件锁争抢（耗时膨胀近 3 倍）。第二步的核心战略是消除重型测试文件内部重复的串行进程链。

## Goals / Non-Goals

### Goals
- **消除 P0-A 重复遍历**：重构 `rerun-round-continuity.test.mjs`，消除首个 `it` 中 36 次重复全链 spawn；
- **优化 P0-B 提交链**：重构 `post-final-rerun-lineage-continuity.test.mjs` `it 4`，避免 10 次不必要的重复提交；
- **状态快照复用 (P1-A)**：在 `operate-work-unit.test.mjs` 中推广快照复用，消除重复前置状态构建；
- **LPT 装箱分片 (P3)**：重构 `scripts/test-shard.mjs` 实现贪心装箱；
- **零断言损失**：断言一条不漏，断言清单快照 diff 严格为 0；
- **全套件提速**：全量回归墙钟从中位 226s 压至 130~150s。

### Non-Goals
- 不修改 `DEEP_RESEARCH_HARNESS/` 中的任何生产框架代码；
- 不修改 `openspec/governance/finalize-change-archive.mjs`，不调整 CHF-004 治理语义；
- 不将 integration 或 e2e 测试降级为 unit 测试。

## Decisions

### 1. 将 P0-A 全链贯通断言折叠入 `buildBaseline()` 钩子
- **现象**：`before()` 中的 `buildBaseline()` 已跑完 7 个 checkpoint 构建出终态快照，紧接着又跑了 `reachWave2`；然而首个用例 `traverses the full rerun chain` 又调用 `runRerunCycle` 把整条链从头走了一遍（36 次 spawn）。
- **决策**：将全链各 checkpoint 的断言逻辑直接并入 `buildBaseline()`；首个用例改为主管增量 rerun cycle 状态演进。断言完全保留，但消除了一整套重复的全生命周期遍历。

### 2. 解耦 P0-B `it 4` 的血统审计与 5 条目风格门槛
- **现象**：`it 4` 意在证明 `ReopenResearchPass` 的审计血统在新的 Final handoff 下被保持并全局追加；但因调用 `--style quick_factual`，触发了 `wave1_per_topic_ref_floor: 5`，被迫循环提交 10 个 work units。
- **决策**：在不改变审计断言的前提下，精简提交链（例如使用 `debug` 风格或复用前置提交快照），消除 8 次无谓的冗余提交。

### 3. P1-A 通用前置状态下放共享快照
- **现象**：`operate-work-unit.test.mjs` 拥有 121 处 spawn，许多测试用例为了测试末端错误处理或 dry-submit，反复从空 bundle 开始 claim/submit。
- **决策**：利用现有的 `cloneBundleTemplate` 和 `uniqueSnapshotRoot`，预构建通用的 claimed/staged 状态快照，用文件复制替代 Node 子进程冷启动。

### 4. `test:shard` 采用贪心 LPT 算法装箱
- **现象**：当前 `scripts/test-shard.mjs` 采用 `index % n` 轮询分配按字母排序的文件列表，导致最重的文件可能集中在某一个 shard，木桶效应严重。
- **决策**：读取 `scripts/test-weights.json`，按权重从大到小遍历文件，每次将文件分配给当前总累计权重最小的 shard，确保各 shard 最终墙钟平衡。

## Verification & Invariants

1. **断言零丢失保护**：重构前导出各文件的 `it` 标题全量列表，重构后进行精确 diff，确保无任何断言丢失；
2. **Solo 独立耗时验证**：每个目标文件在重构前后均单独运行 `node --test` 对比耗时；
3. **权重刷新与全量全绿**：优化后重新运行 `scripts/regen-test-weights.mjs`，并运行全量 `npm test`，确保 3076+ 测试全绿且中位墙钟明显收窄。
