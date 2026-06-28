# Research Wave Gate Implementation (delta)

> req: RWG-015

## ADDED Requirements

### Requirement: content_dedup rule SHALL be added to wave0 and wave1 gate definitions

`gate-wave0-complete.definition.json` and `gate-wave1-complete.definition.json` SHALL each include a `content_dedup` rule.

The rule SHALL target declaration ledger inputs, not a reference directory:

```json
{
  "id": "content_dedup",
  "check": "content_dedup",
  "target": "output_declarations",
  "threshold": {
    "jaccard": 0.8,
    "url_dedup": true,
    "homepage_detect": true,
    "self_ref_detect": true
  },
  "failure_message": "检测到虚假或重复 reference 文件"
}
```

Gate CLIs (`check-gate-wave0-complete.mjs`, `check-gate-wave1-complete.mjs`) SHALL dispatch `content_dedup` to `checkContentDedup(bundlePath, rule.threshold)`. They SHALL NOT pass `referenceDir` as the input discovery surface.

#### Scenario: Wave0 gate includes content_dedup in rule set

- **WHEN** `check-gate-wave0-complete.mjs` evaluates the wave0 gate definition
- **THEN** the `content_dedup` rule SHALL be evaluated alongside existing rules
- **AND** a `content_dedup` failure SHALL cause the gate to fail

#### Scenario: Wave1 gate includes content_dedup in rule set

- **WHEN** `check-gate-wave1-complete.mjs` evaluates the wave1 gate definition
- **THEN** the `content_dedup` rule SHALL be evaluated alongside existing rules
- **AND** a `content_dedup` failure SHALL cause the gate to fail

#### Scenario: content_dedup rule definition survives schema validation

- **WHEN** `DPT_FRAMEWORK/cli/validate-bundle.mjs` validates gate definitions
- **THEN** the `content_dedup` rule with `target: "output_declarations"` and `threshold` object SHALL pass schema validation

#### Scenario: CLI dispatches content_dedup by bundle path

- **WHEN** gate CLI iteration sees `check: "content_dedup"`
- **THEN** it SHALL call `checkContentDedup(bundlePath, rule.threshold)`
- **AND** `checkContentDedup()` SHALL read `rb_output_declarations.jsonl` itself
