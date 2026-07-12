# CLI Inspect Output Conventions

> req: IOC-001, IOC-002, IOC-003, IOC-004, IOC-005

## Purpose

定义三个独立的 wave-specific 结构 lint CLI：`inspect-wave0-output.mjs`、`inspect-wave1-output.mjs`、`inspect-wave2-output.mjs`。每个 CLI 只检查自己 wave 的输出约定，不读 `current_gate`，不继承其他 wave。Agent 在对应 wave 中途跑，拿到 inspect/advice 反馈。不是 gate（不控制 phase 前进，不写 trace，不输出 routing）。
## Requirements
### Requirement: inspect-wave0-output.mjs structural checks

`inspect-wave0-output.mjs` SHALL evaluate Wave0 gate-consumable artifact and provenance contracts through the same pure evaluator result used by `wave0-complete`. It SHALL also continue to inspect the existing Wave0-only structure conventions:

1. `reference/` has no non-hidden subdirectory;
2. non-index/readme Markdown files use `00-shared-<slug>.md` naming;
3. each `00-shared-*.md` exposes the required bullet metadata keys after an optional H1 title and before its first H2 semantic section;
4. each `00-shared-*.md` exposes the five standard semantic sections;
5. `reference/_INDEX.md` exists and inspect can diagnose the expected eight columns and data-row shape;
6. `reference/README.md` exists and inspect can diagnose empty content; and
7. `artifacts/wave0/<topic>/source.yaml` exists for every `topic_registry` topic and satisfies the accepted ReferenceMetadata array contract.

The shared blocking evaluator SHALL cover the current formal Wave0 artifact/provenance rules: `reference/`、`_INDEX.md`、`README.md` existence, shared-reference count floor, placeholder `source_url`, per-topic source YAML existence/schema/count, cache coverage, submitted ledger/output/submission presence, and delegated-bypass provenance. A formal condition SHALL use the same rule id and direct checker result in inspect and gate modes.

Wave0 flat-directory, filename, non-formal metadata/section, `_INDEX.md` presentation, and README non-empty conventions SHALL remain visible but SHALL be advisory unless an accepted formal rule directly consumes that shape. Missing formal artifacts remain blocking. Existing evidence-bearing return-map navigation checks SHALL preserve their accepted current-command classification and SHALL NOT be mislabeled as formal gate rules.

Inspect SHALL return `{ check, inspect, advice }` JSON without routing. It SHALL preserve exit code `0` for pass, `1` for known contract failure, and `2` for invocation/configuration error. It SHALL NOT execute node binding, lifecycle handoff preflight, routing, degraded handoff, gate-attempt counting, trace/log/checkpoint writes, status mutation, or completion-only `trace_event_*` checks.

#### Scenario: Flat directory check passes

- **WHEN** `reference/` contains only Markdown files and no non-hidden subdirectory
- **THEN** the flat-directory convention SHALL pass without advisory

#### Scenario: Flat directory check reports subdirectory

- **WHEN** `reference/` contains a subdirectory such as `reference/01_topic/`
- **THEN** inspect SHALL report `reference/: contains subdirectory '01_topic/' — directory must be flat`
- **AND** advice SHALL direct the Agent to flatten the files and remove the empty subdirectory
- **AND** this inspect-only maintenance convention SHALL NOT independently fail the shared gate-contract result

#### Scenario: Naming check reports unexpected file

- **WHEN** `reference/` contains `notes.md` rather than a `00-shared-<slug>.md` name
- **THEN** inspect SHALL report the unexpected filename and nearest rename/move repair
- **AND** filename preference alone SHALL be advisory when no formal rule consumes it

#### Scenario: H1 title does not hide metadata

- **WHEN** `reference/00-shared-ai-landscape.md` starts with an H1 title followed by all required bullet metadata before the first H2 semantic section
- **THEN** inspect SHALL recognize the metadata keys
- **AND** it SHALL not report them missing merely because the H1 title exists

#### Scenario: Metadata check reports missing key

- **WHEN** `reference/00-shared-ai-landscape.md` lacks metadata key `trust_level`
- **THEN** inspect SHALL name the file and missing key
- **AND** the finding SHALL be advisory when that key is not part of a formal Wave0 pass/fail rule

#### Scenario: Section check reports missing header

- **WHEN** `reference/00-shared-ai-landscape.md` lacks the `Risks And Limitations` semantic section
- **THEN** inspect SHALL name the file and missing section
- **AND** equivalent harmless heading presentation SHALL be accepted or advisory rather than a shared blocker

#### Scenario: _INDEX.md header validation

- **WHEN** `reference/_INDEX.md` exists but its table header lacks `source_layer`
- **THEN** inspect SHALL report the missing expected column
- **AND** the formal existence rule SHALL remain distinct from this inspect-only presentation diagnostic

