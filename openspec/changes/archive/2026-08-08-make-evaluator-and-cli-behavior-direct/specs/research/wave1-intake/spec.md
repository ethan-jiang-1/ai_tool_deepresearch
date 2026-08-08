# Wave1 Intake — Delta

> req: WAI-011

## ADDED Requirements

### Requirement: Evidence-summary Key Findings semantic section SHALL include nested descendant subsection content

When an evidence-summary's `## Key Findings` (or equivalent semantic heading)
organizes its content under descendant headings such as `### 1. 核心机制理解`, the
semantic section body evaluated for `key_findings_missing_or_empty` SHALL include
that descendant subsection content. A `## Key Findings` whose findings are written
under `###` subsections SHALL NOT be judged empty solely because the direct body
between the heading and the first descendant heading is blank.

#### Scenario: Key Findings content under descendant headings is recognized

- **WHEN** an `evidence-summary.md` has `## Key Findings` followed by only
  `### 1. ...`, `### 2. ...` subsections that contain the findings
- **THEN** the semantic `key findings` section SHALL be non-empty
- **AND** the work-unit dry-submit SHALL NOT reject it with
  `key_findings_missing_or_empty`

#### Scenario: an actually empty Key Findings section still fails

- **WHEN** an `evidence-summary.md` has a `## Key Findings` heading with no
  content in the direct body or any descendant subsection
- **THEN** the semantic `key findings` section SHALL be empty
- **AND** the evaluator SHALL still report `key_findings_missing_or_empty`
