> req: WNC-001

## MODIFIED Requirements

### Requirement: Phase node metadata contract

Phase node metadata SHALL describe lifecycle phase nodes, shared guidance, and work-unit sub-agent task guidance without using removed delegated mechanism names as production surfaces. `execution_contract` SHALL remain Agent-readable and validator-enforceable guidance, but deterministic authority SHALL come from queue state, submitted work-unit ledger rows, trace, and gate CLI verdicts.

`phase-hitl1.md` SHALL declare `execution_contract.search_policy: direct_retrieval_probe_only`. The workflow consistency validator SHALL recognize that value as the expected HITL1 policy. It SHALL authorize only the single bounded research-access search/fetch probe defined by the HITL1 phase contract; it SHALL NOT authorize research evidence collection, work-unit delegation, or a second lifecycle execution surface. Other lifecycle nodes SHALL retain their existing expected search policies.

#### Scenario: delegated metadata names work-unit guidance

- **WHEN** a phase node references delegated guidance
- **THEN** the metadata SHALL identify work-unit sub-agent task guidance and submitted coverage requirements

#### Scenario: HITL1 metadata matches its bounded probe behavior

- **WHEN** workflow consistency validation reads `phase-hitl1.md`
- **THEN** `direct_retrieval_probe_only` SHALL be accepted as the valid and expected HITL1 search policy
- **AND** `no_search` or a general research-search policy on HITL1 SHALL be reported as an execution-contract mismatch
