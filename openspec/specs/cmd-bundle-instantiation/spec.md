# cmd-bundle-instantiation Specification
> req: CMI-001, CMI-002, CMI-003, CMI-004, CMI-005, CMI-006, CMI-007, CMI-008, CMI-009

## Purpose
Bundle 实例化命令 playbook、rb_templates 模板文件、validate-bundle.mjs/inspect-bundle.mjs 校验脚本的契约。
## Requirements
### Requirement: Command playbook guides agent to produce a complete bundle
The `DEEP_RESEARCH_HARNESS/command_playbook/instantiate-run-bundle.md` playbook SHALL instruct the agent to create `dpt_rb_{name}/` at project root, containing `BUNDLE_MAP.md`, five `rb_*` control files, `seed_topics/`, `reference/`, `artifacts/`, `_cache/`, `final/`, and `_work_units/`.

The playbook SHALL describe `BUNDLE_MAP.md` as a passive bundle map and SHALL NOT treat it as a lifecycle phase node or replacement for `RUN.md`, command playbooks, or phase Markdown.

#### Scenario: Agent follows playbook for fresh bundle
- **WHEN** Agent reads `DEEP_RESEARCH_HARNESS/command_playbook/instantiate-run-bundle.md` and is given name "ai-safety"
- **THEN** Agent creates `dpt_rb_ai-safety/` as a peer of `DEEP_RESEARCH_HARNESS/` with `BUNDLE_MAP.md`, all required control files, and all required directories

#### Scenario: Bundle name collision
- **WHEN** `dpt_rb_ai-safety/` already exists
- **THEN** the playbook instructs the agent to report error and stop, not overwrite

### Requirement: Template files define minimal valid content

The `DEEP_RESEARCH_HARNESS/rb_templates/` directory SHALL contain template files with `{{name}}` placeholders. The Agent SHALL replace `{{name}}` with the bundle name during instantiation. The `rb_queue.json` template SHALL use the queue v2 shape with `schema_version`, ordered `active_window`, ordered `refill_pool`, `delegated_in_flight`, and `terminal_history`.

The template set SHALL include `BUNDLE_MAP.md.tmpl` and SHALL NOT use `START_FROM_HERE.md.tmpl` as the primary map template for new bundles.

#### Scenario: Template for rb_queue.json

- **WHEN** `DEEP_RESEARCH_HARNESS/rb_templates/rb_queue.json.tmpl` is read
- **THEN** it SHALL contain valid queue v2 JSON
- **AND** it SHALL NOT expose the legacy top-level delegated queue shape as production queue authority

#### Scenario: Template for BUNDLE_MAP.md

- **WHEN** `DEEP_RESEARCH_HARNESS/rb_templates/BUNDLE_MAP.md.tmpl` is read
- **THEN** it SHALL contain the passive bundle map sections required by `bundle-map`
- **AND** it SHALL use `{{name}}` for bundle-specific naming where needed

### Requirement: JS helper validate-bundle.mjs validates all control files
The `DEEP_RESEARCH_HARNESS/cli/validate-bundle.mjs` script SHALL read each control file, validate against its Zod schema, and exit with code 0 (PASS) or 1 (FAIL). The agent SHALL call it via `node DEEP_RESEARCH_HARNESS/cli/validate-bundle.mjs <bundleDir>`.

#### Scenario: validate-bundle.mjs passes on valid bundle
- **WHEN** `node DEEP_RESEARCH_HARNESS/cli/validate-bundle.mjs dpt_rb_ai-safety/` is called and all files are valid
- **THEN** exit code is 0 and output lists each file with ✓

#### Scenario: validate-bundle.mjs fails on invalid bundle
- **WHEN** `rb_status.json` contains `current_gate: "invalid_value"`
- **THEN** exit code is 1 and output shows ✗ with the Zod error detail

### Requirement: JS helper inspect-bundle.mjs validates directory structure
The `DEEP_RESEARCH_HARNESS/cli/inspect-bundle.mjs` script SHALL check all required files and directories exist, and exit with code 0 (PASS) or 1 (FAIL). The agent SHALL call it via `node DEEP_RESEARCH_HARNESS/cli/inspect-bundle.mjs <bundleDir>`.

For current new bundles, the required root map file SHALL be `BUNDLE_MAP.md`. For legacy bundles that contain `START_FROM_HERE.md` but not `BUNDLE_MAP.md`, inspect SHALL exit 0 with a deprecation warning if all other required surfaces are present.

