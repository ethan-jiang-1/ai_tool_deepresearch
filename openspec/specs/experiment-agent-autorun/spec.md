# experiment-agent-autorun Specification

> req: EXA-001, EXA-002, EXA-003, EXA-004, EXA-005, EXA-006, EXA-007, EXA-008, EXA-009

## Purpose
TBD - created by archiving change experiment-auto-runner. Update Purpose after archive.
## Requirements
### Requirement: Agent Experiment Autorun has one precise execution vocabulary

The capability SHALL be named **Agent Experiment Autorun**. The deterministic host process SHALL be called the **Autorun Supervisor**; the Claude Code command surface SHALL be called the **Agent CLI Launcher**; the Coding Agent launched through `claude -p` SHALL be called the **Headless Playbook Agent**; the historical TUI/manual actor SHALL be called the **Interactive Playbook Agent**; and any additional Agent whose behavior is exercised by a case SHALL be called a **Subject Agent/Sub-agent**.

The repository SHALL NOT describe this capability as a traditional CLI test runner, ordinary CI execution, or a model where the Supervisor is the brain and the Agent is only hands. `CLI` SHALL describe the Agent runtime invocation surface, not the source of experiment intelligence.

#### Scenario: Reader distinguishes host supervision from Agent execution

- **WHEN** a maintainer reads the proposal, guideline, runner README, instruction files, or host-tool documentation
- **THEN** the Autorun Supervisor is described as deterministic lifecycle supervision
- **AND** the Headless Playbook Agent is described as the intelligent Markdown executor
- **AND** ordinary CI is not described as a substitute for the Agent runtime

### Requirement: Canonical Autorun surfaces use unambiguous names

The normal autorun surfaces SHALL be:

- `experiments_playbook/PLAYBOOK_MANIFEST.md` for active playbook path
  registration and order;
- `experiments_playbook/RUN_AGENT_AUTORUN_EXPS.md` for the instruction injected
  into one Headless Playbook Agent;
- `experiments_playbook/RUN_INTERACTIVE_EXPS.md` for single-case manual
  debug/replay and real-human judgment; and
- `DEEP_RESEARCH_HARNESS/host_tools/run-agent-experiment.mjs` for the Autorun Supervisor command.

`DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs` SHALL remain a legacy path
to the same command only; it SHALL not be shown as a second canonical Autorun
surface.

`run-agent-experiment.mjs --interactive --case <exact-case>` SHALL be the
bounded Interactive launch path. It SHALL create the same validated run context,
start one TTY/user-present Interactive Playbook Agent with the Interactive
instruction, and perform the same post-completion validation/health/audit
policy. With real TTY stdin/stdout/stderr inherited and no PTY wrapper, the
exact complete instruction/rendered-playbook/identity/digest/context payload
SHALL be delivered as Claude's documented positional initial-prompt argument,
subject to a deterministic conservative 128 KiB UTF-8 limit; oversize input
SHALL fail closed rather than fall back to path discovery or piped stdin.
Interactive invocation SHALL omit `-p`, structured-output, no-session-
persistence, Headless budget and bypass flags. It SHALL reject default, group,
tier, or multi-case selection, SHALL reject `--cleanup-pass`, SHALL preserve
the Interactive run root, and SHALL NOT be described as normal autorun. V1
SHALL NOT add a PTY wrapper or pretend that TTY output satisfies the Headless
structured-transcript contract.

The retired names `RUN_CLI_EXPS.md`, `RUN_TUI_EXPS.md`, and
`run-experiment.mjs` SHALL NOT remain active competing instruction or host-entry
surfaces when the change completes. All repository consumers SHALL migrate in
the same change.

#### Scenario: Only one normal autorun instruction remains

- **WHEN** the change reaches archive readiness
- **THEN** the Headless Playbook Agent receives `RUN_AGENT_AUTORUN_EXPS.md`
- **AND** no active consumer still loads `RUN_CLI_EXPS.md`
- **AND** the Interactive instruction is labeled debug/replay rather than a
  second normal batch mode

#### Scenario: Interactive replay gets the same run context without becoming batch mode

- **WHEN** an operator launches `--interactive --case <exact-case>`
- **THEN** one Interactive Playbook Agent receives one host-created context and
  selected playbook
- **AND** normal TTY permission/user interaction is allowed
- **AND** group, tier, and default-suite selection are rejected

### Requirement: Autorun Supervisor launches a real Headless Playbook Agent

The Autorun Supervisor SHALL invoke the Agent CLI Launcher/Claude Code CLI without a shell and SHALL start one fresh Headless Playbook Agent per selected case with validated `repo_command_root` as cwd. Prompt stdin SHALL contain the complete `RUN_AGENT_AUTORUN_EXPS.md`, the complete deterministically rendered selected playbook, source/rendered repository identity and digests, and the explicit run-context/case-root paths; it SHALL not merely ask the Agent to discover or rewrite a path. The Agent SHALL execute the verdict-affecting Markdown flow, including bash blocks, deterministic feedback steps, explicit Agent actions, optional Subject Agent/Sub-agent work, repair decisions, NOT_RUN handling, and the native verdict step, then stop without editing source playbooks or running optional smoke/health/cleanup.

