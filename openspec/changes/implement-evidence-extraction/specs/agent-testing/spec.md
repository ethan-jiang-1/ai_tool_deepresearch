# agent-testing Delta Spec

> req: AGT-009

## ADDED Requirements

### Requirement: Evidence extraction experiment suite SHALL use a new case segment

`experiments_playbook/exp_evidence-extraction/` SHALL define the controlled experiment suite for the `implement-evidence-extraction` mechanism. The suite SHALL use the currently empty 16x case-number segment (the `1NN` range reserved for evidence-chain experiments), distinct from the existing `exp_engine-boundary` (40x) and `exp_file-observability` (31x) families. The specific starting case number is determined by the first available slot in the segment and documented in the suite README — specs refer to cases by role, not by number.

The suite SHALL include cases covering these proof roles:

- **Fixture-backed Engine path case** (light): proves delegated `complete()` cache trail filtering — valid verified trails written to ledger, incomplete-leaf warnings with trail filtering, and unsafe/non-leaf path hard-fail rejection. Reality Distance Ledger SHALL state no Agent actor and no external calls.

- **Disposable-bundle gate+reentry case** (standard): proves `count_floor` scoping, `cache_coverage` over verified+mapped/missing/unmapped/empty trails, file observability `cache_gap` detection without introducing a seventh classification, and `check-reentry` integration. SHALL verify that countable orphan reference files cannot satisfy gate pass conditions.

- **Real Agent canary case** (heavy): proves that new rerun `action:add` prose/task-card behavior can drive a real Agent/Sub-agent to produce `_cache` three-file leaves, reference files, slot result `cache_trails`, Engine-verified ledger trails, mapped cache coverage, and gate/reentry feedback. This case MAY record NOT RUN when no real Agent/Sub-agent surface is available.

Fixture-backed cases SHALL include a Reality Distance Ledger and MUST NOT claim Agent search, judgment, writing, or repair behavior. The heavy canary case MUST NOT report PASS from fixture data. A NOT RUN heavy case SHALL NOT be interpreted as proof of Agent extraction quality.

The heavy canary case SHALL report these minimum quality metrics when it runs:

- cache trail coverage: percentage of new rerun `action:add` references with non-empty verified and mapped cache trails
- grounding spot-check: sampled Key Facts supported by `page.md` / source text
- URL precision: counted references use article-level URLs, not homepage/shallow URLs
- countable rate: produced declared references versus `isCountable()` pass count
- gap rate: `cache_gap`, orphan, and empty-trail findings for the new run

Before this change can be archived with a claim that Agent extraction quality is validated, the heavy canary case SHALL PASS with recorded quality metrics. If the heavy canary case is NOT RUN, the change MAY still claim Engine auditability / deterministic checkpoint coverage, but it MUST NOT claim that real Agent extraction quality has been proven.

#### Scenario: Evidence extraction cases occupy a new segment
- **WHEN** a contributor adds evidence extraction command experiments
- **THEN** the cases SHALL live under `experiments_playbook/exp_evidence-extraction/`
- **AND** the suite README SHALL document which case-number segment is used and why this mechanism is not a continuation of `exp_engine-boundary` or `exp_file-observability`
- **AND** the cases SHALL NOT be appended to existing experiment directories

#### Scenario: Fixture-backed cases declare production distance
- **WHEN** a light or standard fixture-backed case in this suite uses fixture slot results or prefilled runtime files
- **THEN** the playbook SHALL include a Reality Distance Ledger
- **AND** the verdict SHALL be interpreted as Engine-path evidence only

#### Scenario: Heavy canary cannot pass without a real Agent actor
- **WHEN** the heavy canary case runs without a callable real Agent/Sub-agent surface
- **THEN** the playbook SHALL record NOT RUN and preserve diagnostic context
- **AND** it SHALL NOT mark PASS from hand-written fixture output
- **AND** the change SHALL NOT use that NOT RUN result as an Agent extraction quality proof

#### Scenario: Heavy canary records extraction quality metrics
- **WHEN** the heavy canary case runs with a real Agent/Sub-agent actor
- **THEN** the playbook SHALL record cache trail coverage, grounding spot-check, URL precision, countable rate, and gap rate
- **AND** a PASS verdict SHALL require non-empty verified mapped cache trails for new rerun `action:add` references
- **AND** a PASS verdict SHALL require zero new-run `cache_gap`, orphan, and empty-trail findings
