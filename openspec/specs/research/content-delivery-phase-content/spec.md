# Content Delivery Phase Content

> req: CDP-001, CDP-002, CDP-003, CDP-004, CDP-005, CDP-006

## Purpose

Define the complete 9-section phase body content for the three content-delivery lifecycle phases: HITL2 (`phase-hitl2.md`), readiness (`phase-readiness.md`), and final (`phase-final.md`). Each phase SHALL follow the standard phase node structure with correct frontmatter contracts and deterministic boundaries.
## Requirements
### Requirement: Phase HITL2 body completeness

`phase-hitl2.md` SHALL contain a complete 9-section body following the
standard phase node structure. The node SHALL declare `phase: hitl2`, `gate:
hitl2-recorded`, and `stop: "yes"`. Routing SHALL come from
`transitions.chain.json` and the HITL2 gate result rather than a second
frontmatter `next` authority.

The phase SHALL produce a decision brief that reviews what the research can
answer, open questions, limitations or disputes, and one Agent-recommended
next action with its reason and expected effect. When that action would rerun
research or otherwise materially increase effort/cost, the brief SHALL disclose
the foreseeable material impact from current direct facts without adding an
estimator or state field. User acceptance after that disclosure SHALL count as
confirmation of the disclosed impact; only an actual expansion beyond the
disclosure/current permission requires another minimum question. The
recommendation SHALL be advice for the user's semantic decision; it SHALL NOT
become a decision authority or be recorded as the user's choice without real
user input.

Before the brief presents rerun as executable or the Agent records a clear
rerun request, `phase-hitl2.md` SHALL own one repo-root read-only inline Node
ESM invocation importing existing `loadGateDefinition('rerun-ready')`, the
profile reader and one shared pure rerun-availability evaluator from the Engine
helper barrel. It SHALL output only the evaluator's closed availability facts
without writing files, trace, or state; `brief/hitl2.md` SHALL consume the
phase-derived result rather than duplicate the invocation. The Agent SHALL NOT
raw-parse the definition, interpret `failure_message`, reimplement rule/count
comparison in Markdown, or invent a wrapper/CLI. The phase SHALL pass the
loader-parsed definition and full parsed profile to the REI-003 evaluator with
`includeNextIncrement: true` and consume only its closed result. It SHALL NOT
optional-chain a count before evaluation or duplicate rule/profile/count
interpretation. HITL2 SHALL present/record rerun as executable only for
`supported: true, available: true`; a supported unavailable result exposes only
the new-bundle decision, while unsupported loader/profile/config facts expose
only their concrete contract boundary. Formal Gate authority remains unchanged,
no concrete numeric limit or persisted eligibility SHALL be added, and
post-final consumer stages remain owned by POF-001/POF-003.

The phase SHALL let the user accept or reject that recommendation, ask
questions, use an optional shortcut, or express a different desired outcome in
natural language. Only while HITL2 is the accepted current `stop: yes`
decision boundary SHALL the Agent map clear user intent to the existing
structured decision contract in `rb_profile.yaml#/human_decision_checkpoints/hitl2`.
This mapping SHALL NOT authorize an ordinary voluntary message from a non-HITL
`stop: no` phase to be persisted as a HITL2 decision, mutate run state, select
a route, or create permission.

The allowed decision enum values SHALL remain: `proceed_to_readiness`,
`request_view_revision`, `repair`, `rerun`, `stop_blocked`. A clear
natural-language or shortcut decision SHALL itself count as confirmation. The
phase SHALL NOT impose a blanket second confirmation before recording one of
the five accepted decisions. The Agent SHALL ask only the smallest question
needed to resolve substantive ambiguity, real cost/permission expansion, or
irreversible risk. After the decision is recorded, ordinary Gate, repair,
handoff, status synchronization, and continuation mechanics SHALL return to
the Agent.

When the user selects the existing legal `rerun` decision and supplies a new
or revised research focus, the existing rationale SHALL record two visibly
labelled narrative parts: the user's focus wording verbatim and the Agent's
concise current interpretation. The Agent SHALL let the user correct the
interpretation in the same HITL2 loop before it records the decision. This
free text remains existing rationale guidance only; it SHALL NOT add a focus
enum, profile field, Topic field, Gate input, source quota, separate route, or
third checkpoint. An ordinary rerun with no focus remains compatible with the
existing rationale form.

The phase SHALL record the existing `hitl2_recorded` trace event. This event
is diagnostic/audit evidence of the Phase Agent's recording action; it SHALL
NOT become a second blocking substitute for the profile decision fields or the
gate CLI's own `gate_attempt` event.

After gate pass, the Agent SHALL read `user_decision` from `rb_profile.yaml`
and act accordingly:

- `proceed_to_readiness`: the gate CLI SHALL use the deterministic `passed`
  outcome; the Agent SHALL consume `check.next` for `phases/phase-readiness.md`
  through the accepted handoff path.
- `rerun`: the gate CLI SHALL use the deterministic `rerun` outcome; the
  Agent SHALL consume `check.next` for `phases/phase-rerun.md` through the
  accepted handoff path.
- `request_view_revision`: the Agent SHALL use the recorded rationale and
  current bundle state to determine the affected phase when an existing legal
  path supports it; this context-dependent action SHALL NOT default to
  readiness or gain a fixed chain entry.
- `repair`: when an existing legal repair path supports the requested
  correction, the Agent SHALL use the recorded rationale to repair the current
  run and rerun the HITL2 gate; it SHALL NOT restart from instantiation merely
  because the user chose repair.
- `stop_blocked`: when existing accepted stop behavior is legal at the current
  position, the Agent SHALL use it to terminate the lifecycle and preserve the
  reason.

For any context-dependent action without a legal path at the current position,
the Agent SHALL preserve the user's stated semantics where the existing owner
permits, report the smallest missing capability/path boundary, and SHALL NOT
claim success, recommend the action as immediately executable, invent a route,
default to readiness, or hand-write deterministic status.

`Human-directed` in this phase SHALL identify the source of the semantic
decision. It SHALL NOT transfer ordinary command execution to the user or
create permission by itself: after the decision is recorded, the Agent executes
the remaining mechanical actions allowed by current host permission and
accepted Engine paths. The Agent SHALL NOT invent a route, mutate deterministic
authority by hand, or claim that the decision itself creates an unavailable
override/reentry capability. `transitions.chain.json` SHALL encode only the
existing fixed outcomes: `passed` to `phases/phase-readiness.md` and `rerun` to
`phases/phase-rerun.md`; `request_view_revision`, `repair`, and `stop_blocked`
remain Agent-level decisions without fixed chain entries.

#### Scenario: HITL2 frontmatter contract
- **WHEN** `phase-hitl2.md` is loaded
- **THEN** its frontmatter SHALL contain `node_type: phase`, `id: phase-hitl2`, `phase: hitl2`, `gate: hitl2-recorded`, `stop: "yes"`
- **AND** `requires` SHALL include at least `shared/shared-profile`
- **AND** the phase SHALL NOT establish a competing frontmatter routing authority

#### Scenario: HITL2 decision brief production
- **WHEN** Agent executes the HITL2 phase
- **THEN** Agent SHALL produce `artifacts/hitl2/decision-brief.md` with a research review, exactly one current recommendation, its reason, and expected effect
- **AND** if the recommendation materially increases effort/cost, the brief SHALL disclose that foreseeable impact
- **AND** the brief SHALL present the five accepted actions as optional user-facing affordances rather than requiring internal enum knowledge

#### Scenario: HITL2 rerun records labelled focus rationale
- **WHEN** the user clearly asks to continue research for a stated Topic and
  provides a new or revised focus while rerun availability is supported and available
- **THEN** Agent SHALL record the existing `rerun` decision and a rationale
  containing the user's wording verbatim plus separately labelled current interpretation
- **AND** the Agent SHALL allow correction before recording and SHALL NOT ask a blanket second confirmation
- **AND** the existing Gate/handoff uses `check.next: phases/phase-rerun.md`

#### Scenario: HITL2 user decision recorded to profile
- **WHEN** the user provides a clear natural-language or shortcut decision while HITL2 is the accepted current decision boundary
- **THEN** Agent SHALL map the intent and write the decision to `rb_profile.yaml` under `human_decision_checkpoints.hitl2`
- **AND** the `status` field SHALL be set to `recorded`
- **AND** the `user_decision` field SHALL be one of the five accepted enum values
- **AND** the decision SHALL NOT remain only in chat memory
- **AND** the Agent SHALL NOT ask for a second confirmation of the same clear decision

#### Scenario: HITL2 stop behavior
- **WHEN** Agent reaches the stop point after producing the decision brief
- **THEN** Agent SHALL pause and wait for the user's semantic decision
- **AND** Agent SHALL NOT advance past the gate without a real user decision
- **AND** once a clear decision is recorded, Agent SHALL resume the legal mechanical path without another blanket wait

#### Scenario: Ambiguous HITL2 intent gets one minimum clarification
- **WHEN** the user says “再处理一下” and current context cannot distinguish `repair` from `rerun`
- **THEN** the Agent SHALL ask only the minimum question needed to distinguish the two semantics
- **AND** after clarification the Agent SHALL record the decision and execute the remaining legal path itself
- **AND** the clarification SHALL NOT become a general second-confirmation rule

