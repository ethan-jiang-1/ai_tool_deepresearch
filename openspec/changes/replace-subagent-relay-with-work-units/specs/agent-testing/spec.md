> req: AGT-003, AGT-009

## MODIFIED Requirements

### Requirement: Three-level real subagent test playbooks (AGT-003)

The real subagent test playbook family SHALL exercise sub-agent actor behavior through work-unit claim, bounded prompt execution, submit, submitted ledger coverage, and gate-visible provenance. It SHALL keep light/standard/heavy levels, but production-path assertions SHALL use work-unit artifacts and Engine submit results.

#### Scenario: simple subagent playbook uses work-unit path

- **WHEN** the simple real subagent playbook runs
- **THEN** it SHALL claim a work unit, spawn a bounded sub-agent task, submit by `work_id`, and verify submitted ledger coverage

### Requirement: Runtime-agent trace events prove real execution path (AGT-003)

Runtime-agent trace evidence SHALL bind to work-unit lifecycle events and submitted work-unit identity. The playbook SHALL prove that the sub-agent actor actually ran by checking Engine and runtime evidence associated with `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`.

#### Scenario: runtime evidence binds work unit

- **WHEN** a sub-agent result is accepted
- **THEN** the trace and log evidence SHALL identify the submitted work unit
- **AND** the verdict SHALL not depend on unsubmitted filesystem artifacts

### Requirement: Runtime-agent evidence is mandatory (AGT-003)

The real subagent test suite SHALL require sub-agent-written runtime receipts and Engine-validated work-unit submit output for real LLM sub-agent acceptance.

#### Scenario: missing runtime evidence fails real-agent proof

- **WHEN** a claimed work unit lacks matching runtime evidence for its receipt nonce
- **THEN** the real subagent playbook SHALL NOT claim proof of real sub-agent execution

### Requirement: Evidence extraction experiment suite SHALL use a new case segment

`experiments_playbook/exp_evidence-extraction/` SHALL define the controlled experiment suite for the `implement-evidence-extraction` mechanism. The suite SHALL use the currently empty segment reserved for evidence-chain experiments, distinct from the existing engine-boundary and file-observability experiment families. The specific starting case number is determined by the first available case-number position in the segment and documented in the suite README; specs refer to cases by role, not by number.

The suite SHALL include cases covering these proof roles:

- **Fixture-backed Engine path case** (light): proves work-unit submit cache trail verification, including valid verified trails written to ledger, incomplete-leaf warnings with trail filtering, and unsafe/non-leaf path fail-closed rejection. Reality Distance Ledger SHALL state no Agent actor and no external calls.
- **Disposable-bundle gate+reentry case** (standard): proves `count_floor` scoping, `cache_coverage` over verified+mapped/missing/unmapped/empty trails, file observability `cache_gap` detection without introducing a seventh classification, and `check-reentry` integration. It SHALL verify that countable orphan reference files cannot satisfy gate pass conditions.
- **Real Agent canary case** (heavy): proves that new rerun `action:add` prose/task-card behavior can drive a real Agent/sub-agent to produce cache leaves, reference files, work-unit result `cache_trails`, Engine-verified ledger trails, mapped cache coverage, and gate/reentry feedback. This case MAY record NOT RUN when no real Agent/sub-agent surface is available.

Fixture-backed cases SHALL include a Reality Distance Ledger and MUST NOT claim Agent search, judgment, writing, or repair behavior. The heavy canary case MUST NOT report PASS from fixture data. A NOT RUN heavy case SHALL NOT be interpreted as proof of Agent extraction quality.

The heavy canary case SHALL report these minimum quality metrics when it runs:

- cache trail coverage: percentage of new rerun `action:add` references with non-empty verified and mapped cache trails
- grounding spot-check: sampled Key Facts supported by cached page/source text
- URL precision: counted references use article-level URLs, not homepage/shallow URLs
- countable rate: produced declared references versus `isCountable()` pass count
- gap rate: `cache_gap`, orphan, and empty-trail findings for the new run

#### Scenario: fixture case uses work-unit submit

- **WHEN** the fixture-backed Engine path case runs
- **THEN** it SHALL exercise `operate-work-unit submit` validation and ledger append semantics
- **AND** its verdict SHALL not depend on non-work-unit delegated completion

#### Scenario: real canary reports work-unit evidence quality

- **WHEN** the real Agent canary runs
- **THEN** it SHALL report cache, grounding, URL precision, countable-rate, and gap-rate metrics from submitted work-unit outputs