The Supervisor SHALL use a permission mode that actually enables non-interactive headless execution. An approval request, timeout, non-user signal, nonzero Agent process exit, missing Agent runtime, or missing native completion SHALL produce lifecycle `ERROR` and SHALL preserve any available run root. External user/SIGINT/SIGTERM interruption SHALL produce lifecycle `CANCELLED`, preserve the active run root, and mark not-yet-started selected cases CANCELLED rather than inventing native NOT_RUN completions.

Every non-dry-run Headless invocation SHALL require positive `--max-total-budget-usd`; optional positive `--max-case-budget-usd` SHALL be no greater than the total. The Supervisor SHALL pass Claude `--max-budget-usd` equal to the lesser of current remaining total and the per-case cap when present, and SHALL accumulate only a valid final stream-result `total_cost_usd`. Native outcome SHALL NOT depend on cost. Missing/malformed final cost after a started case, case-budget termination, or exhausted batch budget SHALL use lifecycle ERROR with stable reason, preserve available roots, mark not-started remainder without native completion, and stop further launch. Dry-run SHALL remain credential/runtime/mutation-free and MAY project budget exposure; Interactive replay SHALL not claim Headless budget accounting.

#### Scenario: Headless case runs through a real Agent runtime

- **WHEN** the Supervisor selects a normal autorun case
- **THEN** it starts a real Headless Playbook Agent through the Agent CLI
- **AND** the Agent reads and executes the Markdown playbook
- **AND** a deterministic child-process fixture alone is not reported as proof that this Agent behavior occurred

#### Scenario: Permission prompt fails closed

- **WHEN** the spawned Agent asks for interactive approval instead of completing headlessly
- **THEN** the case outcome is `ERROR`
- **AND** partial trace checks cannot turn it into PASS

#### Scenario: Unattended batch cannot run without a spending boundary

- **WHEN** a Headless non-dry-run selection omits a valid total USD budget
- **THEN** preflight fails before credentials, run roots or Agent launch
- **AND** no default tier or case count silently authorizes unbounded model spend

#### Scenario: Unknown cost stops the remaining batch

- **WHEN** a started Headless case ends without one valid final stream cost or exhausts its Claude case budget
- **THEN** the case is lifecycle ERROR with its native completion retained if one exists and its run root preserved
- **AND** not-yet-started cases are not launched against an unknown remaining budget

### Requirement: Manifest is the single runnable selection authority

The Autorun Supervisor SHALL select and order active paths from `PLAYBOOK_MANIFEST.md`. Its only machine section SHALL be bounded exactly once by `<!-- agent-experiment-manifest:v1 -->` and `<!-- /agent-experiment-manifest -->` and contain one single-column `Path` Markdown table. Row order SHALL be execution order; each row SHALL contain one repository-relative POSIX playbook path. The manifest SHALL register each active runnable `case-*.md` exactly once and SHALL NOT repeat derived case/group/cost/policy/judge fields or maintain a second JSON/table projection.

Every registered playbook SHALL use a strict/closed `schema: command-experiment/v2` frontmatter with exactly these required fields: non-empty `experiment`, full-stem `case`, non-empty `case_goal`; `verdict_mode: all|last`; unique non-empty stable `required_checks[]`; unique non-empty stable `bundle_roles[]`, one `verdict_role` in that set, and unique non-empty `health_roles[]` as a bundle-role subset containing the verdict role; `health_profile: light|standard|heavy`; unique `durable_evidence_roles[]`; and the verification-aligned profile `proof_subject: deterministic_contract|agent_behavior`, `subject_execution: none|real_agent|real_subagent`, `fixture: none|setup_only|fixture_backed`, `runtime: real_disposable_bundle`, `external_calls: none|real`, `verdict_judge: deterministic|real_human|ai_judge`. Bundle/verdict/health roles SHALL match `^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$`; durable evidence roles SHALL match `^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$`. Roles describe authority, never paths. V2 role-array order SHALL be the canonical completion/audit serialization order but SHALL NOT create verdict or health authority from position. `deterministic_contract` SHALL use an empty durable-evidence role list; `agent_behavior` SHALL use the non-empty case-ledger role set. Optional fields SHALL be limited to registered requirement references, a non-empty informational `not_run_if`, `regression_recommendation: recommended`, and `regression_retry_safety: reviewed`. The recommendation defaults to neutral and grants no launch, outcome, health, cost or coverage authority. The retry-safety declaration SHALL be valid only for `verdict_mode: all`; it records a case-level regression admission review but does not alter native verdict semantics. Cross-field constraints SHALL match accepted `verification-routing`. These actor fields describe the Subject Agent/proof claim; they SHALL NOT be inferred from the always-present Headless/Interactive Playbook Agent.

