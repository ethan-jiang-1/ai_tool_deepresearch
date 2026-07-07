# BUG-055: Wave2 Phase Agent 跳过 cross-topic synthesis，直接产出浅层报告

## 严重程度
P0 — 研究质量问题。Wave2 是整个 deep research 的价值兑现点——cross-topic synthesis、emergent pattern discovery、finding confidence triage。但实际行为是：Phase Agent 自己写了两页 synthesis.md，没有做任何 scan matrix 计算、没有 triage findings by confidence、没有识别需要额外验证的 emergent patterns。整个过程 <5 分钟，产出零新发现。

## 复现

在 `engelberg-tech-retreat-2026` run 中：

- Wave2 Phase Agent 直接写了两页 synthesis.md + cross-topic-ledger.md
- 没有做 cross-topic scan matrix（哪个 topic 的哪个 claim 被哪些 source 交叉验证？）
- 没有 triage findings by confidence（P0/P1/P2 分级，每个级别的独立 backing 数量）
- 没有识别 emergent patterns（跨 topic 的新发现需要额外 targeted evidence search）
- 没有执行 wave2 的 emergent search rounds（`rb_profile.yaml` 中 `wave2_emergent_search_rounds: 1` 被完全忽略）
- 整个过程 <5 分钟，产出是对已有数据的浅层文字重组

对比：

| 维度 | Wave0 | Wave1 | Wave2 |
|------|-------|-------|-------|
| 新搜索 | 50+ WebSearch | ~15（主要是补充） | 0 |
| 新 source | 51 | ~5 | 0 |
| 产出深度 | evidence_meaning/relationship/next_hop | wave0 数据的重新组织 | 两页 markdown |
| Phase Agent 行为 | 照单全收 sub-agent | 照单全收 sub-agent | **自己写的，无审查** |

## 根因分析

### A. "Pure synthesis path" 被滥用

Wave2 phase §3 允许 Phase Agent 直接写 synthesis artifacts——前提是**证据已经充分**。Phase Agent 把"证据已经充分"解释为"wave0 有 51 个 source，够了"，而不是"每个 cross-topic claim 是否有足够的独立 backing"。

正确的判断标准：
- 每个 cross-topic claim 是否至少有 2 个独立 source backing？
- 是否有 counter-evidence 被系统性地搜索和排除？
- 是否有 emergent patterns 需要额外 targeted search 验证？

如果以上任一答案为否，就不能走 pure synthesis path——必须先做 emergent evidence search。

### B. Phase Agent 跳过计算工作，直接跳到"写报告"

Cross-topic synthesis 的核心工作是计算，不是写作：
1. Scan matrix：topic × topic 的 claim 交叉矩阵，标记哪些 claim 在多个 topic 中出现、哪些 source 跨 topic 验证
2. Finding confidence triage：P0（≥3 独立 backing）/ P1（2 backing）/ P2（1 backing）/ uncertain（0 backing）
3. Gap analysis：哪些 must-answer 仍然没有足够的 backing？需要什么类型的 evidence 才能补上？
4. Emergent search：对 gap 和 uncertain findings 发起 targeted evidence search

Phase Agent 跳过了 1-4，直接做了"写作"这一步。

### C. Gate 的结构性失败挤占了深度思考

BUG-053 的级联噪音 + BUG-048 的 force-advance 常态化 → Phase Agent 的认知资源全部消耗在"怎么过 gate"上，没有余力思考"这个 synthesis 够不够深"。

### D. Wave2 缺少 sub-agent delegation

Wave2 的理想执行模式应该和 wave0/wave1 一样：Phase Agent 设计 scan matrix → 入队 emergent search work units → sub-agent 执行 targeted search → submit → gate。但当前 Phase Agent 选择了绕过整个 queue 系统自己写。

## 建议修复

1. **Phase-wave2.md 必须规定：走 pure synthesis path 前，必须先完成 cross-topic scan matrix 并证明无 gap。** 否则必须先发起 emergent evidence search rounds（使用 `wave2_emergent_search_rounds` 参数）。

2. **Wave2 的 scan matrix 和 confidence triage 必须是可验证的 artifacts。** 不是 prose markdown——是结构化数据（finding-index.yaml 或 finding-ledger.jsonl），gate 可以检查：
   - 每个 cross-topic claim 的独立 backing 数量
   - P0/P1/P2/uncertain 分布
   - 是否有 emergent search 覆盖了 uncertain findings

3. **Wave2 必须使用 sub-agent delegation 做 emergent search。** Phase Agent 不应自己写 synthesis——它应该设计 search demand、入队 queue、sub-agent 执行、submit、gate。和 wave0/wave1 一样的模式。

4. **Gate 噪音修复（BUG-053）是 wave2 深度修复的前提。** 如果 gate 继续产生 30+ 个 structural failure，Phase Agent 永远没有认知资源做深度思考。

## 发现时间
2026-07-07，engelberg-tech-retreat-2026 run，Wave2 产出 <5 分钟完成，零 emergent search

## 关联
- [[BUG-053]] — gate 噪音挤占深度思考
- [[BUG-048]] — force-advance 常态化
- [[BUG-054]] — wave1 同样深度不足
