# Subagent Collect (delta)

> req: SUC-002

## MODIFIED Requirements

### Requirement: Artifact verification bridges relay result to queue receipt

After a `drive-relay-slot commit` succeeds (engine `commitSlotResult` validation passed), the Phase Agent SHALL verify the task's `done_condition` against the artifact file. For wave0 source intake, the artifact path SHALL be `artifacts/wave0/{topic.slug}/source.yaml` (not `reference/{topic.slug}/source.yaml`).

#### Scenario: Artifact satisfies done_condition triggers complete

- **WHEN** Sub-agent result is committed via the driver and `artifacts/wave0/{topic}/source.yaml` exists
- **AND** the file passes ReferenceMetadata schema validation
- **THEN** Phase Agent SHALL call `complete()` on the queue task