Cost SHALL come from the filename grammar. A co-located `exph_*` 901–949 case SHALL declare real-human judge, and its 950–999 +50 dual SHALL declare AI judge, consistent with accepted band/pair rules. Filesystem discovery across current `exp_*` and `exph_*` runnable locations SHALL be used only to detect unregistered files. An unregistered file or stale, missing, duplicate, identity-mismatched, unsafe, invalid-cost, missing-policy, impossible proof profile or judge-mismatched entry SHALL fail before Agent launch. V1 `weight`, `runner`, `execution`, `evidence`, static `bundle`/`trace`, `verdict`, `agent_mode`, and `agent_dependency` SHALL be retired from current registered playbooks/schema: V2/runtime path identifies the correct dimension, native completion owns dynamic paths/outcome, and `not_run_if` is explanation only.

Exact legacy selection SHALL preserve manifest order. A Headless invocation SHALL provide an explicit exact selector (`--case`, `--group`, `--tier`, or `--all`) or an explicit Experiment Run Strategy profile; an invocation with neither SHALL fail before run-root creation. `--case` SHALL require one exact full case identity and be exclusive with other exact selectors. `--group` MAY combine with one `--tier`; either alone selects its exact matching autorun-compatible set. `--tier` SHALL remain a compatibility filter over filename cost only: it SHALL NOT assert current duration, coverage priority, proof freshness, or a virtual classification. `--all` SHALL select all autorun-compatible cases but not real-human manual cases. Profile selection SHALL preserve its own reported deterministic order and SHALL use manifest order for ties. Exact Headless selection of a real-human case SHALL report HUMAN without launch and direct the operator to the bounded Interactive path. Empty, ambiguous, unknown or invalid combinations SHALL fail before run-root creation. `--dry-run` SHALL validate and report the exact selection/projection without Agent runtime preflight or filesystem mutation.

#### Scenario: Standard selection does not use weight as cost

- **WHEN** a registered playbook filename has standard cost
- **AND** the user selects `--tier standard`
- **THEN** the case is selected from its manifest/filename cost
- **AND** no frontmatter weight exists to include it in `--tier light`

#### Scenario: Manifest drift blocks launch

- **WHEN** a runnable case file has no exact manifest entry or a manifest path is stale
- **THEN** validation fails with the mismatched case/path
- **AND** the Supervisor does not compensate by scanning and running an inferred set

#### Scenario: No selector fails closed

- **WHEN** an operator supplies no exact selector and no Experiment Run Strategy profile
- **THEN** the Supervisor fails before Agent runtime, run-root creation, or case launch
- **AND** it does not silently select filename-Light cases

#### Scenario: Tier remains a historical compatibility filter

- **WHEN** an operator selects `--tier light`
- **THEN** the Supervisor filters the filename cost label in manifest order
- **AND** its report does not label the selected cases as currently fast, fresh, or comprehensive

#### Scenario: Dry run does not require an Agent runtime

- **WHEN** a valid selection is requested with `--dry-run`
- **THEN** the Supervisor reports exact ordered cases and derived V2 policy
- **AND** it does not create run roots, load credentials, or launch the Agent CLI

### Requirement: Autorun exposes strategy selection without becoming a controller

The Autorun Supervisor SHALL accept `--run-profile regression` only for Headless selection and SHALL fail closed before credential loading or run-root creation when the request widens the fast envelope: predicted-duration bound greater than `480000` ms, total budget greater than `$3.00`, per-case budget greater than `$0.60`, Agent timeout greater than `120000` ms, or a per-health-target timeout greater than `60000` ms. Because the existing general Agent timeout default is wider, a non-dry regression launch SHALL explicitly supply `--timeout` no greater than `120000` ms; dry-run makes no child launch and does not require that flag. A non-dry regression launch SHALL retain the existing positive total-budget requirement; the Supervisor SHALL impose an effective `$0.60` per-case launch cap even when the caller did not supply a smaller cap. Exact selectors, Interactive mode, and assurance-only scope combinations SHALL remain incompatible with regression. `--regression-qualification` SHALL be the sole explicit opt-in to select `needs_qualification` candidates under the same envelope; it SHALL require `--run-profile regression` and SHALL be rejected with every other profile or exact selector.

The Supervisor SHALL pass only strategy-selected `eligible` regression playbooks into the existing one-Agent-per-case lifecycle, revalidating their current manifest/frontmatter before preparation. A `needs_qualification` or `ineligible` case SHALL appear in dry-run selection feedback but SHALL NOT be launched through normal regression. An empty eligible regression selection SHALL fail before runtime preparation; the Supervisor SHALL NOT silently choose a slow case, launch a qualification candidate, retry a breach, or schedule a later batch.

