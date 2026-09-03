# cmd-bundle-instantiation Specification
> req: CMI-001, CMI-002, CMI-003, CMI-004, CMI-005, CMI-006, CMI-008, CMI-009

## Purpose
Bundle 实例化命令 playbook、rb_templates 模板文件、validate-bundle.mjs/inspect-bundle.mjs 校验脚本的契约。
## Requirements
### Requirement: Command playbook guides agent to produce a complete bundle

The `DEEP_RESEARCH_HARNESS/command_playbook/instantiate-run-bundle.md` playbook SHALL instruct the agent to create `dpt_rb_{name}/` at project root, containing `BUNDLE_MAP.md`, five `rb_*` control files, `seed_topics/`, `reference/`, `artifacts/`, `_cache/`, `final/`, `_work_units/`, and `_scripts/`.

The five `rb_*` control files are the instantiation-time set: `rb_plan.md`, `rb_profile.yaml`, `rb_status.json`, `rb_queue.json`, and `rb_trace.jsonl`. The playbook SHALL state that the sixth ledger file `rb_output_declarations.jsonl` is Engine-created lazily at the first successful `operate-work-unit submit` and is not part of the instantiation-time content; a freshly instantiated bundle that does not yet contain it is not drift, and its later appearance is the normal submitted-ledger runtime surface.

The playbook SHALL describe `BUNDLE_MAP.md` as a passive bundle map and SHALL NOT treat it as a lifecycle phase node or replacement for `RUN.md`, command playbooks, or phase Markdown.

`_scripts/` SHALL be scaffolded at instantiation time as the run-scoped helper script location: one-shot executors, generators, and recovery scripts that serve only the current run bundle SHALL be written there and SHALL NOT be written to the repository root or the Harness framework root. It is a non-authority runtime area (same class as `_logs/` and `_cache/`): its contents are Agent-produced execution aids that never establish gate, evidence, provenance, or lifecycle authority, and its presence or contents SHALL NOT be part of any gate or inspect-bundle required-shape check.

#### Scenario: Agent follows playbook for fresh bundle

- **WHEN** Agent reads `DEEP_RESEARCH_HARNESS/command_playbook/instantiate-run-bundle.md` and is given name "ai-safety"
- **THEN** Agent creates `dpt_rb_ai-safety/` as a peer of `DEEP_RESEARCH_HARNESS/` with `BUNDLE_MAP.md`, all required control files, and all required directories including `_scripts/`

#### Scenario: Bundle name collision

- **WHEN** `dpt_rb_ai-safety/` already exists
- **THEN** the playbook instructs the agent to report error and stop, not overwrite

#### Scenario: Playbook distinguishes instantiation-time files from the lazily created ledger

- **WHEN** an Agent reads the playbook's bundle-content description
- **THEN** it SHALL see the five instantiation-time `rb_*` control files named explicitly
- **AND** it SHALL be told that `rb_output_declarations.jsonl` appears after the first successful `submit` and its absence in a fresh bundle is not drift

#### Scenario: Playbook directs run-scoped scripts into the bundle

- **WHEN** an Agent needs to write a work-unit executor, reference generator, or recovery script during a run
- **THEN** the playbook SHALL direct it to write the script under the current run bundle root `_scripts/`
- **AND** it SHALL direct the Agent not to write such scripts to the repository root or `DEEP_RESEARCH_HARNESS/`
- **AND** the playbook SHALL present `_scripts/` as a non-authority runtime area that never counts as gate or evidence surface

### Requirement: Template files define minimal valid content

The `DEEP_RESEARCH_HARNESS/rb_templates/` directory SHALL contain template files with `{{name}}` placeholders. The Agent SHALL replace `{{name}}` with the bundle name during instantiation. The `rb_queue.json` template SHALL use the queue v2 shape with `schema_version`, ordered `active_window`, ordered `refill_pool`, `delegated_in_flight`, and `terminal_history`.

The template set SHALL include `BUNDLE_MAP.md.tmpl` and SHALL NOT use `START_FROM_HERE.md.tmpl` as the primary map template for new bundles.

#### Scenario: Template for rb_queue.json

- **WHEN** `DEEP_RESEARCH_HARNESS/rb_templates/rb_queue.json.tmpl` is read
- **THEN** it SHALL contain valid queue v2 JSON
- **AND** it SHALL NOT expose the legacy top-level delegated queue shape as production queue authority

#### Scenario: Template for BUNDLE_MAP.md

