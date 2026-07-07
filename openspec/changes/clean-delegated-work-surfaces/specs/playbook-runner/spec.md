> req: PLR-003

## MODIFIED Requirements

### Requirement: Runner execution contract and report

Runner execution SHALL open the active runner instruction surface, select current playbooks, execute each selected playbook step by step, run every bash block and verdict, collect post-run health before cleanup, and report verdict and health status.

Accepted `playbook-runner` still defines `experiments_playbook/RUN.md` as runner entry; current repository implementation MAY use `experiments_playbook/RUN_EXPS.md` while this drift is explicit. Active runner surfaces SHALL NOT conflict on health, cleanup, report policy, or current-vs-legacy classification.

Current runner surfaces SHALL NOT list old relay/slot playbooks as current production proof. A playbook that depends on retired relay/slot production mechanisms SHALL be triaged for current value. If it can still prove or diagnose current work-unit behavior, it SHALL be migrated to the work-unit path. If it cannot, it SHALL be removed from current runner surfaces. A legacy/backlog label MAY be used only as a temporary review state or for a clearly valuable follow-on migration target; it SHALL NOT be a permanent parking lot for obsolete production examples.

Report SHALL include:

- selected case count, PASS count, FAIL count
- each FAIL case and failure reason summary
- group statistics for light, standard, heavy, legacy/backlog, and human cases when applicable
- each executed case's verdict, health, optional `not_run_reason`, and `bundle_preserved`
- PASS verdict with health issues as PASS plus HEALTH ISSUES, not a collapsed verdict

Cleanup policy SHALL preserve the disposable bundle by default when verdict is FAIL or health is ISSUES, unless the playbook explicitly documents a safe cleanup exception.

#### Scenario: Full selected suite passes with clean health

- **WHEN** the agent executes selected current playbooks and all verdicts PASS
- **AND** post-run health reports are all CLEAN
- **THEN** the report SHALL show selected case count, PASS count, 0 FAIL, and 0 HEALTH ISSUES

#### Scenario: Mixed verdict and health status

- **WHEN** some selected playbooks FAIL or report health ISSUES
- **THEN** the report SHALL list each FAIL case with a trace or diagnostic summary
- **AND** the report SHALL list each HEALTH ISSUES case with concise health summary
- **AND** the report SHALL provide PASS/FAIL and CLEAN/ISSUES totals

#### Scenario: Passing verdict with health issues remains distinguishable

- **WHEN** a playbook verdict is PASS but post-run health is ISSUES
- **THEN** runner report SHALL show verdict PASS and health ISSUES as separate fields
- **AND** cleanup SHALL preserve the bundle by default for failure analysis

#### Scenario: Active runner surface drift is explicit

- **WHEN** implementation updates runner health or cleanup instructions
- **THEN** it SHALL identify whether `experiments_playbook/RUN_EXPS.md`, `experiments_playbook/RUN.md`, or both are active
- **AND** it SHALL update the active surface first
- **AND** if both files remain active, their health, cleanup, report, and legacy/backlog policies SHALL agree

#### Scenario: old relay playbook is migrated or removed

- **WHEN** a runner surface names a playbook that still depends on retired relay/slot production mechanisms
- **THEN** the playbook SHALL be migrated to prove a current work-unit behavior or removed from current runner surfaces
- **AND** it SHALL NOT remain visible as current work-unit production proof
- **AND** any temporary legacy/backlog classification SHALL state the follow-on migration value or removal reason
