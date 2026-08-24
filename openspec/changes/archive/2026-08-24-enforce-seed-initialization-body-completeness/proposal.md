# Enforce Seed Initialization Body Completeness

## Why

`_backlog/bugs/BUG-237-seed-initialization-pending-before-wave0.md`（真实 run
`dpt_rb_ai-coding-evolution`）暴露：`seed-topics-ready` gate 允许
「frontmatter 已 enriched、`seed-initialization` 正文仍保留模板 pending 占位」的
半完成状态通过。五个 Topic 的 frontmatter 已有 `hypothesis`/`in_scope`/
`out_of_scope`/`search_guardrails`/`evidence_route`，但正文仍逐字保留
`pending — seed-topics Agent must enrich this section.` 等 7 行模板占位，用户因此
在 Wave0 之前无法读到每个 Topic 的初始假设、缺口、why now、交付价值与下游位置，
也无法提供早期反馈。该状态不是本次 run 的孤立遗漏：`seed_initialization_structure`
检查只校验 marker 边界与 ghost，从不校验区域内模板占位是否被替换，gate 因此
确定性放行。

## What Changes

- `seed-topics-ready` gate 的确定性规则扩展（`seed_initialization_structure` 同一
  rule）：对带 current markers 的 seed，`seed-initialization` 区域内任一模板
  pending 占位行（与 `SEED_TOPIC_INITIALIZATION.sections` 默认内容逐字节匹配）
  未替换 → gate fail，反馈指向 bounded 编辑面并 rerun 同一 gate。
- Phase Agent 指引收紧：`phase-seed-topics.md` 的 task card `action`/
  `done_condition`、§3.1 显式 gap 语义、§4 Expected Artifacts 明确「区域内不得保留
  模板 pending 占位行；显式 gap 必须改写为具体缺失事实的表述，不得原样保留模板行」。
- 模板与 gate definition 的 failure message 同步说明该要求（可读镜像与 feedback
  文案）。
- 建立确定性 red test：frontmatter enriched + body pending 的 seed 在 unit 与
  gate 集成两层都 fail；替换占位（含改写后的显式 gap）后 pass。
- 修复后按 run 自身 phase contract 对 `dpt_rb_ai-coding-evolution` 五个 seed 的
  Agent-owned 初始化区域做运行时 repair（只写正文、不动 frontmatter、不动 appendix
  token），使「五个 Topic 正文可读」的验收在报告环境成立。

不改变：frontmatter enrichment 契约（已由 `SeedEnrichmentSchema` 在
`operate-topic-state apply` 强制）、appendix/`__BACKFILL_*` token 的 Wave writer
所有权、legacy（无 markers）seed 的兼容路径、Wave0 source floor、
canonical topic identity/evidence authority。

## Capabilities

### New Capabilities

None。

### Modified Capabilities

- `research/seed-topic-materialization`: 新增 requirement STM-010 ——
  `seed-topics-ready` 对 current-marker seed 的初始化区域执行确定性 pending
  占位检查，并约束 Phase Agent 的正文完整性与显式 gap 形式。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `research/seed-topic-materialization` | `openspec/specs/research/seed-topic-materialization/spec.md`（STM-001/002 的 gate rule set 与初始化区域约束）、`DEEP_RESEARCH_HARNESS/engine/helpers/seed-topic-authoring-evaluator.mjs`、`DEEP_RESEARCH_HARNESS/schema/gate_definitions/gate-seed-topics-ready.definition.json` | Modify | gate 的 `seed_initialization_structure` 规则与 evaluator 是待扩展面；新增 STM-010 描述区域内 pending 占位检查与显式 gap 形式。 |