The Supervisor SHALL keep `480000` ms as the strategy's selection forecast, not as a new global batch deadline or scheduler. It SHALL retain the ordinary sequential lifecycle, native outcome, health, audit, report, and cleanup authorities after selection.

#### Scenario: A widened regression command fails before side effects

- **WHEN** an operator invokes `--run-profile regression` with a `600000` ms predicted-duration bound, `$4.00` total budget, `$1.00` per-case budget, a `180000` ms Agent timeout, or a `90000` ms per-health-target timeout
- **THEN** the Supervisor rejects the request before credentials, run roots, reports, or Agent launch
- **AND** it does not reinterpret the invocation as discovery or a legacy selector

#### Scenario: Non-dry regression cannot inherit the general timeout

- **WHEN** an operator launches regression without an explicit `--timeout`
- **THEN** the Supervisor rejects the invocation before credential loading or run-root creation
- **AND** a regression dry-run remains able to inspect the same selection without that runtime flag

#### Scenario: Qualification candidates are inspectable but not launched as regression

- **WHEN** a dry regression projection finds a fast historical v1 case that still needs matching v2 qualification
- **THEN** dry-run output identifies its qualification reason
- **AND** a non-dry regression invocation does not create a run root for that case

#### Scenario: Explicit qualification retains the fast envelope

- **WHEN** an operator combines `--run-profile regression --regression-qualification` with valid fast bounds
- **THEN** the Supervisor may launch only strategy-selected qualification candidates under the same effective `$0.60` per-case cap
- **AND** the retained selection observation identifies qualification rather than normal regression

#### Scenario: An eligible regression case retains the ordinary lifecycle

- **WHEN** one eligible regression case is selected within the fast envelope
- **THEN** the Supervisor launches one fresh Headless Playbook Agent and records the normal native completion, health, audit, report, and cleanup facts
- **AND** regression selection does not create a new scheduler, verdict, health owner, or repair controller

### Requirement: Native playbook completion is the only completed-case outcome authority

Every autorun-compatible playbook SHALL invoke the shared deterministic finalizer exactly once at its verdict boundary and SHALL stop before playbook-local health or cleanup. The CLI SHALL require `--context`, accept repeatable `--bundle <role>=<path>` and repeatable `--evidence <role>=<file>`, and accept optional non-empty `--not-run-reason`. It SHALL NOT accept caller overrides for case, completion target, outcome, mode, profile, judge, allowed bundle roles, verdict role, health roles or required evidence roles. For PASS/FAIL, actual bundle roles SHALL exactly equal the context-bound V2 policy and the finalizer SHALL derive verdict/health authority from that policy. For NOT_RUN, registered/observed/completion roles SHALL exactly agree and MAY only be a subset of policy roles; the reason, not a caller outcome flag, selects NOT_RUN.

Every verdict-affecting check SHALL be a strict root-trace event with `event: check`, `source: playbook`, a `gate` stable ID matching `^[a-z][a-z0-9]*(?:(?:[-_:])[a-z0-9]+)*$`, and explicit boolean `passed` and `expected`. Engine/queue events without this ownership/shape, legacy missing-field events, detail prose and console output SHALL NOT enter the verdict considered set. `verdict_mode: all` SHALL consider every accepted verdict check in trace order; `last` SHALL consider only the last accepted row per gate in trace order. Completion `checks_total` SHALL count all accepted verdict checks, while `checks_considered` and the complete `considered_checks[]` SHALL describe the exact mode projection.

For PASS/FAIL, the finalizer SHALL derive outcome from the declared verdict bundle's considered checks and SHALL require every V2 `required_checks[]` ID to appear at least once in that considered set; missing required evidence SHALL be contract ERROR, not native FAIL or PASS. PASS requires every considered row's `passed` to equal `expected`; any mismatch is native FAIL. For a non-deterministic judge profile, at least one considered required check SHALL carry matching structured `verdict_judge` provenance. For NOT_RUN, the finalizer SHALL accept the reason but SHALL NOT manufacture required checks or PASS/FAIL. A valid PASS, FAIL, or NOT_RUN completion is a completed playbook result and the finalizer SHALL return success after writing it; contract/input failure SHALL return nonzero without a valid completion.

