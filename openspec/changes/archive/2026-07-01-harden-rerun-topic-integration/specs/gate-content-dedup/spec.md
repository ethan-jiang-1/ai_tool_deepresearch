# Gate Content Dedup (delta)

> req: GAC-006, GAC-007, GAC-008, GAC-009

## ADDED Requirements

### Requirement: content_dedup SHALL NOT vacuously pass on empty reference declarations

`checkContentDedup(bundlePath, options)` SHALL continue to use `rb_output_declarations.jsonl` as its only provenance authority for reference inputs.

当 ledger 存在但不含任何 `role === "reference"` declaration 时，`checkContentDedup()` SHALL return `passed: false`。它 SHALL NOT scan `reference/` and treat filesystem-only files as valid dedup inputs.

#### Scenario: Empty reference declarations fail closed

- **WHEN** `rb_output_declarations.jsonl` 不含任何 `role === 'reference'` 的 declaration
- **THEN** `checkContentDedup()` SHALL return `passed: false`
- **AND** inspect/advice SHALL explain that no completed reference output declarations were available

#### Scenario: Filesystem-only references are not trusted dedup inputs

- **WHEN** `reference/orphan.md` exists on disk
- **AND** no ledger declaration includes `reference/orphan.md`
- **THEN** `content_dedup` SHALL NOT use that file as a dedup input
- **AND** the separate ledger coverage rule SHALL fail the gate

### Requirement: content_dedup homepage detection uses path-depth heuristic

`isHomepageUrl(url)` SHALL 将满足以下任一条件的 URL 判定为 homepage：
- URL path 为 `/`、空字符串、或仅 `/index.*`
- URL path depth < 2（即 path 仅含一个 segment，如 `/news/`）

#### Scenario: Shallow path detected as homepage

- **WHEN** URL 为 `https://m-en.yna.co.kr/`
- **THEN** `isHomepageUrl()` SHALL return `true`

#### Scenario: Deep path passes homepage check

- **WHEN** URL 为 `https://m-en.yna.co.kr/view/AEN20260113007053315`
- **THEN** `isHomepageUrl()` SHALL return `false`

### Requirement: Gate SHALL detect reference ledger coverage gaps

Gate wave1-complete SHALL include a ledger coverage rule that compares filesystem reference files participating in `count_floor` with declared ledger reference paths.

The rule SHALL:
- Expand the same `reference/*{topic}*.md` target used by count-floor style checks
- Read declared paths from `rb_output_declarations.jsonl` entries where `output_files[].role === "reference"`
- Fail when any filesystem reference file matching the topic target is missing from the declared path set
- Treat filesystem scan only as orphan detection; filesystem-only files SHALL NOT become valid provenance inputs

#### Scenario: Filesystem reference missing from ledger fails

- **WHEN** `reference/05_south-korea-factor-shell.md` exists
- **AND** no `role === "reference"` declaration includes that path
- **THEN** `ledger_coverage` SHALL fail
- **AND** inspect SHALL list the orphan reference path

#### Scenario: Declared reference coverage passes

- **WHEN** each `reference/*05_south-korea-factor*.md` file has a matching `role === "reference"` declaration
- **THEN** `ledger_coverage` SHALL pass for that topic

### Requirement: Orphan reference diagnostics SHALL be durable

When gate-content-dedup or ledger coverage detects filesystem-only reference files, the Engine SHALL record a durable diagnostic in addition to returning inspect/advice.

The diagnostic SHALL include:
- orphan path
- gate or rule name
- `authority_status`
- reason the file cannot count toward pass conditions
- recommended repair path

#### Scenario: Orphan reference emits diagnostic

- **WHEN** `ledger_coverage` fails because `reference/topic-a-orphan.md` has no ledger declaration
- **THEN** inspect SHALL list the path
- **AND** `rb_trace.jsonl` SHALL contain a non-verdict diagnostic for the orphan
- **AND** `_logs/run.log` SHALL include a WARN diagnostic line
