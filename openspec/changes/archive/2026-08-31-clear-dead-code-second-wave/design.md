# Design: clear-dead-code-second-wave

## Decisions
| # | 决策 | 理由 |
|---|---|---|
| D1 | R1 纯删除（零耦合项直接删） | AUD-2 已双侧验证零引用 |
| D2 | R2 项删后同步 Navigation 注释 | 文件头注释列出已删 token 会误导 |
| D3 | DEAD-FLEXIBILITY #24 删参数 + 统一 `loadQueueReadOnly` | C2 同款模式（不可达分支=漂移温床）|
| D4 | DEAD-FLEXIBILITY #25 propose 期先查 spec | gate JSON 面可能被 spec 命名——先查再删 |
