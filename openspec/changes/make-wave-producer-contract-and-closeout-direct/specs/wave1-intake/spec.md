## MODIFIED Requirements

### Requirement: Inline backfill after each task completion

Inline backfill after delegated Wave1 completion SHALL occur after successful work-unit submit and ledger append. Backfill SHALL not treat claimed or invalid-submitted attempts as completed.

The Phase Agent SHALL perform the submitted-backed closeout for the returned topic in one visible post-submit checklist: materialize the consumer reference/index projection where current submitted backing permits it, write or update the Phase-owned `depth-review.yaml`, replace the applicable Wave1 seed return-map tokens with evidence meaning and concrete navigation refs, then rerun the corresponding Wave inspect. The Sub-agent SHALL provide its bounded result, source claims, cache trails and receipts only; it SHALL NOT own rich reference presentation, depth judgment, seed token replacement, ledger append, cache declaration repair, or inspect/Gate authority.

#### Scenario: invalid submit does not trigger backfill

- **WHEN** a Wave1 submit is rejected as invalid
- **THEN** inline backfill SHALL not run for that queue demand

#### Scenario: submitted return triggers Phase-owned closeout

- **WHEN** a Wave1 work unit formally submits its required outputs and backing
- **THEN** phase guidance SHALL direct the Phase Agent to complete reference/index, depth-review and seed return-map closeout before Wave inspect
- **AND** the guidance SHALL not describe any of those outputs as a Sub-agent required receipt
