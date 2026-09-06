# artifact-persistence-recovery Specification

> req: ARP-001, ARP-002, ARP-003, ARP-004, ARP-005
> delta-synced: 2026-09-06-final-polish-version-control

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

### Requirement: Artifact persistence SHALL derive canonical inventory and serialize Engine-owned allocation

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

#### Scenario: Concurrent publication cannot share a version

- **WHEN** two publication calls race against the same valid inventory
- **THEN** at most one SHALL commit a given target and the other SHALL serialize, retry allocation, or return a recoverable blocker
- **AND** no committed primary report SHALL be overwritten or share its version number

#### Scenario: Existing non-Final persistence remains available

- **WHEN** caller-targeted persistence receives a safe supported target outside the reserved primary namespace and outside an inventory-selected legacy base
- **THEN** it SHALL retain existing backing and compare-and-swap behavior
- **AND** it SHALL not allocate a primary version for that supplementary target

### Requirement: Final publication SHALL emit strict results and protect the reserved primary namespace

`publish-final-report` SHALL retain the existing behavior of allocating global
`latest + 1` for every legal evidence-expanding delivery, and SHALL add one
distinct presentation-revision path for polish-only changes. A presentation
revision SHALL be chosen only by the Final Agent's bounded semantic judgment
(presentation-only vs evidence-expanding, same origin as the existing post-final
routing decision): the Evidence Map backing set and the submitted fact set SHALL
remain unchanged and only structure, length, wording, emphasis, or presentation
of existing verified evidence SHALL differ. A presentation revision SHALL
compare-and-swap update the bytes of the current latest primary revision file
(`final/final_v<N>.md` or the labelled equivalent) at its existing canonical
target, using the current file digest as the expected prior condition, and SHALL
NOT allocate a new global version, create a new primary revision file, or change
`latest` or `next_version`. The presentation revision SHALL be permitted only on
the current `latest` primary revision; any earlier (non-latest) primary revision
bytes SHALL remain immutable and SHALL NOT be the target of a presentation
revision. It SHALL record one REVISIONS.md row (time, summary, prior digest,
new digest) in the version's bound auxiliary directory. A presentation
revision SHALL NOT be used for any new source, new Topic, new research
conclusion, or research-profile change; those SHALL use the existing audited
post-final rerun path and a new global version.

`retire-final-version` SHALL be a human-controlled correction operation on the
same persistence surface. It SHALL accept the selected bundle, one `--version`,
an optional `--feature`, and one non-empty `--user-confirmation` carrying the
user's verbatim retirement request. Every pre-check — latest-only selection,
target collision, auxiliary-directory collision, and auxiliary-directory
safety — SHALL complete before the first filesystem mutation, so a `blocked`
verdict SHALL always imply zero mutation of the bundle. Only after all
pre-checks pass SHALL it retire **only the current latest primary revision**
(retiring an intermediate or non-latest version SHALL be rejected,
preserving the contiguous `1..latest` primary sequence invariant): it SHALL
move the selected primary revision file to the existing `final/attic/` area
(retaining the original filename or a uniform retired suffix), SHALL write a
retired marker (retired_at, retired_by=user, original version/feature, reason),
and SHALL recompute `latest` as the previous revision. It SHALL NOT delete or
rewrite the moved bytes (immutability of history is preserved; retirement only
changes membership of the current authoritative series), SHALL NOT reuse the
retired version number (the sequence never reuses a number), and SHALL be
invocable only by an explicit user request — the CLI SHALL reject a missing or
empty `--user-confirmation` as an invocation/configuration error before the
Engine is invoked, the Engine SHALL validate the retire request schema at
entry, and the Agent SHALL NOT auto-retire any version.

The Engine SHALL derive the canonical primary inventory and classify it before
any publication or retirement, applying the existing safe-target and immutable
rules. Non-primary nested or non-reserved Final artifacts MAY remain
supplementary and SHALL not enter version allocation.

#### Scenario: Single legacy report becomes read-only v0

- **WHEN** a selected historical bundle has no final/final.md, exactly one safe root-level report such as final/report.md, and no canonical revision
- **THEN** inventory SHALL classify that report as legacy v0
- **AND** the first publication SHALL append final/final_v1.md without renaming or rewriting the legacy file

