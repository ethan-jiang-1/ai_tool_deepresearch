# agent-testing Delta Spec

> req: AGT-009

## ADDED Requirements

### Requirement: Evidence extraction experiment suite SHALL use a new case segment

`experiments_playbook/exp_evidence-extraction/` SHALL define the controlled experiment suite for the `implement-evidence-extraction` mechanism. The suite SHALL use the currently empty 16 case-number segment and start at `case-161` because evidence extraction belongs near research-wave evidence-chain experiments while remaining distinct from existing wave-chain, engine-boundary, and file-observability families.

The suite SHALL include these planned proof roles:

- `case-161-light-complete-cache-trails.md`: fixture-backed Engine path proving delegated `complete()` cache trail filtering, verified ledger writing, incomplete-leaf warning, and unsafe/non-leaf hard-fail.
- `case-162-standard-gate-reentry-cache-coverage.md`: disposable-bundle path proving `count_floor`, `cache_coverage`, file observability `cache_gap`, and `check-reentry` over verified+mapped pass, missing non-empty trail fail, unmapped non-empty trail fail/gap, scoped count_floor, orphan-cannot-pass, and legacy empty trail warning.
- `case-163-heavy-rerun-add-real-cache-trail.md`: real Agent/Sub-agent canary proving new rerun `action:add` prose/task-card behavior can produce `_cache` three-file leaves, reference files, slot result candidate `cache_trails`, Engine ledger trails, mapped cache coverage, and gate/reentry feedback.

Fixture-backed cases SHALL include a Reality Distance Ledger and MUST NOT claim Agent search, judgment, writing, or repair behavior. The heavy case MAY record NOT RUN when no real Agent/Sub-agent surface is available, but it MUST NOT report PASS from fixture data. A NOT RUN heavy case SHALL NOT be interpreted as proof of Agent extraction quality.

`case-163` SHALL report these minimum quality metrics when it runs:

- cache trail coverage: percentage of new rerun `action:add` references with non-empty verified and mapped cache trails
- grounding spot-check: sampled Key Facts supported by `page.md` / source text
- URL precision: counted references use article-level URLs, not homepage/shallow URLs
- countable rate: produced declared references versus `isCountable()` pass count
- gap rate: `cache_gap`, orphan, and empty-trail findings for the new run

Before this change can be archived with a claim that Agent extraction quality is validated, `case-163` SHALL PASS with recorded quality metrics. If `case-163` is NOT RUN, the change MAY still claim Engine auditability / deterministic checkpoint coverage, but it MUST NOT claim that real Agent extraction quality has been proven.

#### Scenario: Evidence extraction cases occupy a new segment
- **WHEN** a contributor adds evidence extraction command experiments
- **THEN** the cases SHALL live under `experiments_playbook/exp_evidence-extraction/`
- **AND** the first case SHALL be numbered `case-161`
- **AND** the suite SHALL NOT append its cases to `exp_engine-boundary` or `exp_file-observability`

#### Scenario: Fixture-backed cases declare production distance
- **WHEN** `case-161` or `case-162` uses fixture slot results or prefilled runtime files
- **THEN** the playbook SHALL include a Reality Distance Ledger
- **AND** the verdict SHALL be interpreted as Engine-path evidence only

#### Scenario: Heavy canary cannot pass without a real Agent actor
- **WHEN** `case-163` runs without a callable real Agent/Sub-agent surface
- **THEN** the playbook SHALL record NOT RUN and preserve diagnostic context
- **AND** it SHALL NOT mark PASS from hand-written fixture output
- **AND** the change SHALL NOT use that NOT RUN result as an Agent extraction quality proof

#### Scenario: Heavy canary records extraction quality metrics
- **WHEN** `case-163` runs with a real Agent/Sub-agent actor
- **THEN** the playbook SHALL record cache trail coverage, grounding spot-check, URL precision, countable rate, and gap rate
- **AND** a PASS verdict SHALL require non-empty verified mapped cache trails for new rerun `action:add` references
- **AND** a PASS verdict SHALL require zero new-run `cache_gap`, orphan, and empty-trail findings
