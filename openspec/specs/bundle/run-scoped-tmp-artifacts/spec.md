# run-scoped-tmp-artifacts Specification
> req: RUS-001, RUS-002, RUS-003, RUS-004

## Purpose
run-scoped 脚本中间/临时产物的落点契约：bundle 自带 `_tmp/`、脚本中间产物只写 bundle `_tmp/`、统一 staging helper、硬编码系统 `/tmp/` 写路径的只读扫描与 recovery 采纳路径。

## Requirements

### Requirement: Bundle owns a run-scoped tmp directory

Every run bundle SHALL own a `_tmp/` directory directly under its root (sibling of `_scripts/`, `_logs/`, `_cache/`), created at instantiation time as the sanctioned location for run-scoped script intermediate artifacts. `_tmp/` SHALL be a non-authority runtime area (same class as `_scripts/`, `_logs/`, `_cache/`): its contents are Agent-produced execution aids that SHALL archive with the bundle, MAY be deleted or rebuilt, and SHALL NOT establish gate, evidence, provenance, receipt, or lifecycle authority, and its presence or contents SHALL NOT be part of any gate or inspect-bundle required-shape check.

`_tmp/` SHALL carry a `README.md` (scaffolded at instantiation) that states, in the bundle's primary agent language: this is the run's temporary directory; intermediate artifacts produced by run-scoped scripts belong here; system `/tmp/` SHALL NOT be used for run-scoped intermediates because it is not archived with the bundle and mixes information across runs.

#### Scenario: Fresh bundle contains _tmp scaffold

- **WHEN** a bundle is instantiated
- **THEN** `_tmp/` and `_tmp/README.md` exist under the bundle root
- **AND** the README declares the directory temporary and bundle-scoped

#### Scenario: _tmp stays out of required shape

- **WHEN** inspect-bundle validates a bundle whose `_tmp/` is absent, empty, or contains arbitrary files
- **THEN** inspect SHALL NOT report `_tmp/` as a missing required surface
- **AND** SHALL NOT treat `_tmp/` contents as gate or evidence surface

### Requirement: Run-scoped script intermediates SHALL land in bundle _tmp

Run-scoped helper scripts (`_scripts/*.mjs`) SHALL write their intermediate artifacts — queue/task cards, enrich inputs, wave projection packets, source-list drafts, result drafts, and similar staging files — under the current run bundle root `_tmp/`. Scripts SHALL NOT write run-scoped intermediates to the system temporary directory (`/tmp/`), the repository root, or `DEEP_RESEARCH_HARNESS/`.

The rule covers any file a run-scoped script creates as an intermediate step toward a declared or submitted artifact; it does not cover operating-system-level temp usage by Node itself. Writing intermediates to `_tmp/` keeps them inside the bundle so they archive, survive environment changes, and preserve provenance evidence for recovery and forensics.

#### Scenario: Executor stages enrich input under bundle _tmp

- **WHEN** a run-scoped executor needs to write an enrich input for topic `08_haiguang-shensuan4-dcu`
- **THEN** it SHALL write under the current run bundle root `_tmp/` (e.g. `_tmp/enrich-08-haiguang-shensuan4-dcu.json`)
- **AND** SHALL NOT write it to `/tmp/enrich-*.json`

#### Scenario: Projection packet is recoverable inside the bundle

- **WHEN** a run-scoped script produces a `wave0` projection packet and the source file is later rewritten
- **THEN** the packet SHALL remain inside the bundle under `_tmp/` so a recovery attempt can cite it as bundle-internal evidence
- **AND** the packet's absence from the bundle SHALL NOT be masked by a `/tmp/` copy

### Requirement: Staging helper resolves bundle-scoped temp paths

The Harness SHALL provide a `stagingFile(slug, kind)` helper (in `DEEP_RESEARCH_HARNESS/engine/helpers/run-scoped-tmp.mjs`) that resolves a staging file path inside the current run bundle root `_tmp/` from a slug and a kind (e.g. `enrich`, `wave0-proj`, `source-draft`, `result-draft`). The helper SHALL sanitize slug/kind so the resolved path stays inside `_tmp/` (no traversal), and SHALL be the documented way for run-scoped scripts to compute intermediate paths.

#### Scenario: stagingFile stays under bundle root

- **WHEN** `stagingFile('08_haiguang-shensuan4-dcu', 'enrich')` is called with a bundle root
- **THEN** it returns a path under that bundle root `_tmp/`
- **AND** traversal or separator inputs do not escape `_tmp/`

#### Scenario: Kind and slug produce distinct stable names

- **WHEN** two staging calls use the same slug with different kinds, or the same kind with different slugs
- **THEN** they resolve to distinct file paths
- **AND** repeated calls with identical inputs resolve to the same path

### Requirement: Inspect diagnoses hardcoded system-tmp writes

`inspect-bundle.mjs` SHALL scan `_scripts/*.mjs` of the selected bundle for hardcoded system-tmp write paths (e.g. string literals containing `/tmp/` used as write targets, such as `/tmp/enrich-*.json`) and SHALL report each hit as a run-scoped-tmp diagnostic naming the file and the offending literal. A hit inside the selected current bundle's `_scripts/` SHALL be an active-bundle blocker diagnostic, and inspect SHALL exit `1` for it (same blocker convention as BUI-003 cross-bundle reference diagnostics); a hit that cannot be associated with the current run surface MAY be reported as cleanup and SHALL NOT change exit semantics.

The scan is a read-only diagnostic: it does not repair, rewrite, or gate the bundle's gate verdicts, and it SHALL NOT alter inspect's exit semantics for unrelated surfaces.

#### Scenario: Hardcoded /tmp write is reported

- **WHEN** a bundle's `_scripts/process-all-seeds.mjs` contains `'/tmp/enrich-' + slug + '.json'`
- **THEN** inspect SHALL report a diagnostic naming `_scripts/process-all-seeds.mjs` and the `/tmp/` literal
- **AND** inspect SHALL exit `1` for the active-bundle blocker
- **AND** SHALL NOT rewrite the script or alter inspect's exit semantics for unrelated surfaces

#### Scenario: Bundle-local staging is not a diagnostic

- **WHEN** a bundle's `_scripts/` scripts write only under `_tmp/` (directly or via the staging helper)
- **THEN** inspect SHALL NOT report a run-scoped-tmp diagnostic for those scripts
- **AND** inspect SHALL NOT exit `1` for a run-scoped-tmp reason
