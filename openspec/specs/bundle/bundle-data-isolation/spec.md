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
