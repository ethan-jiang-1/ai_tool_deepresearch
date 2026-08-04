# Artifact Persistence Recovery Delta

> req: ARP-004

## ADDED Requirements

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
