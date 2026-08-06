> req: CMI-004, CMI-005, CMI-007, CMI-009

## RENAMED Requirements

- FROM: `### Requirement: Bundle does NOT contain a framework copy`
- TO: `### Requirement: Bundle does NOT contain a Harness copy`

- FROM: `### Requirement: rb_plan template SHALL stamp the framework version at bundle creation`
- TO: `### Requirement: rb_plan template SHALL stamp the Harness version at bundle creation`

## MODIFIED Requirements

### Requirement: Bundle does NOT contain a Harness copy

The production process SHALL NOT copy reusable Harness files into the bundle.

#### Scenario: No Harness copy in bundle

- **WHEN** a bundle is instantiated
- **THEN** no copy of `DEEP_RESEARCH_HARNESS/` or another reusable Harness asset
  tree exists inside the bundle

### Requirement: Bundle naming is not a mid-pipeline user dependency

Bundle instantiation docs and playbooks SHALL frame the bundle `<name>` as an Agent-derived or already-supplied command input.

The Agent MAY derive a kebab-case bundle name from the research request, use a name explicitly supplied before Harness execution begins, or repair collisions deterministically according to existing bundle-instantiation behavior. The playbook SHALL NOT instruct the Agent to ask the user for a bundle name during autonomous execution, and SHALL NOT make bundle creation depend on a mid-pipeline user response.

#### Scenario: Agent derives bundle name from research request

- **WHEN** the Agent starts bundle instantiation without an explicit bundle name
- **THEN** the playbook SHALL instruct it to derive a stable kebab-case name from the research topic or request
- **AND** it SHALL proceed without asking the user for a name inside autonomous execution

#### Scenario: Already-supplied name is accepted

- **WHEN** a bundle name was supplied before Harness execution begins
- **THEN** the playbook MAY use that name as the command input
- **AND** it SHALL still treat subsequent instantiation commands as Agent-run Harness commands

### Requirement: rb_plan template SHALL stamp the Harness version at bundle creation

> req: CMI-007

Bundle instantiation templates SHALL stamp `framework_version` into `rb_plan.md` frontmatter at bundle creation, alongside the existing `topic_registry_version` schema stamp. The value SHALL be the current Harness version, sourced from the latest `CHANGELOG.md` version entry — the version-history source of truth established by `version-management` (VEM-001) — so that a bundle records the irreplaceable fact of which Harness version created it.

The `framework_version` field SHALL NOT introduce a competing version-string authority; it records a creation-time fact derived from the single CHANGELOG authority.

Any code path that rewrites `rb_plan.md` after creation (for example a rerun `add_topic` appending to `topic_registry`) SHALL preserve the existing `framework_version`.

#### Scenario: A newly created bundle stamps the current Harness version

- **WHEN** `instantiate-run-bundle` creates a bundle under Harness v0.30
- **THEN** `rb_plan.md` frontmatter SHALL contain `framework_version` set to v0.30, next to `topic_registry_version`
- **AND** that value SHALL equal the latest `CHANGELOG.md` version entry

#### Scenario: Rerun topic addition preserves the creation stamp

- **WHEN** a rerun `add_topic` rewrites `rb_plan.md` to append a topic to `topic_registry`
- **THEN** the pre-existing `framework_version` SHALL remain unchanged
- **AND** it SHALL still reflect the Harness version the bundle was originally created under

#### Scenario: The stamp does not create a second version authority

- **WHEN** a developer looks for the Harness version string
- **THEN** the bundle stamp and the RUN.md banner SHALL both derive from the same CHANGELOG authority
- **AND** no competing Harness-version constant SHALL be introduced by this requirement

### Requirement: Bundle creators render BUNDLE_ENTRY.md with actual Harness coordinates

When production `instantiate-run-bundle.mjs` creates a bundle, it SHALL
resolve the created bundle directory and the physical
`DEEP_RESEARCH_HARNESS/` source root before rendering coordinates. It SHALL
render `BUNDLE_ENTRY.md` with the bundle name and a canonical-Harness-root
relative path calculated from those resolved locations. Any coordinate for the
Harness root rendered in `BUNDLE_ENTRY.md` or `BUNDLE_MAP.md` SHALL point to the
canonical physical Harness root. The production creator SHALL be supported
only from its canonical Harness command location; it SHALL not expose an
alternate source-root invocation or rendered source coordinate. It SHALL NOT
assume the bundle is a sibling of the Harness merely because that is the
default target layout, and it SHALL NOT emit a canonical `RUN_BUNDLE.md`.

`--target-dir` MAY be an explicit relative input, but after the bundle exists
the creator SHALL print its filesystem-resolved canonical absolute directory
to stdout for the current-run-bundle-root handoff. It SHALL not print or pass
a cwd-relative bundle spelling as that handoff coordinate.

The rendered coordinates are static navigation text, not runtime authority or a
new persistent schema field. Existing validation, inspection, trace/log,
schema, and no-overwrite contracts remain unchanged.

#### Scenario: BUNDLE_ENTRY.md receives correct creator-rendered coordinates

- **WHEN** a production creator writes a bundle beneath an explicit target
  directory outside the Harness's sibling layout
- **THEN** its `BUNDLE_ENTRY.md` SHALL contain a Harness path that resolves
  from that bundle to the actual canonical Harness root used by the creator
- **AND** it SHALL not contain a fixed sibling-path assumption or an alternate
  Harness source coordinate

#### Scenario: Relative creator target yields an absolute current-root handoff

- **WHEN** the production creator receives an explicit relative `--target-dir`
- **THEN** it SHALL create the same bundle layout under that target and print
  the created bundle's canonical absolute directory to stdout
- **AND** its rendered Harness coordinates SHALL resolve to
  `DEEP_RESEARCH_HARNESS/` as the only supported source root

#### Scenario: Canonical creator command is the only supported source entry

- **WHEN** an Agent or operator invokes the production bundle creator
- **THEN** the supported command path SHALL be under
  `DEEP_RESEARCH_HARNESS/cli/`
- **AND** the repository SHALL not provide a second source-root command path
  that reaches the same creator
