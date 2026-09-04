# Proposal: regression-suite-heavy-chain-speedup

> 2026-09-04 | 来源需求：`_backlog/plans/regression-suite-step2-heavy-chain-investment.md`
> （回归套件第二步投资计划底稿）+ 本会话结构剖析实测（2026-09-04）。

## Why

第一步 tooling 加速（`regression-suite-tooling-speedup`，已归档）通过机器并发度、V8 编译缓存和权重分析，将全量回归墙钟从中位 282s 压至 226s，但遇到了物理下限瓶颈：全套件消耗约 1061 CPU-秒（user 793.9 + sys 267.6），8 核理论打包下限为 133s，实际核利用率仅约 60%。

利用率打不满且并发下耗时膨胀近 3 倍的主因在于**长尾测试内部密集的串行 `spawnSync` 子进程链路**：
- Top 16 文件占全套件耗时约 49%，Top 3 占 21%；
- 争抢口径第一的 `tests/e2e/rerun-round-continuity.test.mjs`（179s）中，`before()` 钩子已构建全链基线并打出快照，但首个 `it` 又调用 `runRerunCycle` 完整重走了一遍全链，造成 36 次无谓的串行 spawn 重复；
- 第二重型文件 `tests/e2e/post-final-rerun-lineage-continuity.test.mjs`（84s）在 `it 4` 内部循环提交了 5 批 wave0 与 5 批 wave1（10 次真实提交）；
- `tests/integration/cli/operate-work-unit.test.mjs`（62s）拥有全仓最多的 121 处 spawn，跨用例重复从零构建前置状态。

多测试文件在 8 并发下同时拉起子进程，造成**嵌套超订（Nested Oversubscription）**和严重的 APFS 文件锁争抢。本 change 旨在通过消除测试内部的重复链路遍历、复用状态快照并引入 LPT 分片装箱，将全量回归中位墙钟压向 130~150s。

## What Changes

- **P0-A 重构 `tests/e2e/rerun-round-continuity.test.mjs`**：
  - 将首个 `it` 中对全生命周期 7 个 checkpoint 的遍历断言移入 `before()` 的基线构建流程；
  - 首个 `it` 仅验证增量 rerun cycle 差异，净削减 36 次串行 spawn；
  - 保证所有原有断言一条不漏，断言清单快照 diff 为空。
- **P0-B 优化 `tests/e2e/post-final-rerun-lineage-continuity.test.mjs`**：
  - 解耦 `it 4` 中的血统存续验证与 5 门槛过度提交，精简无谓的重复 work unit 链。
- **P1-A 优化 `tests/integration/cli/operate-work-unit.test.mjs`**：
  - 对频繁出现的通用前置 work-unit 状态下放使用 `cloneBundleTemplate` / `uniqueSnapshotRoot` 共享快照，消除重复构建开销。
- **P2 重点 CLI 集成测试分层优化**：
  - 对 `tests/integration/cli/check-gate-wave1-complete.test.mjs` 等高频测试，保留 2~3 个真实子进程的 CLI 哨兵用例捍卫 CLE-004 退出码与 stdout JSON 契约，其余规则测试优化前置环境构建。
- **P3 分片调度 LPT 贪心装箱**：
  - 重构 `scripts/test-shard.mjs`，从简单的 `i % n` 轮询改为基于 `scripts/test-weights.json` 的 LPT 贪心装箱算法，压平分片长尾。
- **性能投影与全量验证**：
  - 运行 `scripts/regen-test-weights.mjs` 刷新客观权重表，执行全量 `npm test` 验证全部测试全绿。

**明确不产出**：
- **绝对不修改 `DEEP_RESEARCH_HARNESS/` 生产框架代码**；
- **不修改 `openspec/governance/finalize-change-archive.mjs`**（保持 CHF-004 治理门禁绝对纯洁，全量提速后超时问题自然解除）；
- **不删除任何断言，不将 integration/e2e 降级为 unit**；
- 声明 `skip_specs: true`，无 spec 级行为变化。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `verification/integration-tests` | `openspec/specs/verification/integration-tests/spec.md` | Excluded | 该 capability 拥有 bundle 校验/检查的测试内容契约；本 change 仅重构测试执行组织与去重，不改变任何产品行为契约 |
| `verification/verification-routing` | `openspec/governance/verification-routing-contract.mjs` + spec | Verify-only | 四类证明边界归属不变；verification-plan.yaml 按 v1 schema 声明，验证路由不转红 |
| `engine/cli-exit-code-conventions` | catalog 行 | Excluded | CLI 退出码契约（0/1/2）完全保留，哨兵测试继续严格守护 |
| `verification/heavy-chain-speedup` | 假想候选，已核对 catalog 与 main specs | Excluded | 不引入新 capability：测试内部链路去重与调度优化属于纯内部质量工程，无 observable product behavior。故 `skip_specs: true`，delta-spec 不适用 |

## Source of Record / 责任边界 / 化简影响

- **Source of Record**：测试正确性以 `node:test` 退出状态为唯一凭证；性能数据以 `scripts/test-weights.json` 为客观投影；
- **责任边界**：Agent 负责识别并剔除测试代码中的无效重复操作，Engine CLI 负责保持确定性权威，User 负责批准实施；
- **化简影响**：消除了测试代码中历史累积的“建链后再重走一遍链”的冗余逻辑，大幅降低 CPU 调度超订与磁盘 I/O 拥塞。

## Impact

- 涉及受修改文件：
  - `tests/e2e/rerun-round-continuity.test.mjs`
  - `tests/e2e/post-final-rerun-lineage-continuity.test.mjs`
  - `tests/integration/cli/operate-work-unit.test.mjs`
  - `tests/integration/cli/check-gate-wave1-complete.test.mjs`
  - `scripts/test-shard.mjs`
  - `scripts/test-weights.json`
- 零破坏性变更，零依赖新增，外部 API 与 CLI 行为保持 100% 兼容。
