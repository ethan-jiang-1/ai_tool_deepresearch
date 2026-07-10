> req: CHI-001

## MODIFIED Requirements

### Requirement: Inspect diagnoses Check failures and generates feedback

When Inspect reports multiple failures from the same checkpoint, it SHALL distinguish independent root causes from downstream symptoms whenever the Engine can determine the direct dependency. Root-cause diagnostics SHALL appear before symptom diagnostics in the Agent-facing feedback surface.

A prerequisite failure SHALL short-circuit dependent checks in primary feedback when those checks cannot produce an independent repair action. Primary `inspect[]` and `advice[]` SHALL present the smallest actionable root-cause set and one nearest repair target per root cause. Independent root causes MAY remain side by side.

Complete post-mortem detail MAY be preserved by an existing formal durable diagnostic path, but SHALL NOT be repeated as a large flat wall of derivative failures in primary feedback. A side-effect-free inspect command SHALL keep such detail in memory/stdout only and SHALL NOT create a durable artifact for the sake of completeness.

Advice SHALL avoid manual edits to deterministic authority files when a valid Engine path is required. It SHALL not encode a presentation preference as blocking when direct structured authority already proves the required fact, and SHALL direct repair back to the same visible inspect/checkpoint whenever possible.

#### Scenario: Root cause is listed before symptoms

- **WHEN** a cache coverage failure causes downstream provenance coverage symptoms
- **THEN** Inspect SHALL present cache coverage as the root cause first
- **AND** any retained downstream detail SHALL identify or remain grouped under that upstream cause

#### Scenario: Root cause short-circuits non-actionable symptoms

- **WHEN** a missing or unparseable parent artifact makes downstream provenance, enum, eligibility, handoff, or backing checks non-actionable
- **THEN** Inspect SHALL present the parent artifact failure as the primary root cause
- **AND** dependent checks SHALL be masked, omitted, or grouped outside the primary repair list

#### Scenario: Advice stays actionable

- **WHEN** a checkpoint detects several related and independent failures
- **THEN** advice SHALL group related symptoms and provide one nearest repair target for each independent root cause
- **AND** advice SHALL NOT contain conflicting manual repair instructions for authority files

#### Scenario: Presentation preference does not obscure authority

- **WHEN** a Markdown presentation difference is semantically equivalent and direct structured authority is valid
- **THEN** Inspect SHALL accept it or report advisory feedback
- **AND** the presentation difference SHALL NOT displace or contradict the direct authority result
