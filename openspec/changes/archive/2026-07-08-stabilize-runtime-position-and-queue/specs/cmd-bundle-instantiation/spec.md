## ADDED Requirements

> req: CMI-006

### Requirement: rb_status template SHALL include current_node

Bundle instantiation templates SHALL include `current_node` in `rb_status.json` so newly created bundles expose the current loaded lifecycle node coordinate field from the start of the run.

The initial value SHALL be `null`, meaning no lifecycle node has yet been loaded through `enter-phase`. The status schema SHALL accept `current_node` as a workflow node string, `null`, or absent for legacy compatibility.

#### Scenario: New bundle status includes current node

- **WHEN** a new run bundle is instantiated
- **THEN** its `rb_status.json` SHALL include `current_node: null`
- **AND** `validate-bundle.mjs` SHALL accept the status file

#### Scenario: Legacy status remains compatible

- **WHEN** an existing bundle has no `current_node`
- **THEN** status validation SHALL remain backward compatible
- **AND** the next successful `enter-phase` SHALL populate `current_node`
