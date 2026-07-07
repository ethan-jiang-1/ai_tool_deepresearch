## REMOVED Requirements

> req: EXR-003

### Requirement: case-403 SHALL verify content_dedup via Engine-generated ledger

**Reason**: `content_dedup` is retired as a historical gate patch. Keeping a current playbook that proves duplicate URL, homepage, Jaccard, or self-reference failures would continue teaching the framework that these heuristics are valid quality-loop feedback.

**Migration**: Remove `experiments_playbook/exp_engine-boundary/case-403-light-gate-content-dedup.md` from current runner surfaces, or rewrite the slot as a current work-unit provenance/cache/ledger coverage case that does not mention `content_dedup`, duplicate URL, homepage, Jaccard, or self-reference heuristics. `experiments_playbook/RUN_EXPS.md`, shared experiment helpers, and health-report checks SHALL stop requiring `content_dedup` evidence.

#### Scenario: content_dedup playbook is not current proof

- **WHEN** current experiment runner surfaces are listed
- **THEN** no active case SHALL present `content_dedup` as a current gate or diagnostic proof
- **AND** no active verdict SHALL require URL duplicate, homepage, Jaccard, or self-reference heuristic failure

#### Scenario: Current provenance experiments use accepted authority

- **WHEN** engine-boundary experiments verify delegated reference authority
- **THEN** they SHALL use work-unit submit, declaration ledger coverage, cache trail validation, provenance/hash checks, trace single-sink checks, or queue boundary checks
- **AND** they SHALL NOT depend on retired `content_dedup` evidence
