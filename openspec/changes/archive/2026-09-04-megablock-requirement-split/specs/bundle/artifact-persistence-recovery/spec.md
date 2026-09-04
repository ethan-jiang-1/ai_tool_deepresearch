## REMOVED Requirements

### Requirement: Final Markdown publication SHALL admit backing and protect the primary version series

- Reason: 粒度拆分(spec-lean mainline C3 megablock-requirement-split):Final Markdown publication SHALL admit backing and protect the primary version series 超粒度,按深挖定稿分界拆为单主题子块。
- Migration: requirement 文本逐字节守恒拆为 2 个子 requirement: Artifact persistence SHALL derive canonical inventory and serialize Engine-owned allocation / Final publication SHALL emit strict results and protect the reserved primary namespace。requirement 身份 = 标题稳定锚点;registry 与 spec header 零触碰(无新增/废弃 ID)。

## ADDED Requirements

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

Non-primary nested or non-reserved Final artifacts MAY remain supplementary and
SHALL not enter version allocation. When `final/final.md` exists, other
non-reserved Final Markdown remains supplementary/historical rather than a
second primary base. A legacy v0 selected by the classification above SHALL be
immutable and retained after canonical revisions begin.

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

#### Scenario: Crash recovery cannot bypass Final backing admission

- **WHEN** publication crashes after a prepared payload is durable but before no-clobber target creation, or after target creation but before workspace cleanup
- **THEN** `sweep` SHALL revalidate backing and recover or clean exactly that allocated publication
- **AND** it SHALL not allocate another version, overwrite a conflicting target, or bypass inventory lineage
