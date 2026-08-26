# Content Delivery Phase Content

> req: CDP-001, CDP-002, CDP-003, CDP-004, CDP-005, CDP-006, CDP-007, CDP-008

> delta-synced: strengthen-user-intent-carry-through (CDP-007)

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

`phase-final.md` SHALL contain a complete 9-section body. The node SHALL declare
`phase: final`, `gate: null`, and `stop: "yes"`; it SHALL not declare a `next`
frontmatter field. Final SHALL remain the terminal lifecycle node: it has no
outgoing Gate, normal next phase, or transition-table entry. For Final only,
`stop: "yes"` SHALL mean **deliver first, then remain available for refinement**;
it SHALL NOT delay the first report until the user supplies another decision.

On the bundle's first legal Final entry, after `enter-phase` has admitted a valid
empty canonical primary Final inventory, written the route-bound load, and the
existing Readiness source-gate status synchronization has completed, the Agent
SHALL immediately execute the existing view-aware Report
Composition Pass from verified bundle state and the accepted profile handoff,
publish `final/final.md`, present that committed report, and then invite concise
feedback. It SHALL not ask a pre-delivery confirmation or offer a partial report.
In this contract, Final means the user's current primary delivered report; it
SHALL not be pre-bound to a particular pain point, view, feature label, or
presentation template. Those values MAY shape one version without defining a
parallel Final type or series.

When an accepted post-final rerun later completes a newer legal Readiness-to-
Final handoff, the existing bundle-wide primary series SHALL remain in place.
Before the new Final load, `enter-phase` SHALL have admitted the exact full safe
Final inventory bound by the retired C5 event's prior digest. The existing
Readiness source-gate status synchronization SHALL then complete before Final
work. That baseline and terminal status distinguish the old delivery from the
new one. If synchronized current inventory still matches that prior digest with
zero appended canonical versions, Final SHALL immediately compose from the
new verified lineage and publish global `latest + 1` before requesting feedback;
it SHALL not present the old latest report as though it were the new delivery.
Once one or more immutable appended versions uniquely preserve that prior
inventory, the newest version is bound to the newer Final lineage and ordinary
in-place refinement resumes. No second `final/final.md` is created.

After a report is bound to the current Final lineage, Final SHALL remain the
current node. Clear feedback limited to reader, structure, ordering, length,
wording, emphasis, evidence visibility, appendix posture, or explanation of
already verified facts SHALL be handled inside Final: the Agent SHALL read the
latest committed primary report, the accepted handoff for the current Final
lineage, verified evidence, and the current user turn; prepare a complete
replacement staging report; publish one immutable next version; present it; and
wait again. The loop has no fixed round limit and ends for the current
interaction when the user expresses satisfaction or declines another revision.

If material ambiguity would change the requested presentation, the Agent SHALL
ask only the smallest clarification needed for the next report version. This is
Final-owned delivery collaboration, not a HITL2 decision, Gate, lifecycle state,
or persisted satisfaction verdict. Final SHALL NOT rewrite
`human_decision_checkpoints.hitl2.final_report_view`, `composition_handoff`, or
the predecessor receipt to make a later presentation preference look like the
current-lineage delivery decision.

Feedback that requires a new source, new Topic, new evidence collection, a new
research conclusion, a research-profile change, or another expansion of the
verified research boundary SHALL NOT be fulfilled by rewriting Final. The Agent
SHALL retain the explicit request and use the accepted audited post-final rerun
operation. Unsupported arbitrary state repair or history rewrite SHALL remain
unavailable. Final SHALL not hide a transition to an earlier phase.

After legal Readiness entry, Final SHALL consume the current accepted
`final_report_view` and `composition_handoff` from the profile with verified
research state. It SHALL not consume a receipt as a normal source or fill
missing current-lineage delivery semantics from rationale, decision brief, chat, slug, or
transparent defaults. Each first or revised report SHALL execute this Report
Composition Pass:

1. **Reground** in the goal, scope, root must-answer set, the accepted handoff for
   the current Final lineage, answerability/limitation surfaces, allowed read
   graph, latest report when present, and current bounded feedback;
2. **Answer Inventory** by joining verified finding index, evidence meaning,
   Wave-local mechanism/limitation material, and submitted-backed references;
3. **Coverage and materiality** by assigning every root must-answer `answered`,
   `partial`, or `unavailable`, retaining material answers, contradictions,
   limitations, confidence boundaries, and backing obligations;
