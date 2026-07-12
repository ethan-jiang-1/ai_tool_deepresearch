> req: QIV-007

## ADDED Requirements

### Requirement: Enqueue SHALL accept only current UID-bound layout

Topic-scoped enqueue SHALL resolve the requested current slug to one canonical UID and persist both values in payload. Omitted UID SHALL be deterministically filled; a caller-supplied UID/current-slug mismatch, previous-layout slug, accepted topic-state workspace or noncanonical plan SHALL reject before queue mutation with one nearest action. Historical aliases SHALL be readable for provenance only and SHALL NOT reopen work eligibility.

#### Scenario: Historical slug cannot enqueue
- **WHEN** a task card names a slug present only in `previous_layouts[]`
- **THEN** enqueue SHALL reject without mutation and return the topic's current slug

#### Scenario: Accepted layout workspace short-circuits enqueue
- **WHEN** a topic layout operation remains prepared or partially committed
- **THEN** enqueue SHALL return the exact recover action before evaluating derivative UID/slug symptoms
