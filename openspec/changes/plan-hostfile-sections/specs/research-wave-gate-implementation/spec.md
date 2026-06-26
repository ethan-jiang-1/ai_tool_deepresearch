> req: RWG-001, RWG-014

## MODIFIED Requirements

### Requirement: Setup-ready gate validates bundle structural integrity

The `setup-ready` gate SHALL validate that the bundle is structurally complete before research waves begin. In addition to existing file existence, directory existence, schema validation, status value, and basename consistency checks, the gate SHALL verify that `rb_plan.md` body is non-empty and does not contain required-fill template markers—the prefix patterns `(待填充` and `(尚无话题`. Intentionally-allowed markers (`(待 HITL1 填充 — …)`, `(由 Engine — …)`, `(待 HITL2 确认 — …)`) SHALL NOT cause gate failure. See `plan-hostfile-sections` PHS-002 for the full marker convention.

Gate rules added:
- `plan_body_non_empty` (`field_non_empty` on `rb_plan.md` body, after stripping frontmatter via `stripMdFrontmatter()`) — catches completely empty body.
- `plan_body_no_unfilled_marker` (`pattern_match` with negate, pattern `\((?:待填充|尚无话题)`) — catches required-fill markers the Agent failed to replace. The pattern uses prefix match: it detects `(待填充 — …)` tokens where `— …` is arbitrary guidance text.

#### Scenario: Plan with filled body and no required-fill markers passes

- **WHEN** `rb_plan.md` body contains research content and no prefix matches `(待填充` or `(尚无话题`
- **THEN** both `plan_body_non_empty` and `plan_body_no_unfilled_marker` rules SHALL pass

#### Scenario: Plan with empty body fails

- **WHEN** `rb_plan.md` body is empty after `stripMdFrontmatter()`
- **THEN** `plan_body_non_empty` rule SHALL fail with inspect: "rb_plan.md body is empty"

#### Scenario: Plan with required-fill markers fails

- **WHEN** `rb_plan.md` body contains `(待填充 — …)` or `(尚无话题 — …)`
- **THEN** `plan_body_no_unfilled_marker` rule SHALL fail with inspect listing which marker prefix was detected

#### Scenario: Plan with intentionally-allowed markers passes

- **WHEN** `rb_plan.md` body contains `(待 HITL1 填充 — …)` or `(由 Engine — …)` but NO `(待填充 — …)` or `(尚无话题 — …)` markers
- **THEN** `plan_body_no_unfilled_marker` rule SHALL pass