4. **Spine and placement** by selecting one primary narrative spine and deciding
   must-answer order, finding placement, body/appendix boundaries, and explicit
   reasons for omitted P0/P1 material; and
5. **Draft and self-check** before invoking the canonical primary Final
   publication path.

The view mappings SHALL remain distinguishable while sharing verified-content
obligations: `profile_default` is profile-appropriate; `executive_brief` is
decision-first; `evidence_map` is evidence-first; `claim_judgment` is
claim-first; `technical_deep_dive` is mechanism/dependency-first and
distinguishes observed fact, inferred mechanism, and unresolved hypothesis;
`custom` follows accepted instructions within verified boundaries. A revision
MAY move between these presentation shapes in response to clear user feedback,
but the filename feature label is descriptive only and SHALL NOT mutate the
accepted HITL2 owner.

Foreground, compression, length, evidence exposure, and appendix preferences
SHALL affect ordering, granularity, and presentation only. They SHALL NOT hide
or weaken a material contradiction, limitation, uncertainty, must-answer
obligation, confidence boundary, submitted-backing requirement, or mandatory
Evidence Map. Exact sections and prose remain Agent judgment. The Engine SHALL
not judge whether a report is sufficiently concise, executive, or technically
deep.

Delivery evidence SHALL remain a committed primary report under `final/` bound
to the current legal readiness-to-Final entry as the empty-series base or a
proven later append. Final has no Gate CLI and SHALL NOT write a `final_delivery`
trace event or a satisfaction event.

#### Scenario: Final frontmatter contract

- **WHEN** `phase-final.md` is loaded
- **THEN** frontmatter SHALL contain `node_type: phase`, `id: phase-final`,
  `phase: final`, `gate: null`, and `stop: "yes"`
- **AND** it SHALL not contain a `next` field
- **AND** `gate: null` SHALL mean no outgoing Gate CLI runs

#### Scenario: Final report generation

- **WHEN** `enter-phase` admits an empty primary baseline and Readiness status synchronization completes the first legal Final entry in a new bundle
- **THEN** the Agent SHALL compose and publish `final/final.md` before requesting feedback
- **AND** report content SHALL come from verified bundle state rather than chat memory

#### Scenario: Later Final lineage appends before requesting feedback

- **WHEN** an accepted C5 lineage reaches a newer legal Final handoff, `enter-phase` admits the exact event-bound prior inventory, Readiness status synchronization completes, and inventory still has no appended canonical version
- **THEN** the Agent SHALL compose from the newer verified lineage and publish global `latest + 1` before requesting feedback
- **AND** it SHALL not recreate `final/final.md` or present the prior lineage's latest report as the new delivery

#### Scenario: Final is the current primary report, not a fixed view

- **WHEN** the accepted view, current feedback, or optional feature label emphasizes a particular reader need or presentation angle
- **THEN** that emphasis MAY shape the current Final version
- **AND** it SHALL not redefine Final as a pain-point-specific artifact, create another primary series, or change lifecycle authority

#### Scenario: Final terminal semantics

- **WHEN** a first or revised Final report commits
- **THEN** lifecycle position SHALL remain `phases/phase-final.md`
- **AND** `transitions.chain.json` SHALL NOT contain an entry for Final
- **AND** no Gate, status transition, or satisfaction state SHALL be added

#### Scenario: Post-final feedback routing

- **WHEN** feedback asks only for another presentation of existing verified content
- **THEN** Final SHALL publish another primary version and remain in Final
- **AND** it SHALL not reload HITL2 or invoke post-final rerun
- **WHEN** feedback requires new research or evidence
- **THEN** the accepted audited post-final rerun path SHALL own the request

#### Scenario: Different views change reading path but not verified meaning

- **WHEN** two Final versions present the same readiness-passed research through different views
- **THEN** they MAY differ in framing, spine, order, granularity, evidence exposure, and appendix placement
- **AND** finding meaning, status/confidence, limitations, must-answer coverage, provenance, and submitted backing SHALL remain consistent

#### Scenario: Material content survives compression

- **WHEN** feedback asks to compress a finding, counterevidence, or limitation
- **THEN** Final MAY move non-material detail to an appendix or omit repetition
- **AND** it SHALL retain content whose absence would change an answer, confidence, scope, decision implication, mechanism understanding, or limitation visibility

#### Scenario: Final does not reopen HITL2

- **WHEN** Final receives a presentation-only revision request
- **THEN** it SHALL use the current Final interaction without rewriting or reopening HITL2
- **WHEN** the current Final lineage's accepted handoff is missing, unsupported, stale, or drifted before its first delivery
- **THEN** Final SHALL expose that upstream contract boundary and SHALL not invent missing semantics