#### Scenario: Human repair decision returns execution to the Agent
- **WHEN** the user clearly requests correction of a current research problem, the Agent maps it to `repair`, the decision is recorded, and an existing legal repair path supports the request
- **THEN** the Agent SHALL perform the remaining legal repair actions described by the rationale and rerun the HITL2 gate
- **AND** it SHALL NOT instruct the user to become the ordinary command runner or restart from instantiation solely because repair was selected

#### Scenario: HITL2 rerun follows deterministic rerun handoff
- **WHEN** the user clearly asks to continue researching a stated direction,
  the Agent maps it to `rerun`, the decision is recorded, and the HITL2 gate passes
- **AND** the shared `includeNextIncrement: true` rerun-availability result is supported and available
- **THEN** the gate result SHALL use the `rerun` outcome
- **AND** `check.next` SHALL be `phases/phase-rerun.md`
- **AND** the Agent SHALL consume that target through the accepted handoff path
- **AND** it SHALL NOT default the decision to readiness or require a second confirmation unless the concrete operation crosses a new real cost, permission, or irreversible-risk boundary

#### Scenario: HITL2 does not accept a known-impossible rerun
- **WHEN** the shared availability result is supported but the required next increment is unavailable
- **THEN** the decision brief SHALL NOT recommend or first record rerun as a current-bundle action
- **AND** HITL2 SHALL ask only whether to start a new bundle for the requested scope
- **AND** unsupported input SHALL expose its direct contract boundary without a new-bundle guess or copied numeric limit

#### Scenario: HITL2 proceed_to_readiness follows chain
- **WHEN** user clearly says the research is sufficient or accepts the proceed recommendation, the Agent records `proceed_to_readiness`, and the HITL2 gate passes
- **THEN** the gate result SHALL use the `passed` outcome and `check.next: phases/phase-readiness.md`
- **AND** the Agent SHALL advance through the accepted handoff path without asking the user to approve ordinary readiness/Final commands

#### Scenario: Context-dependent decisions do not gain fixed handoffs
- **WHEN** the recorded decision is `request_view_revision`, `repair`, or `stop_blocked`
- **THEN** the HITL2 gate SHALL NOT default `check.next` to readiness
- **AND** the Agent SHALL follow the decision-specific accepted behavior without inventing a chain edge

#### Scenario: Context-dependent decision without a path stays honest
- **WHEN** `request_view_revision`, `repair`, or `stop_blocked` is recorded but current direct facts expose no legal path for the requested action
- **THEN** while the accepted HITL2 interaction is current, the Agent SHALL report the smallest missing capability/path boundary
- **AND** it SHALL NOT claim completion, default to readiness, invent a chain edge, or hand-write status authority
- **AND** the decision brief SHALL NOT recommend that known-unavailable action as immediately executable

#### Scenario: Recommendation never substitutes for the user decision
- **WHEN** the decision brief recommends one action but the user chooses another accepted action
- **THEN** the Agent SHALL record the user's action rather than the recommendation
- **AND** Engine verdict and route SHALL derive from the recorded accepted decision and existing contracts

#### Scenario: Non-HITL message is not persisted as a HITL2 decision
- **WHEN** the user voluntarily sends a message while the accepted current node is a non-HITL `stop: no` phase
- **THEN** CDP-001 SHALL NOT authorize writing `human_decision_checkpoints.hitl2`, changing deterministic state, or selecting a HITL2 route from that message alone
- **AND** the message SHALL NOT create a third HITL checkpoint, pause state, permission, or mutation authority

When delivery is recommended or intended, the HITL2 phase SHALL add a compact
Chinese-language composition recommendation for reader/familiarity, intended
use, primary focus, selected report view, foreground/compress priorities,
language, length, evidence exposure, and appendix posture. It SHALL present
reader-facing meaning, not a schema questionnaire or enum form. The Phase Agent
SHALL resolve the candidate from current explicit correction, accepted HITL1
purpose/control, root must-answer shape, transparent selected-view defaults,
then disclosed system defaults.

Only a material ambiguity frontier may interrupt delivery: currently independent
questions may be grouped into one message of at most three questions, while
dependent questions wait. Clear acceptance, correction, or delegation completes
the semantic decision. The Agent SHALL write the resolved values to the durable
profile owner, update the decision brief's candidate projection to the accepted
projection, and run the existing HITL2 Gate without a blanket second
confirmation. An unresolved candidate SHALL stay `pending_user`, SHALL NOT
write `proceed_to_readiness`, and SHALL NOT attempt a passed handoff.

