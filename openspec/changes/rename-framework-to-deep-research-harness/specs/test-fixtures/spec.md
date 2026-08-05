> req: TEF-001

## RENAMED Requirements

- FROM: `### Requirement: Fixtures provide a complete mini DPT_FRAMEWORK/`
- TO: `### Requirement: Fixtures provide a complete mini Deep Research Harness/`

## MODIFIED Requirements

### Requirement: Fixtures provide a complete mini Deep Research Harness/

The `tests/fixtures/DEEP_RESEARCH_HARNESS/` SHALL contain schema files (`.mjs`),
`rb_templates`, and CLI scripts sufficient to run `validate-bundle.mjs` and
`inspect-bundle.mjs`. Schemas SHALL be symlinked or copied from
`DEEP_RESEARCH_HARNESS/schema/` without compilation. The fixture SHALL not add
an independently authored legacy Harness tree.

#### Scenario: Fixtures include all required control file schemas

- **WHEN** a test script imports from
  `tests/fixtures/DEEP_RESEARCH_HARNESS/schema/index.mjs`
- **THEN** it provides CONTROL_FILE_SCHEMAS for `rb_status.json`,
  `rb_queue.json`, `rb_profile.yaml`, `rb_plan.md`, and `rb_trace.jsonl`

#### Scenario: Fixtures include working validate-bundle.mjs

- **WHEN** `node tests/fixtures/DEEP_RESEARCH_HARNESS/cli/validate-bundle.mjs
  <bundleDir>` is called with a valid bundle
- **THEN** exit code is 0

### Requirement: Fixtures are versioned alongside tests

Fixture files SHALL be committed to git. They SHALL be regenerated (re-copied)
when `DEEP_RESEARCH_HARNESS/schema/` changes.

When a copied fixture CLI's deterministic bundle-entry behavior changes in
the canonical Harness, the corresponding fixture CLI SHALL be refreshed in
the same change. In particular, the fixture `inspect-bundle.mjs` SHALL
recognize a new `BUNDLE_ENTRY.md` bundle without a stale missing-
`RUN_BUNDLE.md` warning and retain bounded legacy-entry compatibility.

#### Scenario: Fixture regeneration

- **WHEN** a new enum value is added to
  `DEEP_RESEARCH_HARNESS/schema/enums.mjs`
- **THEN** tests/fixtures/DEEP_RESEARCH_HARNESS/schema/enums.mjs is regenerated
  before tests run

#### Scenario: Fixture inspector follows entry-card succession

- **WHEN** the canonical inspector changes its bundle-entry compatibility
  contract
- **THEN** `tests/fixtures/DEEP_RESEARCH_HARNESS/cli/inspect-bundle.mjs` SHALL
  be refreshed with the same `BUNDLE_ENTRY.md` and legacy `RUN_BUNDLE.md`
  reader behavior