#### Scenario: inspect-bundle.mjs catches missing directory
- **WHEN** `final/` directory was not created
- **THEN** exit code is 1 and output lists `missing: final/`

#### Scenario: inspect-bundle.mjs accepts current map

- **WHEN** a bundle contains `BUNDLE_MAP.md` and all other required surfaces
- **THEN** inspect exits 0
- **AND** output does not require `START_FROM_HERE.md`

#### Scenario: inspect-bundle.mjs reports legacy map

- **WHEN** a legacy bundle contains `START_FROM_HERE.md` but not `BUNDLE_MAP.md`
- **AND** all other required bundle surfaces are present
- **THEN** inspect SHALL exit 0 with deprecation advice
- **AND** output SHALL identify `START_FROM_HERE.md` as legacy compatibility rather than current primary structure

#### Scenario: inspect-bundle.mjs reports both map names

- **WHEN** a bundle contains both `BUNDLE_MAP.md` and `START_FROM_HERE.md`
- **AND** all other required bundle surfaces are present
- **THEN** inspect SHALL exit 0
- **AND** output SHALL identify `BUNDLE_MAP.md` as the current root map
- **AND** output SHALL identify `START_FROM_HERE.md` as deprecated compatibility debris or cleanup advice

### Requirement: Bundle does NOT contain a framework copy
The production process SHALL NOT copy any framework files into the bundle.

#### Scenario: No _framework/ in bundle
- **WHEN** bundle is instantiated
- **THEN** no `_framework/` directory exists inside the bundle

### Requirement: Bundle naming is not a mid-pipeline user dependency

Bundle instantiation docs and playbooks SHALL frame the bundle `<name>` as an Agent-derived or already-supplied command input.

The Agent MAY derive a kebab-case bundle name from the research request, use a name explicitly supplied before framework execution begins, or repair collisions deterministically according to existing bundle-instantiation behavior. The playbook SHALL NOT instruct the Agent to ask the user for a bundle name during autonomous execution, and SHALL NOT make bundle creation depend on a mid-pipeline user response.

#### Scenario: Agent derives bundle name from research request

- **WHEN** the Agent starts bundle instantiation without an explicit bundle name
- **THEN** the playbook SHALL instruct it to derive a stable kebab-case name from the research topic or request
- **AND** it SHALL proceed without asking the user for a name inside autonomous execution

#### Scenario: Already-supplied name is accepted

- **WHEN** a bundle name was supplied before framework execution begins
- **THEN** the playbook MAY use that name as the command input
- **AND** it SHALL still treat subsequent instantiation commands as Agent-run framework commands

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

### Requirement: rb_plan template SHALL stamp the framework version at bundle creation

> req: CMI-007

Bundle instantiation templates SHALL stamp `framework_version` into `rb_plan.md` frontmatter at bundle creation, alongside the existing `topic_registry_version` schema stamp. The value SHALL be the current framework version, sourced from the latest `CHANGELOG.md` version entry — the version-history source of truth established by `version-management` (VEM-001) — so that a bundle records the irreplaceable fact of which framework version created it.

The `framework_version` field SHALL NOT introduce a competing version-string authority; it records a creation-time fact derived from the single CHANGELOG authority.

Any code path that rewrites `rb_plan.md` after creation (for example a rerun `add_topic` appending to `topic_registry`) SHALL preserve the existing `framework_version`.

#### Scenario: A newly created bundle stamps the current framework version

- **WHEN** `instantiate-run-bundle` creates a bundle under framework v0.30
- **THEN** `rb_plan.md` frontmatter SHALL contain `framework_version` set to v0.30, next to `topic_registry_version`
- **AND** that value SHALL equal the latest `CHANGELOG.md` version entry

#### Scenario: Rerun topic addition preserves the creation stamp

- **WHEN** a rerun `add_topic` rewrites `rb_plan.md` to append a topic to `topic_registry`
- **THEN** the pre-existing `framework_version` SHALL remain unchanged
- **AND** it SHALL still reflect the framework version the bundle was originally created under

#### Scenario: The stamp does not create a second version authority

- **WHEN** a developer looks for the framework version string
- **THEN** the bundle stamp and the RUN.md banner SHALL both derive from the same CHANGELOG authority
- **AND** no competing framework-version constant SHALL be introduced by this requirement

### Requirement: Production bundle creator SHALL reject invalid invocation before filesystem side effects

