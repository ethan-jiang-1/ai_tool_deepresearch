# Design: carve-wave-depth-contracts

## Decisions

| # | 决策 | 理由 |
|---|---|---|
| D1 | 三层：verdicts（共享 trio + 索引原语下沉）/ wave1 簇 / wave2 簇 | Wave1 与 Wave2 除 37 行 trio 外互不调用（AUD-1）；`submittedFactByRef`/`canonicalizeSubmittedWorkUnitRef`/`safeRel` 被 wave1+wave2 双方使用 → 下沉 verdicts 消环（运行时发现：canonicalize 依赖 safeRel，二者必须同层） |
| D2 | 原 11 公开名在 facade re-export | 11 消费者（含 barrel 8 符号）零改动 |
| D3 | 行号定界切割（声明行号 grep + end=下一声明起点）替代 brace 计数 | brace 计数被字符串/正则中的括号打穿（实测两次 overrun） |

## Risks
- verdicts↔wave1-source-claim-mapping 存在双向依赖（issueResult vs canonicalize/safeRel）——ESM 函数提升下运行时安全，实测全量绿。
