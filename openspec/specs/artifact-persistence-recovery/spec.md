# artifact-persistence-recovery Specification

> req: ARP-001, ARP-002, ARP-003, ARP-004

## Purpose
TBD - created by archiving change make-artifact-persistence-crash-safe. Update Purpose after archive.
## Requirements
### Requirement: Content-bearing bundle files SHALL use one crash-safe persistence workspace

The framework SHALL provide one Engine-owned persistence contract for supported content-bearing targets under `reference/`, `artifacts/`, `final/`, and `_cache/` in the selected bundle. The contract SHALL begin when the caller supplies a completed non-symlink regular staging file and a safe bundle-relative target whose real parent directory already exists.

Each operation SHALL use one Engine-generated exclusive directory under `_diagnostics/artifact-persistence/<operation-id>/` containing a pending payload and one Zod discriminated-union operation sidecar. The `preparing` state SHALL identify schema version, operation id, diagnostic staging-source path, safe target, expected prior target condition, and creation time before payload copy begins. The `prepared` state SHALL preserve those fields and add payload size and payload SHA256 after the payload is fsynced. The expected prior condition SHALL be either `absent` or a concrete prior SHA256. The workspace and target parent SHALL be on the same filesystem device before preparation so final rename can remain atomic.

Persist SHALL durably publish `preparing` before payload copy; successful canonical publication is the boundary at which the Engine accepts the operation for recovery. It SHALL then copy and fsync the payload, atomically replace the sidecar with `prepared`, recheck path safety and expected target bytes, atomically rename the payload to the target, fsync the target parent, and remove the completed workspace. A crash before accepted `preparing` SHALL NOT be described as a recoverable accepted operation, and the staging source SHALL remain untouched. Persist SHALL reject traversal, absolute targets, missing/non-directory parent, symlink traversal, source/target aliasing, cross-device commit, unsupported roots, and authority/control targets. It SHALL never provide unconditional force overwrite. The caller-owned staging source SHALL not be deleted by default and SHALL remain available until successful commit.

#### Scenario: Crash before preparing publication is not overclaimed

- **WHEN** persist crashes before canonical `preparing` state is durably published
- **THEN** the framework SHALL not claim that the operation was accepted or recoverable
- **AND** the staging source SHALL remain untouched for a fresh persist attempt

#### Scenario: Accepted preparing state is discoverable

- **WHEN** canonical `preparing` state is durably published
- **THEN** later sweep SHALL recognize the accepted operation and report its recorded staging source, target, and direct blocker or recovery verdict

#### Scenario: New reference is committed durably

- **WHEN** the Agent supplies a complete staging file, target `reference/source-a.md`, and expected prior condition `absent`
- **THEN** persist SHALL durably record the `preparing` intent, then publish `prepared` before atomic commit
- **AND** the committed target SHALL contain the exact staging bytes
- **AND** the operation workspace SHALL be removed after durability barriers complete
- **AND** the staging source SHALL remain for caller-controlled cleanup

#### Scenario: Compare-and-swap replacement rejects drift

- **WHEN** persist receives an expected prior target SHA256
- **AND** the current target does not match that digest before preparation or commit
- **THEN** persist SHALL return `blocked` without overwriting the target
- **AND** an initial mismatch SHALL create no operation workspace
- **AND** late drift SHALL clean only the current operation workspace when safe or preserve it with the blocker

#### Scenario: Control authority is excluded

- **WHEN** persist targets status, queue, trace, ledger, checkpoint, profile, plan, receipt, `_work_units/`, or another unsupported path
- **THEN** it SHALL reject the request before preparation
- **AND** the existing authority or transaction owner SHALL remain unchanged

### Requirement: Quiescent sweep SHALL recover only prepared persistence workspaces

The framework SHALL provide one narrow sweep operation over `_diagnostics/artifact-persistence/`. Sweep SHALL run only at an explicit quiescent recovery boundary where no persist operation is concurrently writing the selected bundle. It SHALL not use PID inference, stale-lock timers, mtime, chat context, arbitrary `.tmp` files, or filesystem content outside the accepted workspace contract as recovery authority.

