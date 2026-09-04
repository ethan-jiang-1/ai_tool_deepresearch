# Tasks: regression-suite-heavy-chain-speedup

## 0. Plan Review & Baseline Snapshot

- [x] 0.1 Plan review (openspec-feedback:plan-review). 审查 proposal、design、tasks 及 verification-plan 的整体一致性，锁定无生产代码修改约束。
- [x] 0.2 导出并固化各重型目标测试文件的 solo 运行耗时与断言标题快照清单（`rerun-round-continuity`、`post-final-rerun-lineage-continuity`、`operate-work-unit`、`check-gate-wave1-complete`），作为断言零丢失的基线依据。

## 1. P0-A E2E 长链去重 (`tests/e2e/rerun-round-continuity.test.mjs`)

- [x] 1.1 将首个 it 中遍历 7 个 checkpoint 的全链断言合并移入 `buildBaseline()` 钩子，第一个 it 仅验证 rerun cycle 的增量演进，消除 36 次重复串行 spawn。Done when: `node --test tests/e2e/rerun-round-continuity.test.mjs` 绿，solo 耗时降至 35s 以下，且测试标题清单 diff 为空。

## 2. P0-B E2E 提交链精简 (`tests/e2e/post-final-rerun-lineage-continuity.test.mjs`)

- [x] 2.1 优化 `it 4` 中对 `driveAcceptedRerunToNewReadiness` 的调用，精简 5 批 wave0 + 5 批 wave1 的过度循环提交，同时保持 ReopenResearchPass 审计血统断言完全通过。Done when: `node --test tests/e2e/post-final-rerun-lineage-continuity.test.mjs` 绿，solo 耗时降至 18s 以下，测试标题清单 diff 为空。

## 3. P1-A & P2 CLI 集成测试快照优化 (`tests/integration/cli/`)

- [x] 3.1 优化 `tests/integration/cli/operate-work-unit.test.mjs`：对高频出现的通用前置 work unit 状态引入共享快照复用（`cloneBundleTemplate` / `uniqueSnapshotRoot`），削减冷启动 spawn 调用。Done when: `node --test tests/integration/cli/operate-work-unit.test.mjs` 绿，solo 耗时从 25s 缩短至 18s 以下。
- [x] 3.2 优化 `tests/integration/cli/check-gate-wave1-complete.test.mjs`：保留 2~3 个真实子进程 CLI 哨兵测试（守护 CLE-004 退出码与 stdout JSON），优化其余规则测试的环境前置开销。Done when: `node --test tests/integration/cli/check-gate-wave1-complete.test.mjs` 绿，耗时显著下降。

## 4. P3 分片调度 LPT 贪心装箱 (`scripts/test-shard.mjs`)

- [x] 4.1 重构 `scripts/test-shard.mjs` 中的 `shardFiles` 函数，引入基于 `scripts/test-weights.json` 的贪心 LPT 装箱分配算法，确保各 shard 累计权重严格平衡。Done when: 单元测试 `node --test tests/engine/test-shard-partition.test.mjs` 增加 LPT 分片验证且全绿。

## 5. 权重刷新与全套件验证

- [x] 5.1 运行 `node scripts/regen-test-weights.mjs` 重新采样生成客观权重表 `scripts/test-weights.json`。Done when: 权重文件已更新并记录到版本控制。
- [x] 5.2 运行全量回归 `npm test`。Done when: 3076+ 测试用例全部通过，记录实际墙钟中位（预期向 130~150s 区间靠近）。（实测：3097/3097 全绿通过，耗时 208s）。
- [x] 5.3 运行 `node openspec/governance/check-project-reqs.mjs --mode archive --change regression-suite-heavy-chain-speedup` 验证需求一致性通过。
- [x] 5.4 运行 `node openspec/governance/check-project-specs.mjs` 验证规范一致性通过。
- [x] 5.5 Closeout review (openspec-feedback:closeout-review). 确认所有预期优化项均已闭环且所有质量守护项均已达成。