A correction while pending updates that candidate and SHALL NOT silently become
the context-dependent `request_view_revision` branch unless the user explicitly
chooses to defer delivery. For `custom`, a non-empty accepted
`view_instructions` covering intended organization or focus is required; Final
SHALL never reconstruct custom semantics from slug, rationale, or chat. The
phase SHALL preserve every existing decision enum and rerun, repair, stop, Gate,
status, and route semantic, and SHALL not treat rationale, raw chat,
`custom_slug`, or decision brief as a composition machine owner.

#### Scenario: Complete composition recommendation is accepted without a second confirmation

- **WHEN** HITL2 displays a complete composition recommendation and the user
  says “按这个交付” or an equivalent clear delegation
- **THEN** the Agent SHALL write the resolved handoff, record
  `proceed_to_readiness`, and run the existing Gate
- **AND** it SHALL not ask a blanket “是否确定” question

#### Scenario: One clarification frontier resolves material ambiguity

- **WHEN** two or more currently answerable reader/use/view interpretations
  would materially change the report's spine or evidence exposure
- **THEN** the Agent SHALL present at most three independent recommended
  questions together
- **AND** after the user's answer it SHALL produce one resolved candidate rather
  than a schema interview or a new lifecycle checkpoint

#### Scenario: Delivery intent waits at an unresolved boundary

- **WHEN** the user says “直接交付” while custom semantics, reader/use, or
  another material composition distinction remains unresolved
- **THEN** the Agent SHALL retain `pending_user`, explain only the missing
  boundary, and ask the smallest required clarification
- **AND** once it is answered, the earlier delivery intent and answer SHALL
  jointly complete the decision without another confirmation

#### Scenario: Custom view cannot cross with guessed semantics

- **WHEN** `final_report_view` is `custom` but the user has not accepted
  non-empty `view_instructions` covering intended organization or focus
- **THEN** the phase SHALL remain pending and SHALL not route to Readiness
- **AND** Final SHALL never reconstruct the custom view from slug, rationale,
  or chat

### Requirement: Phase Readiness body completeness

`phase-readiness.md` SHALL contain a complete 9-section body. The node SHALL declare `phase: readiness`, `gate: readiness-passed`, `next: final`, `stop: "no"`.

The phase SHALL execute a deterministic precheck before final delivery:
- Verify required artifacts are reachable and parseable
- Verify all prior non-terminal gate passage statuses are auditable from trace evidence (the CLI derives the expected prior gate set at runtime from `manifest.json` topology — all phases before readiness with `gate != null`; readiness-passed itself is not counted)
- Verify profile/status/queue/trace cross-file consistency
- Verify final delivery input comes from verified bundle state

The phase SHALL NOT judge semantic quality or writing quality. It SHALL only perform structural, existence, and consistency checks.

#### Scenario: Readiness frontmatter contract

- **WHEN** `phase-readiness.md` is loaded
- **THEN** its frontmatter SHALL contain `node_type: phase`, `id: phase-readiness`, `phase: readiness`, `gate: readiness-passed`, `stop: "no"`
- **AND** `next` SHALL be `final`

#### Scenario: Readiness artifact reachability check

- **WHEN** Agent executes the readiness phase
- **THEN** Agent SHALL verify required artifacts exist and are parseable
- **AND** required artifacts SHALL include at minimum: `seed_topics/`, `reference/_INDEX.md`, `artifacts/wave2/synthesis.md`, `artifacts/hitl2/decision-brief.md`

#### Scenario: Readiness gate audit

- **WHEN** Agent executes the readiness phase
- **THEN** Agent SHALL verify all prior non-terminal gate passage statuses are auditable (derived from manifest topology, not a hardcoded count)
- **AND** evidence SHALL come from `rb_trace.jsonl` gate_attempt events with `passed: true`

#### Scenario: Readiness cross-file consistency

- **WHEN** Agent executes the readiness phase
- **THEN** Agent SHALL check profile/status/queue/trace for internal contradictions
- **AND** inconsistencies SHALL be reported in inspect/advice output

#### Scenario: Readiness does not judge quality

- **WHEN** Agent executes the readiness phase
- **THEN** the phase body SHALL NOT instruct semantic quality judgment of synthesis or decision brief content
- **AND** SHALL restrict checks to structural/existence/consistency criteria enforced by the readiness gate

Readiness SHALL keep composition comparison at this existing structural
checkpoint. Its guidance SHALL identify the current profile as Final's
composition owner and the selected HITL2 receipt only as the immutable witness
used by the existing route-bound preflight. It SHALL invoke the shared Engine
comparison rather than duplicate fingerprint logic. Exact match proceeds under
the existing rules; projection-only drift exposes only the bounded restore
operation and rerun of this same Readiness Gate; unrelated context drift and
invalid witnesses fail closed. An eligible pre-v1 in-flight predecessor may use
only the named legacy-migration operation. The phase SHALL add no user question,
semantic score, automatic mutation, or second checkpoint, and Final SHALL never
read the receipt as a fallback data owner.

