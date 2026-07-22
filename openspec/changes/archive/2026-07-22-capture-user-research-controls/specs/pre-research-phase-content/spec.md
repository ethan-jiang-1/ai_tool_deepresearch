## ADDED Requirements

> req: PRP-012, PRP-013, PRP-014

### Requirement: HITL1 captures controls without expanding lifecycle authority

The HITL1 phase body and brief SHALL invite the user to optionally provide per-run research controls and SHALL record the resolved control brief in the canonical host-file subsection. HITL1 SHALL resolve a material conflict with profile, must-answer, or style through the existing structured owner before it records both surfaces. The phase SHALL NOT add a profile field, Gate rule, lifecycle state, file-upload checkpoint, background sync, or later silent-wave writer for the controls.

#### Scenario: material conflict is decided before silent work
- **WHEN** a proposed control materially conflicts with profile or must-answer meaning
- **THEN** HITL1 obtains the one needed user decision and updates the existing structured owner where necessary
- **AND** later phases do not choose an implicit winner or mutate profile facts from the prose brief

### Requirement: Research phases consume the original host-file coordinate

Seed Topics, Wave0, Wave1, Wave2 and Final guidance SHALL tell the Agent to read the original user-controls coordinate when controls are present, alongside existing profile, topic and verified evidence inputs. Seed MAY author topic-local `search_guardrails` and `evidence_route` projections, but those projections SHALL NOT replace the original brief. Final SHALL make a material unfulfilled control or evidence limitation visible rather than silently pretending it was satisfied.

#### Scenario: no-controls behavior remains current behavior
- **WHEN** the explicit no-controls form or legacy absence applies
- **THEN** Seed, Wave, and Final retain current guidance without a copied empty brief or added control-specific work

### Requirement: HITL1 capture precedes canonical topic-state replacement

After the user decision and any material-conflict resolution are complete, HITL1 SHALL write the exact URC-001 no-controls or supplied-controls form to `rb_plan.md` before it creates the retained input for `operate-topic-state apply`. The existing canonical topic-state transaction SHALL then preserve that current host-file body while refreshing its frontmatter and Topic Registry presentation. The controls snapshot SHALL NOT be copied into the topic-state input schema or seed identity fields.

If topic-state apply returns an accepted workspace or recovery boundary, the Agent SHALL use its existing exact inspect/recover/apply operation. It SHALL retain and read the already-durable host-file snapshot; it SHALL NOT reconstruct controls from chat memory, reread an external source path, or ask the user to repeat a decision whose snapshot remains readable.

#### Scenario: canonical topic-state apply preserves captured controls
- **WHEN** HITL1 captures a valid supplied-controls snapshot and then applies approved canonical topics
- **THEN** the committed `rb_plan.md` retains the exact controls form while its Topic Registry is refreshed
- **AND** the snapshot does not appear in topic-state input, profile, seed identity, or Engine authority fields

#### Scenario: topic-state recovery does not lose a snapshot
- **WHEN** topic-state apply leaves an accepted recovery workspace after controls were captured
- **THEN** recovery uses the existing workspace owner
- **AND** the active or recovered host file retains the durable controls snapshot without an external-path reread or repeated user decision
