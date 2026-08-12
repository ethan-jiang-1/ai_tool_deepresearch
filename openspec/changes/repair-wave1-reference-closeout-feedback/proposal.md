## Why

Wave1 在已有 submitted backing、depth review、reference convergence 和 same-inspect
闭环的基础上，仍存在三个相互耦合的断点：phase guidance 在有效
`depth-review.yaml` 之前进入 convergence；缺失 review 的直接 root 被 synthetic
topic/count symptoms 掩盖；supplementary submitted row 的 review-sync 提示没有成为
public feedback 的主修复。结果是 Agent 无法沿既有 `inspect -> repair -> rerun` 路径
完成首次或补充 closeout。

本 change 落实
[`_backlog/plans/bug-220-224-wave-reference-closeout-remediation.md`](../../../_backlog/plans/bug-220-224-wave-reference-closeout-remediation.md)
的最小方案：修复一条既有 Wave1 回路，不为五张 backlog card 分别建立机制或 change。

## What Changes

- 修改 Wave1 phase contract：成功 submit 后，Phase Agent 先完成有效、只绑定已提交
  work-unit 的 `depth-review.yaml`，再读取 current Topic 的 reference-convergence
  inspect；之后严格消费 inspect 给出的 exact target，完成既有 materialization、index/seed
  sync，并重跑同一 inspect。
- 在既有 Wave1 convergence/evaluator/feedback 路径中实施已接受契约：unusable
  submitted-backing root 先于 synthetic null topic/profile guard；当 review 缺失时，
  inspect 与 Gate 只返回一个直接 depth-review root，不再并列派生的 topic-invalid 或
  count-floor symptom。
- 修复 supplementary review-sync 的现有路径：传入 canonical slug，只检查 current
  hash-valid submitted 且 `assignment_mode: supplementary` 的 rows；若它们未被 review，depth-review update 是
  `reference_floor_deficit` 的 primary repair。review 判断复用既有 submitted row 的
  accepted coordinate equivalence；primary-row omission 不进入该 signal，
  outcome/rule identity 不变。
- 补齐窄范围回归：BUG-220 的 missing-`finding_id` field feedback；当前 locator 的
  normalization/length behavior；Wave1 root precedence、inspect/Gate 一致性和 phase
  Markdown 顺序。locator 的 `48`/`12` 是实现常量，不进入 REF-011 或 Agent-facing
  filename contract。
- 澄清 Wave0 playbook：一个 update 可含多个 explicit entries；deferred form 的每个
  packet 只选择一个 contribution；多个 contribution 采用 sequential applies。此项不改变
  schema、slot uniqueness 或 transaction semantics。
- 不新增 state、queue、Gate、controller、locator CLI、retry tree、batching schema、
  duplicate validator 或新的 evidence authority。Harness behavior 改动需要版本升至
  `v0.89`，apply 时更新 `CHANGELOG.md` 与 `DEEP_RESEARCH_HARNESS/RUN.md`。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `research/research-wave-phase-content`: modify RWP-015 so a valid
  Phase-owned Wave1 depth review is an explicit prerequisite to consuming the
  existing post-submit reference-convergence loop.

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `research/research-wave-phase-content` | `openspec/specs/research/research-wave-phase-content/spec.md` (RWP-015) and `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave1.md` | Modify | The accepted phase requirement currently directs convergence immediately after submit. This change makes its existing depth-review prerequisite and same-inspect closeout order explicit. |
| `research/wave1-intake` | `openspec/specs/research/wave1-intake/spec.md` (WAI-005, WAI-009, WAI-010) | Verify-only | It already requires unusable submitted authority to short-circuit first, missing reviewed rows to mask derived symptoms, supplementary review synchronization, and inspect-provided materialization targets. |
| `research/research-wave-gate-implementation` | `openspec/specs/research/research-wave-gate-implementation/spec.md` (RWG-017, RWG-021) | Verify-only | The change repairs the existing evaluator/feedback implementation to meet its accepted convergence and formal-Gate behavior; no new Gate rule or outcome is introduced. |
| `engine/cli-inspect-output-conventions` | `openspec/specs/engine/cli-inspect-output-conventions/spec.md` | Verify-only | Existing parent-before-dependent diagnostic behavior covers the direct missing-review root; the change adds no inspect output vocabulary or command. |
| `bundle/reference-flat-format` | `openspec/specs/bundle/reference-flat-format/spec.md` (REF-011) | Verify-only | REF-011 already owns normalized URL, safe token, and stable digest. Literal locator truncation/digest lengths remain implementation details. |
| `research/canonical-topic-state` | `openspec/specs/research/canonical-topic-state/spec.md` and `DEEP_RESEARCH_HARNESS/command_playbook/operate-topic-state.md` | Verify-only | BUG-220 is a regression-only closeout, and BUG-224 only clarifies the accepted single-contribution deferred grammar without changing packet behavior. |
| `verification/verification-routing` | `openspec/specs/verification/verification-routing/spec.md` and selected existing unit/integration assets | Verify-only | The change selects existing test classes and adds focused deterministic evidence; it creates no proof route or test taxonomy. |
| `governance/version-management` | `openspec/specs/governance/version-management/spec.md`, `CHANGELOG.md`, and `DEEP_RESEARCH_HARNESS/RUN.md` | Verify-only | Existing release policy owns the required `v0.89` update; it is not a new versioning behavior. |

## Impact

- Affected implementation: the existing Wave1 submitted-backing/convergence resolver
  and its public feedback projection; no new command or persistent data shape.
- Affected guidance: `phase-wave1.md` for the prerequisite order and
  `operate-topic-state.md` for one Wave0 grammar clarification.
- Direct Sources of Record remain submitted work-unit rows, the Phase-owned
  `depth-review.yaml#reviewed_work_unit_refs`, canonical reference/index facts,
  and the current convergence evaluator. The change does not make a reference,
  index, Seed Topic, or playbook a new evidence authority.
- Semantic precision: the Phase Agent receives one bounded question after
  submit: first complete a valid review, then consume the exact convergence
  repair; it need not reconstruct locator bytes or infer a competing repair.
- Simple control: `submit -> valid review -> inspect -> exact repair -> same
  inspect` reconnects the shortest legal loop. It removes competing feedback
  rather than adding a controller, retry path, queue, or state.
- Responsibility: the Engine preserves deterministic root precedence and
  feedback; the Phase Agent performs existing authorized review/materialization
  work; the user supplies neither an ordinary command nor a new permission.