#### Scenario: README.md missing or empty

- **WHEN** `reference/README.md` is missing
- **THEN** inspect SHALL fail the shared formal existence rule
- **WHEN** the file exists but is empty
- **THEN** inspect SHALL report the non-empty convention as advisory unless the formal rule is intentionally changed by a future spec

#### Scenario: Wave0 inspect reuses gate contract without side effects

- **WHEN** Wave0 inspect evaluates a bundle with a shared artifact/provenance failure
- **THEN** the blocking finding SHALL use the same rule id and direct checker result as `wave0-complete`
- **AND** a recursive before/after bundle snapshot SHALL show no file creation, deletion, or content change

#### Scenario: Wave0 inspect preserves command output contract

- **WHEN** `inspect-wave0-output.mjs --bundle <bundle>` completes
- **THEN** stdout SHALL contain `{ check, inspect, advice }` without routing
- **AND** the command SHALL use exit code `0`, `1`, or `2` according to the documented non-gate convention

### Requirement: inspect-wave1-output.mjs structural checks

`inspect-wave1-output.mjs` SHALL evaluate Wave1 phase-owned artifacts, structured depth-review, references, ledger/cache backing, submitted provenance, and explicit floors through the same pure evaluator result used by `wave1-complete`. It SHALL continue to check only Wave1-owned output conventions, including:

1. at least one per-topic `reference/<topic-prefix>-*.md` file derived from `topic_registry`;
2. required metadata on each Wave1 topic reference;
3. the five required semantic reference sections;
4. `artifacts/wave1/<topic>/evidence-summary.md`;
5. `artifacts/wave1/<topic>/question-list.md`; and
6. matching `reference/_INDEX.md` rows with `source_layer: wave1_topic`.

The shared blocking evaluator SHALL retain per-topic artifact/reference presence, parseable source URL, required semantic structure, reference index/backing, depth-review authority, cache/submitted provenance, explicit profile floors, backfill-token absence, work-unit submission integrity, and delegated-bypass provenance. Existing evidence-bearing return-map navigation checks SHALL preserve their accepted current-command classification.

Presentation parsing SHALL be tolerant without weakening direct contracts:

- `question_list_has_four_sections` SHALL require the four semantic sections but SHALL tolerate harmless heading whitespace/case/list-marker differences and SHALL NOT fail solely on presentation order/style;
- `source_url_present` SHALL accept a parseable bare `http(s)` URL or Markdown link while submitted source/backing rules remain blocking;
- `key_findings_non_empty` SHALL accept common bullet, numbered, or non-empty paragraph content under the semantic Key Findings section; and
- `key_facts_min_lines` SHALL remain an explicit blocking floor while accepting equivalent common list markers and spacing.

When a prerequisite parent or field is missing, inspect SHALL short-circuit only checks that depend on it. Missing or unparseable `depth-review.yaml` SHALL not generate novelty, cache-mapping, floor, profile, or decision symptoms. Missing `source_claims`, `new_source_floor`, or `decision` SHALL mask only the checks that consume that field; independent root causes SHALL remain visible.

Inspect SHALL preserve `{ check, inspect, advice }`, exit code `0/1/2`, and the no-routing non-gate contract. It SHALL not execute formal lifecycle or durability behavior.

#### Scenario: Detects missing topic reference files

- **WHEN** `topic_registry` contains topic id `03`
- **AND** `reference/` contains no matching `03-*.md` or canonical topic-slug-prefixed reference
- **THEN** inspect SHALL report that topic `03` has no Wave1 reference file

#### Scenario: Checks 0N-*.md metadata completeness

- **WHEN** `reference/03-block-goose.md` exists but lacks metadata key `why_it_matters`
- **THEN** inspect SHALL name the file and missing required metadata key

#### Scenario: Checks 0N-*.md section completeness

- **WHEN** `reference/03-block-goose.md` exists but lacks the `Core Content Capture` semantic section
- **THEN** inspect SHALL name the file and missing semantic section

#### Scenario: Wave1 inspect exposes formal gate root cause before gate

- **WHEN** a Phase Agent runs Wave1 inspect after phase-owned artifacts are materialized
- **AND** a required depth-review field or submitted provenance binding is missing
- **THEN** inspect SHALL fail with the same root rule id used by `wave1-complete`
- **AND** advice SHALL name the bundle-relative repair surface without requiring Engine source reading

#### Scenario: equivalent Markdown presentation does not block

- **WHEN** Wave1 Markdown contains the required semantic sections and direct structured backing but uses equivalent harmless whitespace, heading, or list style
- **THEN** the tolerant parser SHALL accept it or report advisory feedback
- **AND** the presentation difference SHALL NOT independently fail the shared Wave1 result

#### Scenario: Source URL parser accepts equivalent direct URL forms

