# Proposal: clear-dead-code-second-wave

来源：`_backlog/plans/cleanup-wave2-carving-test-guards-and-ledger.md`（W4；AUD-2 170 项发现的 R1/R2 子集）。

## Why

AUD-2 死代码审计（149 文件双侧验证）发现 15 个零引用导出、8 个零调用私有函数、2 个 DEAD-FLEXIBILITY 参数面。死代码是漂移温床，清除后未来维护者不会被误导。

## What Changes

- **R1 纯删除**（零耦合）：13 个 DEAD 导出（不含 2 个 R3）、6 个 DEAD 私有函数、`sha256Object`/`createRunId`（host_tools）。
- **R2 配套**：Navigation 注释同步、machine-checks-catalog 文档漂移修正（#19）、`gate-helpers-readers.mjs` 超级不再使用的 reader 块（#18/#19）。
- **DEAD-FLEXIBILITY**：`sideEffects`/`requireInFlight` 参数面删除（4 调用点恒 false）+ `handoff_preflight: false` ×10 gate CLI 移除（需先查 spec 是否命名该字段）。
- **不含**：R3 两个 return-map 符号（归 W6）、TEST-ONLY 18 项、DE-EXPORT 127 项（归 W6）。

## Capabilities

### New Capabilities
（无。）
### Modified Capabilities
（无——`skip_specs: true`。）

## Impact

- 多个 engine/schema/cli/host_tools 文件的死代码删除；absence-lock 测试扩展。

## Capability Discovery

Evidence read：AUD-2 全部双侧验证。

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `research/research-return-map` | R3 两符号涉及但本 change 不触碰 | Excluded | 归 W6 |
| `engine/framework-engine` | 死代码删除不改变导出面语义 | Excluded | 删除的 token 零引用 |
