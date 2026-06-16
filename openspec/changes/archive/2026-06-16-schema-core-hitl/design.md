# Design: schema-core-hitl

## Context

schema-core 已归档。遗漏了 V12 CONSTANTS.md 中定义的 HITL 状态枚举。本次补充，不再遗漏。

## Goals / Non-Goals

**Goals:**
- 新增 4 个 HITL 枚举
- 更新 ProfileSchema 使用新枚举
- 注册 SCO-005~008

**Non-Goals:**
- 不修改其他 contract
- 不增加 HITL 状态机逻辑

## Decisions

### 1. 新增 4 个 Enum

```javascript
// enums.mjs 追加
export const HumanCheckpointStatus = z.enum([
  'not_started',
  'pending_user',
  'recorded',
  'blocked',
  'not_applicable',
]);

export const AnswerabilityClass = z.enum([
  'not_assessed',
  'ready_substantive',
  'ready_insufficient_judgment',
  'blocked_repair_required',
]);

export const HITL2UserDecision = z.enum([
  'not_started',
  'proceed_to_readiness',
  'request_view_revision',
  'repair_and_rerun',
  'stop_blocked',
]);

export const FinalReportView = z.enum([
  'not_started',
  'profile_default',
  'executive_brief',
  'evidence_map',
  'claim_judgment',
  'technical_deep_dive',
  'custom',
]);
```

### 2. ProfileSchema 更新

```javascript
// Before (hardcoded):
hitl1: z.object({ status: z.literal('recorded') }),
hitl2: z.object({ status: z.literal('not_started') }),

// After (使用 HumanCheckpointStatus):
export const ProfileSchema = z.object({
  plan_basename: z.string(),
  research_profile: ResearchProfile,
  root_must_answer_set: z.array(z.string()),
  human_decision_checkpoints: z.object({
    hitl1: z.object({
      status: HumanCheckpointStatus,
      recorded_at: z.string().optional(),
    }),
    hitl2: z.object({
      status: HumanCheckpointStatus,
      answerability_class: AnswerabilityClass,
      user_decision: HITL2UserDecision,
      final_report_view: FinalReportView,
      custom_slug: z.string().optional(),
    }),
  }),
});
```

### 3. 注册 ID

```yaml
SCO-005: schema-core-hitl — HumanCheckpointStatus enum
SCO-006: schema-core-hitl — AnswerabilityClass enum
SCO-007: schema-core-hitl — HITL2UserDecision + FinalReportView enums
SCO-008: schema-core-hitl — ProfileSchema hitl1/hitl2 field update
```

## Risks

- **[Risk] 后续还需要更多 enum** → Mitigation: 按需加，不预加