The finalizer SHALL produce one `agent-experiment-completion/v1` document at the fixed Supervisor-chosen target, which SHALL be absent before finalization. It SHALL write/fsync a same-directory unique temp regular file and use exclusive same-filesystem atomic hardlink publication so an existing target fails without overwrite and a partial final document is never visible; it SHALL unlink the temp and fsync the parent after publication. It SHALL bind run/case/context/instruction/source-playbook/rendered-playbook identity/digests, outcome, verdict mode, counts and the complete considered `{gate,passed,expected}` set without arbitrary detail prose, judge provenance where applicable, every created bundle, required health targets using V2 `health_profile`, required Subject evidence role/path/bytes/sha256 declarations, and each bundle's verdict-boundary raw trace through `trace_prefix_bytes` plus exact-byte `trace_prefix_sha256`. Bundle, health and evidence arrays SHALL be canonicalized by their respective V2 role order regardless of CLI, registry or filesystem enumeration; a NOT_RUN subset SHALL preserve policy-relative order. Each declaration SHALL also record `trace_parse_status: valid|invalid|missing` and nullable `trace_event_count`.

For `agent_behavior` PASS or FAIL, every V2 durable evidence role SHALL map exactly once to a containment-valid non-symlink regular file inside a declared bundle. A Playbook-Agent transcript, check detail, narrative, path-only record or digest without retained bytes SHALL NOT satisfy Subject evidence. NOT_RUN MAY omit evidence whose declared actor/tool capability was unavailable. `deterministic_contract` SHALL declare no Subject evidence roles or files.

PASS/FAIL SHALL reference exactly one declared verdict bundle with complete newline-terminated valid JSONL and a non-empty check set, and SHALL make that verdict bundle a required health target. Every required health target SHALL have valid JSONL. A non-health auxiliary fault-injection bundle MAY declare invalid or missing trace while remaining raw-byte bound. NOT_RUN SHALL carry a reason, MAY have no verdict bundle or created bundle, and SHALL NOT count as PASS.

The Autorun Supervisor SHALL validate and aggregate the native completion. It SHALL NOT replace it by evaluating all trace checks, by accepting one or more generic queue/gate checks, by parsing console PASS text, or by trusting Agent narrative. A partial run without valid completion SHALL be `ERROR` even when every trace check written so far matches its expectation.

After completion validation, the Supervisor SHALL enumerate only non-symlink direct-child directories named `dpt_disp_*` or `dpt_rb_*` under the current case run root, realpath-check containment, and require an exact one-to-one match among observed directories, case-local bundle-role registry and completion role/path declarations. Reserved state/diagnostic/context/completion surfaces are not bundles. The Supervisor SHALL run health only for declared required roles and never infer verdict, role or health scope from filesystem order.

An autorun-compatible case that specifically exercises the production instantiator SHALL still use one fresh `dpt_disp_*` verdict bundle for its `agent_flow_e2e` runtime and required checks. It MAY additionally create one fresh `dpt_rb_*` subject bundle through the real production CLI with explicit case-root target. Both SHALL be completion-declared and health-checked; the case-owned `dpt_rb_*` SHALL NOT be described as a separately selected live production run or make PASS live-production evidence.

#### Scenario: Generic checks cannot create a Heavy PASS

- **WHEN** a Heavy case writes successful `enqueue` or `save` checks but does not complete required Subject Agent work or its native verdict step
- **THEN** the Supervisor reports `ERROR`
- **AND** it SHALL NOT derive PASS from those partial checks

#### Scenario: Premature finalizer cannot bless generic partial checks

- **WHEN** a Subject-Agent case invokes the finalizer but its considered trace checks omit one or more V2 `required_checks`
- **THEN** finalization fails without a valid completion and the effective outcome is ERROR
- **AND** successful generic queue or gate checks cannot substitute for the missing case-owned evidence IDs

#### Scenario: Repair-loop mode remains native

- **WHEN** a repair-loop playbook uses a native `last` verdict mode
- **THEN** its completion records that mode and the considered checks
- **AND** the Supervisor does not reinterpret the full trace using `all`

#### Scenario: Health append does not invalidate completion

- **WHEN** the Supervisor validates the completion against the declared verdict-boundary trace prefix
- **AND** the health verifier later appends an accepted non-verdict diagnostic event
- **THEN** the already validated native outcome remains valid
- **AND** the health event cannot change PASS, FAIL, or NOT_RUN

#### Scenario: Production-instantiator experiment does not become live production proof

- **WHEN** case-73 or case-102 exercises the real production bundle creator
- **THEN** required checks remain in a fresh disposable verdict bundle while the fresh production-shaped subject bundle is separately declared and health-checked under the same case root
- **AND** the report proves the creator contract without claiming that a selected live production run was tested

### Requirement: Each case runs inside one Supervisor-owned containment root