- **WHEN** `DEEP_RESEARCH_HARNESS/rb_templates/BUNDLE_MAP.md.tmpl` is read
- **THEN** it SHALL contain the passive bundle map sections required by `bundle-map`
- **AND** it SHALL use `{{name}}` for bundle-specific naming where needed

### Requirement: JS helper validate-bundle.mjs validates all control files
The `DEEP_RESEARCH_HARNESS/cli/validate-bundle.mjs` script SHALL read each control file, validate against its Zod schema, and exit with code 0 (PASS) or 1 (FAIL). The agent SHALL call it via `node DEEP_RESEARCH_HARNESS/cli/validate-bundle.mjs <bundleDir>`.

#### Scenario: validate-bundle.mjs passes on valid bundle
- **WHEN** `node DEEP_RESEARCH_HARNESS/cli/validate-bundle.mjs dpt_rb_ai-safety/` is called and all files are valid
- **THEN** exit code is 0 and output lists each file with ✓

#### Scenario: validate-bundle.mjs fails on invalid bundle
- **WHEN** `rb_status.json` contains `current_gate: "invalid_value"`
- **THEN** exit code is 1 and output shows ✗ with the Zod error detail

### Requirement: JS helper inspect-bundle.mjs validates directory structure

The `DEEP_RESEARCH_HARNESS/cli/inspect-bundle.mjs` script SHALL check all
required files and directories and the current operational entry contract. The
agent SHALL call it via
`node DEEP_RESEARCH_HARNESS/cli/inspect-bundle.mjs <bundleDir>`.

Before default structural output or any `--summary`, `--timeline`, or `--log`
output, inspect SHALL evaluate the selected root through the shared current
entry predicate. The predicate passes only when both `BUNDLE_ENTRY.md` and
`BUNDLE_MAP.md` exist at that root. On failure, inspect SHALL emit a scoped
`unsupported_current_entry_contract` rejection, exit `1`, and emit no
historical log, timeline, summary, or other inspect data from that directory.
This is a normal known-bundle validation failure, not a migration opportunity.

`RUN_BUNDLE.md`, `START_FROM_HERE.md`, or `BUNDLE_MAP.md` without
`BUNDLE_ENTRY.md` SHALL not satisfy inspect. An extra legacy file beside a
complete pair is non-authoritative historical debris and SHALL not cause
rejection or create a second success path.

#### Scenario: inspect-bundle.mjs catches missing directory

- **WHEN** a current-pair bundle lacks `final/`
- **THEN** exit code is `1` and output lists `missing: final/`
- **AND** the current-entry preflight SHALL not mask that later structural root

#### Scenario: inspect-bundle.mjs accepts current map

- **WHEN** a bundle contains `BUNDLE_ENTRY.md`, `BUNDLE_MAP.md`, and all other
  required surfaces
- **THEN** inspect exits `0`
- **AND** output does not require `RUN_BUNDLE.md` or `START_FROM_HERE.md`

#### Scenario: inspect-bundle.mjs reports legacy map

> **@deprecated scenario name** — Retained solely as the established Scenario
> anchor. The current behavior rejects the former legacy-map success path.

- **WHEN** a bundle lacks either `BUNDLE_ENTRY.md` or `BUNDLE_MAP.md`,
  including only `RUN_BUNDLE.md`, only `START_FROM_HERE.md`, or only
  `BUNDLE_MAP.md`
- **THEN** inspect exits `1` with
  `unsupported_current_entry_contract`
- **AND** it SHALL not emit a compatibility warning, migration advice, log
  content, timeline entries, or summary data from the directory

#### Scenario: inspect-bundle.mjs reports both map names

- **WHEN** a bundle contains the current pair and one or both of
  `RUN_BUNDLE.md` and `START_FROM_HERE.md`
- **THEN** inspect exits `0`
- **AND** those files SHALL not be described as an entry, map, or
  compatibility-success path

### Requirement: Bundle does NOT contain a Harness copy

The production process SHALL NOT copy any reusable Harness files into the
bundle.

#### Scenario: No Harness copy in bundle

- **WHEN** a bundle is instantiated
- **THEN** no copy of `DEEP_RESEARCH_HARNESS/`, a legacy `_framework/`
  directory, or any other reusable Harness asset exists inside the bundle

### Requirement: Bundle naming is not a mid-pipeline user dependency

Bundle instantiation docs and playbooks SHALL frame the bundle `<name>` as an Agent-derived or already-supplied command input.

