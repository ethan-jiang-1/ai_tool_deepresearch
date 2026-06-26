# cli_tools - Read-Only Verifier Helpers

This directory contains optional read-only helper checks for V12.

The helper catches mechanical issues such as missing files, non-current template paths, unresolved instantiation placeholders, runtime metavariables in active values, run-bundle boundary errors, seed intake drift, invalid enum values, missing inventory columns, queue continuity gaps, Rolling Task Projection drift, Pre-Response Gate drift, artifact path problems, and runtime topology delta sync gaps. It does not replace `COMMANDS.md`, `command_playbooks/check-instantiation.md`, `command_playbooks/check-seed-intake.md`, `command_playbooks/check-surfaces.md`, or `command_playbooks/check-runtime.md`.

`check-instantiation` covers only core run-bundle structure: `_framework`, `cli_tools`, root control-file placement, instantiation placeholder cleanup, runtime metavariable placement, local path bindings, the minimal command entrypoint, and initial state.

`check-seed-topic-shape` covers confirmed seed topic file shape: concrete upper intake fields, stable refill/growth headings, placeholder cleanup, seed file path resolution, and original-topic normalized anchors.

`check-seed-intake` covers confirmed seed topic registry, intake, status, queue alignment, and the reusable seed topic shape checks before evidence execution.

## Usage

```text
node cli_tools/check_framework.mjs --gate check-template .
node cli_tools/check_framework.mjs --gate check-instantiation <run-dir>
node cli_tools/check_framework.mjs --gate check-seed-topic-shape <run-dir>
node cli_tools/check_framework.mjs --gate check-seed-intake <run-dir>
node cli_tools/check_framework.mjs --gate check-surfaces <run-dir>
node cli_tools/check_framework.mjs --gate check-runtime <run-dir>
node cli_tools/check_framework.mjs --gate check-gate-wave1-complete <run-dir>
```

Template regression entrypoints:

```text
node cli_tools/check_framework/tests/test-template-regression.mjs
node cli_tools/check_framework/tests/test-runtime-regression.mjs
node cli_tools/check_framework/tests/test-all-regression.mjs
```

For template roots, `check-template` can be detected automatically. A run bundle with `_framework/`, `seed_topics/`, and exactly one `.profile.md`, `.plan.md`, `.status.md`, `.queue.md`, and `.trace.md` file outside `_framework/` is detected as `check-runtime`; pass `--gate check-instantiation` explicitly for clean instantiation checks or `--gate check-gate-*` for a focused gate check.

```text
node cli_tools/check_framework.mjs .
```

## Output

```text
NOTE helper output is read-only; it is not logged gate evidence and does not authorize gate passage
PASS <gate> <path>
```

or:

```text
FAIL E### <message>
```

Additional findings are emitted as `NOTE E### ...`.

`check-instantiation`, `check-seed-intake`, `check-surfaces`, and `check-runtime` use `E017` for run-bundle boundary failures: missing `_framework`, missing `seed_topics`, mutable run data inside `_framework`, control files inside `_framework`, or `topic_root/reference_dir/artifact_dir` paths that do not resolve to `RUN_DIR/seed_topics`, `RUN_DIR/seed_topics/_reference`, and `RUN_DIR/seed_topics/_artifacts`.

`check-seed-intake` uses `E012` for topic registry / intake / audit expansion mismatch. `check-seed-topic-shape`, `check-seed-intake`, `check-surfaces`, and `check-gate-setup-ready` use reusable `E018` seed shape diagnostics when a confirmed seed file is not ready for refill/backfill anchors; fix those with `command_playbooks/repair-seed-topic-shape.md`.

`check-surfaces` uses `E018` for seed topic and intake/status sync failures, `E019` for reference file-set failures, and `E020` for artifact file-set failures. It is state-aware: confirmed Topic Registry rows are strict immediately, while execution navigation files are required only after setup or execution begins.

`check-runtime` uses `E013` for topic artifact path failures. Runtime artifact paths must be concrete and resolve to `seed_topics/_artifacts/wave1_topics/<topic-id>-<topic-slug>/evidence-summary.md` or `question-list.md`.

`check-runtime` uses `E014` for active queue, source-intake runner, Rolling Task Projection, and Pre-Response Gate failures: missing queue anchors, invalid closeout shape, invalid execution mode, source-intake runners writing outside `_cache` before main-agent fan-in, missing strict silent autonomous fields, missing rolling execution window fields, routine report tasks such as `report progress` or `tell user next task`, slash-command tasks such as `use /goal`, and blocked states that lack a concrete decision blocker.

Per-gate checks use `check-gate-instantiation-complete`, `check-gate-setup-ready`, `check-gate-wave0-complete`, `check-gate-wave1-complete`, `check-gate-wave2-complete`, and `check-gate-readiness-passed`. They are focused diagnostics for one gate's audit surface. `check-runtime` still runs the full cross-cutting state-machine suite and calls the applicable gate checks.

`check-runtime` and `check-gate-*` use `E007` for runtime gate/readiness failures: later waves require the prior gate audit `overall_result=pass` plus the matching entry flag, `readiness_passed` requires all Readiness items and Runtime Qualification Result to pass, and Readiness partial/fail/not_started items block completion and final-delivery authorization.

`check-runtime` uses `E015` for topology delta consistency failures, including pending candidates without exactly one disposition, `Topology Drift Review` candidates not mirrored in `Topology Delta`, formalized topic ids missing from append-only `PLAN` / queue work / topic seed files under `TOPIC_ROOT` / `TRACE`, unsynced formalization state, and gate reopen records without concrete affected-wave repair work.

`check-runtime` also applies mechanical counted-reference row checks to rows with `counted_for_floor=yes`: concrete `local_ref_path`, `acceptance_status=accepted`, concrete `source_type`, valid `tier`, valid semicolon-separated `evidence_role`, valid `trust_level`, valid `topic_unique_status` where applicable, valid `seed_backfill_status`, acceptable `web_substance`, acceptable `content_retention_decision`, valid cross-verification enum values, and verified cross-check status for high-marketing-risk or strong-commercial-intent counted rows when `cross_verification_required=yes`.

`check-template` includes small constants-SSOT and policy-regression guards for the current template: current version must come from `specs/CONSTANTS.md`, generated skeletons must keep `<TEMPLATE_VERSION>` placeholders, gate registry paths and CLI names must stay in sync, PLAN skeletons must point to local framework authorities instead of duplicating full profile/reference/webpage rule bodies, local-reference fields must project from constants, Queue receipt phase and receipt grammar docs must stay aligned, direct-reference and instantiation-scaffold exceptions must remain explicit, final output must require `readiness_passed`, runtime topic writeback must route through `formalize-topology-delta`, and the status skeleton must not self-assert instantiation qualification before the independent verifier runs.

## Boundary

- keep dependencies as simple as possible
- use only Node.js built-in modules and local relative `.mjs` files
- no third-party packages
- no npm install
- no package.json required
- no file writes
- no helper-created temp directories
- no gate log writes
- no `_framework` writes
- no run state writes
- no stage or gate authorization
- no research judgment scoring

For manual regression fixtures, create a clearly named temporary directory under the current workspace, run the check, and delete it afterwards. Do not create fixture data inside `_framework/` or any active run state directory.
