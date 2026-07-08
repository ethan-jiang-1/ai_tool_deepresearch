# cmd-bundle-instantiation Specification
> req: CMI-001, CMI-002, CMI-003, CMI-004, CMI-005, CMI-006

## Purpose
Bundle 实例化命令 playbook、rb_templates 模板文件、validate-bundle.mjs/inspect-bundle.mjs 校验脚本的契约。
## Requirements
### Requirement: Command playbook guides agent to produce a complete bundle
The `DPT_FRAMEWORK/command_playbook/instantiate-run-bundle.md` playbook SHALL instruct the agent to create `dpt_rb_{name}/` at project root, containing `BUNDLE_MAP.md`, five `rb_*` control files, `seed_topics/`, `reference/`, `artifacts/`, `_cache/`, `final/`, and `_work_units/`.

The playbook SHALL describe `BUNDLE_MAP.md` as a passive bundle map and SHALL NOT treat it as a lifecycle phase node or replacement for `RUN.md`, command playbooks, or phase Markdown.

#### Scenario: Agent follows playbook for fresh bundle
- **WHEN** Agent reads `DPT_FRAMEWORK/command_playbook/instantiate-run-bundle.md` and is given name "ai-safety"
- **THEN** Agent creates `dpt_rb_ai-safety/` as a peer of `DPT_FRAMEWORK/` with `BUNDLE_MAP.md`, all required control files, and all required directories

#### Scenario: Bundle name collision
- **WHEN** `dpt_rb_ai-safety/` already exists
- **THEN** the playbook instructs the agent to report error and stop, not overwrite

### Requirement: Template files define minimal valid content

The `DPT_FRAMEWORK/rb_templates/` directory SHALL contain template files with `{{name}}` placeholders. The Agent SHALL replace `{{name}}` with the bundle name during instantiation. The `rb_queue.json` template SHALL use the queue v2 shape with `schema_version`, ordered `active_window`, ordered `refill_pool`, `delegated_in_flight`, and `terminal_history`.

The template set SHALL include `BUNDLE_MAP.md.tmpl` and SHALL NOT use `START_FROM_HERE.md.tmpl` as the primary map template for new bundles.

#### Scenario: Template for rb_queue.json

- **WHEN** `DPT_FRAMEWORK/rb_templates/rb_queue.json.tmpl` is read
- **THEN** it SHALL contain valid queue v2 JSON
- **AND** it SHALL NOT expose the legacy top-level delegated queue shape as production queue authority

#### Scenario: Template for BUNDLE_MAP.md

- **WHEN** `DPT_FRAMEWORK/rb_templates/BUNDLE_MAP.md.tmpl` is read
- **THEN** it SHALL contain the passive bundle map sections required by `bundle-map`
- **AND** it SHALL use `{{name}}` for bundle-specific naming where needed

### Requirement: JS helper validate-bundle.mjs validates all control files
The `DPT_FRAMEWORK/cli/validate-bundle.mjs` script SHALL read each control file, validate against its Zod schema, and exit with code 0 (PASS) or 1 (FAIL). The agent SHALL call it via `node DPT_FRAMEWORK/cli/validate-bundle.mjs <bundleDir>`.

#### Scenario: validate-bundle.mjs passes on valid bundle
- **WHEN** `node DPT_FRAMEWORK/cli/validate-bundle.mjs dpt_rb_ai-safety/` is called and all files are valid
- **THEN** exit code is 0 and output lists each file with ✓

#### Scenario: validate-bundle.mjs fails on invalid bundle
- **WHEN** `rb_status.json` contains `current_gate: "invalid_value"`
- **THEN** exit code is 1 and output shows ✗ with the Zod error detail

### Requirement: JS helper inspect-bundle.mjs validates directory structure
The `DPT_FRAMEWORK/cli/inspect-bundle.mjs` script SHALL check all required files and directories exist, and exit with code 0 (PASS) or 1 (FAIL). The agent SHALL call it via `node DPT_FRAMEWORK/cli/inspect-bundle.mjs <bundleDir>`.

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
