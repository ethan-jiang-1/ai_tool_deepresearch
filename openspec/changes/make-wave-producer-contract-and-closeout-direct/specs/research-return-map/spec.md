## MODIFIED Requirements

### Requirement: Seed-topic backfill SHALL preserve traceable meaning, not only evidence lists or conclusions

Seed-topic backfill for Wave0, Wave1, and Wave2 SHALL replace backfill tokens with concise map entries that combine evidence meaning with traceable refs. Backfill SHALL NOT be only a naked list of URLs, only a prose conclusion, or only a count summary.

Wave0 backfill SHALL connect sources/references to must-answers and initial hypotheses. Wave1 backfill SHALL connect mechanism/trend/open-question updates to evidence-summary, question-list, reference, cache, and work-unit refs. Wave2 backfill SHALL preserve finding IDs and link to `cross-topic-ledger.md` and `finding-index.yaml` entries used for projection.

For Wave1, the Phase Agent SHALL perform this backfill only after the exact work-unit rows it relies on have formally submitted and after materializable consumer references have been created from that submitted backing. A Sub-agent SHALL not replace seed tokens, and a claimed, rejected, filesystem-only, or dry-submit-only work unit SHALL not be represented as completed evidence. This preserves the existing return-map navigation role and does not make token replacement, token absence, or map prose delegated coverage authority.

#### Scenario: Wave1 backfill explains what was learned

- **WHEN** the Phase Agent updates `__BACKFILL_WAVE1_MECHANISMS__` from formally submitted Wave1 work
- **THEN** the replacement content SHALL include one or more mechanism/trend statements
- **AND** each statement SHALL include refs to the evidence-summary or question-list and supporting concrete reference/cache/work-unit surfaces where available

#### Scenario: rejected work leaves token ownership unresolved

- **WHEN** a Wave1 work unit is rejected before formal submit
- **THEN** the Phase Agent SHALL not replace its corresponding seed backfill token with an evidence-completion claim
- **AND** it SHALL follow the returned existing submit disposition instead of creating a placeholder or filesystem-only backfill

#### Scenario: Wave2 backfill preserves finding lineage

- **WHEN** a Wave2 backfill task updates `__BACKFILL_WAVE2_JUDGMENT__`
- **THEN** the replacement content SHALL cite relevant finding IDs
- **AND** it SHALL link those findings back to `finding-index.yaml`, `cross-topic-ledger.md`, and source artifacts used by the finding
