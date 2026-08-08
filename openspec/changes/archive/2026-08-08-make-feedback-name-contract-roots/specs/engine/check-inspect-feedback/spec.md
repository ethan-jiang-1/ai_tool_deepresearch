# Check & Inspect Feedback Loop — Delta

> req: CHI-005

## ADDED Requirements

### Requirement: Generic parse/validation failures SHALL name the exact contract fact

When a deterministic parse, validation, schema, or evaluator step fails for a
reason the Agent cannot directly read from the message alone (for example a
generic "YAML parse failed", "Value violates a declared cross-field constraint",
or "wave2_finding_not_current"), the Engine feedback SHALL name the exact
missing or offending contract fact — the specific key, value, field, enum, or
format rule — together with its authorized write surface and the same-checkpoint
rerun. The feedback SHALL be sufficient for the Agent to construct a valid
retained input or repair without reading Engine source or guessing the rule.

#### Scenario: generic parse failure names the offending fact

- **WHEN** a retained input or file fails a deterministic parse
- **THEN** the feedback names the offending key/value and the serialization rule
  violated
- **AND** the feedback names the write surface and the exact rerun checkpoint

#### Scenario: cross-field validation failure names the legal shape

- **WHEN** a structured input violates a declared cross-field constraint
- **THEN** the feedback names the exact field path, the legal allowed shape, and
  the value that violated it
- **AND** the feedback does not require the Agent to reverse-engineer the rule
  from a generic constraint message

#### Scenario: lifecycle-currentness failure names the missing fact

- **WHEN** an operation is rejected because a required fact is not current
  (for example a finding id not current for the current round)
- **THEN** the feedback names which fact is missing or mismatched and what value
  is required
- **AND** the feedback preserves the recorded decision without inventing a new one
