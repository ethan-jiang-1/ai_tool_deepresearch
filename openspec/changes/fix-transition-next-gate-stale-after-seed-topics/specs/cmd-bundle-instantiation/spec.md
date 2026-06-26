> req: CMI-004

## MODIFIED Requirements

### Requirement: Template files define minimal valid content

The `DPT_FRAMEWORK/rb_templates/` directory SHALL contain template files with `{{name}}` placeholders. The agent SHALL replace `{{name}}` with the bundle name during instantiation.

#### Scenario: Template for rb_status.json

- **WHEN** `DPT_FRAMEWORK/rb_templates/rb_status.json.tmpl` is read
- **THEN** it contains valid JSON with `"current_mode": "execution"`, `"state": "not_started"`, `"current_gate": "setup_ready"`, `"next_gate": "seed_topics_ready"`
