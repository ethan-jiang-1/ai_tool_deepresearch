> req: CDP-001, CDP-002, CDP-003, CDP-004, CDP-006

## ADDED Requirements

### Requirement: HITL2 SHALL produce a complete accepted composition handoff before readiness

The HITL2 phase guidance SHALL extend its existing research review and one
recommended next action with a compact Chinese-language composition
recommendation containing, at minimum, reader/familiarity, intended use,
primary focus, selected report view, foreground/compress priorities, language,
length, evidence exposure, and appendix posture. It SHALL present these as
reader-facing meaning, not as a schema questionnaire or enum form.

The Phase Agent SHALL resolve the recommendation using the current HITL2
decision boundary: current explicit correction, accepted HITL1 purpose/control,
root must-answer shape, transparent selected-view defaults, then disclosed
system defaults. It SHALL ask only at a material ambiguity frontier; all
currently independent questions MAY be grouped in one clarification message of
no more than three questions, while dependent questions wait for the next turn.

When the user clearly accepts, corrects, or delegates the displayed candidate,
that expression SHALL complete the current semantic decision. The Agent SHALL
write the resolved values to the durable profile owner, update the decision
brief's candidate projection to the accepted projection, and run the existing
HITL2 Gate. It SHALL NOT require a blanket second confirmation.

The phase SHALL not let an unresolved candidate cross the node boundary:
`pending_user` remains pending, `proceed_to_readiness` is not written, and no
passed handoff is attempted until all required v1 fields are resolved. A
correction made while the candidate is still pending SHALL update that
candidate; it SHALL not be silently converted into the context-dependent
`request_view_revision` branch unless the user explicitly chooses to defer
delivery and take that existing action.

The phase SHALL preserve existing HITL2 decision enums and existing rerun,
repair, stop, Gate, status, and route semantics. It SHALL not read or write
composition meaning from `rationale`, raw chat, `custom_slug`, or the decision
brief as a machine owner.

#### Scenario: Complete recommendation is accepted without a second confirmation

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
- **AND** once that clarification is answered, the earlier delivery intent and
  the answer SHALL jointly complete the decision without another confirmation

#### Scenario: Custom view cannot cross with guessed semantics

- **WHEN** `final_report_view` is `custom` but the user has not accepted
  non-empty `view_instructions` covering the intended organization or focus
- **THEN** the phase SHALL remain pending and SHALL not route to Readiness
- **AND** Final SHALL never reconstruct the custom view from slug, rationale,
  or chat

### Requirement: Final SHALL execute one view-aware Report Composition Pass inside the terminal node

Final phase guidance SHALL require the Phase Agent, after legal Readiness entry,
to consume the current accepted `final_report_view` and `composition_handoff`
from the profile together with verified research state. It SHALL not consume a
receipt as a normal source and SHALL not fill missing semantics from rationale,
decision brief, chat, slug, or transparent Final defaults.

The same Final node SHALL execute these five semantic steps in order:

1. **Reground** in the goal, scope, root must-answer set, accepted handoff,
   answerability/limitation surfaces, allowed read graph, and final target;
2. **Answer Inventory** by joining the verified finding index, evidence meaning,
   Wave-local mechanism/limitation material, and submitted-backed references;
3. **Coverage and materiality** by assigning every root must-answer
   `answered`, `partial`, or `unavailable` and retaining material answers,
   contradictions, limitations, confidence boundaries, and backing obligations;
4. **Spine and placement** by selecting one primary narrative spine and deciding
   must-answer order, finding placement, body/appendix boundaries, and explicit
   reasons for omitted P0/P1 material; and
5. **Draft and self-check** before invoking the existing
   `persist-final-report` admission path.

The view mappings SHALL remain distinguishable while sharing the same verified
content obligations:

- `profile_default` starts from the research-profile-appropriate question,
  topic, or claim spine;
- `executive_brief` is decision-first and foregrounds P0/P1, material risks,
  trade-offs, and unknowns;
- `evidence_map` is evidence-first and exposes support, contradiction,
  limitation, confidence, and gaps without replacing the mandatory Evidence Map
  declaration;
- `claim_judgment` is claim-first and states judgment, support, counterevidence,
  conditions, confidence, and residual unknowns;
- `technical_deep_dive` is mechanism/dependency-first and distinguishes
  observed fact, inferred mechanism, and unresolved hypothesis; and
- `custom` follows the accepted non-empty `view_instructions` while remaining
  inside the verified evidence and must-answer boundary.

`foreground`, `compress`, delivery length, evidence exposure, and appendix
preferences SHALL influence ordering, granularity, and presentation only. They
SHALL NOT hide or weaken a material contradiction, limitation, uncertainty,
must-answer obligation, confidence boundary, submitted backing requirement, or
mandatory Evidence Map. Exact section names and paragraph transitions remain
Final Agent judgment.

Final SHALL remain the graph's only terminal delivery node. The guidance SHALL
not add a question, wait, confirmation, feedback loop, outgoing Gate,
transition, delegated production actor, second primary report, or
report-quality deterministic verdict. A failed persistence/backing check SHALL
return to retained staging and the same operation.

#### Scenario: Different views change reading path but not verified meaning

- **WHEN** the same readiness-passed verified state is delivered under two
  accepted handoffs with different standard views
- **THEN** the reports MAY differ in reader framing, spine, order, granularity,
  evidence exposure, and appendix placement
- **AND** finding meaning, status/confidence, limitations, must-answer coverage,
  provenance, and submitted backing SHALL remain consistent

#### Scenario: Material content survives compression

- **WHEN** a handoff asks Final to compress a finding, counterevidence, or
  limitation
- **THEN** Final MAY move non-material detail to an appendix or omit repetition
- **AND** it SHALL retain any content whose absence would change an answer,
  confidence, scope, decision implication, mechanism understanding, or
  limitation visibility

#### Scenario: Final does not reopen HITL2

- **WHEN** Final encounters a missing, unsupported, stale, or drifted handoff
  after legal entry
- **THEN** it SHALL expose the upstream contract boundary and stop the delivery
  claim
- **AND** it SHALL not ask the user, silently default a view, or route back to
  HITL2 from inside Final

#### Scenario: Final persists only after composition self-check and backing admission

- **WHEN** the Composition Pass has completed its coverage/self-check and the
  report contains the required Evidence Map
- **THEN** the Agent SHALL invoke `persist-final-report` and present delivery only
  after a committed result and existing Final-entry evidence
- **AND** a structural backing rejection SHALL be repaired at retained staging
  and rerun through the same operation
