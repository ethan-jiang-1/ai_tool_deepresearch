# artifact-persistence-recovery Specification

> req: ARP-001, ARP-002, ARP-003, ARP-004, ARP-005

## Purpose

`artifact-persistence-recovery` defines Engine-owned crash-safe persistence and
recovery for content-bearing run-bundle artifacts, including durable staging,
atomic publication, sweep, and submitted-backing admission for Final Markdown.
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


Sweep and its helpers SHALL make `operation_not_prepared` advice workspace-aware: for a
primary-publication workspace (a `publish-final-report` or primary Final operation), the advice SHALL NOT
tell the caller to retry generic `persist`; it SHALL name the recorded primary operation surface and the
exact legal retry for that surface. Only a non-primary persist workspace MAY be advised to retry generic
`persist` from retained staging.
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

### Requirement: Final Markdown publication SHALL admit backing and protect the primary version series

The artifact-persistence command SHALL retain `persist-final-report` for safe
non-primary Markdown targets under `final/` and SHALL add one narrow
`publish-final-report` operation for the canonical primary report series.
Markdown means a `.md` extension without regard to ASCII case for admission;
canonical primary names themselves SHALL use the exact lowercase grammar below.

`publish-final-report` SHALL accept the selected bundle, one completed retained
staging report, and an optional feature label. It SHALL NOT accept a caller-

`--feature` SHALL be accepted only by `publish-final-report`. `persist` and `persist-final-report`
SHALL reject a supplied `--feature` as an invalid invocation (exit `2`), and the rejection SHALL tell the
caller that the operation does not accept `--feature` and that `--feature` belongs to
`publish-final-report`, so a mistyped operation is corrected rather than silently ignored.
selected target, version number, compare-and-swap digest, force/overwrite flag,
or base-classification hint. The optional feature label SHALL match safe
lowercase snake case (`[a-z0-9]+(?:_[a-z0-9]+)*`) and SHALL describe the
presentation emphasis only. It SHALL not create profile, view, evidence,
satisfaction, or lifecycle authority.

The Engine SHALL derive one canonical primary inventory from safe regular files
directly under `final/` and classify it before publication:

- the modern base is exactly `final/final.md`;
- revisions are exactly `final/final_v<N>.md` or
  `final/final_<feature>_v<N>.md`, with positive decimal `N`, no leading zero,
  and a safe feature label;
- revision numbers SHALL be unique and globally monotonic across labelled and
  unlabelled names; they SHALL form one contiguous `1..latest` history;
- with no modern base, exactly one other safe root-level Markdown report and no
  conflicting reserved name MAY be classified read-only as legacy v0; and
- with no modern base, more than one such legacy candidate, an orphan revision,
  a duplicate/gapped/unsafe number, a case-fold collision, a symlink, an
  unreadable entry, or an unparseable root-level reserved `final*.md` name SHALL
  block without guessing from mtime, directory order, chat, or report content.

Non-primary nested or non-reserved Final artifacts MAY remain supplementary and
SHALL not enter version allocation. When `final/final.md` exists, other
non-reserved Final Markdown remains supplementary/historical rather than a
second primary base. A legacy v0 selected by the classification above SHALL be
immutable and retained after canonical revisions begin.

Allocation SHALL be Engine-owned:

- an empty valid inventory publishes the first staging bytes only to
  `final/final.md`, ignoring an optional feature for naming that base;
- a modern or legacy base with no revisions publishes revision `1`;
- every later publication uses `latest + 1` across the whole series; and
- an optional feature produces `final/final_<feature>_v<N>.md`, otherwise the
  target is `final/final_v<N>.md`.

The operation SHALL serialize allocation and publication against concurrent
callers or use an equivalent atomic reservation such that every committed call
receives one unique next target. A collision SHALL never overwrite a report or
silently return the same version to two callers. Pending accepted artifact-
persistence work SHALL remain the current recovery owner; fresh publication
SHALL block or resume that owner rather than allocate against an unstable
inventory.

Before creating a publication workspace or writing a primary target, the
operation SHALL evaluate the completed staging bytes against the existing Final
Evidence Map and submitted-backing contract. A backing rejection SHALL retain
staging and create neither target nor accepted workspace. On pass, publication
SHALL reuse the existing safe preparation, payload fsync, parent fsync, accepted-
workspace, and crash-recovery machinery, but its absent primary target SHALL be
created with the publication-specific same-device atomic no-clobber primitive.
It SHALL NOT use the existing replacement-capable target rename for that commit.
Prepared recovery SHALL bind the allocated target, inventory/base
classification, feature, version, staging digest, and backing result needed to
finish exactly that publication; it SHALL not reallocate a different version
during sweep.

