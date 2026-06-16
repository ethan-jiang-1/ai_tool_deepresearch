# V12 Enum 迁移记录

V12 定义了 51 个 enum（CONSTANTS.md §Run State Enums + §Research And Evidence Enums + §Topic And Topology Enums）。我们按需引入，目前 10 个。

## 已纳入 (10/51)

| # | Enum | 值数 | 纳入原因 |
|---|------|------|---------|
| 1 | CurrentGate | 6 | Gate 状态机核心 |
| 2 | StopAuthorizationState | 4 | Queue/STATUS 必需 |
| 3 | QueueHealth | 4 | Queue 必需 |
| 4 | RunState | 4 | STATUS 必需 |
| 5 | ResearchProfile | 3 | PROFILE 必需 |
| 6 | GateResult | 2 | Gate 审计必需 |
| 7 | HumanCheckpointStatus | 5 | HITL1/HITL2 状态机 |
| 8 | AnswerabilityClass | 4 | HITL2 可回答性 |
| 9 | HITL2UserDecision | 5 | HITL2 用户选择 |
| 10 | FinalReportView | 7 | HITL2 输出视角 |

## 明确的后续纳入

| 时机 | Enum 族 | 数量 |
|------|---------|------|
| evidence capability | acceptance_status, tier, trust_level, evidence_role, web_substance, commercial_intent, marketing_risk, cross_verification_*, content_retention_decision | ~13 |
| topic capability | must_answer_status, seed_topic_intake_ready, topic_stop_decision, branch_disposition, topology_delta_* | ~8 |
| queue engine | queue_producer_rule, receipt_check_phase | 2 |
| exploration | exploration_exploitation_decision | 1 |

## 排除标准

- **纯内部标识**: version_placeholder, version_log 等
- **过度细分**: distance_to_next_gate (far/mid/near) 可在代码中计算
- **尚未设计**: 在新架构中可能不需要或重新设计