- **WHEN** `evidence-summary.md` contains a parseable bare `https://` URL rather than a Markdown link
- **THEN** `source_url_present` SHALL treat the URL marker as present
- **AND** independent submitted-source and backing checks SHALL still apply

#### Scenario: Missing depth review short-circuits derivative checks

- **WHEN** `artifacts/wave1/<topic>/depth-review.yaml` is missing or unparseable
- **THEN** primary inspect output SHALL report that parent failure
- **AND** dependent novelty, cache mapping, profile, floor, and decision rules SHALL be listed as masked or omitted from primary failures

### Requirement: inspect-wave2-output.mjs structural checks

`inspect-wave2-output.mjs` SHALL evaluate Wave2 triple artifacts, finding-index contract, semantic ledger sections, synthesis references, backfill, reference index/backing, cross-reference authority, and submitted targeted-evidence provenance through the same pure evaluator result used by `wave2-complete`. It SHALL continue to inspect the existing Wave2-only conventions:

1. absence of legacy `reference/00_shared/` layout;
2. metadata and semantic-section shape of optional `reference/00-cross-*.md` files;
3. matching `reference/_INDEX.md` rows for materialized `00-cross` files;
4. non-empty `synthesis.md`, six-section `cross-topic-ledger.md`, and parseable/contract-valid `finding-index.yaml`; and
5. absence of Wave2 backfill tokens in `seed_topics/*.md`.

Triple artifacts, finding structured fields, six semantic ledger sections, synthesis/backfill/cross-artifact contracts, reference navigation/backing, explicit floors, and targeted-evidence/submitted provenance SHALL remain blocking where they are formal rules. Heading marker, spacing, and equivalent case differences SHALL be parsed tolerantly while semantic sections remain required.

Legacy `00_shared/` layout and `00-cross` metadata/standard-section presentation that is not consumed by direct authority SHALL remain visible as advisory. `source_url`, prior/submitted backing refs, index coverage, and provenance needed to classify a cross reference SHALL remain blocking.

A missing required finding field SHALL be reported before and SHALL short-circuit only implications that consume that field. The primary output SHALL not expand one missing field into repeated enum, handoff, eligibility, backing, and synthesis symptoms. Missing/unparseable finding-index parent or non-array `findings` SHALL mask dependent per-finding and derived-count checks.

Inspect SHALL preserve `{ check, inspect, advice }`, exit code `0/1/2`, no routing, and full bundle no-write behavior. Formal gate and inspect SHALL agree on shared rule ids; only formal gate may evaluate lifecycle checks, apply degraded behavior, or write durable evidence.

#### Scenario: Detects 00_shared/ subdirectory

- **WHEN** `reference/00_shared/` exists
- **THEN** inspect SHALL report the legacy layout and advise flat `reference/00-cross-*.md` files
- **AND** layout preference alone SHALL be advisory when direct authority/provenance remains valid

#### Scenario: Passes with no cross files

- **WHEN** `reference/` contains no `00-cross-*.md` files
- **THEN** optional cross-file format/index checks SHALL pass
- **AND** other Wave2 artifact and provenance rules SHALL still run

#### Scenario: Detects missing wave2 artifacts

- **WHEN** `artifacts/wave2/synthesis.md` is missing
- **THEN** inspect SHALL report the missing formal artifact and fail the shared rule

#### Scenario: Detects unreplaced backfill token

- **WHEN** a `seed_topics/*.md` file contains `__BACKFILL_WAVE2_JUDGMENT__`
- **THEN** inspect SHALL report the exact file and token as a blocking shared failure

#### Scenario: Detects missing ledger sections

- **WHEN** `cross-topic-ledger.md` lacks the HITL2 Handoff semantic section
- **THEN** inspect SHALL report the missing section
- **AND** harmless heading whitespace or marker differences SHALL not be the sole cause of failure

#### Scenario: missing finding field produces one root repair target

- **WHEN** `finding-index.yaml` contains a finding missing `hitl2_handoff`
- **THEN** Wave2 inspect SHALL report the finding, missing field, expected shape, and bundle-relative artifact as the primary root cause
- **AND** dependent handoff/eligibility/synthesis/backing implications SHALL be masked or retained only as non-primary detail

#### Scenario: Wave2 inspect and formal gate agree

- **WHEN** the same unchanged bundle is evaluated by Wave2 inspect and then by the formal Wave2 gate
- **THEN** shared artifact/provenance failed rule ids SHALL agree
- **AND** only formal gate SHALL add lifecycle-only failures or write gate attempt, bypass diagnostic, checkpoint, and routing evidence

### Requirement: Inspect CLIs are documented non-gate structured-output commands

Wave inspect CLIs SHALL be documented as non-gate structured-output commands under the framework CLI exit-code convention.

