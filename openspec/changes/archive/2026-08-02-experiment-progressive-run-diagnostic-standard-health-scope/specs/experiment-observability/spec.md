> req: EXO-002

## MODIFIED Requirements

### Requirement: Profile-driven health checks consume explicit case health policy

The health verifier SHALL continue to expose explicit `light`, `standard`, and `heavy` profiles. `light` SHALL require trace parsing, legacy trace absence, and bundle schema validation. `standard` SHALL require all light checks plus gate diagnostics and trace/log timeline consistency. A `standard` report SHALL retain any observed work-unit lifecycle diagnostic, but SHALL NOT require work-unit authority or make that optional section independently change top-level health status. `heavy` SHALL require all standard checks plus work-unit lifecycle authority, ledger, runtime receipt, output file, cache trail, and dedup evidence checks.

For Agent Experiment Autorun, each selected playbook SHALL declare one explicit frontmatter `health_profile: light|standard|heavy`, independent of filename execution cost. Each native completion SHALL declare which created bundles are required health targets, and every declared target SHALL use that selected case health profile. Auxiliary bundles MAY be declared without becoming health targets. The Autorun Supervisor SHALL run health only from those validated declarations. Health scope/profile SHALL NOT be derived from a stale `RUN_EXPS` table, retired frontmatter `weight`, filename cost, or a scan-selected bundle.

#### Scenario: Light profile skips Heavy-only checks

- **WHEN** the health verifier runs a completion-declared target with `health_profile: light`
- **THEN** it does not require Heavy ledger, receipt, cache-trail, or dedup checks
- **AND** it still reports applicable observed diagnostics without changing native outcome

#### Scenario: Standard profile keeps work-unit diagnostics optional

- **WHEN** the health verifier runs a completion-declared target with `health_profile: standard`
- **AND** the target has no work-unit authority or an observed work-unit lifecycle issue
- **THEN** the report retains the `work_units` diagnostic with `required: false`
- **AND** that section alone does not make top-level health `ISSUES`

#### Scenario: Heavy profile requires provenance checks

- **WHEN** the health verifier runs a completion-declared target with `health_profile: heavy`
- **THEN** it requires ledger-driven declarations, receipts, output files, cache trails, and dedup evidence
- **AND** incomplete provenance is reported as health ISSUES or ERROR without rewriting native outcome

#### Scenario: Heavy Agent cost does not overstate bundle health scope

- **WHEN** a Heavy real-Agent playbook stops at an early lifecycle boundary whose explicit `health_profile` is light
- **THEN** native completion uses light health for its required target
- **AND** filename cost remains Heavy without being misused as an observability profile

#### Scenario: Missing explicit health policy blocks launch

- **WHEN** the selected case lacks a valid frontmatter `health_profile` or its completion declares a different target profile
- **THEN** case launch fails before health evaluation
- **AND** the Supervisor does not guess scope from filename cost, filesystem order, or a retired weight field
