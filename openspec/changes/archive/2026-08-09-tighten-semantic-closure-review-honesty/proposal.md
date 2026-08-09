## Why

现有 `semantic-closure/v1` 已能区分 resolver、authority-establishing surface、verdict
consumer 与 projection/legacy overlap，但第一次真实 affected dogfood 的归档记录仍出现了
`6` 处、`5` 个 distinct `#fragment` 与当时实际 symbol 不符，以及 Agent-facing projection
被放入 verdict `consumers` 的角色混用。结构 checker 按设计只验证 base file，因此这些记录
可以合法通过，却给 reviewer 制造了未经验证的精确外观。

问题与证据来自
`_backlog/learning/semantic-fact-closure-design-assessment-2026-08-09.md`，推进边界来自
`_backlog/learning/semantic-fact-closure-progressive-rollout-plan-2026-08-09.md`。现在要强化
v1 author、plan review 与 closeout review 的诚实表达；不把这次真实使用摩擦扩成 v2 schema、
generic symbol linter 或新的 runtime/governance authority。

## What Changes

- 修改 semantic-closure authoring contract：coordinate 的 file path 仍是 machine-checked
  identity；`#fragment` 只允许作为 reviewer 能对应到实际 symbol 的 human-facing hint。无法稳定
  命名时使用 bare file path，并在已有 prose surface 中说明，不用猜测 fragment 制造 false precision。
- 明确所有 v1 role 都相对于 family bounded conclusion 分类：`consumers` 只包含会授权、拒绝、
  pass、fail 或 block 的 verdict consumers；Agent-facing task/schema/prompt projection 使用现有
  `overlap: derived`；authority-establishing surface 保持在 `established_by`，diagnostic/raw reader
  不因读取事实而自动成为 verdict owner。
- 强化 proposal、Apply/Archive operation guidance 与 plan/closeout review guidance：reviewer 必须对
  planned/actual surface 复核 fragment 诚实性与角色分类；发现 false precision、projection/consumer
  误分类或无法确定的角色时，按既有 feedback lifecycle 记录普通 pending task，再完成相应 review marker。
- 保持 `semantic-closure/v1`、现有字段和 structural checker proof boundary 不变。checker 继续只验证
  safe file coordinate、record shape 与 selected asset reference，不执行 generic token/callsite 扫描，
  不声称 symbol 或 semantic role 正确。
- 保持历史记录不可改写：不批量修补 archived `semantic-closure.yaml`，不把本次发现伪装成历史上已验证
  的事实。
- 不新增 semantic family、projection 字段、runtime Gate/state/receipt、test runner、global topology
  registry 或 read-only family view；不修改 finalizer 的 checker 顺序，也不让 finalizer 执行测试。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `governance/semantic-fact-closure`: 收紧 v1 coordinate hint 与 resolver/established-by/consumer/overlap
  的 authoring 和 semantic review 要求，同时保持结构 checker 与 schema 边界不变。
- `governance/change-feedback-loop`: 要求 apply/closeout review guidance 把 fragment false precision 与
  semantic role 误分类转成普通 pending work，不能用 checker PASS 或 review marker 掩盖。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `governance/semantic-fact-closure` | Catalog row；main spec 的 SEF-002 applicability/record contract、SEF-003 one-resolver 与 Agent-owned review boundary、SEF-004 structural checker boundary | Modify | 它直接拥有 coordinate、role inventory、checker proof boundary 与 semantic review 分工；现有 v1 表达能力足够，本 change 只收紧可观察 author/reviewer 行为。 |
| `governance/change-feedback-loop` | Catalog row；main spec 的 CHF-001 durable finding route 与 CHF-002 supported apply/archive review guidance | Modify | 它拥有 review marker、普通 pending task 与 lifecycle guidance 的交付；本 change 要求角色/fragment finding 进入这条既有闭环。 |
| `verification/verification-routing` | Catalog row；main spec 的 VER-001 four-class taxonomy、VER-002 closed plan 与 VER-003 checker/native-verdict boundary | Verify-only | 本 change 需要选择 deterministic knowledge-surface/integration proof，但不改变 test class、plan schema、asset route 或 native verdict authority。 |

## Semantic Precision And Control Shape

本 change 服务的明确读者是 semantic-closure record author 与 plan/closeout reviewer；它回答的有界
问题是：“这个 coordinate 与 role 声明，是否诚实地定位本次 change 实际存在的 surface，并说明它
相对于 family conclusion 的作用？”必须保留四个会改变结论的区别：machine-checked base file 与
human-facing fragment hint、authority establishment 与 verdict consumption、Agent-facing projection 与
outcome-changing consumer、structural validity 与 semantic judgment。正常推理停止点是 actual symbol
或 bare path 加明确 prose；无法确定角色时结论是 unknown 并进入 ordinary pending task，而不是沿
代码猜一个看似精确的 fragment。

Direct Source of Record 仍是 accepted semantic-closure/change-feedback specs 对治理行为的契约、
change-local record 对当前 change 的声明，以及 current source/spec 对实际 symbol 和 runtime role 的
事实。最短合法闭环是 authoring -> plan review -> target implementation -> actual-diff closeout review ->
ordinary repair task；Node checker 只在其原有位置验证结构和引用。净简化来自避免新增 v2 migration、
projection 字段、token scanner、checker verdict、fallback/retry、global topology graph 和历史重写；
本 change 只校准现有角色与既有 feedback loop。

用户只决定新的语义、范围与风险取舍；Agent 负责读取实际 surface、使用 actual symbol/bare path、
分类角色、记录和执行可逆修复；Engine/Node 继续只裁决 deterministic shape/reference facts。review guidance
不能创造 permission、override checker failure，或把 human-directed decision 变成缺失 capability。

## Impact

- Apply 目标限于 `openspec/config.yaml` 的 proposal 与 Apply/Archive operation guidance、
  `guidelines/change-feedback-loop.md`、相关 governance knowledge-surface test，以及 Apply/Archive 阶段的
  delta-to-main spec sync 与 requirement registry 校验。`SUPPORTED_ENTRY_SURFACES` 中的 `.agents` /
  `.claude` adapter 是 inventory-backed review/test boundary；除非该审查证明其未抵达 current guidance，
  否则不修改并行的 adapter 文本。
- 不修改 `openspec/governance/semantic-fact-closure-contract.mjs`、
  `check-semantic-closure.mjs` 或 `finalize-change-archive.mjs` 的 executable behavior，除非 plan review
  在首次 target edit 前发现现有 guidance 无法由当前 owned surface 交付；该 finding 必须先成为普通
  pending task，不能静默扩 scope。
- 本 change 的 `semantic-closure.yaml` 使用 `not_applicable`：它只修改 OpenSpec governance author/review
  行为，不改变 Deep Research Harness runtime resolver 或 verdict consumer。
- 不修改 `DEEP_RESEARCH_HARNESS/`，因此不需要 Harness version bump；不新增依赖。
