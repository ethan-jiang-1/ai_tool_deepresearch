# Tasks: schema-core-hitl

## 1. Enum 补充

- [x] 1.1 `enums.mjs` 追加 HumanCheckpointStatus (5 values)
- [x] 1.2 `enums.mjs` 追加 AnswerabilityClass (4 values)
- [x] 1.3 `enums.mjs` 追加 HITL2UserDecision (5 values)
- [x] 1.4 `enums.mjs` 追加 FinalReportView (7 values)

## 2. ProfileSchema 更新

- [x] 2.1 `contracts/profile.mjs`：hitl1.status 用 HumanCheckpointStatus 替代 z.literal
- [x] 2.2 `contracts/profile.mjs`：hitl2 增加 answerability_class, user_decision, final_report_view, custom_slug

## 3. Barrel + Registry

- [x] 3.1 `index.mjs` 导出新的 4 个 HITL enum
- [x] 3.2 `req-registry.yaml` 注册 SCO-005 ~ SCO-008

## 4. 自测更新

- [x] 4.1 `tests/schema/enums.test.mjs` 追加 4 个 HITL enum 的 accept + reject 测试
- [x] 4.2 `tests/schema/contracts.test.mjs` 更新 ProfileSchema 测试
- [x] 4.3 `node --test tests/schema/` 全部通过
