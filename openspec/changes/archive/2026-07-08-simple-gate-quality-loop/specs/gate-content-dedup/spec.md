## REMOVED Requirements

> req: GAC-001, GAC-002, GAC-003, GAC-004, GAC-005, GAC-006, GAC-007, GAC-008, GAC-009

### Requirement: content_dedup SHALL read reference inputs from declaration ledger

**Reason**: `content_dedup` was a historical patch for earlier delegated-output bugs. Current quality authority belongs to work-unit submit, declaration ledger coverage, cache trail validation, provenance/hash checks, source/reference schema checks, and phase handoff witnesses. Keeping a separate dedup patch would add second-order quality logic to the quality loop itself.

**Migration**: Remove `checkContentDedup()` as an active gate helper and remove all current production guidance that treats `content_dedup` as a gate, diagnostic, or advice surface. Ledger input authority remains covered by `agent-output-declaration`, `work-unit-provenance-gate`, and `research-wave-gate-implementation`. If registry entries must remain for no-delete traceability, they SHALL be `[DEPRECATED]` tombstones only after archive/sync removes this active delta declaration path; `gate-content-dedup` SHALL have no current main spec directory after archive.

#### Scenario: content_dedup input discovery is no longer an active contract

- **WHEN** Wave0 or Wave1 gates evaluate phase-boundary quality
- **THEN** they SHALL NOT call `checkContentDedup()`
- **AND** they SHALL rely on declaration-ledger, work-unit, cache, provenance, hash, and schema checks for deterministic authority

### Requirement: Jaccard similarity check SHALL detect near-duplicate reference content

**Reason**: Jaccard similarity is an error-prone content heuristic and does not belong in the deterministic phase-boundary gate quality loop.

**Migration**: Remove active Jaccard dedup helper code and tests. If future semantic duplicate detection is needed, it must be proposed as an Agent-facing research-quality workflow or separate advisory analysis, not a phase-boundary gate patch.

#### Scenario: Jaccard heuristic is absent from gate evaluation

- **WHEN** active gate helper code and Wave0/Wave1 gate CLIs are inspected
- **THEN** no phase-boundary gate SHALL evaluate Jaccard similarity as pass/fail or diagnostic advice

### Requirement: URL dedup check SHALL detect duplicate source URLs

**Reason**: URL duplicate heuristics were part of the historical patch and are too coarse for gate authority. Duplicate-looking URLs are not a reliable substitute for provenance, cache, and source schema checks.

**Migration**: Remove `content_dedup` URL duplicate checks. Source URL presence and cache mapping remain enforced by source/reference schema, cache trail, ledger, and work-unit provenance contracts.

#### Scenario: URL dedup heuristic is absent from active gates

- **WHEN** two references share or normalize to the same source URL
- **THEN** `content_dedup` SHALL NOT run
- **AND** any blocking failure SHALL come from accepted deterministic contracts such as schema, cache, ledger, provenance, or hash checks

### Requirement: Homepage URL detection SHALL flag root-domain-only references

**Reason**: Homepage detection caused false positives and encoded a brittle quality heuristic into the gate. It should not decide phase advancement or remain as hidden advice.

**Migration**: Remove homepage detection from active gate helper code and tests. Accepted source/reference format and cache content diagnostics continue to require concrete, recoverable evidence surfaces where those requirements are deterministic.

#### Scenario: Homepage heuristic is not current authority

- **WHEN** a source URL looks shallow, root-like, or homepage-like
- **THEN** the retired `content_dedup` homepage heuristic SHALL NOT block handoff or emit current gate advice

### Requirement: Self-referential language detection SHALL flag files describing themselves

**Reason**: Self-reference detection is a prose heuristic that can misclassify valid content and should not be patched into deterministic gate authority.

**Migration**: Remove self-reference detection from gate helper code and tests. Actual malformed or non-authoritative references remain covered by source/reference schema, work-unit submit, ledger coverage, cache content, and provenance checks.

#### Scenario: Self-reference heuristic is not current authority

- **WHEN** a reference file contains prose that could be interpreted as describing the file itself
- **THEN** no active phase-boundary gate SHALL run the retired self-reference heuristic

### Requirement: content_dedup SHALL return standard gate check result

**Reason**: `content_dedup` SHALL no longer be a gate check type. Keeping a standard result shape for a retired patch would make it too easy to reintroduce the patch under diagnostic-only wording.

**Migration**: Remove `content_dedup` from gate definition schemas, gate definition files, CLI dispatch switches, helper exports, docs, and positive tests. Any current occurrence outside archived OpenSpec history SHALL be negative cleanup/deprecation wording or removed.

#### Scenario: Gate definitions reject content_dedup

- **WHEN** an active gate definition contains `"check": "content_dedup"`
- **THEN** validation or regression coverage SHALL fail
- **AND** the repair SHALL be to remove the retired rule, not to mark it advisory

### Requirement: content_dedup SHALL NOT vacuously pass on empty reference declarations

**Reason**: Empty or missing reference declarations are now handled by ledger coverage, work-unit provenance, and source/reference schema authority. A retired dedup patch should not carry a separate empty-input rule.

**Migration**: Move any still-useful empty declaration diagnostics to the accepted ledger/provenance/cache checks that own the relevant authority.

#### Scenario: Empty reference declarations are handled by current authority

- **WHEN** a bundle has no valid declared reference outputs for a phase that requires them
- **THEN** the failure SHALL come from current ledger, provenance, queue/work-unit, schema, or artifact count checks
- **AND** `content_dedup` SHALL NOT run

### Requirement: content_dedup homepage detection uses path-depth heuristic

**Reason**: Path-depth homepage detection was the concrete false-positive source that showed the patch was too brittle for the quality loop.

**Migration**: Delete the active path-depth heuristic and its positive gate tests. Future source-quality concerns must be expressed through deterministic source schema/cache contracts or Agent-facing research instructions.

#### Scenario: Path-depth heuristic is removed

- **WHEN** a declared source URL has a one-segment path that may still identify a specific article or resource
- **THEN** no active gate SHALL classify it through the retired path-depth homepage heuristic

### Requirement: Gate SHALL detect reference ledger coverage gaps

**Reason**: Ledger coverage is still valid, but its accepted home is not the retired `gate-content-dedup` capability. It belongs with work-unit provenance and research wave gate diagnostics.

**Migration**: Preserve filesystem-only reference rejection and ledger coverage diagnostics under `work-unit-provenance-gate` and `research-wave-gate-implementation`. Remove any implementation coupling that routes ledger coverage through `content_dedup`.

#### Scenario: Ledger coverage survives content_dedup retirement

- **WHEN** `reference/00-shared-*.md` or topic reference files exist without submitted work-unit ledger declarations
- **THEN** current ledger/provenance checks SHALL reject them as non-authoritative
- **AND** no active diagnostic SHALL require restoring `content_dedup`

### Requirement: Orphan reference diagnostics SHALL be durable

**Reason**: Orphan diagnostics are useful, but they should be emitted by current authority-bearing ledger/provenance/cache checks, not by a retired dedup patch.

**Migration**: Keep durable orphan/reference coverage diagnostics where they are tied to accepted ledger/provenance checks. Remove `gate-content-dedup` as a current diagnostic producer.

#### Scenario: Orphan diagnostics use current checks

- **WHEN** a filesystem-only reference is detected
- **THEN** diagnostics SHALL identify it through current ledger/provenance/cache authority checks
- **AND** advice SHALL route repair through valid work-unit submit or Engine-mediated repair paths
- **AND** advice SHALL NOT mention `content_dedup` as the remedy