#### Scenario: Ambiguous legacy inventory fails closed

- **WHEN** no modern base exists and multiple root-level non-reserved Markdown candidates exist
- **THEN** publication SHALL block with the ambiguous candidates and no allocated target
- **AND** it SHALL not choose by mtime, lexical order, size, or content

#### Scenario: Invalid canonical inventory fails closed

- **WHEN** the primary namespace contains a duplicate number, a missing prior revision, an orphan revision, unsafe entry, case-fold collision, or unparseable reserved name
- **THEN** publication SHALL return one direct inventory blocker before workspace creation
- **AND** it SHALL not repair, renumber, delete, or overwrite history

#### Scenario: Invalid backing has no persistence side effect

- **WHEN** a proposed primary report has absent, malformed, unsafe, missing, or unsubmitted Evidence Map backing
- **THEN** publication SHALL return structured backing rejection with the nearest repair fact and same operation to rerun
- **AND** it SHALL create no target or accepted publication workspace and SHALL retain staging

#### Scenario: Generic persist cannot bypass Final backing admission

- **WHEN** generic persist or caller-targeted persist-final-report receives a direct-root target in the reserved final/final*.md namespace
- **THEN** it SHALL reject before workspace preparation or mutation
- **AND** it SHALL direct the Agent to publish-final-report without accepting a caller version

#### Scenario: An unsafe Final-looking target remains invalid configuration

- **WHEN** any persistence operation receives an unsafe or malformed target that resembles Markdown under final/
- **THEN** it SHALL return the existing configuration failure class with exit code 2 before workspace preparation
- **AND** it SHALL not report normal backing rejection, primary allocation, or a generic-persist redirect

#### Scenario: Crash recovery cannot bypass Final backing admission

- **WHEN** publication crashes after a prepared payload is durable but before no-clobber target creation, or after target creation but before workspace cleanup
- **THEN** sweep SHALL revalidate backing and recover or clean exactly that allocated publication
- **AND** it SHALL not allocate another version, overwrite a conflicting target, or bypass inventory lineage

#### Scenario: Polish-only change stays in the current version

- **WHEN** the Final Agent judges a staging report presentation-only (Evidence Map backing set and submitted facts unchanged; only wording/structure/emphasis differ)
- **THEN** `publish-final-report` SHALL publish a revision presentation file (e.g. `report-r<M>.md`) inside the version's bound auxiliary directory
- **AND** SHALL NOT allocate a new global version, create a new primary revision file, or rewrite the immutable primary bytes of `final_v<N>.md`
- **AND** SHALL append one REVISIONS.md row in the version's bound auxiliary directory

#### Scenario: Evidence-expanding change allocates a new version

- **WHEN** a staging report adds a new source, Topic, research conclusion, or research-profile change
- **THEN** the audited post-final rerun path SHALL be used
- **AND** the resulting legal Final delivery SHALL allocate global `latest + 1` as today

#### Scenario: Human retires the latest spuriously created version

- **WHEN** an explicit user request retires the current latest version N via `retire-final-version --version N --user-confirmation "<verbatim user request>"`
- **THEN** the Engine SHALL move `final/final_v<N>.md` (or the labelled equivalent) to `final/attic/`, write the retired marker, and recompute `latest` as the previous revision
- **AND** SHALL NOT delete or rewrite the moved bytes
- **AND** SHALL NOT reuse version number N in any later allocation

#### Scenario: Retiring a non-latest version is rejected

- **WHEN** an explicit user request attempts to retire an intermediate or non-latest version
- **THEN** the Engine SHALL reject before any target mutation, preserving the contiguous primary sequence
- **AND** it SHALL return a structured error naming the latest version as the only retireable target

#### Scenario: Agent cannot auto-retire

- **WHEN** an Agent attempts to retire a version without `--user-confirmation` (missing, empty, or not carrying a user request)
- **THEN** the CLI SHALL reject the invocation as an invocation/configuration error before the Engine is invoked
- **AND** the bundle SHALL remain byte-identical

#### Scenario: Blocked retirement implies zero mutation

