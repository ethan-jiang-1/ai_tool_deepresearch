> req: RWG-001

## MODIFIED Requirements

### Requirement: Setup-ready gate validates bundle structural integrity

The `setup-ready` gate SHALL validate that the bundle is structurally complete before research waves begin. In addition to existing file existence, directory existence, schema validation, status value, and basename consistency checks, the gate SHALL verify that `rb_plan.md` body is non-empty and does not contain template placeholder tokens `(待填充)` or `(尚无话题)`.

#### Scenario: Plan with filled body passes

- **WHEN** `rb_plan.md` body contains research content (at least one character after frontmatter block)
- **THEN** both `plan_body_non_empty` and `plan_body_no_placeholder` rules SHALL pass

#### Scenario: Plan with empty body fails

- **WHEN** `rb_plan.md` body is empty after stripping frontmatter
- **THEN** `plan_body_non_empty` rule SHALL fail with inspect: "rb_plan.md body is empty"

#### Scenario: Plan with unfilled placeholders fails

- **WHEN** `rb_plan.md` body contains `(待填充)` or `(尚无话题)`
- **THEN** `plan_body_no_placeholder` rule SHALL fail with inspect listing which placeholder was detected
