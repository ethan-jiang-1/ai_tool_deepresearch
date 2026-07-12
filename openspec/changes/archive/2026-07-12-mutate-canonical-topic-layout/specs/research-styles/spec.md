> req: RES-008

## ADDED Requirements

### Requirement: Safe topic removal SHALL reuse the existing research-style owner

When a committed layout operation safely removes an unstarted topic and changes registry length, its structured result SHALL identify the existing `apply-research-style.mjs` follow-up. Topic-state code SHALL not write profile fields, and rename/reorder without count change SHALL not trigger style recomputation.

#### Scenario: Safe remove recomputes style once
- **WHEN** layout commit reduces canonical registry length
- **THEN** the Agent SHALL run the existing style CLI before the rerun-ready gate
- **AND** topic-state helper SHALL leave unrelated profile sections untouched