`publish-final-report` SHALL emit a strict Engine-validated result that separates
backing `check`/`inspect`/`advice` from the mechanical publication verdict. A
committed result SHALL expose the canonical target, base classification,
allocated version (`0` for the first modern base, positive `N` for revisions),
optional feature, prior latest target when any, and inventory binding. It SHALL
not validate or establish legal Final entry, lifecycle position, handoff,
delivery, semantic improvement, or user satisfaction. A committed primary-
looking file without the independent accepted readiness-to-Final lineage SHALL
remain only a mechanical persistence fact and SHALL not count as delivery.

The direct-root reserved namespace `final/final*.md`, compared case-
insensitively for collision safety, SHALL be writable only through
`publish-final-report`; exact accepted canonical names remain case-sensitive.
Generic `persist` and caller-targeted `persist-final-report` SHALL reject a
reserved primary target before workspace creation and direct the Agent to the
publication operation. They SHALL also reject replacement of an inventory-
selected legacy v0. Existing safe non-primary Final Markdown and non-Final
content persistence SHALL otherwise retain their accepted behavior.

Before any operation classifies a path, it SHALL apply the existing safe-target
contract. An unsafe or malformed target SHALL remain configuration failure
(exit `2`), not an admission blocker or redirect. `sweep` SHALL rerun the same
Final-backing evaluator before completing prepared Final Markdown work and
SHALL preserve exact allocated-target/immutability rules. It SHALL continue to
recover other accepted workspaces under the existing contract.

#### Scenario: Empty inventory publishes canonical base mechanically

- **WHEN** a selected bundle has an empty valid primary inventory and a backed staging report
- **THEN** `publish-final-report` SHALL commit the exact bytes to `final/final.md`
- **AND** result version SHALL be `0` even when an optional feature was supplied

#### Scenario: Later Final delivery appends instead of recreating the base

- **WHEN** a later legal Final lineage needs its first report and the bundle already has a valid primary series
- **THEN** `publish-final-report` SHALL allocate global `latest + 1` from that series
- **AND** it SHALL not create another base, reset numbering, or interpret lifecycle lineage itself

#### Scenario: Publisher does not witness lifecycle delivery

- **WHEN** `publish-final-report` commits a primary-looking file without independent accepted readiness-to-Final lineage
- **THEN** its result SHALL remain a mechanical publication fact
- **AND** it SHALL not validate, establish, or claim Final entry, handoff, lifecycle position, or user-facing delivery

#### Scenario: Valid Final report commits through the existing durability path

- **WHEN** `publish-final-report` or supported non-primary `persist-final-report` receives a complete backed staging report and a satisfied absent-target expectation
- **THEN** both SHALL reuse the existing crash-safe preparation and recovery contract
- **AND** primary publication SHALL create its absent target atomically without replacement while supplementary persistence retains its accepted commit semantics
- **AND** the mechanical result SHALL not claim lifecycle delivery, provenance creation, report quality, or satisfaction

#### Scenario: Unlabelled and labelled revisions share one sequence

- **WHEN** `final/final.md` and `final/final_v1.md` exist and a backed staging report is published with feature `technical_deep_dive`
- **THEN** the Engine SHALL allocate `final/final_technical_deep_dive_v2.md`
- **AND** the next unlabelled publication SHALL allocate version `3`, not reuse `2` or maintain a second counter

#### Scenario: Primary history is immutable

- **WHEN** a caller tries to replace `final/final.md` or any committed canonical revision
- **THEN** publication and caller-targeted persistence SHALL reject before target mutation
- **AND** every earlier primary byte sequence SHALL remain unchanged

#### Scenario: Single legacy report becomes read-only v0

- **WHEN** a selected historical bundle has no `final/final.md`, exactly one safe root-level report such as `final/report.md`, and no canonical revision
- **THEN** inventory SHALL classify that report as legacy v0
- **AND** the first publication SHALL append `final/final_v1.md` without renaming or rewriting the legacy file

#### Scenario: Ambiguous legacy inventory fails closed

- **WHEN** no modern base exists and multiple root-level non-reserved Markdown candidates exist
- **THEN** publication SHALL block with the ambiguous candidates and no allocated target
- **AND** it SHALL not choose by mtime, lexical order, size, or content

#### Scenario: Invalid canonical inventory fails closed

- **WHEN** the primary namespace contains a duplicate number, a missing prior revision, an orphan revision, unsafe entry, case-fold collision, or unparseable reserved name
- **THEN** publication SHALL return one direct inventory blocker before workspace creation
- **AND** it SHALL not repair, renumber, delete, or overwrite history

#### Scenario: Concurrent publication cannot share a version

- **WHEN** two publication calls race against the same valid inventory
- **THEN** at most one SHALL commit a given target and the other SHALL serialize, retry allocation, or return a recoverable blocker
- **AND** no committed primary report SHALL be overwritten or share its version number

#### Scenario: Invalid backing has no persistence side effect

- **WHEN** a proposed primary report has absent, malformed, unsafe, missing, or unsubmitted Evidence Map backing
- **THEN** publication SHALL return structured backing rejection with the nearest repair fact and same operation to rerun
- **AND** it SHALL create no target or accepted publication workspace and SHALL retain staging

