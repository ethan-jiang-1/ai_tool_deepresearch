> req: RES-007

## ADDED Requirements

### Requirement: Topic-state add SHALL reuse the existing research-style owner

When topic-state add commits and changes registry length, its structured result SHALL identify the existing `apply-research-style.mjs` path as the one required follow-up. Research-style computation SHALL read only committed registry length and preserve unrelated profile sections under its existing contract. Prepared/blocked topic-state workspaces SHALL NOT affect profile calculation, and topic-state code SHALL NOT directly mutate profile fields.

#### Scenario: Add recomputes style after commit
- **WHEN** add-topic commits successfully
- **THEN** the Agent SHALL run the existing research-style CLI using the committed registry before the active HITL1 or rerun readiness gate
