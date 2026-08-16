> req: CLE-003, CLE-004

## MODIFIED Requirements

### Requirement: Known exit-code exceptions are documented without behavior changes

The exit-code convention documentation SHALL include an explicit current-state inventory of known command classes and exceptions.

At minimum, the inventory SHALL document:

- gate CLIs use the shared gate result helper and emit tri-state `0/1/2`;
- many current non-gate utility CLIs emit binary `0/1` and do not yet share a common exit helper;
- `log-event.mjs` is a documented exception that returns `0` even when logging fails, because diagnostic log/trace write failure must not block Agent flow unless a separate accepted contract says otherwise;
- `check-reentry.mjs` and inspect-style tools may use `2` for caller invocation/config errors even when not routed through the gate helper;
- `validate-workflow-package.mjs` is a reconciled invocation-error surface: it emits `0` for a consistent package, `1` for consistency issues, and `2` for invocation/configuration errors such as missing required context or unreadable files; and
- any known doc/code drift discovered during apply, such as a header documenting an exit code a command does not emit, SHALL be recorded as drift rather than silently normalized in prose.

This change SHALL reconcile help and invocation/configuration behavior only for
its selected public operation surfaces. It SHALL NOT require runtime behavior
reconciliation for the remaining documented exceptions, and docs SHALL NOT
silently describe target behavior as current behavior. Any future effort to
unify all utility CLIs, change unrelated code-2 semantics, or add a shared exit
helper SHALL be a separate OpenSpec change.

#### Scenario: Exceptions are visible to Agent callers

- **WHEN** the Agent reads the exit-code convention in `COMMANDS.md`
- **THEN** it SHALL see that gate CLIs, utility CLIs, and `log-event.mjs` do not all currently use the exact same runtime helper
- **AND** it SHALL still receive a canonical interpretation for how to treat each class

#### Scenario: Drift is recorded, not hidden

- **WHEN** implementation audit finds a CLI whose header documents an exit code that the code does not emit
- **THEN** the convention docs or apply notes SHALL record that drift as a known exception or future reconciliation item
- **AND** this change SHALL NOT change the CLI's behavior unless a task explicitly adds that behavior change and updates its spec

#### Scenario: Selected invocation behavior is not generalized to utilities

- **WHEN** command documentation inventories the C3 code-`2` operation
  surfaces
- **THEN** it SHALL name the selected commands rather than claim that every
  framework utility already shares their parser or output helper
- **AND** unselected utility behavior SHALL remain an explicit documented
  exception until a separately accepted change reconciles it

#### Scenario: Reconcile-workflow-package exit two is documented as current behavior

- **WHEN** the Agent reads the exit-code convention for `validate-workflow-package.mjs`
- **THEN** the docs SHALL state its current tri-state behavior including `2` for invocation/configuration errors
- **AND** they SHALL NOT present it as a pending drift or future reconciliation item

### Requirement: Exit-code convention has regression coverage

The project SHALL include regression coverage for the documented exit-code convention and exception inventory.

Coverage SHALL verify both documentation discoverability and representative runtime behavior that can be checked without changing CLI semantics. Representative checks SHALL include:

- a gate CLI or shared gate helper exposes the tri-state convention and structured gate result shape;
- a non-gate utility CLI currently behaves as a documented binary command or documented exception;
- `log-event.mjs` remains documented as an always-0 diagnostic/logging exception;
- current non-gate utility exceptions remain visible rather than being silently normalized into the target convention;
- `validate-workflow-package.mjs` emits `2` for a representative invocation/configuration error and `0`/`1` for its documented pass/fail results, and the docs no longer list it as known drift;
- the docs state that Agent callers must read structured stdout rather than relying only on numeric exit code; and
- the docs state that morale/continuation guidance belongs in advice or Agent-readable prose, not exit code.

The regression SHALL be deterministic, use Node.js built-ins plus existing approved dependencies only, and SHALL NOT require network access or real Agent execution.

#### Scenario: Regression detects missing top-level contract

- **WHEN** `DEEP_RESEARCH_HARNESS/COMMANDS.md` no longer contains the exit-code convention
- **THEN** the regression SHALL fail
- **AND** the failure SHALL identify the missing documented contract

#### Scenario: Regression detects undocumented exception removal

- **WHEN** `log-event.mjs` remains an always-0 command but the docs stop documenting that exception
- **THEN** the regression SHALL fail
- **AND** the failure SHALL identify the missing exception inventory entry

#### Scenario: Regression detects reconciled-surface drift

- **WHEN** `validate-workflow-package.mjs` no longer emits `2` for an invocation error, or the docs list it as known drift
- **THEN** the regression SHALL fail
- **AND** the failure SHALL identify the exit-code or inventory entry that drifted