For each operation directory, verdict precedence SHALL be deterministic: an invalid/unsafe sidecar or valid `preparing` state produces `blocked`; a valid `prepared` state whose target already matches the payload digest produces `cleaned`; a target that violates the expected prior condition produces `blocked`; a valid prepared payload with a satisfied expected prior condition produces `finalized`. Sweep SHALL never automatically delete a blocked workspace. A valid `preparing` blocker SHALL report its recorded staging source and target; other blockers SHALL report the workspace path. The nearest Agent action SHALL be inspect/remove the diagnostic workspace and retry persist from retained staging, or resolve the target conflict and rerun sweep.

Sweep SHALL be idempotent. Re-running after `finalized` or `cleaned` SHALL not duplicate content or recreate workspace state. A sweep summary containing any `blocked` entry SHALL be action-required; otherwise it SHALL be clean.

#### Scenario: Complete prepared payload is finalized after crash

- **WHEN** a crash leaves a valid prepared workspace before final rename
- **AND** the target still satisfies the recorded expected prior condition
- **THEN** sweep SHALL atomically finalize the target and remove the workspace
- **AND** a second sweep SHALL find no remaining operation or duplicate content

#### Scenario: Committed target with stale workspace is cleaned

- **WHEN** a crash occurs after target rename but before workspace cleanup
- **AND** the current target digest equals the prepared payload digest
- **THEN** sweep SHALL preserve the target, remove the stale workspace, and return `cleaned`

#### Scenario: Incomplete workspace blocks without deletion

- **WHEN** an operation directory contains valid `preparing` state, an invalid sidecar, or a prepared sidecar without matching payload
- **THEN** sweep SHALL return `blocked` and leave the workspace untouched
- **AND** it SHALL identify ordinary Agent cleanup and persist retry as the nearest legal action

#### Scenario: Target conflict remains untouched

- **WHEN** a valid prepared workspace exists but the current target matches neither the expected prior digest nor the prepared payload digest
- **THEN** sweep SHALL return `blocked`
- **AND** it SHALL not overwrite, merge, delete, or semantically reconcile either content version

#### Scenario: Sweep requires quiescence

- **WHEN** the Agent invokes sweep
- **THEN** the command contract SHALL state that no persist operation may be concurrently writing the selected bundle
- **AND** the framework SHALL not claim unsupported concurrent persist/sweep safety

### Requirement: Persistence results SHALL remain mechanical and non-authoritative

Persist and sweep results SHALL be validated by Engine-owned Zod schemas. Results SHALL report schema version, operation id when available, target, `committed|finalized|cleaned|blocked` verdict, direct reason code/message, and workspace path. Persist/sweep SHALL call the existing best-effort `_logs/run.log` owner for operator-visible diagnostics and SHALL not create a new trace event family or a second logging contract. Log presence or failure SHALL not determine, fabricate, or reverse the filesystem verdict.

Persistence results SHALL remain mechanical durability facts, not business completion, evidence provenance, gate pass, lifecycle progress, delivery, topic identity, or post-final reentry authority. The Agent SHALL select real content and an accepted target, execute legal cleanup/retry, and consume Engine feedback. A user SHALL be asked only for genuinely new semantics, irreversible overwrite risk, or permission; `human-directed` SHALL NOT authorize unknown temp promotion, arbitrary overwrite, or control-state mutation.

#### Scenario: Persisted file does not gain business authority

- **WHEN** a file is committed under a supported content root
- **THEN** existing declaration, provenance, gate, handoff, submit, and delivery contracts SHALL still determine whether it counts
- **AND** persistence SHALL not create a ledger row, gate attempt, status transition, topic identity, or delivery witness

#### Scenario: Blocker returns one nearest action

- **WHEN** sweep encounters an incomplete workspace or target conflict
- **THEN** its result SHALL identify one direct root fact and one nearest Agent action
- **AND** it SHALL not ask the user to run ordinary commands or generate a multi-route recovery strategy

#### Scenario: Persistence remains selected-bundle scoped

- **WHEN** persist or sweep runs for a selected bundle
- **THEN** recursive before/after inspection SHALL show no mutation outside that bundle
- **AND** no status, queue, trace, ledger, checkpoint, profile, plan, receipt, or work-unit transaction file SHALL be changed

### Requirement: Final Markdown persistence SHALL admit submitted backing before durability commit

The artifact-persistence command SHALL provide a `persist-final-report`
operation for a safe Markdown target under `final/`; Markdown means a target
whose extension is `.md` without regard to ASCII case. Before creating an
artifact-persistence workspace or writing a Final target, that operation SHALL
evaluate the completed retained staging report against the Final Evidence Map
and submitted-backing contract.

