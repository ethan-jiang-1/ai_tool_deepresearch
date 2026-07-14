# Check & Inspect Feedback Loop
> req: CHI-001, CHI-002, CHI-003

## Purpose

Check 硬性验证 + Inspect 诊断 + 反馈 → 纠正闭环。LLM-JS C&I 协作原则的实现。
## Requirements
### Requirement: Check validates state with Zod schema before accepting output
Every state mutation SHALL be validated with a Zod schema before being persisted. Invalid output is rejected.

#### Scenario: Valid state passes Check
- **WHEN** state is validated against its Zod schema and all fields match
- **THEN** Check returns `{ ok: true }` and the state is accepted

#### Scenario: Invalid state fails Check
- **WHEN** state has a required field missing or an invalid enum value
- **THEN** Check returns `{ ok: false, error: "..." }` and the state is NOT persisted

### Requirement: Inspect diagnoses Check failures and generates feedback

When Inspect reports multiple failures from the same checkpoint, it SHALL distinguish independent root causes from downstream symptoms whenever the Engine can determine the direct dependency. Root-cause diagnostics SHALL appear before symptom diagnostics in the Agent-facing feedback surface.

A prerequisite failure SHALL short-circuit dependent checks in primary feedback when those checks cannot produce an independent repair action. Primary `inspect[]` and `advice[]` SHALL present the smallest actionable root-cause set and one nearest repair target per root cause. Independent root causes MAY remain side by side.

Complete post-mortem detail MAY be preserved by an existing formal durable diagnostic path, but SHALL NOT be repeated as a large flat wall of derivative failures in primary feedback. A side-effect-free inspect command SHALL keep such detail in memory/stdout only and SHALL NOT create a durable artifact for the sake of completeness.

Advice SHALL avoid manual edits to deterministic authority files when a valid Engine path is required. It SHALL not encode a presentation preference as blocking when direct structured authority already proves the required fact, and SHALL direct repair back to the same visible inspect/checkpoint whenever possible.

#### Scenario: Root cause is listed before symptoms

- **WHEN** a cache coverage failure causes downstream provenance coverage symptoms
- **THEN** Inspect SHALL present cache coverage as the root cause first
- **AND** any retained downstream detail SHALL identify or remain grouped under that upstream cause

#### Scenario: Root cause short-circuits non-actionable symptoms

- **WHEN** a missing or unparseable parent artifact makes downstream provenance, enum, eligibility, handoff, or backing checks non-actionable
- **THEN** Inspect SHALL present the parent artifact failure as the primary root cause
- **AND** dependent checks SHALL be masked, omitted, or grouped outside the primary repair list

#### Scenario: Advice stays actionable

- **WHEN** a checkpoint detects several related and independent failures
- **THEN** advice SHALL group related symptoms and provide one nearest repair target for each independent root cause
- **AND** advice SHALL NOT contain conflicting manual repair instructions for authority files

#### Scenario: Presentation preference does not obscure authority

- **WHEN** a Markdown presentation difference is semantically equivalent and direct structured authority is valid
- **THEN** Inspect SHALL accept it or report advisory feedback
- **AND** the presentation difference SHALL NOT displace or contradict the direct authority result

### Requirement: Feedback drives reflection and correction

The diagnostic from Inspect or a formal Gate SHALL be returned to the active Markdown Controller or LLM as structured feedback. Every formal Gate Controller SHALL inspect top-level `hints[]`, including `repair_kind`, before using compatible `inspect[]` or `advice[]` prose. A hint SHALL remain a read-only projection of the Engine's direct finding; it SHALL NOT create permission, state authority, a new route, or an automatic mutation.

When a primary hint has `repair_kind: agent_action|engine_operation`, names an authorized mutable surface or existing legal Engine operation, and requires no new semantic/risk decision, the Agent SHALL perform that mechanical action and rerun the exact checkpoint named by `rerun`. The Controller SHALL NOT ask the user to execute ordinary pipeline commands or reconstruct `repair_kind`/`write_to` from error text, `rule.target`, or source inspection.

When `repair_kind` is `user_decision`, `external_action`, or `missing_contract`, the Controller SHALL surface only that smallest semantic/risk/permission decision, non-delegable action, or unavailable capability boundary. After the decision or external prerequisite is satisfied, legal mechanical execution SHALL return to the Agent. Corrected state SHALL re-enter the same Check/Gate unless an accepted contract explicitly names another checkpoint.

#### Scenario: Controller executes an authorized Gate repair

- **WHEN** a formal Gate fails with one hint whose `repair_kind` is `agent_action` or `engine_operation` and whose `write_to` names the corresponding authorized surface or operation
- **THEN** the active Markdown Controller SHALL have the Agent perform that repair and invoke the exact `rerun` command
- **AND** it SHALL NOT ask the user to run the command or infer a different repair path from generic advice