#### Scenario: Readiness projects the one composition consistency boundary

- **WHEN** the selected legal HITL2 handoff and current profile are compared
- **THEN** the phase SHALL direct the Agent to the shared Gate/operation result
  and its exact restore or migration command when applicable
- **AND** it SHALL not ask the user, recreate fingerprint logic, or create a
  second composition checkpoint

### Requirement: Phase Final body completeness

`phase-final.md` SHALL contain a complete 9-section body. The node SHALL declare `phase: final`, `gate: null`, and `stop: "no"`; it SHALL not declare a `next` frontmatter field. It SHALL be a terminal node — no outgoing gate, no normal next phase.

The phase SHALL generate final report artifact(s) from verified bundle state. The report SHALL source content from verified wave artifacts and profile, not from chat memory.

Post-final user feedback SHALL NOT be processed by Final or require reloading Final/HITL2 as a duplicate question loop. When the feedback is an explicit rerun request, the accepted post-final recovery operation SHALL persist the decision into the existing HITL2 `rerun` profile semantics and create one audited handoff to `phases/phase-rerun.md`. Unsupported repair/state-seed requests SHALL remain unavailable. Final SHALL NOT contain hidden next, hidden gate, implicit loop or generic override wording.

Delivery completion SHALL be evidenced by the existence of at least one report file under the `final/` directory. Because `phase-final.md` is a terminal node with `gate: null`, there is no gate CLI to write a `final_delivery` trace event, and the charter prohibits hand-writing trace events. Therefore the delivery fact is proven by file existence plus legal readiness→Final entry, not by a `final_delivery` event.

#### Scenario: Final frontmatter contract

- **WHEN** `phase-final.md` is loaded
- **THEN** its frontmatter SHALL contain `node_type: phase`, `id: phase-final`, `phase: final`, `gate: null`, and `stop: "no"`
- **AND** it SHALL not contain a `next` frontmatter field
- **AND** `gate` being `null` SHALL mean no outgoing gate CLI runs after this phase

#### Scenario: Final report generation

- **WHEN** Agent executes the final phase
- **THEN** Agent SHALL generate at least 1 final report artifact in the `final/` directory
- **AND** report content SHALL be sourced from verified bundle state (wave artifacts, profile, status)

#### Scenario: Final terminal semantics

- **WHEN** final phase completes
- **THEN** the lifecycle SHALL have no normal next phase
- **AND** `transitions.chain.json` SHALL NOT contain an entry for `phases/phase-final.md`

#### Scenario: Post-final feedback routing

- **WHEN** user provides explicit rerun feedback after final delivery
- **THEN** the accepted post-final recovery operation SHALL write the current HITL2 rerun semantics and audited recovery lineage
- **AND** rework SHALL enter the existing `phases/phase-rerun.md` path without re-asking the same decision
- **AND** Final SHALL NOT implement a hidden loop back to earlier phases or claim unsupported generic repair authority

After legal Readiness entry, Final SHALL consume the current accepted
`final_report_view` and `composition_handoff` from the profile with verified
research state. It SHALL not consume a receipt as a normal source or fill
missing semantics from rationale, decision brief, chat, slug, or transparent
Final defaults. The same terminal node SHALL execute this Report Composition
Pass in order:

1. **Reground** in the goal, scope, root must-answer set, accepted handoff,
   answerability/limitation surfaces, allowed read graph, and final target;
2. **Answer Inventory** by joining verified finding index, evidence meaning,
   Wave-local mechanism/limitation material, and submitted-backed references;
3. **Coverage and materiality** by assigning every root must-answer
   `answered`, `partial`, or `unavailable`, retaining material answers,
   contradictions, limitations, confidence boundaries, and backing obligations;
4. **Spine and placement** by selecting one primary narrative spine and deciding
   must-answer order, finding placement, body/appendix boundaries, and explicit
   reasons for omitted P0/P1 material; and
5. **Draft and self-check** before invoking the existing
   `persist-final-report` admission path.

The view mappings SHALL remain distinguishable while sharing verified-content
obligations: `profile_default` starts from the profile-appropriate question,
topic, or claim spine; `executive_brief` is decision-first and foregrounds
P0/P1, material risks, trade-offs, and unknowns; `evidence_map` is
evidence-first and exposes support, contradiction, limitation, confidence, and
gaps without replacing the mandatory Evidence Map declaration; `claim_judgment`
is claim-first and states judgment, support, counterevidence, conditions,
confidence, and residual unknowns; `technical_deep_dive` is
mechanism/dependency-first and distinguishes observed fact, inferred mechanism,
and unresolved hypothesis; `custom` follows accepted non-empty
`view_instructions` within verified evidence and must-answer boundaries.

