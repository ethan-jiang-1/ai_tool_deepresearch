# Subagent Node Contract (delta)

> req: SNC-001

## MODIFIED Requirements

### Requirement: Sub-agent role specs SHALL mandate lifecycle logging

Each sub-agent role spec shipped in the framework SHALL mandate that the sub-agent read its slot's `_beacon.json` and emit the lifecycle event set via `log-event.mjs`, carrying the beacon `receipt_nonce`. This contract SHALL be always-loaded in the role body, independent of spawn path.

#### Scenario: Role spec mandates beacon read + logging

- **WHEN** a sub-agent loads its role spec
- **THEN** the role spec SHALL instruct it to read `<slot>/_beacon.json` for `bundle_dir` / `log_cli` / `receipt_nonce`
- **AND** SHALL mandate emitting the lifecycle event set with the nonce
