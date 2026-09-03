# bundle-data-isolation Specification
> req: BUI-001, BUI-002

## Purpose
多个 Runtime Bundle SHALL 能在项目根同级共存，同时保持控制文件、运行数据、reference、artifacts 和 trace 互相隔离、互不污染。
## Requirements
### Requirement: Multiple bundles can coexist at project root
Two bundles (`dpt_rb_{name}`) SHALL coexist at project root, each with its own independent file set and state.

#### Scenario: Two bundles coexist side by side
- **WHEN** `dpt_rb_a/` and `dpt_rb_b/` are both present at project root
- **THEN** each has its own independent control files, data directories, and trace

#### Scenario: Modifying one bundle does not affect the other
- **WHEN** `bundleA.status.current_gate` is changed to `wave0_complete`
- **THEN** `bundleB.status.current_gate` remains unchanged

### Requirement: Each bundle has its own data directories
Every bundle SHALL own its own `reference/` and `artifacts/` directories, never sharing them with other bundles or the Harness.

#### Scenario: Bundle A references don't appear in Bundle B
- **WHEN** a reference file is written to `dpt_rb_a/reference/`
- **THEN** `dpt_rb_b/reference/` remains empty

### Requirement: Runtime output paths SHALL stay under current run bundle root and repo-root leaks SHALL be diagnosed

Runtime output paths including `_work_units/`, `artifacts/`, `_cache/`, `reference/`, `_logs/`, `final/`, `rb_status.json`, `rb_queue.json`, `rb_trace.jsonl`, and `rb_output_declarations.jsonl` SHALL resolve under the current run bundle root. When a Harness command or inspection has an explicit current run bundle path, repo-root runtime-looking directories or files SHALL be reported as bundle isolation diagnostics unless they are the selected current run bundle root itself.

`DEEP_RESEARCH_HARNESS/` SHALL remain reusable Harness assets and SHALL NOT be treated as runtime truth. Repo-root execution location SHALL NOT change the base for runtime writes.

Repo-root leak diagnostics SHALL distinguish severity. A leak MAY be reported as cleanup or historical debris when it cannot be associated with the current run bundle. It SHALL become an active-bundle blocker when the leaked path can be associated with the current bundle, current work unit, declared output, cache trail, status, trace, queue, or output ledger surface.

#### Scenario: Repo-root runtime directories are diagnosed

- **WHEN** a current run uses current run bundle root `dpt_rb_aidlc-investigation/`
- **AND** repo root contains `_work_units/`, `artifacts/`, or `_cache/` created outside that bundle
- **THEN** the inspection or preflight SHALL report a bundle isolation diagnostic naming the leaked path
- **AND** it SHALL explain that runtime writes belong under the current run bundle root

#### Scenario: Bundle-root runtime directories are valid

- **WHEN** current run bundle root `dpt_rb_aidlc-investigation/` contains `_work_units/`, `artifacts/`, `_cache/`, `reference/`, and `final/`
- **THEN** those paths SHALL be treated as runtime bundle state
- **AND** the same basename under the current run bundle root SHALL NOT be reported as a repo-root leak

#### Scenario: Unassociated old debris is diagnostic cleanup only

- **WHEN** repo root contains a runtime-looking directory that cannot be associated with the current current run bundle or current work-unit/output/cache/status surfaces
- **THEN** inspection MAY report the path as cleanup debris
- **AND** it SHALL NOT block the current run bundle solely because the old path exists

#### Scenario: Harness root is not runtime truth

- **WHEN** a Harness command is launched from repo root and references `DEEP_RESEARCH_HARNESS/`
- **THEN** the command SHALL still require or derive an explicit current run bundle root for runtime state
- **AND** it SHALL NOT write run outputs into `DEEP_RESEARCH_HARNESS/` or repo-root runtime directories

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
does not by itself repair, rewrite, or gate the bundle. It is necessary but
not sufficient evidence of informational self-containment: a semantic citation
carrying no `dpt_rb_*` token (for example a prior report identified only as
`历史报告 V7`) remains a violation of the self-containment requirement that the
scan cannot see, and stays an Agent obligation under that requirement,
reviewable through run surfacing and user audit.

#### Scenario: Cross-bundle path citation is reported

- **WHEN** a bundle's `_scripts/generate-final-report.mjs` emits `final/final.md` whose evidence index contains `dpt_rb_chinese-ai-inference-chips-vs-nvidia/final/final_v7.md`
- **THEN** inspect SHALL report the file and cited bundle as a bundle isolation diagnostic
- **AND** the diagnostic SHALL follow the existing cleanup/blocker severity split from BUI-002

#### Scenario: Own bundle name is not a violation

- **WHEN** a content file mentions the selected bundle's own name (e.g. in a self-referential trace or report header)
- **THEN** the scan SHALL NOT report it as a cross-bundle reference