Foreground, compress, delivery length, evidence exposure, and appendix
preferences SHALL affect only ordering, granularity, and presentation. They
SHALL NOT hide or weaken a material contradiction, limitation, uncertainty,
must-answer obligation, confidence boundary, submitted-backing requirement, or
mandatory Evidence Map. Exact section names and transitions remain Final Agent
judgment. Final SHALL add no question, wait, confirmation, feedback loop,
outgoing Gate, transition, delegated production actor, second primary report,
or report-quality deterministic verdict; a failed persistence/backing check
returns to retained staging and the same operation.

#### Scenario: Different views change reading path but not verified meaning

- **WHEN** the same readiness-passed verified state is delivered under two
  accepted handoffs with different standard views
- **THEN** reports MAY differ in reader framing, spine, order, granularity,
  evidence exposure, and appendix placement
- **AND** finding meaning, status/confidence, limitations, must-answer coverage,
  provenance, and submitted backing SHALL remain consistent

#### Scenario: Material content survives compression

- **WHEN** a handoff asks Final to compress a finding, counterevidence, or
  limitation
- **THEN** Final MAY move non-material detail to an appendix or omit repetition
- **AND** it SHALL retain content whose absence would change an answer,
  confidence, scope, decision implication, mechanism understanding, or
  limitation visibility

#### Scenario: Final does not reopen HITL2

- **WHEN** Final encounters a missing, unsupported, stale, or drifted handoff
  after legal entry
- **THEN** it SHALL expose the upstream contract boundary and stop the delivery
  claim
- **AND** it SHALL not ask the user, silently default a view, or route back to
  HITL2 from inside Final

#### Scenario: Final persists after composition self-check and backing admission

- **WHEN** the Composition Pass has completed its coverage/self-check and the
  report contains the required Evidence Map
- **THEN** the Agent SHALL invoke `persist-final-report` and present delivery
  only after a committed result and existing Final-entry evidence
- **AND** a structural backing rejection SHALL be repaired at retained staging
  and rerun through the same operation

### Requirement: Final delivery is terminal non-interactive delivery and post-final feedback re-enters through HITL2

Content delivery phase docs SHALL distinguish terminal non-interactive Final delivery from interactive in-run decision checkpoints while providing the accepted post-final feedback routing contract.

For Final, `non-interactive` SHALL mean that the framework does not initiate a question, decision wait, confirmation, progress/partial-delivery offer or repair loop. It SHALL NOT mean that the Agent ignores a user-initiated normal conversation turn already current. During active Final, the Agent SHALL answer such a turn from verified direct facts or state the smallest unavailable boundary without creating a decision owner, pause, durable intent, route, mutation/reentry authority or third checkpoint. Before final artifacts legally exist, the answer SHALL NOT claim delivery, turn into a progress/partial-report offer or alter `interaction: terminal_delivery` / `next_action: deliver_final_artifacts`. After legal Final delivery, ordinary factual replies remain answerable; only an explicit rerun request that requires mutation/reentry MAY enter the accepted audited post-final recovery path.

For this capability:

- HITL1 and HITL2 SHALL remain the only framework-initiated interactive in-run checkpoints where the framework invites and waits for a semantic decision;
- HITL2 SHALL remain the structured human decision vocabulary for review, repair, rerun, or stop decisions, while its prompt MAY accept clear natural language and optional shortcuts;
- the natural-language mapping defined for HITL2 SHALL apply only at that accepted HITL2 decision boundary and SHALL NOT turn an ordinary voluntary message during a non-HITL phase into persisted decision or mutation authority;
- readiness SHALL remain the structural precheck before final delivery;
- Final SHALL remain a terminal non-interactive delivery phase with `gate: null`, no `next` frontmatter field, no hidden next phase, no hidden gate, no recommendation/confirmation prompt, and no implicit loop;
- final report delivery MAY surface final artifacts after they exist, but SHALL NOT ask the user whether to continue, whether partial output is enough, or whether to repair inside Final; and
- explicit user feedback after final delivery that requests rerun and requires mutation/reentry SHALL use the accepted audited post-final recovery operation, which records the new decision as HITL2 `rerun` semantics and creates one legal handoff to the existing rerun phase rather than turning Final into a repair surface; ordinary factual replies SHALL NOT be forced through recovery.