The Supervisor SHALL create one unique per-case run root at `.exp-bundles/runs/<batch-id>/<ordinal>-<safe-case-id>-<uuid>/`, capture its non-symlink directory realpath/device/inode identity, write a strict fixed-name `agent-experiment-run.json` (`agent-experiment-run/v1`) context there, and launch the Playbook Agent with validated `repo_command_root` as fixed cwd. Direct-child `dpt_disp_*|dpt_rb_*` directories are bundle roots; the containing directory is the case run root and SHALL NOT be reported as a bundle. The context SHALL bind execution mode, selected manifest/playbook path, source and rendered playbook digests, injected instruction path and digest, case/group, filename cost, complete V2 native/proof policy including stable bundle/verdict/health roles, validated `repo_command_root`, repo-root `framework_root`, case run root and the fixed sibling `agent-experiment-completion.json`. The Supervisor SHALL retain the expected object/context digest, root identity and source/rendered bytes/digests independently; completion SHALL bind context/instruction/source/rendered playbook digests.

Repository source surfaces SHALL remain at the repository root. Neither the Supervisor nor an autorun-compatible playbook SHALL copy, symlink or hardlink `DEEP_RESEARCH_HARNESS/`, `experiments_env/`, `tests/` or another repository source tree anywhere under `.exp-bundles/`. Framework and experiment helpers SHALL be invoked from their original repo-relative paths while all mutable run output is routed through explicit rendered path arguments to the case run root. Fixed repo cwd SHALL NOT grant bundle, verdict or cleanup authority.

Source playbooks SHALL use only allowlisted `{{RUN_CONTEXT_SH}}`, `{{CASE_RUN_ROOT_SH}}`, and `{{PLAYBOOK_STATE_DIR_SH}}` runtime tokens. Each occurrence SHALL be an unquoted, unconcatenated standalone shell word inside a Markdown `bash` or `sh` fenced code block; frontmatter, prose, another-language fence, quoted/backticked word, heredoc payload and suffix/prefix concatenation SHALL be rejected. Every autorun-compatible source SHALL contain at least one context token for finalization and one case-root token for explicit creation/preparation; the state-dir token is optional per case. Before launch the Supervisor SHALL validate only fence/token lexical grammar, substitute each occurrence literally with one POSIX single-quoted absolute shell word (including standard embedded-quote encoding), reject unknown or unresolved tokens, and bind both source and rendered digests. This validation SHALL NOT parse or execute Markdown Agent Flow. Creator/preparation helpers SHALL receive explicit target paths; the finalizer SHALL receive the explicit context path. No component SHALL discover Agent Experiment context from `process.env`, inherited cwd, a latest-run scan or a repo-global pointer.

Every created bundle SHALL be registered immediately under one context-bound V2 stable role in `_playbook_state/bundles.json` through a deterministic explicit-context state CLI. The Supervisor SHALL pre-create one empty schema-valid registry. State/finalizer CLIs SHALL require the explicit context path to be a non-symlink regular file, derive the sole case-root authority from its validated real parent, and use only the fixed registry/completion paths under that parent; mutable root/target fields SHALL be checked for equality but SHALL NOT redirect writes. Registration SHALL first acquire a fixed `_playbook_state/bundles.lock` by exclusive create; an existing lock, whether concurrent or left by a crashed writer, SHALL fail closed without automatic recovery. While holding the lock, it SHALL validate role policy, direct-child name, realpath containment and non-symlink directory, then use a temp file, file/directory sync and atomic rename to replace the registry while prohibiting overwrite of an existing role or rebinding one path to another role; it SHALL unlink the lock and sync the state directory on normal release. “No overwrite” applies to existing bindings, not to the registry file. Later Markdown blocks SHALL resolve the role explicitly rather than retain a shell variable or rely on Agent conversation memory. The registry is a path handoff and SHALL NOT itself select verdict, health or cleanup. Native completion and the Supervisor SHALL exact-match registry roles/paths against declared policy and observed directories.

Before accepting completion, invoking health or attempting cleanup, the Supervisor SHALL revalidate the case-root path as the same non-symlink directory identity captured at creation. A replaced directory, symlink swap, changed context digest or mutable-field mismatch SHALL be lifecycle ERROR and SHALL prohibit health and cleanup; detection after child execution SHALL not authorize mutation outside the original case root.

All created bundles, playbook state handoffs, case-local runtime diagnostics, native completion, and cleanup targets for that case SHALL remain within the run root after lexical and realpath containment checks. Current `/tmp`, repo-root bundle, `tests/.test-bundles`, hard-coded run target and playbook-local cleanup paths SHALL be migrated out of the autorun path. Existing repo-relative source command/import paths MAY remain because repo command cwd is explicit and is not runtime storage. Supervisor-owned durable transcript/audit/report surfaces SHALL instead live in their declared `.exp-bundles/_logs|_audit|_reports` locations outside deletable case roots. A case MAY declare multiple bundle roots through native completion.

The Supervisor SHALL NOT scan the repository root or a shared bundle directory to guess the latest case bundle. It SHALL NOT accept an unvalidated `BUNDLE=<path>` as cleanup authority, and SHALL never remove a path outside the current run root.

#### Scenario: Multi-bundle case declares all roots