#### Scenario: Final persists after composition self-check and backing admission

- **WHEN** a first or revised staging report completes its semantic self-check and bounded Evidence Map
- **THEN** the Agent SHALL invoke the canonical primary publication operation
- **AND** it SHALL present the version only after a committed result
- **AND** a backing rejection SHALL return to retained staging and the same operation

### Requirement: Final delivery remains terminal while iterating in place

Content-delivery guidance SHALL distinguish lifecycle terminality from
interaction placement. HITL1 and HITL2 SHALL remain the only framework-initiated
in-run checkpoints that request a lifecycle semantic decision. Final SHALL be a
terminal interactive delivery surface, not a third HITL: it requests feedback
about an already delivered artifact but owns no Gate verdict, decision enum,
outgoing transition, accepted profile decision, or lifecycle completion state.

The Final interaction SHALL follow this order:

```text
legal Final entry
  -> complete the exact Readiness source-gate status synchronization
  -> publish and present the first report immediately
  -> invite and await feedback on that report
  -> clear presentation feedback: publish and present one next version
  -> invite and await feedback again
  -> satisfied: end the current interaction without another write
  -> evidence-expanding request: use audited post-final rerun
```

The first report SHALL NOT depend on a user response after Final entry. After
each committed report, the Agent SHALL make the artifact directly available and
invite natural-language feedback without forcing a menu, a formal confirmation,
or HITL2 vocabulary. A clear revision request authorizes exactly the bounded
semantic rewrite it describes; it does not authorize new evidence collection,
profile mutation, state repair, overwrite, deletion, or another lifecycle path.
Materially ambiguous feedback receives one minimum clarification before the
next version. A user expression of satisfaction ends the current interaction
and SHALL NOT be persisted as an Engine fact or produce an empty version.

Final MAY use recommendation-first language when useful, such as briefly
recommending a structure or explaining the impact of a requested shortening.
That recommendation SHALL remain Agent advice about the next artifact, not a
framework decision checkpoint or a second confirmation requirement.

Each readiness-to-Final handoff and all committed primary reports SHALL remain
historical truth. In-place refinement within one Final lineage SHALL not rewrite
Gate attempts, entry witnesses, that lineage's profile handoff fields, evidence,
receipts, ledger rows, or prior report bytes. When a later explicit request
crosses the verified research boundary, the post-final operation SHALL record
existing HITL2 `rerun` semantics and create one legal handoff to
`phases/phase-rerun.md`; the user SHALL not have to repeat that rerun decision in
a duplicate Final or HITL2 prompt. A later normal HITL2/Readiness pass MAY
establish a new accepted composition handoff for the next Final lineage without
rewriting any earlier handoff.

When the user has not requested another language, Final guidance SHALL prefer
Chinese for report narrative, delivery summaries, and feedback invitations.
Canonical enum values, paths, field names, commands, citations, and source
titles SHALL retain their canonical or source form. Language preference SHALL
not alter authorization, evidence, or persistence requirements.

#### Scenario: Final delivery is not a third in-run checkpoint

- **WHEN** Final presents a committed report and asks whether the user wants it adjusted
- **THEN** the lifecycle SHALL remain terminal with no Gate or outgoing transition
- **AND** the feedback invitation SHALL not create a HITL decision enum or persisted verdict

#### Scenario: User-initiated turn during Final is answered without opening a Final loop

> **@deprecated behavior** — The scenario title is retained as an archive
> anchor. “Without opening” now means no lifecycle/Gate/HITL loop; bounded
> presentation refinement is handled by the already-current Final interaction.

- **WHEN** the user gives clear presentation feedback after a committed Final report
- **THEN** the Agent SHALL revise from current verified facts, publish one next version, and remain in Final
- **AND** it SHALL not route the request through HITL2 or audited rerun

#### Scenario: Final does not inherit HITL2 prompt-side mapping

- **WHEN** Final receives natural-language satisfaction, revision, or clarification text
- **THEN** it SHALL interpret that text only for the bounded delivery interaction
- **AND** it SHALL not map it into `human_decision_checkpoints.hitl2` unless the request explicitly requires the accepted post-final rerun path

#### Scenario: Final narrative prefers Chinese without translating canonical tokens

- **WHEN** Final generates, delivers, or discusses a report and the user requested no other language
- **THEN** guidance SHALL prefer Chinese narrative
- **AND** citations, source titles, paths, commands, field names, and enum values SHALL remain canonical

