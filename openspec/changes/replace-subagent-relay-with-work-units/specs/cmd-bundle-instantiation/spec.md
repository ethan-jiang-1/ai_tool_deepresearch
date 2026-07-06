> req: CMI-004

## MODIFIED Requirements

### Requirement: Template files define minimal valid content

The `DPT_FRAMEWORK/rb_templates/` directory SHALL contain template files with `{{name}}` placeholders. The Agent SHALL replace `{{name}}` with the bundle name during instantiation. The `rb_queue.json` template SHALL use the queue v2 shape with `schema_version`, ordered `active_window`, ordered `refill_pool`, `delegated_in_flight`, and `terminal_history`.

#### Scenario: Template for rb_queue.json

- **WHEN** `DPT_FRAMEWORK/rb_templates/rb_queue.json.tmpl` is read
- **THEN** it SHALL contain valid queue v2 JSON
- **AND** it SHALL NOT expose top-level delegated queue slots as the production queue shape