#### Scenario: Generic persist cannot bypass Final backing admission

- **WHEN** generic `persist` or caller-targeted `persist-final-report` receives a direct-root target in the reserved `final/final*.md` namespace
- **THEN** it SHALL reject before workspace preparation or mutation
- **AND** it SHALL direct the Agent to `publish-final-report` without accepting a caller version

#### Scenario: An unsafe Final-looking target remains invalid configuration

- **WHEN** any persistence operation receives an unsafe or malformed target that resembles Markdown under `final/`
- **THEN** it SHALL return the existing configuration failure class with exit code `2` before workspace preparation
- **AND** it SHALL not report normal backing rejection, primary allocation, or a generic-persist redirect

#### Scenario: Existing non-Final persistence remains available

- **WHEN** caller-targeted persistence receives a safe supported target outside the reserved primary namespace and outside an inventory-selected legacy base
- **THEN** it SHALL retain existing backing and compare-and-swap behavior
- **AND** it SHALL not allocate a primary version for that supplementary target

#### Scenario: Crash recovery cannot bypass Final backing admission

- **WHEN** publication crashes after a prepared payload is durable but before no-clobber target creation, or after target creation but before workspace cleanup
- **THEN** `sweep` SHALL revalidate backing and recover or clean exactly that allocated publication
- **AND** it SHALL not allocate another version, overwrite a conflicting target, or bypass inventory lineage

### Requirement: Final auxiliary directories SHALL bind to their primary version

The Engine's canonical Final inventory classification SHALL recognize, for each
safe real directory directly under `final/`, a version-bound auxiliary directory
when the directory name equals a canonical revision filename with its `.md`
suffix removed:

- `final_v<N>` binds the unlabelled revision `final_v<N>.md`; and
- `final_<feature>_v<N>` binds the labelled revision
  `final_<feature>_v<N>.md`, with the same safe lowercase snake-case feature and
  the same positive decimal `N`.

A recognized auxiliary directory SHALL classify as `auxiliary` with the same
`version` and `feature` as its bound revision, and SHALL remain non-primary: it
SHALL NOT enter the primary version series, change `latest` or `next_version`,
participate in the primary-series witness digest, or be allocated a version.

A directory whose name matches the auxiliary grammar but has no matching primary
revision file with the identical name plus `.md` SHALL block the series with one
direct `orphan_auxiliary_directory` blocker naming that directory. A directory
whose name does not match the auxiliary grammar SHALL remain `supplementary`
with no version and SHALL NOT block. The classification SHALL read only direct
inventory entry names and kinds; it SHALL NOT read mtime, directory order,
report prose, chat, or lifecycle intent.

#### Scenario: Auxiliary directory binds its unlabelled revision

- **WHEN** `final/` contains `final/final_v2.md` and a real directory `final/final_v2/`
- **THEN** the inventory SHALL classify the directory as `auxiliary` with `version` 2 and `feature` null
- **AND** the series SHALL remain valid with `final_v2.md` as its only primary revision for that version

#### Scenario: Labelled auxiliary directory binds its labelled revision

- **WHEN** `final/` contains `final/final_technical_deep_dive_v2.md` and a real directory `final/final_technical_deep_dive_v2/`
- **THEN** the inventory SHALL classify the directory as `auxiliary` with `version` 2 and `feature` `technical_deep_dive`
- **AND** the series SHALL remain valid with that labelled revision as the only primary entry for version 2

#### Scenario: Auxiliary directory does not enter primary allocation

- **WHEN** a valid series has base `final/final.md`, revisions through `final_v2.md`, and directories `final/final_v1/` and `final/final_v2/`
- **THEN** `latest` SHALL be the `final_v2` primary revision and `next_version` SHALL be 3
- **AND** neither auxiliary directory SHALL appear in `primary_entries` or change the primary-series witness digest

#### Scenario: Orphan auxiliary directory blocks

- **WHEN** `final/` contains a real directory `final/final_v3/` but no `final/final_v3.md`
- **THEN** the series SHALL return `valid: false` with one `orphan_auxiliary_directory` blocker naming `final_v3`
- **AND** it SHALL NOT repair, renumber, rename, or delete the directory or any history

#### Scenario: Version grammar without an exact name match is an orphan

- **WHEN** `final/` contains the labelled revision `final/final_technical_deep_dive_v2.md` and a real directory `final/final_v2/` but no `final/final_v2.md`
- **THEN** `final/final_v2/` SHALL NOT bind the labelled revision
- **AND** the series SHALL block with one `orphan_auxiliary_directory` blocker naming `final_v2`

#### Scenario: Version-decoupled directory stays supplementary

- **WHEN** `final/` contains a real directory `final/chips/` or `final/topics/`
- **THEN** the inventory SHALL classify the directory as `supplementary` with no version and no feature
- **AND** the series SHALL NOT block on that directory
