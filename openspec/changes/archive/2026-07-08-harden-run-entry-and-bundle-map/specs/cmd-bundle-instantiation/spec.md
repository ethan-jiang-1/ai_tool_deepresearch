> req: CMI-001, CMI-003, CMI-004

## MODIFIED Requirements

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