- **WHEN** one playbook creates multiple disposable bundles
- **THEN** its native completion binds every created bundle root within the case run root
- **AND** health/report/cleanup do not select one bundle by filesystem iteration order

#### Scenario: Escaping bundle path is rejected

- **WHEN** Agent output or completion names a bundle outside the current run root
- **THEN** completion validation fails with `ERROR`
- **AND** the Supervisor does not inspect or delete that outside path (a case-owned containment experiment may separately perform its explicitly declared read-only leak inspection)

#### Scenario: Framework remains one repo-root source tree

- **WHEN** the Supervisor prepares a Headless or Interactive case run root
- **THEN** no framework, experiments environment or tests copy/link exists anywhere under that run root or another `.exp-bundles/` location
- **AND** the validated run context points commands to the original repo-root source while only run-owned mutable data is created under `.exp-bundles/`

#### Scenario: Runtime binding is deterministic and explicit

- **WHEN** the Supervisor prepares one selected source playbook for execution
- **THEN** it substitutes only the three allowed runtime path tokens, binds source and rendered digests, and launches from the validated repo command root
- **AND** no environment variable, cwd inference, latest-run scan or Agent-authored path rewrite chooses the case run root

#### Scenario: Dynamic bundle path survives independent tool calls

- **WHEN** one Markdown block creates a role-bound bundle and a later block needs it
- **THEN** the first block registers the containment-valid path under its stable role and the later block resolves that role from case-local structured state
- **AND** shell environment, chat memory, filesystem order and an unvalidated `BUNDLE=` line are not path authority

### Requirement: Outcome, health, audit, and cleanup remain separate

The Supervisor SHALL report `native_outcome: PASS|FAIL|NOT_RUN|null`, `lifecycle_outcome: HUMAN|ERROR|CANCELLED|null`, `effective_outcome`, health `CLEAN|ISSUES|ERROR|null`, Agent process outcome, duration, per-case/accumulated USD cost or explicit unknown, and preservation separately. A valid native completion followed by Agent-process failure SHALL remain visible but SHALL have effective ERROR. Audit/report files SHALL be durable projections and SHALL NOT become verdict authority.

Before every Headless launch, the Supervisor SHALL open an outside-case-root durable transcript set at `.exp-bundles/_logs/<batch-id>/`: the exact injected prompt, sanitized Claude `stream-json` stdout, and sanitized stderr. It SHALL flush, fsync and close each file, fsync newly created directory entries, and compute each byte length and sha256 before the terminal case audit. Known provider credential values and complete child environments SHALL NOT be logged. Transcript write/sync/close/hash failure SHALL be infrastructure ERROR and SHALL prohibit cleanup. Interactive case results SHALL mark the Headless transcript references null and preserve their run roots rather than fabricating a structured TTY transcript. The outer Headless transcript SHALL NOT satisfy a nested Subject evidence role.

Before any cleanup-eligible PASS deletion, the Supervisor SHALL re-read and re-hash every completion-declared bundle's exact verdict-boundary trace prefix, reject source mutation or known credential bytes, and export the exact bytes outside the case root under `.exp-bundles/_evidence/<batch-id>/.../traces/` in canonical V2 role order. A malformed non-health auxiliary SHALL retain its original bytes; a declared missing trace SHALL retain an explicit null reference rather than a fabricated file. For `agent_behavior`, the required exact Subject evidence bytes SHALL additionally be exported under a separate `subject/` subtree. Every export SHALL be non-symlink regular output, flushed/fsynced/closed, destination-hash verified and directory-synced before audit and deletion.

Before cleaning an `agent_behavior` PASS, the Supervisor SHALL revalidate every completion-declared evidence source after health, reject changes/symlinks/non-files/path escape/known provider credential bytes, copy exact bytes to `.exp-bundles/_evidence/<batch-id>/<ordinal>-<safe-case-id>/`, fsync files and directory entries, and verify exported bytes/sha256. Missing role coverage or export failure SHALL produce effective ERROR and preserve the case root. Audit/report SHALL bind the durable exported paths, bytes and hashes.

Every terminal case audit SHALL append/fsync/close a full `case_result` event at `.exp-bundles/_audit/agent-experiment-runs.jsonl`. It SHALL contain selection/run/context identity and digests, the full native completion if present, full validated health JSON, process/timing and separate outcomes/reason, run-root availability, cleanup request/eligibility, and durable prompt/stdout/stderr path-byte-hash references. With `--cleanup-pass`, cleanup SHALL occur only after effective PASS, every required health target reports CLEAN, and that event is durable. If cleanup is attempted, a subsequent hash-linked `cleanup_result` event SHALL record success or failure plus any lifecycle/effective-outcome override caused by cleanup failure. The atomic batch report SHALL live at `.exp-bundles/_reports/<batch-id>.json` and SHALL fold the same event schema into the complete final case projection rather than create a thinner competing result schema. None of these durable surfaces may live inside a deletable case root.

