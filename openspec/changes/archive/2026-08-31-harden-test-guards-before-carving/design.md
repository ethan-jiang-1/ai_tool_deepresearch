# Design: harden-test-guards-before-carving

## Context

见 proposal.md。AUD-3 的四个修复选项（并发限流/超时余量/fixture hermetic/waitForFile 提额）中，本 change 采纳三项，缓期一项。

## Decisions

| # | 决策 | 理由 / 备选 |
|---|---|---|
| D1 | 负向扫描 glob 化：`readdirSync(engine)` 过滤 `work-unit-*.mjs` 全集，替代硬编码 3 文件清单 | C4 教训的直接落实：未来再加模块自动入网。备选：手工维护清单——会再次漂移 |
| D2 | normalOwners 清单补 5 个新 C4 模块（snapshot/late-retry/declaration-recovery/transaction-primitives/transaction-projection） | 同 C4 教训；这些文件若出现 rerun-only 分支词必须被测试抓住 |
| D3 | 结构锁加守卫：`helperStart/helperEnd/release` 任一 <0 即 `assert.fail('锚点丢失: ...')`，而不是静默产生空切片 | 空切片会让 doesNotMatch 永真——守护失效且无报错 |
| D4 | 并发限流：`node --test --test-concurrency=4`（替代默认 cores-1） | AUD-3 实测：repo-wide walker 型 checker 与并行测试互踩；限流是 infra 级最小修复。备选（缓期）：check-all.mjs `--root` 透传 + fixture mkdtemp hermetic 化——需 governance CLI 契约变更，登记遗留 |
| D5 | `waitForFile` 3s→10s（transaction.test），与 operate-work-unit 的 5s 对齐并留余量 | 消除 spawned holder 的时序脆弱性 |
| D6 | 基线文件断言三件事：①公开导出面清单（apply/inspect/recover + schema introspection 等逐名）；②公开 API smoke：fixture bundle 上 build/apply/inspect/recover 各走一步；③源文本锚点：`evaluateCanonicalSeedBindings` 在本文件（W2 时该函数下沉 bundle-io，此锚点触发重指提醒） | 基线的意义是"切缝前后行为可对比"，不是重复既有 4/5 簇符号级测试 |

## Risks / Trade-offs

- `--test-concurrency=4` 会拉长全量时长（实测 cores-1 并发约 160s，限 4 后预计 250–400s）——换取稳定性，接受。
- 基线文件的 smoke 流程若依赖 fixture 细节，切缝后可能需要小改——刻意保留（它就是漂移捕捉器）。
- 残余风险：fixture 与并行 checker 的竞态窗口缩小但未消除（D4 缓期项登记 §10.9）。