The Agent MAY derive a kebab-case bundle name from the research request, or use a name explicitly supplied before Harness execution begins. Name derivation, and the instantiation of the first production bundle for a user-initiated research request, SHALL NOT depend on a mid-pipeline user response. Whether an additional bundle may be created at all — collision retry, mid-session restart, re-scope sibling, or any second bundle beside an existing same-topic bundle — is governed by the additional-creation consent requirement of this capability and SHALL follow its stop-and-ask path; it SHALL NOT be resolved by deterministically deriving a collision-safe alternate name and retrying. The playbook SHALL NOT instruct the Agent to ask the user for a bundle name during autonomous execution.

#### Scenario: Agent derives bundle name from research request

- **WHEN** the Agent starts bundle instantiation without an explicit bundle name and no sibling condition under the additional-creation consent requirement applies
- **THEN** the playbook SHALL instruct it to derive a stable kebab-case name from the research topic or request
- **AND** it SHALL proceed without asking the user for a name inside autonomous execution

#### Scenario: Already-supplied name is accepted

- **WHEN** a bundle name was supplied before Harness execution begins
- **THEN** the playbook MAY use that name as the command input
- **AND** it SHALL still treat subsequent instantiation commands as Agent-run Harness commands

#### Scenario: Collision routes to the consent boundary, not a rename

- **WHEN** the Agent's derived or supplied name collides with an existing production bundle
- **THEN** the playbook SHALL NOT instruct the Agent to derive a collision-safe alternate name and retry silently
- **AND** it SHALL route the decision through the additional-creation consent requirement of this capability

### Requirement: rb_status template SHALL include current_node

Bundle instantiation templates SHALL include `current_node` in `rb_status.json` so newly created bundles expose the current loaded lifecycle node coordinate field from the start of the run.

The initial value SHALL be `null`, meaning no lifecycle node has yet been loaded through `enter-phase`. The status schema SHALL accept `current_node` as a workflow node string, `null`, or absent for legacy compatibility.

#### Scenario: New bundle status includes current node

- **WHEN** a new run bundle is instantiated
- **THEN** its `rb_status.json` SHALL include `current_node: null`
- **AND** `validate-bundle.mjs` SHALL accept the status file

#### Scenario: Legacy status remains compatible

- **WHEN** an existing bundle has no `current_node`
- **THEN** status validation SHALL remain backward compatible
- **AND** the next successful `enter-phase` SHALL populate `current_node`

### Requirement: Production bundle creator SHALL reject invalid invocation before filesystem side effects

`DEEP_RESEARCH_HARNESS/cli/instantiate-run-bundle.mjs` SHALL parse its complete argv before resolving a repo root, creating a target directory, reading/writing templates, creating trace/log files, or invoking bundle validation. Its accepted invocation shape is `instantiate-run-bundle.mjs <name> [--target-dir <dir>|--target-dir=<dir>]`; it SHALL accept exactly one positional name and only the declared options. The parser SHALL also recognize `--force` solely to preserve its existing explicit no-overwrite rejection; it is not a successful invocation option. A standalone `--help` option before any `--` end-of-options delimiter SHALL take precedence over other argv validation, print usage, and exit 0 without filesystem side effects. A `--help` text after that delimiter SHALL remain a positional name and fail the name grammar. Without a preceding help option, every declared option MAY occur at most once across its separated and `=` presentations; unknown, repeated, or missing-valued options SHALL fail before filesystem side effects.

The production `<name>` SHALL match `^[a-z0-9][a-z0-9-]*$`. A flag token, unknown option, missing option value, additional positional, empty/whitespace name, or name containing a path separator, traversal segment, leading `-`, underscore, or another disallowed character SHALL fail before any filesystem side effect, with nonzero exit and one diagnostic that names the accepted invocation or name shape. The creator SHALL not normalize an invalid name into a new production identity.

After successful parsing and validation, existing production collision/no-overwrite, schema, trace/log, validation and inspection behavior SHALL remain unchanged. A successful bundle SHALL remain a direct child of the explicit `--target-dir` when supplied, otherwise of repo root. `--force` SHALL remain rejected before bundle mutation. `--target-dir` is a location rather than a bundle-name token: when the creator invokes validation or inspection for its derived bundle path, it SHALL pass that path as one direct child-process argument and SHALL NOT interpolate it into a shell command string.

#### Scenario: Help is safe before target creation

