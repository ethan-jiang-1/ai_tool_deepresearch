# Reference Flat Format — Delta

> req: REF-010, REF-011

## ADDED Requirements

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

### Requirement: Canonical Wave1 locator derivation SHALL be documented in Agent-facing guidance

The one canonical Wave1 reference locator (which returns the exact
`reference/{topic.slug}-{token}-{digest}.md` path from normalized submitted
backing) SHALL have its derivation documented in Agent-facing guidance. The
guidance SHALL state that the canonical filename is derived from the normalized
submitted backing URL as a safe human-readable URL token plus a stable
collision-safe digest, and that an Agent-chosen filename is a repair input, not
a second locator. (The Wave1 reference-floor inspect surfacing of the exact
canonical target per candidate is governed by the Wave1 Intake delta WAI-010.)

#### Scenario: guidance documents the locator derivation

- **WHEN** an Agent reads the Wave1 reference materialization guidance
- **THEN** the guidance states that the canonical filename is derived from the
  normalized submitted backing URL as a safe human-readable URL token plus a
  stable collision-safe digest
- **AND** an Agent-chosen filename is documented as a repair input, not a second
  locator
