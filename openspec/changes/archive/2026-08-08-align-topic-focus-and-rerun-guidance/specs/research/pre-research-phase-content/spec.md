# Pre-Research Phase Content Delta

> req: PRP-012, PRP-014

## MODIFIED Requirements

### Requirement: HITL1 captures controls without expanding lifecycle authority

The HITL1 phase body and brief SHALL invite the user to optionally provide
per-run research controls and an optional natural-language research focus, and
SHALL record the resolved control brief in the canonical host-file subsection.
HITL1 SHALL resolve a material conflict with profile, must-answer, style, or
the proposed Topic map through the existing structured owner before it records
both surfaces. The phase SHALL NOT add a profile field, canonical Topic field,
Gate rule, lifecycle state, file-upload checkpoint, background sync, later
silent-wave writer, or focus parser.

When writing the accepted no-controls or supplied-controls form, HITL1 guidance
SHALL direct the Agent to obtain exact text from the existing pure
`plan-hostfile-sections` renderer, then write that returned text only to the
already Agent-owned `rb_plan.md## Constraints > ### User Research Controls`
coordinate. When an accepted focus exists, the literal source passed to that
renderer SHALL include the user's verbatim focus wording and separately
labelled current Agent interpretation. The renderer remains a presentation
helper, not a host-file writer, focus parser, Topic-state input authority,
profile writer, or Gate authority. If its public command surface is unavailable
or rejects its invocation, guidance SHALL expose that missing-contract or direct
invocation boundary; it SHALL not tell the Agent to imitate a shorter fence,
invent an alternative rendering protocol, or bypass the existing owner.

#### Scenario: material conflict is decided before silent work
- **WHEN** a proposed control or focus materially conflicts with profile,
  must-answer, style, or approved Topic semantics
- **THEN** HITL1 obtains the one needed user decision and updates the existing
  structured owner where necessary
- **AND** later phases do not choose an implicit winner or mutate profile facts
  from the prose brief

#### Scenario: HITL1 uses the reachable controls renderer without widening authority
- **WHEN** a resolved HITL1 controls/focus decision is ready for durable capture
- **THEN** the Agent SHALL use the documented pure renderer and write its
  returned section at the existing host-file coordinate before topic-state apply
- **AND** it SHALL not treat renderer output as profile, Gate, lifecycle, Topic
  state, or focus-coverage authority

#### Scenario: no-controls behavior remains current behavior
- **WHEN** user provides no optional research controls or focus
- **THEN** HITL1 SHALL write the existing exact no-controls form through the
  same renderer and continue the existing accepted topic/profile path
- **AND** it SHALL NOT add a focus-related prompt, state, Gate, or follow-up
  merely because no focus was supplied

### Requirement: HITL1 capture precedes canonical topic-state replacement

After the user decision and any material-conflict resolution are complete,
HITL1 SHALL write the exact URC-001 no-controls or supplied-controls form to
`rb_plan.md` before it creates the retained input for `operate-topic-state
apply`. When a focus is accepted, that form includes the existing literal
user-wording and Agent-interpretation convention. The existing canonical
topic-state transaction SHALL then preserve that current host-file body while
refreshing its frontmatter and Topic Registry presentation. The controls
snapshot SHALL NOT be copied into the topic-state input schema, Topic identity,
seed identity, profile, Gate, or Engine authority fields.

If topic-state apply returns an accepted workspace or recovery boundary, the
Agent SHALL use its existing exact inspect/recover/apply operation. It SHALL
retain and read the already-durable host-file snapshot; it SHALL NOT reconstruct
controls/focus from chat memory, reread an external source path, or ask the
user to repeat a decision whose snapshot remains readable.

#### Scenario: canonical topic-state apply preserves captured controls
- **WHEN** HITL1 captures a valid supplied-controls snapshot containing an
  accepted focus and then applies approved canonical topics
- **THEN** the committed `rb_plan.md` retains the exact controls form while its
  Topic Registry is refreshed
- **AND** the snapshot does not appear in topic-state input, profile, seed
  identity, or Engine authority fields

#### Scenario: topic-state recovery does not lose a snapshot
- **WHEN** topic-state apply leaves an accepted recovery workspace after
  controls/focus were captured
- **THEN** recovery uses the existing workspace owner
- **AND** the active or recovered host file retains the durable controls
  snapshot without an external-path reread or repeated user decision