| `research/pre-research-gate-implementation` | `openspec/specs/research/pre-research-gate-implementation/spec.md` | Excluded | 只覆盖 instantiation/hitl1/setup 三 gate；seed-topics gate 属于 seed-topic-materialization。 |
| `verification/verification-routing` | `openspec/specs/verification/verification-routing/spec.md` | Verify-only | 只用既有 unit/integration 分类路由新证据，不修改分类契约。 |
| `research/canonical-topic-state` | `openspec/specs/research/canonical-topic-state/spec.md`（catalog 邻居） | Excluded | `enrich_seed` apply 的 schema/事务不变；本次不改 frontmatter 写入契约。 |

## Semantic Precision Reflection

读者/有界问题：**「frontmatter 已 enriched + 正文仍为模板占位」是否应被
`seed-topics-ready` 判定为可进入下一阶段的有效状态？** 答案是否定的。

必须保留的区别：

1. **模板占位（renderer-owned 指令）** vs **Agent 创作内容（含显式 gap）**。
   判定只做字节级占位匹配：与 `SEED_TOPIC_INITIALIZATION.sections` 默认行
   （trim 后）完全一致的行 = 该 section 从未被触碰 → fail。任何改写（包括
   「`pending — <具体缺失事实>`」形式的显式 gap）都不匹配 → pass。这是
   deterministic 边界，不引入语义质量判断。
2. **body 完整性** vs **appendix 回填**。`__BACKFILL_*` token 属于对应 Wave
   writer 的合法回填路径（BUG-237 non-goal），本 change 不触碰。
3. **current-marker seed** vs **legacy seed**。无 markers 的旧 seed 保持
   read-compatible，不被迁移或推断。

正常推理停止点：`seed-topics-ready` 对每个 current-marker seed 输出一个
bounded 编辑面（`<slug>.md#seed-initialization`）与同一 gate rerun；Agent 在
start/end markers 内替换占位后重跑 gate。Engine 不评判正文好坏，Agent 不获得任何
新 permission，User 不产生新 decision 点。

## Authority And Control Boundary

- **direct Source of Record**：seed 文件本身（`seed_topics/<slug>.md` 的
  `seed-initialization` 区域字节）+ `SEED_TOPIC_INITIALIZATION.sections` 默认内容
  （占位真值）。
- **最短合法闭环**：Agent 编辑 bounded 区域 → 重跑同一 `seed-topics-ready` gate →
  Engine 给出确定性 verdict。无新 state、无新 gate、无新 writer、无新 recovery
  控制器。
- **net simplification**：把「半完成状态靠 Wave0 才暴露」的隐性延迟反馈，前移为
  seed-topics gate 的直接确定性检查；不新增任何控制层，只扩展既有 evaluator 的
  一个检查。
- **责任边界**：User 决定研究语义（HITL1）；Agent 负责正文创作与显式 gap；
  Engine 负责占位检测的确定性 verdict。本 change 不授予任何一方新 permission，
  不引入 human-directed 能力。

## Impact

- `DEEP_RESEARCH_HARNESS/engine/helpers/seed-topic-authoring-evaluator.mjs`：
  新增占位行集合派生与区域内检查（同一 `evaluateSeedInitializationStructure`）。
- `DEEP_RESEARCH_HARNESS/schema/gate_definitions/gate-seed-topics-ready.definition.json`：
  `seed_initialization_structure` rule 的 failure_message 说明占位替换要求。
- `DEEP_RESEARCH_HARNESS/cli/gates/check-gate-seed-topics-ready.mjs`：该 rule 的
  repair 文案说明占位替换/显式 gap 形式。
- `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-seed-topics.md` 与
  `DEEP_RESEARCH_HARNESS/workflows/nodes/templates/seed-topic-template.md`：
  guidance 收紧。
- `tests/engine/helpers/seed-topic-authoring-evaluator.test.mjs`、
  `tests/integration/cli/check-gate-seed-topics-ready.test.mjs`、
  `tests/integration/md/seed-topic-projection-document-contract.test.mjs`：
  红/绿测试与文档锁。
- 运行时：`dpt_rb_ai-coding-evolution/seed_topics/*.md` 五个初始化正文 repair
  （git-ignored 的 bundle 内容，不作为 change diff）。
