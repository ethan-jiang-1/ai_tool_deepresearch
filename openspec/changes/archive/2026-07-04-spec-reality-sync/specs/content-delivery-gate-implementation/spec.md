# Content Delivery Gate Implementation (delta)

> req: CDG-002

## MODIFIED Requirements

### Requirement: Readiness passed gate rule set

`gate-readiness-passed.definition.json` SHALL define a complete rule set replacing the placeholder. The gate SHALL verify:
- Required artifact directories/files exist: `seed_topics/`, `reference/_INDEX.md`, `artifacts/wave2/synthesis.md`, `artifacts/hitl2/decision-brief.md`
- Every prior gate that precedes readiness in the manifest topology has at least one `gate_attempt` event with `passed: true` in `rb_trace.jsonl` (the CLI derives the expected prior gate set from `manifest.json` at runtime — no hardcoded threshold)
- `rb_profile.yaml` is parseable as valid YAML
- `rb_trace.jsonl` is readable (every line is valid JSON)
- `rb_status.json` `current_gate` equals `readiness_passed` and `next_gate` equals `none`

The gate SHALL NOT evaluate content quality, writing quality, argument strength, or synthesis completeness. It SHALL only perform deterministic structural checks.

#### Scenario: Gate definition parseable and complete

- **WHEN** `gate-readiness-passed.definition.json` is loaded
- **THEN** it SHALL parse as valid JSON with `gate`, `description`, and `rules` fields
- **AND** `rules` SHALL contain at least 7 rules
- **AND** no rule SHALL have `check: "placeholder"`

#### Scenario: Required artifacts reachability check

- **WHEN** the gate executes artifact existence rules
- **AND** any required artifact (`seed_topics/`, `reference/_INDEX.md`, `artifacts/wave2/synthesis.md`, `artifacts/hitl2/decision-brief.md`) is missing
- **THEN** the gate SHALL return fail with a message identifying the missing artifact

#### Scenario: All prior gates passed audit

- **WHEN** the gate executes the prior-gate audit rule
- **AND** any required prior gate lacks a `gate_attempt` event with `passed: true` in `rb_trace.jsonl`
- **THEN** the gate SHALL return fail identifying the missing gate passage evidence
