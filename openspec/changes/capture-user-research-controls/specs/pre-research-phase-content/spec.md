## ADDED Requirements

> req: PRP-012, PRP-013

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