`DEEP_RESEARCH_HARNESS/cli/instantiate-run-bundle.mjs` SHALL parse its complete argv before resolving a repo root, creating a target directory, reading/writing templates, creating trace/log files, or invoking bundle validation. Its accepted invocation shape is `instantiate-run-bundle.mjs <name> [--target-dir <dir>|--target-dir=<dir>]`; it SHALL accept exactly one positional name and only the declared options. The parser SHALL also recognize `--force` solely to preserve its existing explicit no-overwrite rejection; it is not a successful invocation option. A standalone `--help` option before any `--` end-of-options delimiter SHALL take precedence over other argv validation, print usage, and exit 0 without filesystem side effects. A `--help` text after that delimiter SHALL remain a positional name and fail the name grammar. Without a preceding help option, every declared option MAY occur at most once across its separated and `=` presentations; unknown, repeated, or missing-valued options SHALL fail before filesystem side effects.

The production `<name>` SHALL match `^[a-z0-9][a-z0-9-]*$`. A flag token, unknown option, missing option value, additional positional, empty/whitespace name, or name containing a path separator, traversal segment, leading `-`, underscore, or another disallowed character SHALL fail before any filesystem side effect, with nonzero exit and one diagnostic that names the accepted invocation or name shape. The creator SHALL not normalize an invalid name into a new production identity.

After successful parsing and validation, existing production collision/no-overwrite, schema, trace/log, validation and inspection behavior SHALL remain unchanged. A successful bundle SHALL remain a direct child of the explicit `--target-dir` when supplied, otherwise of repo root. `--force` SHALL remain rejected before bundle mutation. `--target-dir` is a location rather than a bundle-name token: when the creator invokes validation or inspection for its derived bundle path, it SHALL pass that path as one direct child-process argument and SHALL NOT interpolate it into a shell command string.

#### Scenario: Help is safe before target creation

- **WHEN** `instantiate-run-bundle.mjs --help` is invoked before an end-of-options delimiter, including with an unknown sibling option or a `--target-dir` whose path does not yet exist
- **THEN** the creator SHALL print usage, exit 0, and create neither that target directory nor a `dpt_rb_*` bundle, trace, log, or control file

#### Scenario: Invalid production name cannot create a bundle

- **WHEN** the only positional name is a delimiter-protected `--help`, `bad name`, `../escape`, `-leading`, or contains an underscore
- **THEN** the creator SHALL exit nonzero before target/bundle creation
- **AND** its diagnostic SHALL name the accepted production name shape or invocation usage

#### Scenario: Malformed option fails before mutation

- **WHEN** a caller supplies an unknown option, a repeated `--target-dir` in any separated/`=` combination, a `--target-dir` without a value, or more than one positional name without a preceding standalone `--help` option
- **THEN** the creator SHALL exit nonzero before writing any filesystem surface
- **AND** the caller can correct the same command to its accepted invocation shape and retry

#### Scenario: Legal production invocation preserves direct-child creation

- **WHEN** a legal kebab-case name and explicit target directory, including one whose path contains spaces or a double quote, are supplied
- **THEN** the creator SHALL preserve its existing successful production bundle creation behavior
- **AND** the emitted bundle path SHALL be a direct child of that target directory
- **AND** validation and inspection SHALL receive the derived bundle path as its literal child-process argument

#### Scenario: Force remains forbidden

- **WHEN** a caller supplies `--force` to the production creator
- **THEN** it SHALL return the existing no-overwrite rejection before bundle mutation

### Requirement: Bundle creators render RUN_BUNDLE.md with actual framework coordinates

When production `instantiate-run-bundle.mjs` creates a bundle, it SHALL render
`RUN_BUNDLE.md` with the bundle name and framework-root relative path calculated
from the actual framework location used by the creator. It SHALL NOT assume the
bundle is a sibling of `DEEP_RESEARCH_HARNESS/` merely because that is the default
target layout.

The rendered coordinates are static navigation text, not runtime authority or
a new persistent schema field. Existing validation, inspection, trace/log,
schema, and no-overwrite contracts remain unchanged.

#### Scenario: RUN_BUNDLE.md receives correct creator-rendered coordinates

- **WHEN** a production creator writes a bundle beneath an explicit target
  directory outside the framework's sibling layout
- **THEN** its `RUN_BUNDLE.md` SHALL contain a framework path that resolves
  from that bundle to the actual framework root used by the creator
- **AND** it SHALL NOT contain a fixed `../DEEP_RESEARCH_HARNESS/` assumption
