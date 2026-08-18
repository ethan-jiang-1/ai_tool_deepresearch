> req: STM-009

## ADDED Requirements

### Requirement: Seed materialization SHALL project applicable baseline intent into existing topic-local surfaces

When the HITL1 controls baseline materially affects a canonical Topic, the
Seed Topics Agent SHALL express the smallest topic-local operational
interpretation through the existing `enrich_seed` input and initialization
body. It SHALL use `search_guardrails` and `evidence_route`, add or refine
`hypothesis` and `in_scope` only when needed, and explain the Topic's research
or delivery relevance in the existing non-duplicating body. The complete
controls snapshot SHALL remain only at its host-file coordinate.

When a control does not apply to a Topic, the Agent SHALL not create an empty
or decorative projection. When upstream meaning is insufficient, it SHALL use
the existing explicit non-empty gap form rather than invent intent. The
projection SHALL NOT change canonical Topic identity, add frontmatter fields,
copy full user wording, pre-author future Wave task briefs, or become a Gate or
Engine semantic verdict.

#### Scenario: Source restriction reaches an affected Topic

- **WHEN** the controls baseline requires a source policy that materially affects one canonical Topic
- **THEN** the Topic's existing search guardrails and evidence route SHALL contain a bounded topic-local interpretation
- **AND** the full controls snapshot SHALL remain at the original plan coordinate

#### Scenario: Unaffected Topic receives no copied control brief

- **WHEN** a baseline control has no material effect on another Topic
- **THEN** Seed materialization SHALL retain the normal enrichment path for that Topic
- **AND** it SHALL not copy the control, create an empty intent field, or alter Topic identity

#### Scenario: Missing semantic detail remains an explicit gap

- **WHEN** the baseline does not provide enough detail for a required enrichment value
- **THEN** the Agent SHALL write the existing structurally valid explicit gap
- **AND** neither Agent nor Engine SHALL fabricate a more specific interpretation