#### Scenario: Satisfied user ends interaction without new state

- **WHEN** the user says the current version is satisfactory or requests no further change
- **THEN** the Agent SHALL end the current interaction without publishing another version
- **AND** the Engine SHALL not write a satisfaction flag, Gate event, status transition, or trace event

#### Scenario: Post-final rerun uses audited HITL2 semantics

- **WHEN** feedback explicitly requires a new source, Topic, evidence collection, research conclusion, or research-profile change
- **THEN** the Agent SHALL retain and submit that request through the accepted post-final recovery operation
- **AND** the Engine SHALL record existing HITL2 `rerun` semantics and one lineage-bound handoff to `phases/phase-rerun.md`

#### Scenario: Post-final feedback keeps HITL2 routing

> **@deprecated** — The historical scenario name is retained for archive
> compatibility. Only evidence-expanding feedback keeps audited HITL2 rerun
> routing; presentation-only feedback now remains in Final.

- **WHEN** post-final feedback crosses the verified research boundary
- **THEN** it SHALL use audited post-final rerun rather than a hidden Final transition
- **AND** presentation-only feedback SHALL not be routed there

#### Scenario: Unsupported post-final action remains unavailable

- **WHEN** feedback asks for arbitrary state mutation, history rewrite, report overwrite/deletion, or developer state-seed
- **THEN** the framework SHALL report the missing capability or permission boundary
- **AND** it SHALL not reinterpret the request as presentation refinement or rerun

#### Scenario: Prior Final lineage remains auditable

- **WHEN** one or more Final revisions or a later rerun occur
- **THEN** all earlier report versions and readiness/Final evidence SHALL remain unchanged
- **AND** any rerun recovery event SHALL bind the prior delivery lineage and current rerun lineage

#### Scenario: Final terminal frontmatter has no outgoing edge

- **WHEN** `phase-final.md` is loaded for delivery and refinement
- **THEN** frontmatter SHALL use `gate: null`, `stop: "yes"`, and omit `next`
- **AND** in-place interaction SHALL not create a hidden next phase or Final Gate

### Requirement: Final artifacts SHALL count as delivery evidence only after legal readiness-to-final handoff and final node entry

Primary Final report files SHALL count as delivery evidence only when the
lifecycle legally reached `phase-final.md`: Readiness passed with `check.next`
targeting Final, `enter-phase` admitted the required pre-publication inventory
baseline and wrote its route-bound `load_complete`, and status synchronization
reflects the Readiness source Gate. The first legal Final load SHALL have admitted
an empty primary series; a post-C5 return load SHALL have admitted an exact match
to the retired event's full prior Final inventory digest. Presentation revisions
committed while that same lineage remains current SHALL inherit it without a new
Gate or load.

`final/final.md` SHALL be the initial primary report only for the bundle's first
admitted and synchronized legal Final lineage with empty primary inventory. Revisions and every first
report for a later legal Final lineage SHALL use `final/final_v<N>.md` or
`final/final_<feature>_v<N>.md`, where `N` is the globally monotonic Engine-
allocated revision number. For a later lineage produced by accepted C5, delivery
evidence SHALL require a unique immutable-prefix proof against that event's
prior Final inventory digest: zero appended canonical versions means delivery is
still pending; one or more appended highest versions bind the newest version to
the later lineage. No match is lineage/inventory drift, not delivery. All
canonical files SHALL remain immutable delivery history. Supplementary or legacy
Markdown under `final/` SHALL not become canonical primary delivery merely
because it exists.

For a new Final handoff, a primary-looking file created before legal Final entry,
or any post-C5 inventory drift before its new load, SHALL cause `enter-phase` to
reject before entry mutation. Files outside the canonical publication path or in
an invalid/ambiguous series SHALL remain diagnostic or supplementary artifacts;
they SHALL not bypass readiness, prove a committed version, or authorize user-
facing delivery. A bundle with a legal Final load predating this admission
contract remains readable through explicit legacy compatibility, not through a
fabricated claim about historical creation order.

#### Scenario: Legal final delivery uses readiness handoff evidence

- **WHEN** Readiness passes, empty-primary admission succeeds, Final is legally entered and synchronized, and canonical publication then commits `final/final.md`
- **THEN** that file SHALL count as the first primary delivery artifact

#### Scenario: Legal Final revision reuses the same terminal lineage

