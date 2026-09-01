# Design: carve-gate-helpers-core

## Decisions
| # | 决策 | 理由 |
|---|---|---|
| D1 | 4 模块：invocation / result / attempt-audit / plan-progress | AUD-1 §2 聚类（五簇中 plan-progress 独立、attempt-audit 吸收簇 3+4 + mid-file logger import）|
| D2 | 主文件 → facade：`__dirname`/`WORKFLOW_NODES_DIR` export + 17 公开名 re-export 分块 | 前两次失败的根因已修复：①export 前缀覆盖 const；②facade 必须显式 re-export 全部公开名（不能假设桶消费者自行改导入路径）|
| D3 | mid-file `logger.mjs` import 随 attempt-audit 搬迁 | logToRun/readBundleName 被 attempt-audit 10 处引用 |
| D4 | move-only 纪律 | 函数体逐字搬运；deviation = 2 const export 前缀 + facade re-export 块为伴生必要改动 |

## Risks
- 前两次回滚的根因（export const 遗漏 + facade 忘记 re-export）已通过显式修复 + 全量 ×2 绿关闭。
