# Design: retire-return-map-symbols-and-de-export

## Decisions
| # | 决策 | 理由 |
|---|---|---|
| D1 | R3 退休 = spec delta REMOVED + 代码删除（同一 change） | AUD-2 双侧验证：行为由其他入口实现，条款描述的是已被取代的路径 |
| D2 | DE-EXPORT 只去掉 `export` 关键字（函数体不动），Navigation 注释同步 | AUD-2 E 类：零外部 importer = 收窄导出面不改变行为 |
| D3 | absence-lock 扩展覆盖所有退休/去导出符号 | 沿用 residual-spec-drift-text-locks.test.mjs 模式 |
