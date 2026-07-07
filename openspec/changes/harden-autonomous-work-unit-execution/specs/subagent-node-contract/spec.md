## ADDED Requirements

> req: SNC-004

### Requirement: Sub-agent role specs SHALL require beacon-first absolute path resolution and file existence verification before return

Sub-agent role specs, shared sub-agent protocol, generated work-unit task Markdown, and Phase Agent spawn prompts SHALL require the sub-agent to read the assigned `_beacon.json` before writing runtime files, extract `bundle_dir`, and resolve all runtime output paths against that active bundle root. Spawn prompts SHALL also inline the exact identity block (`work_id`, `queue_item_id`, `kind`, `receipt_nonce`, `bundle_dir`, key refs) so the sub-agent does not invent identity fields or rely on ambiguous relative paths.

Before returning success, the sub-agent SHALL verify required output files exist and are non-empty where applicable. Failure to write or verify files SHALL be reported as work-unit failure.

#### Scenario: Sub-agent consumes beacon before writing

- **WHEN** a sub-agent starts a work-unit task
- **THEN** the role contract SHALL require it to read the assigned `_beacon.json`
- **AND** all writes to `_work_units/`, `artifacts/`, `_cache/`, `reference/`, or `final/` SHALL be resolved under `beacon.bundle_dir`

#### Scenario: Spawn prompt inlines exact identity fields

- **WHEN** the Phase Agent spawns a sub-agent for a work unit
- **THEN** the spawn prompt SHALL include exact values for `work_id`, `queue_item_id`, `kind`, `receipt_nonce`, and `bundle_dir`
- **AND** it SHALL instruct the sub-agent to copy those values exactly into every runtime receipt event and `result.json`
- **AND** it SHALL NOT ask the sub-agent to generate a new nonce

#### Scenario: Repo-root writes are invalid sub-agent output

- **WHEN** a sub-agent writes `_work_units/...`, `artifacts/...`, or `_cache/...` relative to repo root instead of active bundle root
- **THEN** submit or inspection SHALL reject or diagnose the output as a bundle-root violation
- **AND** the leaked repo-root files SHALL NOT count as work-unit completion

#### Scenario: File existence verification is part of successful return

- **WHEN** a work-unit task declares output files and cache trails
- **THEN** the sub-agent SHALL verify those files under active bundle root before returning success
- **AND** if verification fails it SHALL return a failure summary rather than only content findings
