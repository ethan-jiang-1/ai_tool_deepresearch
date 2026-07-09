> req: RWE-011

## ADDED Requirements

### Requirement: Wave experiments SHALL cover timeout preflight and progress lease behavior

Controlled wave fault-tolerance or progress-lease playbook coverage SHALL prove the timeout-preflight behavior that protects delegated work units from premature wall-clock terminalization. The coverage SHALL use real disposable bundle state and production work-unit CLI/API boundaries after fixture setup. Disposable bundles SHALL be created through approved shared experiment infrastructure, then validated/inspected before mechanism execution when the playbook claims production-path evidence.

The playbook MAY use fixture-backed result, receipt, output, or cache surfaces to exercise Engine-layer timeout decisions, but such fixtures SHALL be explicitly labeled as fixture facts or Engine-layer evidence. The playbook SHALL not hand-edit submitted ledger rows, fake runtime receipts as real Sub-agent output, claim fixture-backed checks prove real search/fetch quality, or bypass `operate-work-unit` boundaries for facts that production reaches through the work-unit CLI/API.

The experiment coverage SHALL include at least these cases:

- no-progress claimed attempt whose effective idle lease has expired is timeout-eligible and can enter the existing timeout retry path;
- progress-positive claimed attempt is not timeout-eligible and default timeout refuses terminalization without creating retry demand through production work-unit CLI/API boundaries;
- candidate result that dry-submit would pass is routed to formal submit advice;
- candidate result that dry-submit rejects with repair diagnostics is routed to same-`work_id` repair advice;
- candidate result with wrong identity, terminal status, invalid binding, or ambiguous authority is routed to inspect/block rather than same-`work_id` repair;
- optional `timeout-preflight --result <candidate>` follows dry-submit candidate path semantics and external-candidate mtime non-extension;
- explicit forced timeout records force diagnostics, including structured `progress_sources[]`;
- normal submit after terminal timeout remains rejected, preserving the existing late-submit fail-closed contract until a later audited late-accept change explicitly modifies it.

Verdicts SHALL come from trace, CLI JSON output, and bundle authority files rather than console-only summaries. Critical runtime assertions SHALL be recorded as trace `check` events or equivalent accepted verdict entries so a runner can audit pass/fail from the disposable bundle. Any fixture distance SHALL be recorded in the playbook's reality-distance ledger or result interpretation. PASS cleanup and FAIL preserve-for-diagnosis behavior SHALL follow the command-experiments guideline.

#### Scenario: no-progress timeout retry remains valid

- **WHEN** a controlled wave case creates a claimed work unit with no result, no progress receipt, no output/cache progress, and an expired effective idle lease
- **THEN** timeout-preflight SHALL report timeout eligibility
- **AND** default timeout SHALL requeue retry through the existing REDO path

#### Scenario: progress-positive timeout is refused

- **WHEN** a controlled wave case creates a claimed work unit with recent Engine-observed progress
- **THEN** timeout-preflight SHALL report `timeout_eligible: false`
- **AND** default timeout through production work-unit CLI/API boundaries SHALL leave queue/index/status/ledger/retry surfaces unchanged

#### Scenario: submit-ready candidate routes to submit

- **WHEN** a controlled wave case creates a candidate result that dry-submit would accept
- **THEN** timeout-preflight SHALL recommend formal submit
- **AND** the case SHALL verify that timeout is not the recommended terminal path

#### Scenario: caller-provided candidate path follows dry-submit semantics

- **WHEN** a controlled wave case supplies `timeout-preflight --result <candidate-result>`
- **AND** the candidate path would be valid or invalid under dry-submit candidate path rules
- **THEN** timeout-preflight SHALL classify the candidate consistently with dry-submit
- **AND** the case SHALL verify the recommendation through CLI JSON and runtime assertions
- **AND** an external candidate file mtime alone SHALL NOT extend the work-unit idle lease

#### Scenario: repairable candidate routes to repair

- **WHEN** a controlled wave case creates a candidate result that dry-submit rejects with repair diagnostics
- **THEN** timeout-preflight SHALL recommend repair of the same `work_id`
- **AND** the attempt SHALL remain claimed

#### Scenario: invalid candidate authority routes to inspect or block

- **WHEN** a controlled wave case creates a candidate result with wrong `work_id`, terminal attempt status, invalid queue binding, or ambiguous authority
- **THEN** timeout-preflight SHALL recommend `inspect` or `block`
- **AND** the case SHALL verify that the candidate is not treated as same-`work_id` repair
- **AND** default timeout SHALL not terminalize the attempt

#### Scenario: forced timeout records audit evidence

- **WHEN** a controlled wave case uses `operate-work-unit timeout --force` on a progress-positive attempt
- **THEN** the resulting trace/log or equivalent diagnostic surface SHALL record forced timeout evidence, including structured `progress_sources[]`
- **AND** the playbook SHALL assert that the terminal attempt remains fail-closed and non-covering

#### Scenario: late submit remains fail closed

- **WHEN** a work unit has already been terminalized as `timed_out`
- **THEN** ordinary `operate-work-unit submit` SHALL still reject that terminal attempt
- **AND** the playbook SHALL not describe audited late accept as available in this change