- **WHEN** a retire request passes the confirmation guard but a pre-check fails (for example an auxiliary-directory collision in `final/attic/`)
- **THEN** the Engine SHALL return a `blocked` verdict naming the collision
- **AND** no bundle path — primary revision, auxiliary directory, or `final/attic/` — SHALL have been created, moved, or rewritten by that invocation


### Requirement: Final auxiliary directories SHALL bind to their primary version

A recognized auxiliary directory (`final_v<N>` or `final_<feature>_v<N>`) SHALL
classify as `auxiliary` with the same version/feature as its bound revision, SHALL
remain non-primary, and SHALL NOT enter the primary version series, change
`latest`/`next_version`, participate in the witness digest, or be allocated a
version — as today. In addition, each primary revision SHALL carry a bound
auxiliary directory containing a self-contained evidence-details file (e.g.
`07-evidence-details.md`) that materializes, for every declared key finding: the
conclusion summary, key numbers, caliber labels, and clickable external source
URLs. Every external URL in the evidence-details file SHALL resolve to the
submitted-reference frontmatter `source_url` set (no fabricated links). The
primary report's Evidence Map SHALL direct readers to the bound auxiliary
directory's evidence-details file; readers SHALL be able to verify every
conclusion from the public delivery (primary MD + bound auxiliary directory)
without accessing internal `artifacts/` or `reference/` paths. The Evidence Map
backing column SHALL retain its existing submitted-backing semantics for audit.

#### Scenario: Auxiliary directory binds its unlabelled revision

- **WHEN** final/ contains final/final_v2.md and a real directory final/final_v2/
- **THEN** the inventory SHALL classify the directory as auxiliary with version 2 and feature null
- **AND** the series SHALL remain valid with final_v2.md as its only primary revision for that version

#### Scenario: Labelled auxiliary directory binds its labelled revision

- **WHEN** final/ contains final/final_technical_deep_dive_v2.md and a real directory final/final_technical_deep_dive_v2/
- **THEN** the inventory SHALL classify the directory as auxiliary with version 2 and feature technical_deep_dive
- **AND** the series SHALL remain valid with that labelled revision as the only primary entry for version 2

#### Scenario: Auxiliary directory does not enter primary allocation

- **WHEN** a valid series has base final/final.md, revisions through final_v2.md, and directories final/final_v1/ and final/final_v2/
- **THEN** latest SHALL be the final_v2 primary revision and next_version SHALL be 3
- **AND** neither auxiliary directory SHALL appear in primary_entries or change the primary-series witness digest

#### Scenario: Orphan auxiliary directory blocks

- **WHEN** final/ contains a real directory final/final_v3/ but no final/final_v3.md
- **THEN** the series SHALL return valid: false with one orphan_auxiliary_directory blocker naming final_v3
- **AND** it SHALL NOT repair, renumber, rename, or delete the directory or any history

#### Scenario: Version grammar without an exact name match is an orphan

- **WHEN** final/ contains the labelled revision final/final_technical_deep_dive_v2.md and a real directory final/final_v2/ but no final/final_v2.md
- **THEN** final/final_v2/ SHALL NOT bind the labelled revision
- **AND** the series SHALL block with one orphan_auxiliary_directory blocker naming final_v2

#### Scenario: Version-decoupled directory stays supplementary

- **WHEN** final/ contains a real directory final/chips/ or final/topics/
- **THEN** the inventory SHALL classify the directory as supplementary with no version and no feature
- **AND** the series SHALL NOT block on that directory

#### Scenario: Evidence details are self-contained in the version directory

- **WHEN** a primary revision is published with a bound auxiliary directory
- **THEN** the directory SHALL contain an evidence-details file materializing every key finding's conclusion, numbers, caliber labels, and external source URLs
- **AND** every external URL SHALL be traceable to a submitted reference frontmatter `source_url` (fabricated links SHALL be rejected before persistence)

#### Scenario: Orphan auxiliary directory still blocks

- **WHEN** `final/` contains a real directory matching the auxiliary grammar but no matching primary revision file
- **THEN** the series SHALL return `valid: false` with one `orphan_auxiliary_directory` blocker naming that directory
- **AND** it SHALL NOT repair, renumber, rename, or delete the directory or any history
