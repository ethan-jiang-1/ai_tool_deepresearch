## Why

BUG-212、BUG-213、BUG-214 是三个不同 defect，却暴露出同一类工程漂移：同一个
Engine 确定性事实被 schema、submit、Gate、inspect 或 diagnostic 的多个 consumer
各自从 raw record 重建，新增 consumer 没有被约束为复用既有 authority。现在需要把
这种闭合关系纳入 OpenSpec change lifecycle，令下一次改动在 target edit 前就能暴露
遗漏，而不是在运行中的 Gate 才发现相互矛盾的 verdict。

原始事实来自 `_backlog/bugs/BUG-212-supersede-predecessor-bypass-misreport.md`、
`_backlog/bugs/BUG-213-depth-review-rejects-authorized-prior-source-ref.md`、
`_backlog/bugs/BUG-214-supplementary-empty-output-files-vs-dry-submit-contract.md`，以及
`_backlog/plans/semantic-fact-closure-openspec-governance.md` 的共同理解。

## What Changes

- 新增 `openspec/governance/semantic-fact-families.yaml` 作为项目级、registry-like
  semantic fact catalog，先登记当前 Deep Research Harness delegated-work/evidence
  runtime 路径的 13 个有界 deterministic fact families；它是可增长目录，不是字段清单、
  runtime schema registry
  或声称覆盖整个 Framework 的永久总表。其中 `work-unit.assignment-output-obligation`
  单列 BUG-214 的 assignment-derived direct-output 义务，避免把“要不要声明 output”
  混同于某个 output 的内容履约。
- 为每个未来 OpenSpec change 增加 change-local `semantic-closure.yaml`：要么以可审查
  理由声明 `not_applicable`，要么按 fact family 分别声明 authority、`established_by`、verdict
  consumer、旧新 projection 的关系与两类验证坐标。新 family 只能在同一 change 的
  record 中登记，并在第一个受影响 target edit 前写入 global catalog；不允许 `other`
  或自由命名。`plan` mode 要求此类 addition 尚未在 catalog 中，`assets` mode 则要求
  它已经写入且与声明一致。proposal guidance 会先要求 change author 读取这个全局
  catalog 并创建该 record；它不是等到 archive 才发现的事后清单。
- 新增只读 Node/Zod checker 的 `plan` 与 `assets` mode。它检查结构、change identity、
  catalog/reference、坐标和验证资产，并给出 owner、最小修复坐标和同一 rerun command；
  它不从任意 JS 推断语义完整性、不执行测试、不写 runtime state，也不制造 PASS。
- 把 checker 接入支持的 OpenSpec lifecycle：能力接受后，每个 selected change 在首次
  target edit 前都必须通过 `plan` mode；有 feedback lifecycle 时，它在 plan review 后
  执行。governed archive finalizer 在现有 verification-routing assets check 后必须通过
  `assets` mode。
  缺少 feedback marker 的 change 不会得到另一条 archive success path：它必须先补齐
  既有的 review-marker tasks、回到 apply，再通过同一个 finalizer。
  本 change 的一次性 bootstrap 在建立自身 checker 前仍须先通过既有
  verification-routing plan check；它只可建立 catalog、checker 及其 focused tests，随后
  必须通过自身的 plan check 才能改动其余 target。这个过渡顺序只属于本 change 的 task
  list，不会成为已更新 apply entry 的“command 不存在”豁免。
- 将 semantic completeness 留在 change-scoped plan/closeout review，并更新
  `guidelines/change-feedback-loop.md` 使 reviewer 明确审查 affected record 的
  resolver、`established_by`、consumer、overlap 与 `not_applicable` 理由；review 发现漏项时，
  必须成为普通未完成 task，而不是把 checker 伪装成能理解完整 runtime 语义的 linter。
- 不在本 change 修复 BUG-212/213/214 的 runtime resolver 或 consumer；后续独立 change
  将以本机制记录并收敛那三个事实。CI、global raw-field linter、新 runtime Gate、
  runtime state、Agent controller 与一次性重构全部 13 家族均不在范围内。

## Capabilities

### New Capabilities

- `governance/semantic-fact-closure`: 定义 semantic fact catalog、每 change 的闭合记录、
  structural/referential checker、bootstrap 及其不替代语义 review 的边界。新 capability
  使用已检查且未占用的 requirement prefix `SEF`，并会在 apply 时按现有 traceability
  contract 登记。

### Modified Capabilities

