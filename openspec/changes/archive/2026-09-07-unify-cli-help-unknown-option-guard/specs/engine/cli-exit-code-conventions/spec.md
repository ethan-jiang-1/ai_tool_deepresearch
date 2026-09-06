# Delta — engine/cli-exit-code-conventions

> req: CLE-001, CLE-003, CLE-004

## MODIFIED Requirements

### Requirement: Framework CLI exit-code contract is discoverable

The framework SHALL document a discoverable CLI exit-code convention in a top-level Agent-facing command location and in the CLI implementer guide.

The top-level documentation SHALL present the convention as a canonical interpretation and target convention for Agent callers, not as proof that every current CLI already shares the same runtime helper. It SHALL state that exit codes are coarse control-flow signals for shell/runner branching, while actionable detail is carried by structured stdout. For gate CLIs, the primary structured output SHALL be the gate result JSON containing `check`, `routing`, `inspect`, and `advice`. For non-gate CLIs, the command documentation SHALL identify the structured stdout envelope or documented output the Agent must read before deciding the next action.

The discoverable convention SHALL include the canonical tri-state:

| code | meaning |
| --- | --- |
| `0` | command succeeded or gate passed |
| `1` | normal repairable failure, validation failure, gate rule failure, or business error |
| `2` | configuration, routing contract, or invocation error where the caller used the command incorrectly or the deterministic route/config is invalid |

The documentation SHALL tell Agent callers to read stdout JSON / structured output for `check.passed`, `check.next`, `inspect[]`, `advice[]`, `status`, `reason`, or command-specific detail as applicable. Exit code alone SHALL NOT be treated as the full contract.

For the selected public operation surfaces `inspect-wave{0,1,2}-output`,
`operate-topic-state`, `enter-phase`, `advance-status`, and
`plan-hostfile-sections`, the discoverable convention SHALL also distinguish
help from invocation/configuration rejection. `--help` and `-h` SHALL be a
successful, side-effect-free help response with exit code `0`. Missing required
arguments, unknown options, missing option values, and an unusable explicit
bundle/configuration argument SHALL be caller-facing code-`2` outcomes before a
domain evaluator, writer, trace append, or status mutation runs. Command docs
SHALL name the accepted invocation forms, identify any structured failure root,
and state that a caller must not use an unvalidated argument token as a repair
path, rerun command, or writable coordinate.

The selected operation documentation SHALL state this exact grammar, instead of
leaving an Agent to infer it from a parser: Wave inspect accepts standalone
`--help`/`-h`, or exactly `--bundle <bundle-path>` and no positional bundle;
topic-state retains its operation positional forms `inspect --bundle
<bundle-path>`, `schema --context <context>`, `apply --bundle <bundle-path>
--input <input-path>`, and `recover --bundle <bundle-path> --operation-id
<operation-id>`; `enter-phase` accepts `--bundle <bundle-path> --node
<file-ref>` with optional `--full`; `advance-status` accepts `--bundle
<bundle-path> --to <source-gate-enum>`; and the controls renderer accepts
`render-no-controls` or `render-supplied-controls --input <snapshot-path>`.
For all selected commands, help is standalone, required named options occur
exactly once, and any unknown, duplicate, mixed, or otherwise unlisted shape is
the documented code-`2` path.

The guarded parseArgs utility batch — `reconcile-plan-progress.mjs`,
`audit-phase-status.mjs`, `check-reentry.mjs`, `log-event.mjs`,
`validate-work-unit-hygiene.mjs`, and `apply-research-style.mjs` — SHALL share
one deterministic argument-guard helper that wraps argument parsing for these
commands. For each guarded command, a `--help` or `-h` token appearing before
any `--` separator SHALL be treated as a help request regardless of other
supplied options: it SHALL print that command's usage line to stdout and exit
`0` without reading or writing any bundle path and without emitting any runtime
stack trace. Any other undeclared option or unparseable invocation SHALL be
caught before domain evaluation, print an invocation error reason followed by
the usage line to stderr, and exit `2`. The guard SHALL NOT change each
command's documented post-parse domain behavior, required-argument handling,
structured stdout envelope, or exit codes for non-invocation outcomes. For
`log-event.mjs`, the always-`0` exception SHALL apply only to diagnostic and
logging outcomes of a well-formed invocation; a help token SHALL print usage
and exit `0`, and an invocation rejection SHALL exit `2`. The command
documentation SHALL list the guarded batch and state this help/invocation
grammar so an Agent caller does not need to read parser source.

#### Scenario: Top-level commands document exit code convention

