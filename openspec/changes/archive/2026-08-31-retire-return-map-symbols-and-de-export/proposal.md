# Proposal: retire-return-map-symbols-and-de-export

来源：`_backlog/plans/cleanup-wave2-carving-test-guards-and-ledger.md`（W6；AUD-2 R3 + E 类）。

## Why

AUD-2 发现两个 R3 符号（`inspectSeedTopicReturnMaps`/`hasBackfillToken`）被现行 return-map spec 条款锁定但代码零引用——行为已由其他入口实现，条款需退休。127 个 DE-EXPORT 符号零外部 importer（仅内部调用），收窄导出面。

## What Changes

- **R3 spec delta**：`research/research-return-map` 退休两个条款（hasBackfillToken per-wave 行为 + inspectSeedTopicReturnMaps 映射），代码删除两符号。
- **machine-checks-catalog**：文档漂移修正（#19）。
- **DE-EXPORT 批量**：~127 个零 importer 导出移除 `export` 前缀（AUD-2 E 类清单，按目录分批；Navigation 注释同步）。
- **不含**：TEST-ONLY 18 项（保留/注记）。

## Capabilities

### New Capabilities
（无。）
### Modified Capabilities
| `research/research-return-map` | 退休两个条款 | requirement 正文变化（spec delta） |

## Impact

- 多文件 `export` 前缀移除；2 个函数删除；1 个 spec delta。

## Capability Discovery

Evidence read：AUD-2 E 类清单 + R3 双侧验证。

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `research/research-return-map` | spec :266-289/:276 双侧验证 | Modify | R3 退休需 spec delta |