When the evaluation passes, `persist-final-report` SHALL use the existing
compare-and-swap, atomic-commit, and crash-recovery persistence path to commit
the exact staging bytes. It SHALL not create another final-write workspace,
second success authority, Gate, trace event, delivery witness, or evidence
ledger. A backing rejection SHALL leave the staging source available and SHALL
create neither a Final target nor an artifact-persistence workspace.

`persist-final-report` SHALL emit an operation-specific, Zod-validated result
that keeps the backing evaluator's `check`, `inspect`, and `advice` feedback
separate from the persistence `committed|blocked` verdict and its existing
operation/target/workspace facts. A backing failure SHALL expose its direct map
row or link fact and the same operation to rerun; a successful backing check
SHALL not claim that a later durability conflict is a provenance failure. The
existing generic `persist` and `sweep` result contracts SHALL remain compatible.

The generic `persist` operation SHALL reject a Markdown target under `final/`
before workspace creation and SHALL return the one direct operation to use for
that report. It SHALL continue to serve supported non-Final-Markdown content
targets. Before `sweep` finalizes a prepared workspace whose target is a Final
Markdown report, it SHALL rerun the same Final-backing evaluator against the
prepared payload and current submitted authority. A failure SHALL leave the
workspace and Final target untouched, identify the direct map/backing fact, and
direct the Agent to repair retained staging or a legal backing surface, remove
only the reported workspace, and rerun `persist-final-report`. `sweep` SHALL
continue to recover other accepted workspaces through its existing contract.

Before `persist` or `persist-final-report` classifies a target as Final
Markdown, it SHALL apply the existing safe-target contract. An unsafe or
malformed target that resembles `final/*.md` SHALL remain an invalid
configuration result (exit `2`), not an admission blocker or generic-persist
redirect. For a safe redirected generic `persist` request, the existing strict
generic result schema SHALL remain unchanged and its existing `reason` field
SHALL name `persist-final-report` as the one direct next operation.

#### Scenario: Valid Final report commits through the existing durability path

- **WHEN** `persist-final-report` receives a safe Final Markdown target, a
  complete retained staging report with valid Evidence Map backing, and a
  satisfied compare-and-swap expectation
- **THEN** it SHALL commit the exact staging bytes using the existing
  crash-safe persistence contract
- **AND** its successful result SHALL retain the ordinary mechanical
  persistence verdict without claiming Final delivery or creating provenance

#### Scenario: Invalid backing has no persistence side effect

- **WHEN** `persist-final-report` finds an absent, malformed, unsafe, missing,
  or unsubmitted Evidence Map backing link
- **THEN** it SHALL return a structured deterministic rejection with the
  nearest staging-row or backing-path repair fact and the same operation to
  rerun
- **AND** it SHALL not create a persistence workspace, write or replace the
  Final target, or delete the staging source

#### Scenario: Generic persist cannot bypass Final backing admission

- **WHEN** the generic `persist` operation receives a Markdown target under
  `final/`
- **THEN** it SHALL reject the request before workspace preparation or target
  mutation
- **AND** it SHALL direct the Agent to `persist-final-report` rather than
  silently accepting an unvalidated Final report

#### Scenario: An unsafe Final-looking target remains invalid configuration

- **WHEN** `persist` or `persist-final-report` receives an unsafe or malformed
  target that resembles a Markdown path under `final/`
- **THEN** it SHALL return the existing configuration failure class with exit
  code `2` before workspace preparation
- **AND** it SHALL not report a normal backing rejection or a generic-persist
  redirect

#### Scenario: Existing non-Final persistence remains available

- **WHEN** generic `persist` receives a safe supported target outside Final
  Markdown reports
- **THEN** it SHALL retain the existing persistence contract and compare-and-
  swap behavior
- **AND** it SHALL not require an Evidence Map for that non-Final content

#### Scenario: Crash recovery cannot bypass Final backing admission

- **WHEN** a `persist-final-report` attempt crashes after its payload is
  prepared but before Final target rename
- **AND** a later `sweep` sees that prepared Final Markdown workspace
- **THEN** `sweep` SHALL rerun the same Final-backing evaluator before it
  finalizes the target
- **AND** an invalid or no-longer-submitted backing SHALL block the workspace
  without target mutation rather than commit an unauditable Final report
