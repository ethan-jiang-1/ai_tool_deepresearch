# Wave2 Synthesis — Delta

> req: WTS-012

## ADDED Requirements

### Requirement: Finding-index currentness contract SHALL be documented and named in feedback

The finding-index contract SHALL document the currentness requirements for a
Wave2 finding that can be projected into a `wave2_judgment` seed entry: the
finding `id` SHALL match `W2F-\d{3}` (three or more digits after `W2F-`) and the
finding SHALL carry a `created_in_rerun_count` equal to the current round. When
`wave2_judgment` apply is rejected for a non-current or malformed finding, the
feedback SHALL name which currentness fact is missing or mismatched (id format
vs missing `created_in_rerun_count` vs wrong round).

#### Scenario: malformed finding id is named

- **WHEN** a `wave2_judgment` apply references a finding id that does not match
  `W2F-\d{3}`
- **THEN** the feedback names the id format rule and the offending id

#### Scenario: missing currentness field is named

- **WHEN** a `wave2_judgment` apply references a finding that lacks
  `created_in_rerun_count` equal to the current round
- **THEN** the feedback names the missing/mismatched field and the required
  value
- **AND** the feedback does not require the Agent to reverse-engineer the rule
  from a generic "not current" message