- **WHEN** Final remains current after the first delivery and canonical publication commits `final/final_v1.md`
- **THEN** the revision SHALL count as delivery evidence without another Gate or phase entry
- **AND** `final/final.md` SHALL remain unchanged

#### Scenario: Newer Final handoff alone is not a new delivery

- **WHEN** accepted C5 descendants reach a newer legal Final handoff, exact prior-inventory admission and Readiness status synchronization succeed, but canonical inventory has no append beyond the C5 event-bound prior digest
- **THEN** the newer lineage SHALL remain at immediate Final delivery pending
- **AND** the prior latest report SHALL remain historical delivery evidence for its prior lineage, not current delivery evidence for the newer lineage

#### Scenario: First report after rerun appends the global series

- **WHEN** the newer Final lineage has completed entry/status synchronization, publishes a backed next version, and current inventory uniquely preserves the event-bound prior inventory as an immutable prefix
- **THEN** the appended highest version SHALL count as the first delivery for that newer lineage
- **AND** all earlier versions and lineage evidence SHALL remain unchanged

#### Scenario: Premature final report is phase-boundary violation

- **WHEN** a primary-looking Final file appears before the first Final load or changes the C5-bound inventory before a later Final load
- **THEN** `enter-phase` SHALL reject that new Final entry and audit SHALL report premature terminal output or inventory drift
- **AND** the file SHALL not count as delivery evidence

#### Scenario: Final file existence does not bypass readiness

- **WHEN** a primary-looking Final file exists without a passed Readiness Gate and route-bound Final load
- **THEN** audit SHALL treat it as non-authoritative
- **AND** it SHALL direct the Agent to the latest legal phase or repair path

### Requirement: Final guidance SHALL declare and persist traceable evidence backing

Final guidance SHALL direct the Phase Agent to write a bounded Evidence Map in
every primary Final Markdown report, select its declarations from verified
bundle state, and use the canonical primary publication operation. The Agent
SHALL preserve completed staging until a `committed` result and repair the
reported map row or backing path before rerunning the same operation after a
deterministic rejection.

Every revision SHALL independently pass the existing submitted-backing
admission contract. A prior version's successful backing check SHALL not admit
new bytes by inheritance. The Engine SHALL validate structural declaration,
safe paths, canonical inventory, backing, immutability, version allocation, and
atomic commit; it SHALL not judge report quality or user satisfaction.

This guidance SHALL preserve Final lifecycle semantics: `gate: null`, no
`final_delivery` or satisfaction trace event, no hidden next edge, and no
outgoing transition. Its allowed user feedback loop SHALL remain bounded to
Agent-owned presentation refinement from existing verified evidence.

#### Scenario: Final Markdown delivery uses the one admitted persistence path

- **WHEN** the Phase Agent prepares a first or revised primary Final report in retained staging
- **THEN** guidance SHALL require a bounded Evidence Map and the canonical primary publication operation
- **AND** the report SHALL not be presented as delivered before a committed result and legal Final-entry evidence

#### Scenario: Final backing rejection stays an Agent repair of staging

- **WHEN** canonical publication rejects a report's Evidence Map backing
- **THEN** guidance SHALL direct the Agent to repair retained staging or its legal backing surface and rerun the same operation
- **AND** it SHALL not ask the user to run ordinary commands or create a Gate, status, or report-quality verdict

#### Scenario: Every revision receives independent backing admission

- **WHEN** `final/final.md` was admitted and a different staging report is proposed as `final/final_v1.md`
- **THEN** the new report SHALL be evaluated against current submitted backing before commit
- **AND** prior admission SHALL not authorize the revised bytes

#### Scenario: Final terminal delivery semantics remain unchanged

- **WHEN** a primary Final report commits
- **THEN** Final SHALL remain a terminal lifecycle node with no Gate, normal next phase, status advance, or delivery trace event
- **AND** the Agent MAY continue only the bounded in-place refinement interaction or use audited rerun for evidence expansion

### Requirement: Final SHALL reground in current research intent and current-lineage composition intent

For each first or post-rerun Final composition, the Final Agent SHALL reground
in verified evidence and answerability/limitation surfaces, the HITL1 controls
baseline when present, the newest complete matching Decisions revision when
present, the Wave2 Current Intent Coverage projection when present, and the
current-lineage `composition_handoff`. Research controls and amendments own
research obligations; the handoff owns reader, use, view, foregrounding,
compression, language, evidence exposure, and appendix posture.

