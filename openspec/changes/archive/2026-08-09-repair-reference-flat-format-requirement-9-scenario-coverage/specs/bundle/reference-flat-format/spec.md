# Reference Flat Format — Delta

> req: REF-010

## MODIFIED Requirements

### Requirement: Reference metadata values SHALL be writable as valid YAML and frontmatter failures SHALL name the offending value

Reference metadata written to a `reference/*.md` opening frontmatter mapping SHALL
be valid YAML when committed. An `acceptance_status` value that the Agent-facing
template presents with an inline marker (for example `accepted :warning:`) SHALL
be documented to be quoted in YAML, so the committed mapping parses. When a
reference frontmatter parse fails, the Engine feedback SHALL name the offending
key and value (or the exact serialization rule), rather than reporting only a
generic "YAML parse failed".

#### Scenario: acceptance_status with a warning marker is committed parseable

- **WHEN** an Agent writes `acceptance_status: "accepted :warning:"` (quoted) into
  a reference frontmatter mapping and runs the reference format check
- **THEN** the mapping parses and the reference is accepted
- **AND** the unquoted form is documented as invalid in the Agent-facing template

#### Scenario: frontmatter parse failure names the offending value

- **WHEN** a reference frontmatter fails to parse
- **THEN** the Engine feedback names the offending key and value
- **AND** the feedback directs repair to the exact frontmatter line without
  requiring the Agent to infer it from a generic parser message
