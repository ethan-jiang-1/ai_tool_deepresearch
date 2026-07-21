> req: RWP-015

## MODIFIED Requirements

### Requirement: Work-unit role guidance SHALL be Phase-Agent-loaded guidance

Role guidance SHALL remain work-unit Sub-agent task guidance. The Phase Agent SHALL load the role guidance selected by the current wave's registered work-unit kind so it can construct demand and interpret returned Engine feedback, while the Engine-derived generated task/spawn prompt SHALL also give the selected actor the same canonical role-guidance ref and resolved read path. The actor SHALL read that guidance and its explicit shared guidance refs before executing search, fetch or output authoring. Role guidance SHALL remain subordinate to the current assignment's exact `required_outputs[]` and SHALL not turn supplementary work into an implicit primary pair.

Active phase docs SHALL not instruct the Phase Agent to load non-work-unit role protocols as production execution protocol, manually copy a role template into each spawn prompt, choose an arbitrary role file or author direct-contract semantics. The Phase Agent retains queue/claim/dry-submit/repair/submit responsibility; direct role delivery SHALL not give the actor lifecycle, Gate, user-interaction or contract-selection authority.

#### Scenario: role guidance uses work-unit protocol
- **WHEN** delegated task guidance is loaded by the Phase Agent or selected actor
- **THEN** it SHALL describe the same work-unit task/result/receipt expectations and role-specific research/output responsibilities
- **AND** the generated task SHALL bind both readers to the canonical role selected from the registered work-unit kind

#### Scenario: Phase Agent does not hand-author actor contract delivery
- **WHEN** the Phase Agent receives a claim result with generated task and spawn prompt
- **THEN** it SHALL pass the generated actor surface without rewriting headings, role identity or fallback tiers
- **AND** it SHALL run the existing dry-submit/replacement loop after actor return rather than repair actor-owned semantic output or ask the user to operate it