- **WHEN** the Phase Agent reads `DEEP_RESEARCH_HARNESS/COMMANDS.md`
- **THEN** it SHALL see a top-level exit-code convention section before or near command tables
- **AND** that section SHALL list codes `0`, `1`, and `2`
- **AND** it SHALL state that structured stdout carries actionable details

#### Scenario: CLI README matches top-level convention

- **WHEN** a maintainer reads `DEEP_RESEARCH_HARNESS/cli/README.md`
- **THEN** its exit-code section SHALL be consistent with the top-level command index
- **AND** it SHALL preserve gate-specific details such as `routing.kind` handling without contradicting the broader convention

#### Scenario: Selected operation help and invocation classes are discoverable

- **WHEN** an Agent reads the command documentation before calling a selected
  public operation
- **THEN** it SHALL see that `--help`/`-h` exit `0` without operating on a
  bundle
- **AND** it SHALL see that an invocation or configuration rejection exits `2`
  before domain evaluation and must be read for its direct structured root

#### Scenario: Wave inspect does not accept an undocumented positional bundle

- **WHEN** an Agent reads selected-operation grammar before invoking Wave inspect
- **THEN** it SHALL see only `--bundle <bundle-path>` as the non-help bundle form
- **AND** it SHALL see a bare path, duplicate flag, or mixed help invocation
  classified as a code-`2` caller error rather than a Wave verdict

#### Scenario: Guarded utility answers standalone help without side effects

- **WHEN** any guarded parseArgs utility is invoked with only `--help` or `-h`
- **THEN** it SHALL print a usage line and exit `0`
- **AND** it SHALL NOT emit a runtime stack trace, read or write any bundle
  path, or create any file or directory

#### Scenario: Unknown option on a guarded utility is a code-2 invocation rejection

- **WHEN** any guarded parseArgs utility is invoked with an undeclared option
- **THEN** it SHALL print an invocation error reason and the usage line and
  exit `2`
- **AND** the output SHALL NOT contain Node internal stack frames
- **AND** no domain evaluation, bundle read, or file write SHALL have run

#### Scenario: log-event exception is narrowed to diagnostic outcomes

- **WHEN** `log-event.mjs` is invoked with an undeclared option
- **THEN** it SHALL print an invocation error reason and the usage line and
  exit `2`
- **WHEN** a well-formed `log-event.mjs` invocation fails to write its log or
  trace record
- **THEN** it SHALL still exit `0` so diagnostics never block Agent flow

### Requirement: Known exit-code exceptions are documented without behavior changes

The exit-code convention documentation SHALL include an explicit current-state inventory of known command classes and exceptions.

At minimum, the inventory SHALL document:

- gate CLIs use the shared gate result helper and emit tri-state `0/1/2`;
- the guarded parseArgs utility batch (`reconcile-plan-progress.mjs`, `audit-phase-status.mjs`, `check-reentry.mjs`, `log-event.mjs`, `validate-work-unit-hygiene.mjs`, `apply-research-style.mjs`) shares one argument-guard helper: standalone help exits `0` with a usage line, and undeclared options or unparseable invocations exit `2` with an error reason and usage line before any domain evaluation;
- `log-event.mjs` remains a documented exception that returns `0` even when logging fails, because diagnostic log/trace write failure must not block Agent flow unless a separate accepted contract says otherwise; its invocation rejections are code-`2` outcomes and do not fall under that exception;
- within the guarded batch, `apply-research-style.mjs` keeps its documented current code `1` for a missing required argument after a well-formed parse, and other utility CLIs with binary `0/1` behavior outside the guarded batch keep their documented current codes and are not silently normalized by the guard;
- `check-reentry.mjs` and inspect-style tools may use `2` for caller invocation/config errors even when not routed through the gate helper;
- `validate-workflow-package.mjs` is a reconciled invocation-error surface: it emits `0` for a consistent package, `1` for consistency issues, and `2` for invocation/configuration errors such as missing required context or unreadable files; and
- any known doc/code drift discovered during apply, such as a header documenting an exit code a command does not emit, SHALL be recorded as drift rather than silently normalized in prose.

Help and invocation reconciliation for the guarded parseArgs utility batch is accepted current behavior. Unifying the remaining utility CLIs, changing unrelated code-`2` semantics, or routing other command families through the shared argument-guard helper SHALL be a separate OpenSpec change.

#### Scenario: Exceptions are visible to Agent callers

- **WHEN** the Agent reads the exit-code convention in `COMMANDS.md`
- **THEN** it SHALL see that gate CLIs, the guarded utility batch, remaining binary utility CLIs, and `log-event.mjs` are inventoried with their current exit-code classes
- **AND** it SHALL still receive a canonical interpretation for how to treat each class