Neither owner SHALL substitute for the other. Controls or synthesis SHALL NOT
fill a missing/stale current-lineage composition handoff. Presentation intent
SHALL NOT silently weaken a material research control, contradiction,
limitation, uncertainty, or backing obligation. A material unfulfilled current
research commitment SHALL remain visible in the report under the existing
verified-content rules.

Presentation-only feedback after delivery SHALL continue through the existing
immutable Final version lineage and current user turn; it SHALL NOT rewrite the
controls baseline or create a Decisions revision. Evidence-expanding feedback
continues through the accepted post-Final rerun path before a newer revision can
become current.

#### Scenario: Composition preference cannot hide a hard research limitation

- **WHEN** the current handoff requests a compressed executive view but a current research commitment remains materially limited
- **THEN** Final MAY compress placement and detail while keeping the limitation visible
- **AND** it SHALL not report the commitment as satisfied or omit it because of presentation preference

#### Scenario: Controls cannot manufacture missing delivery semantics

- **WHEN** research controls and coverage are readable but the current-lineage composition handoff is missing or invalid
- **THEN** Final SHALL expose the existing handoff boundary
- **AND** it SHALL not infer reader/view/organization from controls, Decisions, rationale, or chat

#### Scenario: Presentation refinement does not create research history

- **WHEN** the user asks Final only to reorder or reword already verified content
- **THEN** Final SHALL publish the next immutable primary version through the existing path
- **AND** it SHALL not append a research-intent revision or invoke post-Final rerun

### Requirement: Final guidance SHALL bind auxiliary detail archives to their version and maintain the series index

`phase-final.md` SHALL direct the Phase Agent to treat one delivered Final
version as exactly one primary report plus one same-named auxiliary detail
archive directory:

- version N's primary report is `final/final_v<N>.md` (or
  `final/final_<feature>_v<N>.md`); and
- its auxiliary detail archive is the directory `final/final_v<N>/` (or
  `final/final_<feature>_v<N>/`), whose name is the primary report filename with
  its `.md` suffix removed.

A version's auxiliary detail files SHALL live only under that version's own
directory. A primary report's ordinary-prose cross-references to auxiliary
detail SHALL target only its own auxiliary directory; they SHALL NOT use
another version's directory as its detail archive. These prose
cross-references are not Evidence Map backing, which SHALL continue to resolve
only to submitted evidence.

Committed history SHALL remain read-only: older versions' primary reports and
their auxiliary directories SHALL stay byte-identical, and new detail for a
new version SHALL be written only into that new version's files and directory.
A version-decoupled directory name such as `chips/` or `supplement/` SHALL NOT
be created for a version's archive.

The Agent SHALL maintain `final/README.md` as the bundle's single document
authority for the naming and independence convention and the version release
record. On every new committed version the Agent SHALL update `final/README.md`
through the non-primary `persist-final-report` path. `final/README.md` and every
auxiliary detail Markdown SHALL each carry its own bounded Evidence Map and
SHALL NOT become canonical primary delivery or version authority by existing.

#### Scenario: One version pairs a primary report with a same-named archive

- **WHEN** Final composes version N
- **THEN** guidance SHALL require the primary report `final/final_v<N>.md` and the archive directory `final/final_v<N>/`
- **AND** the archive directory name SHALL equal the primary report filename without `.md`

#### Scenario: Auxiliary detail stays inside its version directory

- **WHEN** Final writes auxiliary detail for version N
- **THEN** it SHALL be placed under `final/final_v<N>/`
- **AND** it SHALL NOT be placed under another version's directory or a version-decoupled directory

#### Scenario: Primary report cross-references only its own archive

- **WHEN** a primary report links to auxiliary detail in prose
- **THEN** the link SHALL target its own `final/final_v<N>/`
- **AND** it SHALL NOT target another version's archive directory
- **AND** Evidence Map backing links SHALL continue to resolve only to submitted evidence, not Final output

#### Scenario: History stays read-only across versions

- **WHEN** version M with M < N is committed and version N is later composed
- **THEN** `final/final_v<M>.md` and `final/final_v<M>/` SHALL remain byte-identical
- **AND** new detail for version N SHALL be written only under `final/final_v<N>/`

#### Scenario: Series index is maintained through the non-primary path

- **WHEN** a new committed version exists
- **THEN** the Agent SHALL update `final/README.md` through non-primary `persist-final-report`
- **AND** `final/README.md` SHALL describe the naming and independence convention and the version release record
- **AND** it SHALL carry its own bounded Evidence Map and SHALL NOT count as primary delivery
