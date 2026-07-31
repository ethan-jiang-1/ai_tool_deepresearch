> req: EXR-006

## MODIFIED Requirements

### Requirement: case-406 SHALL verify real Sub-agent boundary path

case-406 SHALL verify a real sub-agent boundary through work-unit claim, work-unit task/beacon, Subject-owned lifecycle receipt/result/output/cache evidence, `operate-work-unit submit`, submitted ledger, and submit trace coverage. It SHALL use only the work-unit delegated CLI path.

case-406 SHALL be a no-network actor-boundary canary, not a Wave0 Phase-ready proof. Its native required checks SHALL stop at the submitted actor checkpoint and SHALL NOT require `wave0-gate-pass`, fabricate `wave0_evidence`, or otherwise establish a Phase-owned canonical projection. A separate Wave0 playbook with the complete Phase-owned inputs SHALL remain responsible for a Wave0 Gate claim.

#### Scenario: real sub-agent returns through submit

- **WHEN** the real sub-agent completes its assigned task
- **THEN** the return SHALL be accepted only through `operate-work-unit submit`

#### Scenario: actor boundary result is independent of Wave0 readiness

- **WHEN** case-406 has valid Subject task, receipt, result, output, submit, ledger, and trace facts but no Phase-owned Wave0 projection
- **THEN** its native actor-boundary verdict SHALL evaluate those submitted Actor facts without a Wave0 Gate required check
- **AND** the verdict SHALL not claim that Wave0 is ready or that the Wave0 Gate passed