#### Scenario: User receives only the semantic decision boundary

- **WHEN** a Gate hint has `repair_kind: user_decision` and identifies a missing recorded human decision rather than a mechanical artifact repair
- **THEN** the Controller SHALL ask only for that decision
- **AND** after the decision is recorded, the Agent SHALL resume the legal Gate workflow

#### Scenario: Hint consumption does not create authority

- **WHEN** a hint has `repair_kind: engine_operation` and names a status, trace, ledger, receipt, hash or queue blocker
- **THEN** the Controller SHALL invoke the accepted Engine-owned operation or report `missing_contract`
- **AND** it SHALL NOT directly edit deterministic authority because the hint exists

#### Scenario: Feedback loop corrects and passes
- **WHEN** Check fails, Inspect generates diagnostic, and repair uses it to fix state
- **THEN** the corrected state passes Check on re-validation

### Requirement: C&I 反馈环 fork 变体 (CHI-002)
fork 变体的 Check & Inspect 反馈环 SHALL 在 fork 版 WorkflowState (含 `topicReadiness` 多维字段) 上运行: Check 用 Zod `safeParse` 校验含 topicReadiness 的约束; 失败时 Inspect 将 ZodError 转为结构化诊断 `{ field, issue, code, fix }`, 反馈给 repair, 修正后重回 Check。多维护度重叠时按优先级 `blocked > fail_b > fail_a > pass` 确定分支。

#### Scenario: topicReadiness 无效触发 Check 失败
- **WHEN** fork 版 state 的 `topicReadiness` 不满足 Zod 约束 (如多维护度重叠未按优先级确定)
- **THEN** Check 返回 `{ ok: false }`, state 不被持久化

#### Scenario: Inspect 结构化诊断并反馈修复
- **WHEN** Check 因 topicReadiness 校验失败
- **THEN** Inspect 生成诊断 `{ field: "topicReadiness", issue, code, fix }`, repair 据此修正后 state 重回 Check 并 PASS

### Requirement: Recovery advice SHALL identify one reachable nearest legal action

For each independent root finding, formal Gate and inspect feedback SHALL expose one reachable nearest action through explicit `repair_kind`, `missing_fact`, exact next-action coordinate `write_to`, and exact `rerun`. Existing transition, handoff, status-window, owner and command-contract helpers SHALL determine whether an Engine operation is currently legal. Feedback SHALL NOT recommend a predecessor, entry, recovery, replacement or mutation command that those same preconditions would reject.

If no sanctioned runtime operation can repair the direct fact, `write_to` SHALL identify the `missing_contract` or external non-delegable boundary instead of offering speculative alternatives. `inspect[]` and `advice[]` MAY retain bounded context but SHALL NOT add competing repair branches for the same root. Legacy Gate `failure_message` MAY remain stored for definition-file compatibility or durable detail, but the Controller/projector SHALL NOT project it as an action source when a definition-owned or checker-owned structured repair contract exists. This requirement SHALL NOT create a prose-consistency Gate, exhaustive message rewrite, generic repair CLI, persisted repair plan or Engine-selected semantic strategy.

#### Scenario: Reachable same-check action is returned

- **WHEN** current direct facts prove one existing repair operation is legal
- **THEN** the primary hint SHALL name that operation in `write_to` and the same checkpoint in `rerun`
- **AND** no competing action SHALL be rendered for that root

#### Scenario: Missing capability is explicit

- **WHEN** an actually submitted legacy declaration cannot be reconstructed to its recorded hash and no accepted replacement/rebind operation exists
- **THEN** feedback SHALL expose `missing_contract` as the sole repair boundary
- **AND** it SHALL NOT present manual ledger construction, external backup copying or a new attempt as an accepted action

#### Scenario: Reachable repair action is recommended

- **WHEN** a deterministic same-check repair action satisfies its current preconditions
- **THEN** primary advice for that root finding SHALL identify the action as its nearest legal action
- **AND** it SHALL not include competing recovery routes for the same root

#### Scenario: Circular predecessor advice is suppressed

- **WHEN** a proposed predecessor gate or phase-entry command would be rejected by the current handoff/status preflight
- **THEN** advice SHALL not render that command as an available repair
- **AND** it SHALL report the direct missing runtime contract or blocking boundary

#### Scenario: Semantic repair remains Agent-owned

- **WHEN** the Engine can identify a blocker but cannot deterministically select the semantic correction
- **THEN** it SHALL report the blocker and affected surface
- **AND** it SHALL NOT invent a multi-step semantic recovery plan
