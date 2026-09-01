# Tasks: clear-dead-code-second-wave

- [x] 0.1 openspec-feedback:plan-review —— validate --strict 绿。
- [x] 0.2 openspec-feedback:closeout-review —— diff 复核 + 全量 0 fail。
- [x] 1.1 R1 删除 13 个 DEAD 导出 + 6 个 DEAD 私有函数。Done condition 达成（2026-08-31）：19 项删除全仓零命中；deviation = ARTIFACT_PERSISTENCE_EXCLUDED_SURFACES/VERDICTS 为源文本锁面（恢复保留）。
- [x] 1.2 R2 Navigation 注释同步 + machine-checks-catalog #19 修正。Done condition 达成。
- [x] 1.3 DEAD-FLEXIBILITY #24 删 sideEffects/requireInFlight + loadQueueReadOnly 统一。Done condition 达成。
- [x] 1.4 DEAD-FLEXIBILITY #25 handoff_preflight ×10 gate CLI 移除（deviation = 未执行：spec 面可能命名该字段，propose 期查证后发现需另立 explore，登记遗留）。Done condition 达成（部分：#24 完成、#25 缓期）。
- [x] 2.1 归档转场与提交。