- **WHEN** `instantiate-run-bundle.mjs --help` is invoked before an end-of-options delimiter, including with an unknown sibling option or a `--target-dir` whose path does not yet exist
- **THEN** the creator SHALL print usage, exit 0, and create neither that target directory nor a `dpt_rb_*` bundle, trace, log, or control file

#### Scenario: Invalid production name cannot create a bundle

- **WHEN** the only positional name is a delimiter-protected `--help`, `bad name`, `../escape`, `-leading`, or contains an underscore
- **THEN** the creator SHALL exit nonzero before target/bundle creation
- **AND** its diagnostic SHALL name the accepted production name shape or invocation usage

#### Scenario: Malformed option fails before mutation

- **WHEN** a caller supplies an unknown option, a repeated `--target-dir` in any separated/`=` combination, a `--target-dir` without a value, or more than one positional name without a preceding standalone `--help` option
- **THEN** the creator SHALL exit nonzero before writing any filesystem surface
- **AND** the caller can correct the same command to its accepted invocation shape and retry

#### Scenario: Legal production invocation preserves direct-child creation

- **WHEN** a legal kebab-case name and explicit target directory, including one whose path contains spaces or a double quote, are supplied
- **THEN** the creator SHALL preserve its existing successful production bundle creation behavior
- **AND** the emitted bundle path SHALL be a direct child of that target directory
- **AND** validation and inspection SHALL receive the derived bundle path as its literal child-process argument

#### Scenario: Force remains forbidden

- **WHEN** a caller supplies `--force` to the production creator
- **THEN** it SHALL return the existing no-overwrite rejection before bundle mutation

### Requirement: Bundle creators render BUNDLE_ENTRY.md with actual Harness coordinates

When production `instantiate-run-bundle.mjs` creates a bundle, it SHALL
resolve the created bundle directory and the physical
`DEEP_RESEARCH_HARNESS/` source root before rendering coordinates. It SHALL
render `BUNDLE_ENTRY.md` with the bundle name and a canonical-Harness-root
relative path calculated from those resolved locations. Any coordinate for the
Harness root rendered in `BUNDLE_ENTRY.md` or `BUNDLE_MAP.md` SHALL point to the
canonical physical Harness root. The production creator SHALL be supported
only from its canonical Harness command location; it SHALL not expose an
alternate source-root invocation or rendered source coordinate. It SHALL NOT
assume the bundle is a sibling of the Harness merely because that is the
default target layout, and it SHALL NOT emit a canonical `RUN_BUNDLE.md`.

`--target-dir` MAY be an explicit relative input, but after the bundle exists
the creator SHALL print its filesystem-resolved canonical absolute directory
to stdout for the current-run-bundle-root handoff. It SHALL not print or pass
a cwd-relative bundle spelling as that handoff coordinate.

The rendered coordinates are static navigation text, not runtime authority or a
new persistent schema field. Existing validation, inspection, trace/log,
schema, and no-overwrite contracts remain unchanged.

#### Scenario: BUNDLE_ENTRY.md receives correct creator-rendered coordinates

- **WHEN** a production creator writes a bundle beneath an explicit target
  directory outside the Harness's sibling layout
- **THEN** its `BUNDLE_ENTRY.md` SHALL contain a Harness path that resolves
  from that bundle to the actual canonical Harness root used by the creator
- **AND** it SHALL not contain a fixed sibling-path assumption or an alternate
  Harness source coordinate

#### Scenario: Relative creator target yields an absolute current-root handoff

- **WHEN** the production creator receives an explicit relative `--target-dir`
- **THEN** it SHALL create the same bundle layout under that target and print
  the created bundle's canonical absolute directory to stdout
- **AND** its rendered Harness coordinates SHALL resolve to
  `DEEP_RESEARCH_HARNESS/` as the only supported source root

#### Scenario: Canonical creator command is the only supported source entry

- **WHEN** an Agent or operator invokes the production bundle creator
- **THEN** the supported command path SHALL be under
  `DEEP_RESEARCH_HARNESS/cli/`
- **AND** the repository SHALL not provide a second source-root command path
  that reaches the same creator

### Requirement: Additional bundle creation SHALL carry an explicit user decision

Creating an additional production run bundle — including a collision retry
after an existing `dpt_rb_{name}/` rejected instantiation, a mid-session
restart of an unfinished run, a re-scoped sibling of an active bundle, or any
second bundle in the same workspace while a prior same-topic bundle exists —
SHALL require the user's explicit awareness and decision before the
instantiation command runs. The Agent SHALL present the existing bundle
situation (name, lifecycle state, why a new bundle is proposed) and obtain the
user's explicit consent. Deriving the kebab-case name itself remains
Agent-executed per the naming requirement and does not require user input.