- `governance/change-feedback-loop`: 将 semantic-closure plan check 纳入首次 target edit
  前的 lifecycle prerequisite，并将 semantic-closure assets check 纳入 governed archive
  finalizer 的 root-first mechanical closeout sequence。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `governance/change-feedback-loop` | Catalog row; `spec.md` 的 lifecycle guidance、finalizer 和 supported-entry requirements | Modify | 它拥有 apply/archive 的 delivery 与 finalizer prerequisite 行为；本 change 必须改变该闭合顺序，但不让它拥有新 YAML 的语义。 |
| `verification/verification-routing` | Catalog row; `spec.md` 的 per-change plan、plan/assets checker 与 bootstrap requirements | Verify-only | semantic closure 复用其 change-local artifact 和 two-mode checker 的治理形状，并遵守既有 verification plan；不改变 test-class taxonomy、plan schema 或 proof permission。 |
| `governance/requirement-traceability` | Catalog row; `spec.md` 的 capability discovery、prefix registry 和 archive governance requirements | Verify-only | 新 capability 的 `SEF` prefix、requirements 与 discovery record 必须按此既有 contract 登记；该 contract 本身不需要新行为。 |
| `governance/guidance-constitution` | Catalog row; `spec.md` 的 implementation-neutral admission 与 blocking-boundary requirements | Excluded | 本 change 是一个具体 lifecycle/checker mechanism，不是跨实现的宪章原则；它更新 `change-feedback-loop` 的 delivery prompt 以承接已修改的 lifecycle contract，但不改变 constitutional guidance authority。 |
| `research/research-wave-gate-implementation` | Catalog row; `spec.md` 的 producer-authority-checker-diagnostic-guard closure requirement | Excluded | 它是 BUG-212/213/214 后续 runtime remediation 的可能 owner；Change A 不改变任何 Wave gate 或 resolver 行为。 |
| `governance/semantic-fact-closure` | Catalog plus all inspected candidates above; no existing main spec owns the catalog, change-local closure record, and lifecycle checker contract together | New | 约束条件是“change 改动是否闭合一个可改变 legal outcome 的 Engine fact family”，与 review marker、verification route、registry organization 和 runtime Gate behavior 正交；它需要独立 schema/checker module。 |

## Boundary And Control Shape

这个新概念服务的读者是 change author 与 plan/closeout reviewer，回答的有界问题是：
“这次 change 是否影响一个能改变 Submit、Gate、handoff 或 Final-admission 结果的
deterministic fact；若影响，authority 与所有 verdict consumer 是否被明确收敛？”它必须
保留 `not_applicable` 与 `affected`、raw reader 与 semantic resolver、同一 family 的
consumer 与不同 family 的 consumer、以及 structural validity 与 semantic completeness
这些会改变结论的区别。读者正常读取 record 和 checker feedback 即可得到明确的
`not_applicable`、结构性 blocker 或需人工 review 的范围；无法从 record 判定的语义完整性
会明确停在 review，而不被假装成 Engine verdict。

直接 Source of Record 分别是 project catalog 对可引用 Harness runtime family 的目录事实、
change-local record 对当前 change 的声明事实、以及未来 Harness runtime resolver 对具体
family 的 runtime 结论。OpenSpec governance checker/finalizer 对 lifecycle eligibility 的
结构性 verdict 不属于这个 runtime catalog；它们仍由各自的治理 capability 决定。最短合法闭环是：
record -> read-only plan check -> Agent 修复记录或计划 ->
implementation/verification -> assets check -> archive。它复用现有 OpenSpec lifecycle 和
verification-routing 的双模式形状，避免新增 Gate、state、controller、global linter 或
另一套 schema authority。用户只在出现未定义的事实边界或新的语义选择时作决定；Agent
负责按 actionable feedback 作合法机械修复并重跑；Node checker 只裁决声明和资产的确定性
结构事实。

## Impact

- Apply 时的目标仅限 `openspec/governance/` 下的新 catalog/checker contract、
  `openspec/config.yaml`、`guidelines/change-feedback-loop.md`、由 finalizer 声明的
  `.agents` / `.claude` supported lifecycle entry surfaces、governed archive finalizer、
  requirement registry/catalog 以及 `tests/` 下的 governance proof assets。
- 当前 change 自身会创建 `semantic-closure.yaml`，以 `not_applicable` 说明它只建立
  change governance、未改变 catalog 中任何 runtime fact family；它仍会被 bootstrap 后的
  checker dogfood。
- 不修改 `DEEP_RESEARCH_HARNESS/`，因此不需要 Harness version bump。
