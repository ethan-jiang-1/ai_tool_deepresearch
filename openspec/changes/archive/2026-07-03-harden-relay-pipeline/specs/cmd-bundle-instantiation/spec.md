# Cmd Bundle Instantiation (delta)

> req: CMI-002

## Purpose

Update the queue template slot count reference in the "Template for rb_queue.json" scenario to reflect the expanded 20-slot active window defined in `agentic-queue` AGQ-019. All other template scenarios are preserved unchanged.

## MODIFIED Requirements

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
- **THEN** it contains valid JSON with `"current_mode": "execution"`, `"state": "not_started"`, `"current_gate": "setup_ready"`, `"next_gate": "seed_topics_ready"`

#### Scenario: Template for rb_queue.json
- **WHEN** `DPT_FRAMEWORK/rb_templates/rb_queue.json.tmpl` is read
- **THEN** it contains valid JSON with `"queue_health": "ready"`, `"stop_authorization_state": "unauthorized_continue_required"`, 20 null slots, and an empty `"refill_pool": []`

#### Scenario: Template for rb_profile.yaml
- **WHEN** `DPT_FRAMEWORK/rb_templates/rb_profile.yaml.tmpl` is read
- **THEN** it contains valid YAML with `plan_basename: {{name}}`, `research_profile: not_selected`, empty `root_must_answer_set: []`, and `human_decision_checkpoints` with hitl1 `status: not_started` and hitl2 `status: not_started, answerability_class: not_assessed, user_decision: not_started, final_report_view: not_started` (matching ProfileSchema post schema-core-hitl)

#### Scenario: Template for rb_trace.jsonl
- **WHEN** `DPT_FRAMEWORK/rb_templates/rb_trace.jsonl` is read
- **THEN** it is an empty file (0 bytes)

## REMOVED Requirements

None.

## RENAMED Requirements

None.