#### Scenario: Drift is recorded, not hidden

- **WHEN** implementation audit finds a CLI whose header documents an exit code that the code does not emit
- **THEN** the convention docs or apply notes SHALL record that drift as a known exception or future reconciliation item
- **AND** the convention docs SHALL NOT change the CLI's behavior unless an accepted change explicitly adds that behavior change and updates its spec

#### Scenario: Selected invocation behavior is not generalized to utilities

- **WHEN** command documentation inventories the TopicTreeEvolution code-`2` operation
  surfaces
- **THEN** it SHALL name the selected commands rather than claim that every
  framework utility already shares their parser or output helper
- **AND** unselected utility behavior SHALL remain an explicit documented
  exception until a separately accepted change reconciles it

#### Scenario: Guard behavior is not generalized beyond the batch

- **WHEN** command documentation inventories the exit-code classes
- **THEN** it SHALL name the guarded parseArgs utility batch explicitly rather than claim that every framework utility shares the argument-guard helper
- **AND** utility CLIs outside the batch SHALL remain explicit documented exceptions until a separately accepted change reconciles them

#### Scenario: Reconcile-workflow-package exit two is documented as current behavior

- **WHEN** the Agent reads the exit-code convention for `validate-workflow-package.mjs`
- **THEN** the docs SHALL state its current tri-state behavior including `2` for invocation/configuration errors
- **AND** they SHALL NOT present it as a pending drift or future reconciliation item

### Requirement: Exit-code convention has regression coverage

The project SHALL include regression coverage for the documented exit-code convention and exception inventory.

Coverage SHALL verify both documentation discoverability and representative runtime behavior that can be checked without changing CLI semantics. Representative checks SHALL include:

- a gate CLI or shared gate helper exposes the tri-state convention and structured gate result shape;
- the shared argument-guard helper resolves standalone help, well-formed arguments, and undeclared options to distinct deterministic outcomes (`help`, `ok`, and an invocation rejection) without reading or writing the filesystem;
- each guarded parseArgs utility in the batch resolves its arguments only through the shared argument-guard helper;
- the guarded batch answers standalone help with a usage line and exit `0`, and undeclared options with an error reason, usage line, and exit `2`, with no runtime stack trace in either path;
- `log-event.mjs` invocation rejection exits `2` while a failed log or trace write after a well-formed invocation still exits `0`;
- a non-gate utility CLI outside the batch currently behaves as a documented binary command or documented exception;
- current non-gate utility exceptions remain visible rather than being silently normalized into the target convention;
- `validate-workflow-package.mjs` emits `2` for a representative invocation/configuration error and `0`/`1` for its documented pass/fail results, and the docs no longer list it as known drift;
- the docs state that Agent callers must read structured stdout rather than relying only on numeric exit code; and
- the docs state that morale/continuation guidance belongs in advice or Agent-readable prose, not exit code.

The regression SHALL be deterministic, use Node.js built-ins plus existing approved dependencies only, and SHALL NOT require network access or real Agent execution. Runtime probes for the guarded batch MAY invoke the local CLI files in child processes, consistent with the accepted integration-test practice for this directory.

#### Scenario: Regression detects missing top-level contract

- **WHEN** `DEEP_RESEARCH_HARNESS/COMMANDS.md` no longer contains the exit-code convention
- **THEN** the regression SHALL fail
- **AND** the failure SHALL identify the missing documented contract

#### Scenario: Regression detects undocumented exception removal

- **WHEN** `log-event.mjs` remains an always-0 command for diagnostic outcomes but the docs stop documenting that exception
- **THEN** the regression SHALL fail
- **AND** the failure SHALL identify the missing exception inventory entry

#### Scenario: Regression detects reconciled-surface drift

- **WHEN** `validate-workflow-package.mjs` no longer emits `2` for an invocation error, or the docs list it as known drift
- **THEN** the regression SHALL fail
- **AND** the failure SHALL identify the exit-code or inventory entry that drifted

#### Scenario: Regression detects a guarded CLI bypassing the shared helper

- **WHEN** a guarded parseArgs utility parses arguments without the shared argument-guard helper
- **THEN** the regression SHALL fail
- **AND** the failure SHALL name the file that drifted from the batch

#### Scenario: Regression locks guarded help and unknown-option outcomes

- **WHEN** the argument-guard helper is exercised with standalone help, well-formed arguments, and an undeclared option
- **THEN** the regression SHALL observe the distinct `help`, `ok`, and invocation-rejection outcomes with their documented exit-code classes
- **AND** the runtime probes SHALL require no network access and no real Agent execution
