## MODIFIED Requirements

> req: CHI-001

### Requirement: Inspect diagnoses Check failures and generates feedback

When Inspect reports multiple failures from the same checkpoint, it SHALL distinguish root causes from downstream symptoms whenever the Engine can determine the dependency. Root-cause diagnostics SHALL appear before symptom diagnostics in the Agent-facing feedback surface.

Feedback SHALL preserve complete diagnostic detail in durable artifacts when available, but the primary `inspect[]` and `advice[]` surfaces SHALL give the Agent concise next repair targets. Advice SHALL avoid telling the Agent to perform manual edits to deterministic authority files when a valid Engine path is required.

#### Scenario: Root cause is listed before symptoms

- **WHEN** a cache coverage failure causes downstream provenance coverage symptoms
- **THEN** Inspect SHALL present cache coverage as the root cause first
- **AND** downstream symptoms SHALL identify their upstream cause when known

#### Scenario: Advice stays actionable

- **WHEN** a checkpoint returns many related failures
- **THEN** advice SHALL group related symptoms under a small number of repair targets
- **AND** advice SHALL not contain multiple conflicting manual repair instructions for authority files
