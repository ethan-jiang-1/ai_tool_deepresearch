# Design — Enforce Seed Initialization Body Completeness

## Context

See proposal.md — Why. Current state that shapes the approach:

- `evaluateSeedInitializationStructure`（`DEEP_RESEARCH_HARNESS/engine/helpers/seed-topic-authoring-evaluator.mjs`）对 current-marker seed 只校验：marker 各一且
  `start < end < appendix`、end marker 下方无 renderer-owned heading / pending
  ghost、区域内五个 section heading 各一次且有序。它**不**校验区域内默认内容
  （`SEED_TOPIC_INITIALIZATION.sections[].content`，即 7 行 `pending — ...`
  占位）是否被替换 → `seed-topics-ready` 对「frontmatter enriched + body
  pending」确定性 pass（BUG-237，已在 `dpt_rb_ai-coding-evolution` 复现）。
- frontmatter 一侧已被 `SeedEnrichmentSchema`（`canonical-topic-state.mjs`）在
  `enrich_seed` apply 时强制非空；正文一侧没有对应 deterministic 检查。
- gate CLI 对 `seed_initialization_structure` rule 已生成 `repair_kind:
  agent_action` + `write_to: <path>#seed-initialization` 的 hint；只需扩展
  判定与文案，不需要新的 gate/rule 接线。
- `phase-seed-topics.md` 的 task card `action` 已要求编辑 markers 内 body，但
  `done_condition` 与 §3.1 未显式禁止保留模板占位行；§3.1「记录 existing
  explicit non-empty `pending` gap」措辞含糊，Agent 可能原样保留模板行当作 gap。

## Goals / Non-Goals

**Goals:**

- 让 `seed-topics-ready` 对 current-marker seed 确定性拒绝「正文仍含模板 pending
  占位」的状态，并把反馈前移到 seed-topics gate（不再等 Wave0 才暴露）。
- 让 Phase Agent 指引明确：替换占位行、显式 gap 必须改写为具体缺失事实表述。
- 建立 unit + integration 两层确定性 red/green 证据，并在真实 bundle 上验证。

**Non-Goals:**

- 不做正文语义质量判断、不把 body 当第二 registry、不要求语义完备。
- 不改 frontmatter enrichment 契约、不改 appendix/`__BACKFILL_*` token 及其
  Wave writer 所有权、不改 Wave0 source floor、不改 legacy seed 兼容。
- 不新增 gate、state、writer、recovery 控制器或用户 decision 点。
- 不做 bundle 内容的迁移；真实 bundle 的 repair 是 run 自身 contract 下的运行时
  动作，不属于本 change 的 diff。

## Decisions

### D1. 判定方式：trim 后逐字节匹配默认占位行集合

在 `evaluateSeedInitializationStructure` 中，把 `SEED_TOPIC_INITIALIZATION.sections`
每条的 `content` 按 `\n` 拆分、`trim()` 后构成占位行集合（派生常量，单一真值源）；
把初始化区域按行拆分、`trim()` 后逐一比对，任一命中即 fail。

- **备选 A（区域含 `pending` 前缀行即 fail）**：与 accepted 的显式 gap 形式
  （phase §3.1 允许 `pending — <具体缺失事实>` 表述）冲突，会误伤合法 gap。
- **备选 B（整区域与渲染模板全文比对）**：过度严格——Agent 部分改写也会 fail，
  且无法给出逐行诊断。
- **结论**：D1 只捕获「该行从未被触碰」这一确定事实，允许任何改写（含保留
  `pending —` 前缀的显式 gap），零语义判断。缺陷：Agent 若故意逐字复制模板行当
  gap 会 fail——这正是「未替换」信号，repair 文案会说明需改写。

### D2. 检查放在既有 `seed_initialization_structure` rule / evaluator 内

同一 rule id 复用既有 gate hint 机器（`makeContractFinding`、masked-rules 逻辑、
`repair_kind: agent_action`、`write_to`、rerun 文案）。新检查放在既有
below-boundary ghost 检查之后、`return { passed: true }` 之前，保持 ghost 判定
优先级不变（现有集成测试断言不变）。

### D3. 占位行集合从 `SEED_TOPIC_INITIALIZATION.sections` 派生，不重复维护

模板/渲染器/evaluator 的静态 parity 测试已存在；内容字符串只存一处，任何
占位文案改动自动同步到检查。不改 `sections` 内容本身（避免波及渲染与既有测试）。

### D4. Guidance 收紧点

- `phase-seed-topics.md`：task card `action` 增加「不得保留模板 pending 占位行」；
  `done_condition` 增加「区域内无模板占位行，显式 gap 已改写」；§3.1 的 gap 句
  明确「改写为具体缺失事实，不得原样保留模板行」；§4 Expected Artifacts 加一条。
- `templates/seed-topic-template.md`：Initialization Skeleton 加一句 readable
  mirror 说明（renderer 输出 `pending — ...` 占位，Agent 必须在 gate 前替换）。
- gate definition JSON 的 `seed_initialization_structure` failure_message 与
  gate CLI 的 repair 文案说明占位替换/显式 gap 形式。

### D5. 测试分层（verification-routing）

- unit（`tests/engine/helpers/seed-topic-authoring-evaluator.test.mjs`）：
  evaluator 纯函数——渲染模板 fail、替换后 pass、显式 gap 改写 pass、
  ghost-below 仍 fail、legacy 仍 pass。
- integration（`tests/integration/cli/check-gate-seed-topics-ready.test.mjs`）：
  临时 bundle 上跑真实 gate CLI——pending body fail（hint rule_id /
  repair_kind / write_to / rerun 断言），enriched body pass。
- integration md 文档锁（`tests/integration/md/seed-topic-projection-document-contract.test.mjs`）：
  phase 与 template 携带「替换占位」要求的 doc-lock。
- 真实 bundle 验证（运行时，非测试资产）：对新 evaluator 逐文件跑五个 seed
  → 修复前 fail；修复后 pass。

## Risks / Trade-offs

- [合法正文恰好逐字等于某模板占位行（含刻意复制）] → 判 fail 并要求改写；
  repair 文案明确「显式 gap 需改写为具体缺失事实」，成本是一个词的重新表述。
- [HITL1 新建 skeleton（含占位）在 seed phase 完成前被 gate 拒绝] → 这是预期
  行为：seed phase 的职责就是替换占位；gate 不再把半成品当有效状态。
- [region 内占位与 below-boundary ghost 同时存在时只报一个 root] → 既有 evaluator
  顺序保持 ghost 优先，两类都属于同一 rule 的 bounded 修复面，不引入歧义。
- [真实 bundle repair 涉及语义创作] → 只从 bundle 内已记录的
  `topic_registry`/`rb_profile.yaml` 事实派生，不足处以显式 gap 表述，不编造。

## Migration Plan

无 schema/state 迁移。真实 bundle 的五个 seed 正文按 `phase-seed-topics.md` 的
Agent-owned 编辑面做运行时 repair（直接改 markers 内正文；frontmatter 已 enriched
无需 apply），随后用新 evaluator 验证无占位残留。

## Open Questions

无。
