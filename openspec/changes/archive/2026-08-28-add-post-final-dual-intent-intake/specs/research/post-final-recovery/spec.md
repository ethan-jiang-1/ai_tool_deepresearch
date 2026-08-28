> req: POF-005

## ADDED Requirements

### Requirement: Post-final rerun intake guidance structures scope formation from a diagnostics dig-list

`command_playbook/post-final-recovery.md` SHALL include intake guidance for forming a bounded rerun scope when the current run bundle's `_diagnostics/` contains a next-dig-list: an Agent-authored, non-authority, prioritized topic-intake artifact that carries forward evidence gaps and declared dead holes from a delivered report. The guidance SHALL direct the Agent, before drafting the retained request, to:

- read the latest next-dig-list in `_diagnostics/`;
- propose one bounded scope organized by that list's own priority tiers;
- reference the selected item identifiers inside the existing `requested_scope` and `reason` strings; and
- exclude items the list itself declares as evidence-nonexistent or no-reinvestment dead holes unless the user explicitly reopens them.

The user SHALL own the scope/risk decision through the existing correction step: the Agent's tier-based proposal is a recommendation the user may correct before `apply`, unchanged from the existing reason-interpretation contract.

A next-dig-list SHALL remain non-authority. Its presence or content SHALL NOT create rerun intent, expand permission, alter inspect/apply eligibility or lineage validation, or add request schema fields, label parsing, or a second rerun route. When `_diagnostics/` contains no next-dig-list, the existing ordinary non-empty reason/scope request contract SHALL apply unchanged. The Engine SHALL continue to validate only the existing request shape and lineage.

#### Scenario: Dig-list intake produces a tier-structured scope proposal

- **WHEN** the current run bundle's `_diagnostics/` contains a next-dig-list and the user makes an explicit evidence-expanding post-final request
- **THEN** the Agent SHALL read the latest list and propose one bounded scope organized by its priority tiers with selected item identifiers referenced in the existing `requested_scope`/`reason` strings
- **AND** the user SHALL be able to correct that proposal before `apply` through the existing correction step

#### Scenario: Declared dead holes stay excluded by default

- **WHEN** the latest next-dig-list marks an item as evidence-nonexistent or no-reinvestment
- **THEN** the Agent's default scope proposal SHALL exclude that item
- **AND** the item SHALL re-enter scope only by an explicit user decision

#### Scenario: Absent dig-list keeps the ordinary request contract

- **WHEN** `_diagnostics/` contains no next-dig-list
- **THEN** the intake step SHALL be skipped
- **AND** the existing ordinary non-empty reason and requested-scope contract SHALL govern unchanged

#### Scenario: Dig-list presence adds no authority

- **WHEN** a next-dig-list exists in `_diagnostics/`
- **THEN** inspect/apply eligibility, request validation, rerun authorization, and lineage proofs SHALL remain exactly the existing contracts
- **AND** the Engine SHALL NOT parse the list, its item identifiers, or its priority tiers
