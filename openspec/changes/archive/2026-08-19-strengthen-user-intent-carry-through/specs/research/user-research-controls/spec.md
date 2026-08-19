> req: URC-004

## ADDED Requirements

### Requirement: User research controls SHALL remain the HITL1 baseline for later amendments

After HITL1 and its existing bounded source-access alignment are resolved,
`rb_plan.md## Constraints > ### User Research Controls` SHALL remain the
baseline research-control snapshot for the run. A later accepted HITL2 or
post-Final rerun SHALL NOT rewrite that baseline to make a new preference look
original; it SHALL record the post-HITL1 change in the existing Decisions
revision history.

For a run with accepted rerun revisions, current research intent SHALL mean the
baseline plus the newest complete revision's cumulative active amendments. The
newest revision MAY add, strengthen, replace, or withdraw a post-HITL1
requirement, but it SHALL NOT silently erase or relabel the baseline. A material
conflict with an immutable baseline constraint remains visible and follows the
existing user-decision or limitation boundary. When no revision exists, the
baseline retains its existing meaning without an empty amendment record.

The baseline and revision prose remain Agent/user narrative guidance. Neither
surface SHALL become an Engine semantic input, permission token, Gate override,
or substitute for canonical Topic, profile, provenance, or submitted evidence.

#### Scenario: Later preference is an amendment rather than a baseline rewrite

- **WHEN** HITL1 records a source preference and a later legal rerun accepts a narrower source requirement
- **THEN** the original controls snapshot SHALL remain unchanged
- **AND** the newest Decisions revision SHALL state the narrower requirement in its current active amendments

#### Scenario: Withdrawal does not erase the historical decision

- **WHEN** a later rerun withdraws an amendment introduced by an earlier rerun
- **THEN** the newest revision SHALL omit it from the current active set and name the withdrawal
- **AND** the older accepted revision SHALL remain unchanged as history

#### Scenario: No rerun preserves the current controls path

- **WHEN** a run has no accepted post-HITL1 revision
- **THEN** the controls snapshot SHALL keep its current baseline meaning
- **AND** no empty Decisions revision, profile field, or inferred amendment SHALL be created