Cleanup SHALL remove the complete Supervisor-owned case run root rather than case-selected paths. PASS with required health ISSUES, health ERROR, plus every FAIL, NOT_RUN, ERROR, or CANCELLED SHALL preserve the available case run root. Audit, transcript or cleanup failure SHALL report ERROR and stop further cleanup. V1 SHALL NOT infer or execute a safe-cleanup exception from prose. Without `--cleanup-pass`, all executed run roots SHALL be preserved. The legacy `.exp-bundles/_run_log.jsonl`, `_temp/exp_verdicts.jsonl`, and per-bundle `exp_result.json` SHALL receive no new Autorun writes and SHALL NOT be used as fallback authority. Cleanup intentionally removes full runtime replay state; operators requiring later forensic reinspection SHALL omit `--cleanup-pass`.

#### Scenario: PASS with health issues is preserved

- **WHEN** native completion is PASS and health is ISSUES
- **THEN** report preserves both facts without collapsing either
- **AND** the run root is preserved even when `--cleanup-pass` is present

#### Scenario: Clean PASS cleanup is contained and auditable

- **WHEN** native completion is PASS, health is CLEAN, and `--cleanup-pass` is present
- **THEN** the exact prompt, durable Agent transcript/stderr and full case-result audit are closed, hashed and fsynced before deletion
- **AND** only the current containment-valid case run root is removed

#### Scenario: Deleted PASS still has a complete durable result

- **WHEN** a clean PASS case run root has been removed
- **THEN** its audit/report still exposes the full native completion, validated health results, process/outcome/reason, run identity/digests and cleanup fact
- **AND** its outside-root prompt, structured Agent transcript and stderr remain addressable with byte length and sha256 rather than a dangling path into the deleted root

#### Scenario: Agent-behavior cleanup preserves the Subject proof itself

- **WHEN** a Headless `agent_behavior` case is otherwise eligible for PASS cleanup
- **THEN** every case-required Subject prompt/task/transcript/result/receipt/output/judge role is exported as exact hash-verified bytes outside the case root before deletion
- **AND** an outer Playbook-Agent transcript or completion check summary alone cannot authorize cleanup

#### Scenario: Native PASS followed by process failure is not counted PASS

- **WHEN** a valid PASS completion exists but the Headless Playbook Agent later times out or exits nonzero
- **THEN** the report preserves native outcome PASS and records lifecycle/effective ERROR separately
- **AND** health cleanup is not used to erase the run root

#### Scenario: Health execution failure is infrastructure error

- **WHEN** a required health command times out, crashes, or emits malformed JSON after a valid completion
- **THEN** health is ERROR and effective outcome is ERROR while native outcome remains unchanged
- **AND** the run root is preserved

### Requirement: Human and AI judge evidence remain distinct from conventional CI

Cases 901–949 SHALL remain real-human/manual evidence and SHALL be skipped by Agent Autorun with lifecycle outcome HUMAN. Their 950–999 AI-judge duals MAY run through Headless Agent Autorun but SHALL retain an explicit AI-judge source and SHALL NOT replace, delete, or complete a real-human claim.

For an agent-behavior 9NN pair, the Playbook Agent SHALL launch and preserve evidence from an independent Subject Agent that produces the behavior under review. The Playbook Agent's own execution SHALL NOT satisfy `subject_execution`, and the same actor SHALL NOT both produce and judge the semantic output. A real-human case SHALL receive an actual human verdict through Interactive replay; an AI-judge dual SHALL perform and structurally tag an actual AI review, never a hard-coded pass.

Ordinary CI or `node:test` SHALL NOT be described as capable of executing `agent_flow_e2e` without a real Agent runtime. A CI host MAY invoke the Autorun Supervisor only when it explicitly provides the Agent CLI, model credentials, and required tool capabilities; in that arrangement CI remains the host, while the Headless Playbook Agent remains the executor and native runtime evidence remains verdict authority.

#### Scenario: AI judge does not erase human evidence

- **WHEN** an AI-judge dual reports PASS
- **THEN** its report identifies AI-judge provenance
- **AND** the paired real-human claim remains separate and incomplete until a real human judges it

#### Scenario: AI judge does not review its own Playbook-Agent output

- **WHEN** an AI-judge dual claims Subject Agent topic-rewrite behavior
- **THEN** independent Subject Agent runtime evidence precedes the separately tagged AI review check
- **AND** a Playbook Agent self-produced rewrite or hard-coded AI PASS cannot satisfy native required checks

#### Scenario: Deterministic CI fixture proves only Supervisor mechanics

- **WHEN** a node:test fixture exercises Supervisor argv, timeout, path, or report behavior
- **THEN** it may prove the deterministic Supervisor contract
- **AND** it SHALL NOT be reported as proof that a Headless Playbook Agent followed a playbook
