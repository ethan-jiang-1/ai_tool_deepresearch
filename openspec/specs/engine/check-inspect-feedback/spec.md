# Check & Inspect Feedback Loop
> req: CHI-001, CHI-002, CHI-003, CHI-004, CHI-005

> delta-synced: make-work-unit-attempt-recovery-explicit (CHI-004)

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

`repair_kind` SHALL determine action responsibility, not interaction timing. The three non-mechanical kinds SHALL retain distinct modalities rather than being collapsed into one generic escalation:

- `user_decision` identifies the smallest semantic/risk/permission decision. HITL1 or HITL2 MAY ask only for that decision and wait for it when the current accepted HITL boundary owns it;
- `external_action` identifies only the genuinely non-delegable external prerequisite. HITL1 or HITL2 MAY request that action when the current accepted HITL boundary permits it, and legal mechanics SHALL return to the Agent after the prerequisite is satisfied; and
- `missing_contract` states the exact unavailable capability or owner boundary. It SHALL NOT be phrased as a user decision, approval or acknowledgement request, and the Controller SHALL NOT wait for a user response as though one could satisfy the absent contract.

HITL1 and HITL2 SHALL remain the only lifecycle surfaces that authorize those framework-initiated requests and waits. During a non-terminal `stop: no` phase, any of the three hints SHALL remain the smallest honest Agent-facing boundary but SHALL NOT by itself authorize a question, approval request, status/progress/partial-delivery output, or waiting for user acknowledgement; the Agent SHALL continue any other legal same-check repair, degradation or handoff, or hold silently at the current checkpoint.

To keep one feedback truth usable at every lifecycle placement, Inspect/Gate producer-supplied `repair` and action-bearing `advice[]` for those three kinds SHALL identify the smallest boundary and its existing owner or unavailable contract, but SHALL NOT command immediate user contact, HITL reentry, approval, surfacing, or acknowledgement wait. The structured `rerun` coordinate remains the single exact checkpoint instruction; compatibility prose SHALL NOT duplicate a competing command or contradict it. The producer SHALL NOT suppress or relabel a direct finding merely to obtain a different interaction placement, and SHALL NOT inspect conversation state to choose wording. If direct facts and an accepted contract instead show that the producer assigned the wrong action owner, it SHALL correct the finding to the existing mechanical owner rather than preserve a false human escalation.

When a relevant user-initiated normal conversation turn is already current, the Agent SHALL answer from direct facts and, if the requested action reaches an unavailable path, state only that boundary. The answer SHALL NOT create decision, permission, mutation/reentry, pause, or routing authority. After a decision or external prerequisite is satisfied through an accepted surface, legal mechanical execution SHALL return to the Agent. Corrected state SHALL re-enter the same Check/Gate unless an accepted contract explicitly names another checkpoint.

#### Scenario: Controller executes an authorized Gate repair

- **WHEN** a formal Gate fails with one hint whose `repair_kind` is `agent_action` or `engine_operation` and whose `write_to` names the corresponding authorized surface or operation
- **THEN** the active Markdown Controller SHALL have the Agent perform that repair and invoke the exact `rerun` command
- **AND** it SHALL NOT ask the user to run the command or infer a different repair path from generic advice

#### Scenario: User receives only the semantic decision boundary

- **WHEN** a HITL1 or HITL2 Gate hint has `repair_kind: user_decision` and identifies a missing recorded human decision rather than a mechanical artifact repair
- **THEN** the Controller SHALL ask only for that decision
- **AND** after the decision is recorded, the Agent SHALL resume the legal Gate workflow

#### Scenario: Missing contract is stated rather than asked

- **WHEN** a HITL1 or HITL2 Gate hint has `repair_kind: missing_contract`
- **THEN** the Controller SHALL state the exact unavailable capability or owner boundary
- **AND** it SHALL NOT ask the user to approve, acknowledge or confirm the missing capability as though a response could create it
- **AND** it SHALL NOT wait for acknowledgement before preserving that boundary

#### Scenario: Stop:no feedback does not initiate interaction

- **WHEN** a non-terminal `stop: no` Gate or Inspect result has `repair_kind: user_decision`, `external_action`, or `missing_contract`
- **THEN** the Controller SHALL retain the smallest boundary in Agent-facing feedback without initiating a user question, approval request, status output, or acknowledgement wait from that hint alone
- **AND** a relevant user-initiated normal conversation turn SHALL be answered from direct facts and, if it reaches an unavailable path, only the smallest boundary, without changing current checkpoint or lifecycle authority

#### Scenario: Hint consumption does not create authority

- **WHEN** a hint has `repair_kind: engine_operation` and names a status, trace, ledger, receipt, hash or queue blocker
- **THEN** the Controller SHALL invoke the accepted Engine-owned operation or report `missing_contract`
- **AND** it SHALL NOT directly edit deterministic authority because the hint exists

#### Scenario: Existing mechanical owner is not escalated as a new decision

- **WHEN** a finding reports a missing derived value whose semantic input is already recorded and whose accepted Engine operation can regenerate it
- **THEN** the producer SHALL identify that existing operation as `engine_operation`
- **AND** it SHALL NOT preserve or invent `user_decision` solely because the failure occurs in a later phase

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

### Requirement: Attempt recovery feedback SHALL expose one ownership-safe legal action

