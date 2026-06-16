# Bundle Instantiation

> req: CMI-001, CMI-002, CMI-003, CMI-004

Agent 读取 `DPT_FRAMEWORK/command_playbook/instantiate-run-bundle.md` 命令 playbook，按步骤生产 `dpt_rb_{name}/`。JS helper (check.mjs + inspect.mjs) 做质量保障。

## ADDED Requirements

### Requirement: Command playbook guides agent to produce a complete bundle
The `command_playbook/instantiate-run-bundle.md` playbook SHALL instruct the agent to create `dpt_rb_{name}/` at project root, containing `START_FROM_HERE.md`, five `rb_*` control files, `seed_topics/`, `reference/`, `artifacts/`, `_cache/`, `final/`.

#### Scenario: Agent follows playbook for fresh bundle
- **WHEN** Agent reads `command_playbook/instantiate-run-bundle.md` and is given name "ai-safety"
- **THEN** Agent creates `dpt_rb_ai-safety/` as a peer of `DPT_FRAMEWORK/` with all required files and directories

#### Scenario: Bundle name collision
- **WHEN** `dpt_rb_ai-safety/` already exists
- **THEN** the playbook instructs the agent to report error and stop, not overwrite

### Requirement: Template files define minimal valid content
The `DPT_FRAMEWORK/rb_templates/` directory SHALL contain template files with `{{name}}` placeholders. The agent SHALL replace `{{name}}` with the bundle name during instantiation.

#### Scenario: Template for START_FROM_HERE.md
- **WHEN** `DPT_FRAMEWORK/rb_templates/START_FROM_HERE.md.tmpl` is read
- **THEN** it contains markdown with `{{name}}` placeholder, framework path reference, control file list, data directory map, and stop authorization rules

#### Scenario: Template for rb_plan.md
- **WHEN** `DPT_FRAMEWORK/rb_templates/rb_plan.md.tmpl` is read
- **THEN** it contains JSON frontmatter with `"plan_basename": "{{name}}"`, `"derived_topic_count": 0`, `"topic_registry": []`, and a markdown body with placeholder sections

#### Scenario: Template for rb_status.json
- **WHEN** `DPT_FRAMEWORK/rb_templates/rb_status.json.tmpl` is read
- **THEN** it contains valid JSON with `"current_mode": "execution"`, `"state": "not_started"`, `"current_gate": "setup_ready"`, `"next_gate": "wave0_complete"`

#### Scenario: Template for rb_queue.json
- **WHEN** `DPT_FRAMEWORK/rb_templates/rb_queue.json.tmpl` is read
- **THEN** it contains valid JSON with `"queue_health": "ready"`, `"stop_authorization_state": "unauthorized_continue_required"`, five null slots, and an empty `"refill_pool": []`

#### Scenario: Template for rb_profile.yaml
- **WHEN** `DPT_FRAMEWORK/rb_templates/rb_profile.yaml.tmpl` is read
- **THEN** it contains valid YAML with `plan_basename: {{name}}`, `research_profile: not_selected`, empty `root_must_answer_set: []`, and `human_decision_checkpoints` with hitl1 `status: not_started` and hitl2 `status: not_started, answerability_class: not_assessed, user_decision: not_started, final_report_view: not_started` (matching ProfileSchema post schema-core-hitl)

#### Scenario: Template for rb_trace.jsonl
- **WHEN** `DPT_FRAMEWORK/rb_templates/rb_trace.jsonl` is read
- **THEN** it is an empty file (0 bytes)

### Requirement: JS helper check.mjs validates all control files
The `DPT_FRAMEWORK/cli/check.mjs` script SHALL read each control file, validate against its Zod schema, and exit with code 0 (PASS) or 1 (FAIL). The agent SHALL call it via `node DPT_FRAMEWORK/cli/check.mjs <bundleDir>`.

#### Scenario: check.mjs passes on valid bundle
- **WHEN** `node check.mjs dpt_rb_ai-safety/` is called and all files are valid
- **THEN** exit code is 0 and output lists each file with ✓

#### Scenario: check.mjs fails on invalid bundle
- **WHEN** `rb_status.json` contains `current_gate: "invalid_value"`
- **THEN** exit code is 1 and output shows ✗ with the Zod error detail

### Requirement: JS helper inspect.mjs validates directory structure
The `DPT_FRAMEWORK/cli/inspect.mjs` script SHALL check all required files and directories exist, and exit with code 0 (PASS) or 1 (FAIL). The agent SHALL call it via `node DPT_FRAMEWORK/cli/inspect.mjs <bundleDir>`.

#### Scenario: inspect.mjs catches missing directory
- **WHEN** `final/` directory was not created
- **THEN** exit code is 1 and output lists `missing: final/`

### Requirement: Bundle does NOT contain a framework copy
The production process SHALL NOT copy any framework files into the bundle.

#### Scenario: No _framework/ in bundle
- **WHEN** bundle is instantiated
- **THEN** no `_framework/` directory exists inside the bundle