The post-final operation SHALL NOT require the user to repeat the same rerun decision at a newly loaded HITL2 prompt. After the semantic/risk decision and any host-required non-delegable approval, the Agent SHALL execute inspect/apply/recover, consume the legal rerun handoff and continue the existing canonical rerun pipeline. This is HITL2-mediated decision semantics through the accepted recovery operation, not a third checkpoint, a Final-owned loop, or generic prompt-side mapping authority.

The previous Final delivery SHALL remain historical truth: the recovery audit SHALL bind the prior readiness→Final handoff/load, prior HITL2 decision/profile hash, status hash and final inventory digest. C5 SHALL NOT delete or rewrite existing gate attempts, entry witnesses, evidence, receipts, ledger rows or final artifacts to imply that delivery never occurred.

When the user has not requested another output language, Final phase guidance SHALL contain a soft instruction to prefer Chinese for user-facing report narrative and the terminal delivery summary. Internal enum values, file paths, field names, CLI commands, citations, and source titles SHALL retain canonical or source form. The language instruction SHALL NOT add a language detector, make non-Chinese output a deterministic delivery failure, or alter Final authorization and evidence requirements.

The language instruction SHALL NOT create a new Final gate, hidden next edge, post-delivery interaction loop, `final_delivery` trace authority, or chat/log summary that substitutes for legal readiness-to-final handoff and `final/` artifact existence.

This requirement SHALL NOT authorize generic repair, arbitrary state mutation or developer state-seed. Unsupported post-final actions SHALL remain a missing capability rather than being routed through the rerun exception.

#### Scenario: Final delivery is not a third in-run checkpoint

- **WHEN** `phase-final.md` delivers final report artifacts
- **THEN** the docs SHALL treat that delivery as terminal output after final artifacts exist
- **AND** they SHALL NOT describe Final as a confirmation loop, progress report, recommendation prompt, or interactive repair checkpoint

#### Scenario: User-initiated turn during Final is answered without opening a Final loop

- **WHEN** a user-initiated normal conversation turn is current while Final is active
- **THEN** the Agent SHALL answer from verified direct facts or state the smallest unavailable boundary
- **AND** before final artifacts legally exist it SHALL NOT claim delivery, offer progress/partial delivery or wait for confirmation
- **AND** the reply SHALL NOT create a decision owner, pause, durable intent, route, mutation/reentry authority or change `terminal_delivery` / `deliver_final_artifacts`
- **AND** after legal delivery only an explicit accepted rerun request MAY enter audited post-final recovery; ordinary factual replies SHALL NOT open a Final loop

#### Scenario: Final does not inherit HITL2 prompt-side mapping

- **WHEN** Final generates or delivers report artifacts
- **THEN** it SHALL NOT invite a new proceed/repair/rerun/stop decision or map an ordinary delivery response into `human_decision_checkpoints.hitl2`
- **AND** only the separately accepted audited post-final rerun operation MAY create the existing rerun semantics after an explicit post-final request

#### Scenario: Final narrative prefers Chinese without translating canonical tokens

- **WHEN** `phase-final.md` generates and delivers final artifacts
- **AND** the user has not requested another output language
- **THEN** Agent-facing guidance SHALL instruct the Agent to prefer Chinese for report narrative and the delivery summary
- **AND** citations, source titles, paths, commands, field names, and enum values SHALL remain in canonical or source form
- **AND** language preference SHALL NOT replace legal Final entry or final artifact evidence
- **AND** it SHALL NOT require or imply a `final_delivery` gate/trace event as delivery authority

#### Scenario: Post-final rerun uses audited HITL2 semantics

- **WHEN** user feedback after legal Final delivery explicitly requests a rerun and current host permission allows the operation
- **THEN** the Agent SHALL submit the retained post-final request through the accepted recovery operation
- **AND** the Engine SHALL record HITL2 `rerun` semantics and one lineage-bound handoff to `phases/phase-rerun.md`
- **AND** the user SHALL NOT be asked to run ordinary recovery commands or repeat the same decision at a Final-owned or duplicate HITL2 loop

#### Scenario: Post-final feedback keeps HITL2 routing
> **@deprecated** — The pre-C5 scenario name is retained for archive compatibility. Routing now means recording HITL2 rerun semantics through the audited recovery operation and entering the existing rerun node, not reloading a duplicate HITL2 prompt.

- **WHEN** user feedback arrives after final delivery and requests rerun
- **THEN** docs SHALL route the decision through the accepted post-final recovery operation into the existing HITL2 rerun contract
- **AND** they SHALL NOT add a hidden Final gate, hidden Final next edge, duplicate HITL2 question or Final-owned repair loop

#### Scenario: Unsupported post-final action remains unavailable

