## REMOVED Requirements

### Requirement: rb_plan template SHALL stamp the Harness version at bundle creation

**Reason**: `framework_version` is a writer-only projection of an internal
changelog heading. No current Engine, Gate, CLI, migration, or execution path
uses it to select behavior, so continuing to generate it falsely suggests a
runtime version or compatibility contract.

**Migration**: New bundles SHALL omit the field. Existing bundles remain
parseable through the current plan contract; ordinary current plan mutation
continues its existing generic handling of pre-existing unknown frontmatter
without interpreting, upgrading, rejecting, or recreating
`framework_version`.
