> req: PLR-003

## MODIFIED Requirements

### Requirement: Runner execution contract and report (PLR-003)

Runner execution SHALL open the active runner instruction surface, select current playbooks, execute each selected playbook step by step, run every bash block and verdict, collect post-run health before cleanup, and report verdict and health status.

Accepted `playbook-runner` still defines `experiments_playbook/RUN.md` as runner entry; current repository implementation MAY use `experiments_playbook/RUN_EXPS.md` while this drift is explicit. Active runner surfaces SHALL NOT conflict on health, cleanup, report policy, or current/removed/migrated case classification.

Current runner surfaces SHALL NOT list old relay/slot playbooks, old hand-written delegated ledger fixtures, old queue slot-shape playbooks, or obsolete JS helper cases as current production proof. A playbook that depends on retired relay/slot production mechanisms, invalid non-delegated queue paths, or old delegated ledger rows SHALL be triaged for current value. If it can still prove or diagnose current work-unit or queue v2 behavior, it SHALL be migrated to the current path. If it cannot, it SHALL be removed from current runner surfaces and the obsolete runnable file/helper SHALL be deleted or moved out of current runner-readable locations by this cleanup. A legacy/backlog label MAY be used only as a temporary apply-time review state; it SHALL NOT remain as a permanent runner table or current-surface parking lot for obsolete production examples after this change archives.

Report SHALL include:

- selected case count, PASS count, FAIL count
- each FAIL case and failure reason summary
- group statistics for light, standard, heavy, skipped human cases, and removed/migrated case counts when applicable
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
- **AND** if both files remain active, their health, cleanup, report, and removed-case policies SHALL agree

#### Scenario: old relay or queue-slot playbook is migrated or removed

- **WHEN** a runner surface names a playbook that still depends on retired relay/slot production mechanisms, old delegated ledger rows, or old queue slot shape
- **THEN** the playbook SHALL be migrated to prove current work-unit or queue v2 behavior, or removed from current runner surfaces
- **AND** it SHALL NOT remain visible as current work-unit production proof
- **AND** any temporary legacy/backlog classification SHALL be resolved before archive by migration or removal from current runner surfaces

#### Scenario: obsolete runnable files are not left as hidden current examples

- **WHEN** an old relay/slot playbook or JS helper is removed from runner tables because it has no current proof value
- **THEN** the corresponding current runnable file SHALL also be deleted or moved to an excluded historical archive path
- **AND** it SHALL NOT remain under `experiments_playbook/` as a runnable-looking current example
