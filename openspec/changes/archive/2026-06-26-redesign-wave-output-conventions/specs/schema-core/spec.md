# Schema Core (delta)

> req: SCO-002, SCO-010

注：SCO-010 为 delta 新增 ID，内容嵌入 SCO-002 的 MODIFIED body 中，不设独立 `### Requirement:` 块。参见 `openspec/governance/req-registry.yaml` 中对应 pending 条目。

## MODIFIED Requirements

### Requirement: Six Zod contracts

The system SHALL provide six Zod contracts for bundle control file validation:

| Contract | Target File | Schema |
|----------|------------|--------|
| Gate contract | `rb_status.json` | Gate state machine schema |
| Plan contract | `rb_plan.md` | Topic plan schema |
| Profile contract | `rb_profile.yaml` | Research profile schema |
| Queue contract | `rb_queue.json` | Queue state schema with structured `QueueWorkUnitSchema` |
| Status contract | `rb_status.json` | Run state schema |
| Trace contract | `rb_trace.jsonl` | Trace entry schema |

Reference contract 更新：ReferenceMetadata schema 继续用于 thin YAML（`artifacts/wave0/<topic>/source.yaml`），字段不变（`url`、`title`、`retrieved_date`、`topic_tag`、`notes` 可选）。**新增** `_INDEX.md` 轻量 table 校验（表头完整性：检查全部 8 列 `ref_file`、`source_type`、`trust_level`、`tier`、`related_topic`、`source_layer`、`acceptance_status`、`date_landed` + 至少 1 行数据）— 对应 SCO-010。其他 4 个 contracts（gate、plan、status、trace）无需变更。

> 以下 ProfileSchema 和 Queue contract 内容为原主 spec 已有内容，**非本 change 新增**。`rerun_count` 由 REI-002 实现，`QueueWorkUnitSchema` 由 SCO-009 实现，此处保留完整 body 仅为 MODIFIED requirement 归档安全性（避免 partial diff 丢失既有内容）。本 change 不修改这些字段，不需要对应 task。

The ProfileSchema SHALL add `rerun_count` to the HITL2 section. HITL2 section SHALL include `answerability_class` (AnswerabilityClass), `user_decision` (HITL2UserDecision), `final_report_view` (FinalReportView), optional `custom_slug` (string), and optional `rerun_count` (non-negative integer, default 0). The Queue contract SHALL use `QueueWorkUnitSchema` for structured queue slot validation, replacing the previous skeleton placeholder slots.

#### Scenario: ProfileSchema accepts valid hitl2 skeleton
- **WHEN** `ProfileSchema.safeParse({ plan_basename: 'test', research_profile: 'quick_factual', root_must_answer_set: [], human_decision_checkpoints: { hitl1: { status: 'recorded' }, hitl2: { status: 'not_started', answerability_class: 'not_assessed', user_decision: 'not_started', final_report_view: 'not_started' } } })` is called
- **THEN** it returns `{ success: true }`

#### Scenario: ProfileSchema rejects invalid hitl2 status
- **WHEN** hitl2 status is `'invalid'`
- **THEN** it returns `{ success: false }`

#### Scenario: ProfileSchema accepts rerun_count

- **WHEN** `ProfileSchema.safeParse({ plan_basename: 'test', research_profile: 'quick_factual', root_must_answer_set: [], human_decision_checkpoints: { hitl1: { status: 'recorded' }, hitl2: { status: 'recorded', answerability_class: 'ready_substantive', user_decision: 'rerun', final_report_view: 'profile_default', rerun_count: 1 } } })` is called
- **THEN** it returns `{ success: true }`

#### Scenario: ProfileSchema rejects negative rerun_count

- **WHEN** `rerun_count` is `-1`
- **THEN** it returns `{ success: false }`

#### Scenario: Queue contract validates structured slots

- **WHEN** `validate-bundle.mjs` checks `rb_queue.json`
- **THEN** each of the 5 active window slots (`slot_1_current` through `slot_5_tail`) SHALL validate against `QueueWorkUnitSchema` (nullable)
- **AND** `refill_pool` SHALL validate as `z.array(QueueWorkUnitSchema)`

#### Scenario: QueueWorkUnitSchema validates a complete task card

- **WHEN** a queue item with all required fields (`work_id`, `title`, `targets`, `action`, `producer_rule`, `required_receipts`, `completion_receipt`, `status`) is validated
- **THEN** it SHALL pass Zod validation

#### Scenario: QueueWorkUnitSchema rejects missing required fields

- **WHEN** a queue item missing `producer_rule` or `required_receipts` is validated
- **THEN** Zod validation SHALL throw

#### Scenario: Backward compatible with null slots

- **WHEN** a bundle has `null` values in queue slots (e.g., empty queue)
- **THEN** Zod validation SHALL pass (slots are `.nullable()`)

#### Scenario: ReferenceMetadata schema applies to artifacts/wave0/ thin YAML

- **WHEN** `artifacts/wave0/<topic>/source.yaml` 被校验
- **THEN** 校验 SHALL 使用 ReferenceMetadata schema
- **AND** 每条 entry 的 `url`、`title`、`retrieved_date`、`topic_tag` 非空且类型正确

#### Scenario: _INDEX.md passes light validation

- **WHEN** `reference/_INDEX.md` 被校验
- **THEN** 校验 SHALL 确认 table header 包含全部 8 列：`ref_file`、`source_type`、`trust_level`、`tier`、`related_topic`、`source_layer`、`acceptance_status`、`date_landed`
- **AND** table 至少包含 1 行数据
