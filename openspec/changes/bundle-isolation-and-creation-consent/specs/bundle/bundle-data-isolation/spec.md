# bundle-data-isolation (delta)

> req: BUI-003

## ADDED Requirements

### Requirement: Run bundle content SHALL be informationally self-contained

During a selected current run bundle operation, every content item the bundle
produces or cites as research input — in `rb_plan.md`, `seed_topics/`,
`artifacts/`, `reference/`, `final/`, and `_scripts/` helpers that generate
such content — SHALL resolve to one of two legal origins:

1. evidence produced inside the selected current run bundle (submitted
   work-unit results, wave source sets, bundle-local cache trails), or
2. input the user explicitly supplied for this run in the current
   conversation, materialized inside the bundle with a user-supplied
   provenance marker.

Content from any other run bundle — including sibling bundles with similar
names, earlier bundles on adjacent topics, or their final reports — SHALL NOT
be cited as an evidence source, imported as a reference, or used as a
research baseline or comparison frame. A prior-research finding that the user
explicitly supplies SHALL be re-verified against primary sources before it is
cited as evidence in `artifacts/` or `final/`; until then it carries only
user-supplied-background status and SHALL NOT appear in evidence indexes as a
source.

#### Scenario: Sibling bundle final report cited as evidence is a violation

- **WHEN** the selected run bundle's `final/references/03_hybrid-deployment.md` lists `历史报告 V7` (the final report of sibling bundle `dpt_rb_chinese-ai-inference-chips-vs-nvidia/`) as a source row
- **AND** the bundle's `artifacts/wave1/<topic>/evidence-summary.md` credits claims to that 历史报告 instead of bundle-local sources
- **THEN** inspect and audit SHALL report a bundle isolation violation naming the citing files
- **AND** the violation SHALL be an active-bundle blocker when the citing file belongs to the current run surface

#### Scenario: Plan framed as delta against another bundle is a violation

- **WHEN** `rb_plan.md` frames the research questions as differences against another run bundle's findings (e.g. "与历史报告判定的差异") without any user-supplied input materialized in the bundle
- **THEN** the plan content is in violation of informational self-containment
- **AND** the Agent SHALL NOT continue the run from that framing until the user explicitly re-supplies or withdraws the baseline

#### Scenario: User-supplied prior findings are materialized with provenance

- **WHEN** the user explicitly supplies a prior research finding in the current conversation and asks the run to build on it
- **THEN** the Agent SHALL record it inside the selected bundle with a user-supplied provenance marker rather than referencing the other bundle's files
- **AND** the finding SHALL be re-verified against primary sources before being cited as evidence in `artifacts/` or `final/`

### Requirement: Cross-bundle references in bundle content SHALL be machine-diagnosed

`inspect-bundle.mjs` and `audit-phase-status.mjs` SHALL scan the selected
bundle's content files (`rb_plan.md`, `seed_topics/*.md`, `artifacts/**/*.md`,
`reference/*.md`, `final/**/*.md`) for citations of other run bundle paths or
bundle-scoped report identities (a `dpt_rb_[a-z0-9-]+` token that is not the
selected bundle's own name). Each hit SHALL be reported as a bundle isolation
diagnostic naming the file and the cited bundle, using the existing severity
split: diagnostic cleanup when it cannot be associated with the current run
surface, active-bundle blocker when it can.

The scan is a diagnostic over content text; it does not parse semantics and
does not by itself repair, rewrite, or gate the bundle.

#### Scenario: Cross-bundle path citation is reported

- **WHEN** a bundle's `_scripts/generate-final-report.mjs` emits `final/final.md` whose evidence index contains `dpt_rb_chinese-ai-inference-chips-vs-nvidia/final/final_v7.md`
- **THEN** inspect SHALL report the file and cited bundle as a bundle isolation diagnostic
- **AND** the diagnostic SHALL follow the existing cleanup/blocker severity split from BUI-002

#### Scenario: Own bundle name is not a violation

- **WHEN** a content file mentions the selected bundle's own name (e.g. in a self-referential trace or report header)
- **THEN** the scan SHALL NOT report it as a cross-bundle reference
