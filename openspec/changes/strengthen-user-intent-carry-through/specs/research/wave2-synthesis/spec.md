> req: WTS-013

## ADDED Requirements

### Requirement: Wave2 synthesis SHALL expose current-intent coverage without becoming its authority

Before pure synthesis, the Phase Agent SHALL read applicable HITL1 controls,
the newest complete matching Decisions revision for a rerun, affected Topics'
matching directions, current-round `focus_coverage` outcomes, the routed
carried-target receipt, finding index, and verified evidence. Older revisions,
nonmatching directions, and historical submitted work MAY inform history but
SHALL NOT be represented as current amendment coverage.

When current controls or amendments create material commitments,
`artifacts/wave2/synthesis.md` SHALL contain a readable Current Intent Coverage
section that summarizes the current incremental objective, affected Topics,
which commitments have current backing, and which remain visible limitations.
It SHALL cite the source coordinates and applicable commitment/finding IDs
rather than copy complete user wording. The section is a human-readable
projection: it SHALL NOT add fields to `finding-index.yaml`, a ledger row,
synthesis eligibility, a Gate rule, or a second coverage verdict. When no
material control or amendment exists, the current synthesis contract remains
valid without an empty section.

#### Scenario: Current coverage separates backed and limited commitments

- **WHEN** one rerun commitment has current backing and another has an accepted visible limitation
- **THEN** synthesis SHALL identify both outcomes with their current source coordinates and IDs
- **AND** it SHALL not describe the limited commitment as covered or hide it during narrative compression

#### Scenario: Historical evidence is not relabelled as current completion

- **WHEN** round-2 synthesis can read relevant evidence submitted in round 1 but no current-round backing satisfies a changed commitment
- **THEN** the evidence MAY remain contextual history
- **AND** the Current Intent Coverage projection SHALL not report it as current-round covered backing

#### Scenario: Projection does not expand structured authority

- **WHEN** synthesis includes the Current Intent Coverage section
- **THEN** finding-index, ledger, Gate, provenance, and submitted-work contracts SHALL remain unchanged
- **AND** no Engine component SHALL parse the section to decide semantic satisfaction