- **WHEN** post-final feedback requests arbitrary repair-in-place, status movement, history rewrite or developer state-seed rather than `post_final_rerun`
- **THEN** the framework SHALL report the missing capability/permission boundary
- **AND** SHALL NOT reinterpret the request as a rerun or generic override

#### Scenario: Prior Final lineage remains auditable

- **WHEN** a post-final rerun is accepted
- **THEN** existing Final gate/load/evidence/provenance history SHALL remain unchanged
- **AND** the recovery event SHALL bind the prior delivery lineage and current rerun lineage

#### Scenario: Final terminal frontmatter has no outgoing edge

- **WHEN** `phase-final.md` is loaded for terminal delivery
- **THEN** its frontmatter SHALL use `gate: null` and omit `next`
- **AND** that absence SHALL not create a hidden next phase, Final Gate, or
  Final-owned repair loop

### Requirement: Final artifacts SHALL count as delivery evidence only after legal readiness-to-final handoff and final node entry

Final report files under `final/` SHALL count as terminal delivery evidence only when the lifecycle has legally reached `phase-final.md`: readiness has passed with `check.next` targeting `phases/phase-final.md`, `enter-phase` has written a route-bound `load_complete` for Final, and status synchronization reflects the readiness source gate after that load witness.

Files under `final/` created from wave0, wave1, wave2, setup, seed-topics, HITL2, readiness before pass, rerun, or any other non-Final context SHALL be diagnostic evidence only. They SHALL NOT prove delivery, SHALL NOT authorize user-facing final report presentation, and SHALL NOT replace readiness or prior gate checks.

#### Scenario: Legal final delivery uses readiness handoff evidence

- **WHEN** readiness gate passes with `check.next: "phases/phase-final.md"`
- **AND** `enter-phase` writes a route-bound `load_complete` for `phases/phase-final.md`
- **AND** status synchronization records the readiness source gate window
- **AND** the Agent writes `final/report.md` while executing Final
- **THEN** the final report file MAY count as terminal delivery evidence

#### Scenario: Premature final report is phase-boundary violation

- **WHEN** the active authorized phase is wave0, wave1, wave2, or another non-Final phase
- **AND** a file appears under `final/`
- **THEN** inspection, readiness, or phase status audit SHALL report premature terminal output or phase-boundary violation
- **AND** the file SHALL NOT count as terminal delivery evidence

#### Scenario: Final file existence does not bypass readiness

- **WHEN** `final/report.md` exists
- **AND** trace lacks a passed readiness gate and route-bound Final `load_complete`
- **THEN** readiness/final audit SHALL treat the file as non-authoritative
- **AND** it SHALL direct the Agent back to the latest legal phase or repair path

### Requirement: Final guidance SHALL declare and persist traceable evidence backing

Final phase guidance SHALL direct the Phase Agent to write a bounded Evidence
Map in every Final Markdown report, choose its key-finding declarations from
verified bundle state, and invoke `persist-final-report` for each safe Markdown
target under `final/`. The guidance SHALL preserve a completed staging file
until a `committed` result and SHALL direct the Agent to repair the reported
map row or backing path, then rerun the same operation when deterministic
admission fails.

The guidance SHALL preserve Final's existing terminal semantics: `gate: null`,
no Final Gate, no `final_delivery` trace event, no hidden next edge, no
Final-owned feedback/retry loop, and no user prompt for ordinary report repair.
The Agent remains responsible for content judgment and authorized mechanical
repair; the Engine remains responsible only for structural declaration, path,
and submitted-provenance feedback.

#### Scenario: Final Markdown delivery uses the one admitted persistence path

- **WHEN** the Phase Agent prepares a Final Markdown report in retained
  staging
- **THEN** Final guidance SHALL require a bounded Evidence Map and direct the
  Agent to use `persist-final-report` rather than generic `persist`
- **AND** the report SHALL not be presented as delivered before a `committed`
  result and the existing legal Final-entry conditions hold

#### Scenario: Final backing rejection stays an Agent repair of staging

- **WHEN** `persist-final-report` returns a backing rejection during Final
- **THEN** Final guidance SHALL direct the Agent to inspect the reported direct
  fact, repair its retained staging report or its legal backing surface, and
  rerun `persist-final-report`
- **AND** it SHALL not ask the user to run an ordinary command or create a
  Final Gate, Final trace event, Final-owned interaction loop, or new lifecycle
  state

#### Scenario: Final terminal delivery semantics remain unchanged

- **WHEN** a Final Markdown report has passed backing admission and commits
- **THEN** Final SHALL remain a terminal, non-interactive delivery phase with
  no outgoing Gate or transition
- **AND** the persistence result and Evidence Map SHALL not replace the
  existing readiness-to-Final handoff and Final-entry evidence
