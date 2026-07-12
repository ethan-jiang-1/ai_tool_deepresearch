> req: RRM-005

## ADDED Requirements

### Requirement: Return-map parsing SHALL tolerate balanced field presentation wrappers

Return-map parsing SHALL map a balanced asterisk bold wrapper around an existing canonical field label, such as `**evidence_meaning**:`, to the same field as `evidence_meaning:`. Presentation normalization SHALL occur before existing entry, required-field, enum, reference, and concrete-navigation validation. Underscore emphasis, inline-code wrappers, or other Markdown presentation SHALL remain outside this requirement.

The accepted canonical fields SHALL remain `evidence_meaning`, `relationship`, `refs`, `status`, and `next_hop`. Presentation tolerance SHALL NOT accept misspelled fields, missing colons, invalid enum values, fabricated refs, or arbitrary Markdown structures. The implementation SHALL use a narrow line-level normalization and SHALL NOT add a Markdown parser dependency.

#### Scenario: Bold-wrapped canonical fields are accepted

- **WHEN** a return-map entry uses balanced bold wrappers around all five canonical field labels
- **THEN** the parser SHALL extract the same canonical fields and values as the unwrapped form
- **AND** downstream enum and reference validation SHALL still run

#### Scenario: Misspelled wrapped field remains invalid

- **WHEN** a return-map entry contains `**evidence_meanng**:`
- **THEN** presentation normalization SHALL not map it to `evidence_meaning`
- **AND** required-field validation SHALL report the missing canonical field

#### Scenario: Presentation tolerance does not weaken refs

- **WHEN** a bold-wrapped return-map entry has no concrete reference for an evidence-bearing claim
- **THEN** existing concrete-reference navigation validation SHALL still fail according to its accepted classification