For attempt-owned feedback, public work-unit commands, inspect, and Gate projections SHALL distinguish
`busy`, active logical-owner mismatch, stale existing attempt binding, submit-owned integrity failure,
suspect transaction, supersession eligibility, and submitted historical coverage with an immutable relation.
Each independent primary root SHALL identify the direct fact, authoritative owner, one exact legal operation
or honest `missing_contract`, and the same checkpoint to rerun. A structured busy outcome is legal only for
a schema-valid global lock-owner record paired with its readable non-suspect `work-unit.transaction.v2`
journal. It SHALL expose the holder disposition and identify
the caller's requested operation/work ID separately from the holder transaction's ID, operation, and target
work/queue coordinates, state whether the holder targets the same attempt, and direct wait plus the caller's
same-operation rerun. It SHALL not label the candidate invalid or present timeout, re-claim, queue
reactivation, manual hash editing, or parallel replacement as competing actions. Logical-owner and busy
feedback SHALL not claim physical actor identity, process death, progress, or liveness.

Where an attributable missing ledger row is exactly recoverable, feedback SHALL name only
`recover-declaration` and the same checkpoint. Otherwise, where direct post-submit integrity drift and intact
parent authority make supersession legal, feedback SHALL name `supersede`; only its successful result SHALL
then name the successor's ordinary actor-observed claim/submit path or its unique legal current lineage leaf.
Index/status/terminal-queue drift,
duplicate or unattributable ledger corruption, and malformed supersession relations SHALL return
`missing_contract`, not a guessed successor. Where no drift makes correction legal, feedback SHALL name the
semantic/supplementary boundary rather than promising a mutable submitted row. The Engine
selects only deterministic legal operations; the Agent decides semantic content and executes the existing
mechanical operation; the user is asked only for a genuinely new semantic/risk decision.

When a lock/journal is unpaired, unreadable, target-mismatched, proof-incomplete, legacy, or `suspect`,
feedback SHALL return `suspect_transaction`, not `busy`. It SHALL name
`operate-work-unit recover-transaction <bundle> --tx-id <id>` only when no global lock is held and the named
v2 journal's complete exact-path before-image manifest can establish that no durable mutation remains;
otherwise its one action is `missing_contract`. Age SHALL not reclassify a pair as stale or dead.
`timeout-preflight` SHALL use the same root: any valid non-suspect v2 global holder blocks the current timeout
mutation, a `started` holder targeting the checked work ID additionally blocks both default and forced
terminalization as same-attempt integrity, and a suspect transaction receives no wait, force-timeout,
lock-deletion, or cleanup advice.

#### Scenario: contention feedback preserves the current attempt

- **WHEN** a formal submit receives global transaction-lock contention with a schema-valid lock owner and
  matching readable non-suspect v2 journal, whether or not a `started` holder targets the same work ID
- **THEN** feedback SHALL identify `busy` as the primary root and direct the same submit operation to rerun
  after wait
- **AND** it SHALL identify caller and holder coordinates separately
- **AND** it SHALL not direct the Agent to alter the candidate, terminalize the attempt, claim another item,
  or ask the user to run a command

#### Scenario: suspect transaction has no fictional wait path

- **WHEN** inspect, submit preflight, or timeout-preflight finds an unpaired, unreadable, target-mismatched,
  proof-incomplete, legacy, or `suspect` lock/journal
- **THEN** feedback SHALL identify `suspect_transaction` as the primary root
- **AND** it SHALL name only the exact `recover-transaction` operation when a v2 `started`/`suspect` journal is
  unlocked and its complete before-image proof can be compared, otherwise `missing_contract`
- **AND** it SHALL not recommend waiting, forced timeout, a manual deletion, or a generic cleanup command

#### Scenario: submitted drift exposes one correction boundary

- **WHEN** inspect finds supersession-eligible direct post-submit drift for a current submitted attempt whose
  index/status/terminal-queue authority remains exact and whose missing declaration is not exactly recoverable
- **THEN** feedback SHALL name the drifted surfaces and the audited supersede operation as the sole current
  correction path
- **AND** it SHALL not advise hand-editing ledger, index, queue, transaction, or hash authority

#### Scenario: exact declaration recovery precedes supersession

- **WHEN** a submitted attempt is missing its ledger row and the existing declaration-recovery evaluator can
  reproduce the accepted row exactly
- **THEN** feedback SHALL name only `recover-declaration` and the same inspect/Gate rerun
- **AND** it SHALL not offer `supersede` as a parallel action

#### Scenario: a same-attempt active transaction cannot be force-timed-out

- **WHEN** timeout-preflight finds a valid active v2 `started` journal whose target set contains the checked work ID
- **THEN** feedback SHALL identify the same-attempt transaction fact and same timeout-preflight rerun
- **AND** it SHALL not offer default timeout, forced timeout, journal recovery, or lock deletion

### Requirement: Generic parse/validation failures SHALL name the exact contract fact

When a deterministic parse, validation, schema, or evaluator step fails for a
reason the Agent cannot directly read from the message alone (for example a
generic "YAML parse failed", "Value violates a declared cross-field constraint",
or "wave2_finding_not_current"), the Engine feedback SHALL name the exact
missing or offending contract fact — the specific key, value, field, enum, or
format rule — together with its authori
