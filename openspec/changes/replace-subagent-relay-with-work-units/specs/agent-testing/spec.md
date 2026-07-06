> req: AGT-009

## MODIFIED Requirements

### Requirement: Evidence extraction experiment suite SHALL use a new case segment

`experiments_playbook/exp_evidence-extraction/` SHALL define the controlled experiment suite for the `implement-evidence-extraction` mechanism. The suite SHALL use the currently empty segment reserved for evidence-chain experiments, distinct from the existing engine-boundary and file-observability experiment families. The specific starting case number is determined by the first available slot in the segment and documented in the suite README; specs refer to cases by role, not by number.

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
