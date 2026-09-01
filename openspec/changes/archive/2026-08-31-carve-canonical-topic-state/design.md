# Design: carve-canonical-topic-state

## Context

AUD-1 §1 聚类地图（5 簇、行号区间、消费图）+ 消费者 32 文件清单。W1 基线测试（tests/integration/canonical-topic-state-baseline.test.mjs）已就位作为漂移捕捉器。

## Decisions

| # | 决策 | 理由 |
|---|---|---|
| D1 | 按簇切 4 模块：plan-schema（纯计算）/ bundle-io（IO 基层）/ wave-projection / inspect；主文件保留 transaction core | AUD-1 聚类与环分析：全部边向下，无环、无需三层 |
| D2 | `evaluateCanonicalSeedBindings` 下沉 bundle-io 基层 | load-bearing 决策（AUD-1）：它被 wave-projection/inspect/apply/return-map/gates 五方使用，留 inspect 会把 inspect 拉上写路径 |
| D3 | 主文件 facade re-export 全部被搬走的公开名（TOPIC_STATE_SCHEMA_VERSION/TopicApplyPlanSchema/describeTopicApplyPlanSchema/projectTopicApplyValidationErrors/evaluateCanonicalSeedBindings/inspectCanonicalTopicState） | 32 消费者零改动 |
| D4 | move-only：函数体逐字搬运；deviation=两常量（LOCK/LEGACY 等）与 facade re-exports 为搬运伴生必要改动 | C4 D4 同款纪律 |
| D5 | contract 测试源文本锁重指到模块族（五文件并集） | 保留回归意图，适配新布局 |

## Risks / Trade-offs

- 簇 2（IO 原语）仅间接覆盖——由 apply/inspect 套件 + 基线 smoke 兜底。
- facade↔module 混合环风险：主文件只 re-export + transaction core，不再引用簇函数的反向边（经验证加载 OK + 全量绿）。