The first bundle created for a user-initiated research request is authorized
by that request; every subsequent creation is an additional creation under
this requirement. Consent lives in the current conversation and the explicit
acknowledgment argument of the creator CLI; it is not a durable state, not a
third in-run HITL checkpoint, and does not alter HITL1/HITL2 exclusivity.

The command playbook `instantiate-run-bundle.md` SHALL NOT instruct the Agent
to silently derive a collision-safe alternate name and retry on collision;
on collision or sibling presence it SHALL instruct the Agent to stop and ask
the user.

#### Scenario: Collision no longer silently renames

- **WHEN** `dpt_rb_glm-5-3-deepseek-v4-domestic-chips/` already exists and the Agent's proposed name collides
- **THEN** the playbook SHALL instruct the Agent to stop and ask the user whether to continue the existing bundle, reopen it through the accepted recovery path, or create an additional bundle
- **AND** the Agent SHALL NOT instantiate `dpt_rb_glm-5-3-deepseek-v4-domestic-chips-v2/` (or any collision-derived variant) without the user's explicit consent

#### Scenario: Mid-run re-scope requires user decision

- **WHEN** a run bundle is mid-execution (not Final) and the Agent concludes the scope must change in a way it judges to need a fresh bundle
- **THEN** the Agent SHALL surface the situation and the legal alternatives (continue, reopen/rerun through accepted recovery, or create an additional bundle) and wait for the user's decision
- **AND** the Agent SHALL NOT instantiate a sibling bundle while the current bundle is unfinished

#### Scenario: First bundle stays autonomous

- **WHEN** the user initiates a new research request and no same-topic production bundle exists
- **THEN** the Agent derives the name and instantiates the first bundle without a consent stop, per the naming requirement
- **AND** the user SHALL be informed of the created bundle path in the run's normal surfacing

### Requirement: Creator CLI SHALL preflight siblings before filesystem side effects

`instantiate-run-bundle.mjs` SHALL, after argv parsing and before creating any
directory or file, scan the target directory for existing production run
bundle siblings (`dpt_rb_*`). When a sibling is name-similar to the requested
name (shared kebab-case prefix beyond `dpt_rb_`, or the requested name extends
an existing name) or is a same-topic bundle in a non-Final state, the creator
SHALL refuse creation with nonzero exit and one diagnostic that names the
sibling, its lifecycle state, and the consent path: obtain the user's explicit
decision, then rerun with `--acknowledge-existing-bundle <sibling-name>`.

A sibling SHALL count as Final only when its `rb_status.json` evidences the
terminal state (`state` completed with `current_gate` `readiness_passed`); a
missing, unreadable, incomplete, or ambiguous status SHALL be treated as
non-Final (fail-closed). `--acknowledge-existing-bundle <name>` SHALL accept
the name of one existing sibling and SHALL be rejected (before filesystem
side effects) when the named bundle does not exist, when it is not one of the
preflight-flagged siblings, or when it is supplied more than once. All other
existing argv behavior, including collision rejection, name grammar,
`--target-dir` handling, and `--force` rejection, remains unchanged.

#### Scenario: Silent v2 creation is refused

- **WHEN** `instantiate-run-bundle.mjs glm-5-3-deepseek-v4-domestic-chips-v2` runs while sibling `dpt_rb_glm-5-3-deepseek-v4-domestic-chips/` exists in a non-Final state
- **THEN** the creator SHALL exit nonzero before any filesystem side effect
- **AND** its single diagnostic SHALL name the sibling and the consent path (`--acknowledge-existing-bundle` after an explicit user decision)

#### Scenario: Acknowledged creation proceeds after user consent

- **WHEN** the user explicitly consents to creating an additional bundle alongside existing sibling `dpt_rb_a/` and the Agent reruns with `--acknowledge-existing-bundle a`
- **THEN** the creator SHALL perform its existing successful creation behavior
- **AND** the acknowledgment argument SHALL appear only as a preflight gate, never as bundle content or durable state

#### Scenario: Bad acknowledgment is rejected before mutation

- **WHEN** `--acknowledge-existing-bundle` names a bundle that does not exist, is not a preflight-flagged sibling, or is repeated
- **THEN** the creator SHALL exit nonzero before writing any filesystem surface, consistent with CMI-008