Inspect CLI stdout SHALL remain the actionable Agent decision surface and SHALL include the command's documented structured output, currently `{ check, inspect, advice }` without routing. Numeric exit code SHALL remain coarse:

- `0` when the inspected structure passes;
- `1` when the inspect check fails with actionable diagnostics; and
- `2` for caller invocation errors such as missing required flags.

Inspect CLIs SHALL NOT be documented as phase-routing gates, SHALL NOT emit or require `routing`, and SHALL NOT encode morale or continuation encouragement in exit code.

#### Scenario: Inspect failure is repairable output failure

- **WHEN** an inspect-wave CLI detects malformed or missing wave artifacts
- **THEN** it SHALL emit structured inspect/advice detail
- **AND** it SHALL use the documented non-gate failure class rather than phase-routing semantics

#### Scenario: Missing bundle is invocation error

- **WHEN** an inspect-wave CLI is called without the required bundle argument
- **THEN** it MAY use code `2` as caller invocation error
- **AND** the framework exit-code docs SHALL list this as a non-gate command class

### Requirement: Inspect output SHALL classify blocking, advisory, and diagnostic-only findings accurately

Inspect CLIs and shared inspect helpers SHALL classify findings according to the current command result:

- `blocking`: contributes to `check.passed: false` for the current inspect command or names a formal gate failure condition;
- `advisory`: does not fail the current command and covers repair suggestions or presentation/maintenance preferences that are not authority blockers; and
- `diagnostic-only`: cannot by itself establish or revoke gate coverage and does not contribute to current command failure.

A finding SHALL NOT be labeled `diagnosticOnly: true` or described as diagnostic-only when the CLI counts it toward `check.passed: false`. Gate and inspect output MAY explain that a return map does not establish evidence authority, but that statement SHALL remain separate from whether the current consumer-navigation check is blocking.

For blocking deterministic findings, inspect SHALL name the failing artifact/ref/field or rule, expected deterministic shape/canonical value, and one nearest repair surface. When a prerequisite failure makes downstream checks non-actionable, primary `inspect[]` SHALL contain the prerequisite root and SHALL mask, omit, or group dependent symptoms outside the primary repair list.

Inspect SHALL preserve `check.passed`, `check.wave`, `check.checks_run`, `check.checks_failed`, `check.return_map_classification`, `inspect[]`, and `advice[]`. It SHALL add `check.failed_rule_ids` and:

```text
check.finding_classification = {
  blocking: [...ids],
  advisory: [...ids],
  diagnostic_only: [...ids]
}
```

`check.passed` SHALL be false exactly when the current command has one or more blocking findings. `check.failed_rule_ids` SHALL match blocking shared/command rule ids, and advisory/diagnostic-only ids SHALL NOT contribute to `checks_failed`. Summary fields SHALL not contradict the command result.

#### Scenario: failed inspect command does not call its blocker diagnostic-only

- **WHEN** `inspect-wave1-output.mjs` fails because an evidence-bearing seed-topic return map has no concrete existing `reference/*.md`
- **THEN** the output SHALL classify that finding as blocking for the inspect command
- **AND** it SHALL NOT label that finding diagnostic-only
- **AND** `return_map_classification` SHALL NOT claim the failed return-map check is diagnostic-only

#### Scenario: advisory map-shape issue remains advisory

- **WHEN** a return-map issue does not affect the current command pass/fail
- **THEN** inspect output MAY classify it as advisory or diagnostic-only
- **AND** it SHALL explain that submitted ledgers and gate checks remain evidence authority

#### Scenario: gate output names blocking status

- **WHEN** a gate fails because a return-map or reference-navigation rule is configured as blocking
- **THEN** gate output SHALL name the issue as blocking
- **AND** advice SHALL direct the Agent to the concrete artifact/ref repair path

#### Scenario: blocking inspect finding includes repair coordinates

- **WHEN** an inspect command fails because a deterministic output contract is not satisfied
- **THEN** the finding SHALL name the failing bundle-relative surface and expected shape
- **AND** advice SHALL name the nearest repair surface, such as a seed-topic return-map entry, work-unit result declaration, depth-review ref, finding field, or concrete `reference/*.md` file

#### Scenario: prerequisite failure short-circuits symptoms

- **WHEN** a required structured parent object or artifact cannot be parsed
- **THEN** primary inspect output SHALL report that root cause first
- **AND** checks requiring the missing parent SHALL not emit independent primary failures

#### Scenario: summary fields agree with classifications

- **WHEN** inspect output contains blocking, advisory, and diagnostic-only findings
- **THEN** every `check.failed_rule_ids` entry SHALL appear in `check.finding_classification.blocking`
- **AND** `check.passed` and `checks_failed` SHALL ignore advisory and diagnostic-only findings
