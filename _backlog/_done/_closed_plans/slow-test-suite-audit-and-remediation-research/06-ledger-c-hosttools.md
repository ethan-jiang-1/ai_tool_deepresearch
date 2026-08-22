# Ledger C — Host-Tool Slow Cases (Cluster: Supervisor + Launcher)

> Obligation ledger for the 8 slowest host-tool cases. Plan §"Test Decision Matrix" rows 19, 31, 38, 39, 40, 41, 42, 43; §"P2".

## 1. "fails closed for malformed, exhausted, or over-cap final cost"
- file:line: `tests/integration/host_tools/run-agent-experiment.test.mjs:444`
- measured: 4.893s (plan row 19, anchor current)
- assertion: Three cost-failure modes (`malformed-cost`, `budget-exhausted`, `over-budget`) each produce `lifecycle_outcome=ERROR` with the specific reason `cost_unknown` or `case_budget_exhausted`, `exit_code=2`, and `run_root_available=true`.
- authority: `run-agent-experiment.mjs:472-475` (accumulated cost + cap check sets `stopLaunchReason`), `run-agent-experiment.mjs:187-196` (`reasonForProcess` maps `budgetExhausted`), `agent-experiment-supervisor.mjs:444-514` (`runHeadlessAgent` streams JSONL, extracts `total_cost_usd` at line 508-510), `agent-cli-launcher.mjs:27-44` (`buildHeadlessAgentCliPlan` wires `--max-budget-usd`).
- mutation: The three reason codes (`cost_unknown`, `case_budget_exhausted`) and the fail-closed exit-2 behavior MUST persist. The classification logic in `run-agent-experiment.mjs:462-475` and `reasonForProcess` MUST NOT be weakened.
- neighbors: `tests/host_tools/agent-experiment-autorun.test.mjs:503` ("rejects mismatched cost and mutable completion coordinates") covers cost schema invariants in-process. `tests/integration/host_tools/run-agent-experiment.test.mjs:404` ("retains valid native completion but stops the batch when final cost is missing") covers the single `cost_unknown` path with a real supervisor.
- disposition: **Split matrix** (P2). The three modes decompose: (a) `malformed-cost` → `cost_unknown` is a parser fact — `runHeadlessAgent` line 508-510 returns `null` for non-numeric `total_cost_usd`, directly testable. (b) `budget-exhausted` → `reasonForProcess` reads `processResult.budgetExhausted` which is set by `runHeadlessAgent` line 494 when the stream contains a budget-failure event. (c) `over-budget` → `case_budget_exhausted` is set at `run-agent-experiment.mjs:486-488` when cost exceeds cap. Retain one real supervisor sentinel for `over-budget` (already at :460 within the "stops the unstarted remainder" case). The `cost_unknown` sentinel already exists at :404.
- evidence: "Matrix covers every old row; sentinel proves the CLI wires to that contract." The three modes map to: parser test (malformed), stream-event test (budget-exhausted message), cap-math test (over-budget). The existing sentinels at :404 and :460 already exercise the production supervisor path for both major reason codes.
- cost drivers: 3× `makeProject()` (each: mkdtemp, symlink `DEEP_RESEARCH_HARNESS`, write `.env`, write playbook, write agent fixture `.mjs`, write health checker), 3× `runSupervisor()` → `runHeadlessAgent()` (each spawns `node fixture-claude-*.mjs` which spawns `agent-experiment-state.mjs register-bundle` + `finalize-agent-experiment.mjs`). Total: 3 fixture projects, 3 supervisor spawns, ~9 Node subprocesses.

## 2. "keeps a specific lifecycle reason for Agent process and stream failures"
- file:line: `tests/integration/host_tools/run-agent-experiment.test.mjs:477`
- measured: 4.071s (plan row 31, anchor current)
- assertion: Five process-failure modes (`nonzero` exit 17, `signal` SIGTERM, `timeout`, `approval`, `malformed-stream`) each produce `lifecycle_outcome=ERROR` with a specific reason: `agent_nonzero_17`, `agent_signal_SIGTERM`, `agent_timeout`, `approval_required`, `malformed_agent_stream`.
- authority: `run-agent-experiment.mjs:187-196` (`reasonForProcess` pure function), `agent-experiment-supervisor.mjs:444-514` (`runHeadlessAgent` determines `processOutcome` at lines 495-499 from signal/timeout/approval/exit analysis).
- mutation: The five reason strings MUST persist. The `reasonForProcess` precedence order (external signal → approval → timeout → signal → nonzero → parse error → budget exhausted) MUST NOT change.
- neighbors: `tests/host_tools/agent-experiment-autorun.test.mjs` has schema-level completion tests but no direct neighbor for these five reason codes. `tests/integration/host_tools/run-agent-experiment.test.mjs:496` (missing/malformed completion) covers the adjacent `native_completion_invalid` reason family.
- disposition: **Split matrix** (P2). `reasonForProcess` is a pure function — all five codes can be proven by direct call with crafted `processResult` objects, no child processes needed. Keep one real supervisor sentinel for the `nonzero` path (simplest real process). The `timeout` path requires a real child process (the process must hang), but can use a trivial `sleep`-only child rather than the full agent fixture. The `malformed_agent_stream` path is a JSONL parser fact — directly testable with crafted stream input.
- evidence: Matrix covers nonzero, signal, timeout, approval, parse-error → reason. One real sentinel (nonzero or timeout) proves the supervisor wires the `reasonForProcess` output to the result. The `agent_timeout` case has a 2s SIGTERM→SIGKILL delay embedded in `runHeadlessAgent:457` — this is irreducible for a real timeout sentinel but can be isolated to one case.
- cost drivers: 5× `makeProject()`, 5× `runSupervisor()` → `runHeadlessAgent()`. Total: 5 fixture projects, 5 supervisor spawns, ~15 Node subprocesses. The `agent_timeout` mode sets a 50ms timeout with the fixture hanging via `setInterval(() => {}, 1000)`, triggering the 2s SIGTERM→SIGKILL cascade.

## 3. "rejects missing or extra declared run-root bundles without outside cleanup"
- file:line: `tests/integration/host_tools/run-agent-experiment.test.mjs:371`
- measured: 3.553s (plan row 38, anchor current)
- assertion: Two bundle-mismatch modes (extra undeclared bundle on disk, missing required bundle from policy) both yield `effective_outcome=ERROR`, `agent_process=nonzero`, and `run_root_available=true` — without cleanup attempting to remove the root.
- authority: `agent-experiment-supervisor.mjs:284-296` (`directObservedBundles` enumerates `dpt_*` directories), `agent-experiment-supervisor.mjs:339-343` (`validateNativeCompletion` compares completion roles against policy), `agent-experiment-supervisor.mjs:360-362` (observed vs completion length/identity mismatch → `fail`). The `extra-bundle` mode is detected by the agent fixture's own `finalize-agent-experiment.mjs` call (line 143-148: "observed bundle directories do not exact-match completion declarations"), producing `agent_process=nonzero`.
- mutation: The observed-vs-declared bundle mismatch detection in `validateNativeCompletion` and `finalize-agent-experiment.mjs` MUST persist. The `nonzero` agent_process and `run_root_available=true` for bundle failures MUST persist.
- neighbors: `tests/host_tools/agent-experiment-autorun.test.mjs:625` ("rejects bundle registration that escapes the case run root via parent traversal") and `:639` ("rejects finalizer bundle path that points outside the case run root") cover path-containment validation in-process. `tests/host_tools/agent-experiment-autorun.test.mjs:591` ("rejects DEEP_RESEARCH_HARNESS/experiments_env/tests copies under .exp-bundles") covers source isolation.
- disposition: **Split matrix** (P2). `directObservedBundles` is a pure function (readdir → filter → sort). The `validateNativeCompletion` mismatch logic at lines 360-362 is a direct comparison of arrays. Both can be tested as a direct contract matrix. Retain one real supervisor sentinel for the `extra-bundle` path (simpler than `missing` since it exercises the agent fixture's own finalizer rejection). The `missing` mode is a variant of the same mismatch check.
- evidence: Direct matrix covers: extra-on-disk-only, missing-from-policy, both-present-match. One supervisor sentinel proves the wire from child process exit to result classification.
- cost drivers: 2× `makeProject()`, 2× `runSupervisor()`. For the `missing` case, `configureFixturePlaybook` is called to rewrite the playbook. Total: 2 fixture projects, 2 supervisor spawns, ~6 Node subprocesses.

## 4. "fails closed when the native completion is missing or malformed"
- file:line: `tests/integration/host_tools/run-agent-experiment.test.mjs:496`
- measured: 3.364s (plan row 39, anchor current)
- assertion: Two completion-absence modes (`missing-completion`, `malformed-completion`) both produce `native_outcome=null`, `lifecycle_outcome=ERROR`, a reason matching `/^native_completion_invalid:/`, and `run_root_available=true`.
- authority: `agent-experiment-supervisor.mjs:300-383` (`validateNativeCompletion`), specifically lines 318-320 (parse `agent-experiment-completion.json` via Zod schema — `AgentExperimentCompletionSchema.parse`). The `run-agent-experiment.mjs:481-484` catch block sets `lifecycle_outcome=ERROR` and `reason=native_completion_invalid: <error.message>`.
- mutation: The `native_completion_invalid` reason prefix and the `native_outcome=null` for missing/malformed completion MUST persist. The completion schema validation MUST NOT be relaxed.
- neighbors: `tests/host_tools/agent-experiment-autorun.test.mjs:512` ("rejects inconsistent NOT_RUN and trace/health bindings") covers completion schema invariants in-process. `tests/integration/host_tools/run-agent-experiment.test.mjs:509` ("cannot turn successful generic enqueue/save checks into a Heavy PASS without completion") covers the adjacent Heavy-without-completion path.
- disposition: **Split matrix** (P2). Both modes are parser facts: `missing-completion` → `AgentExperimentCompletionSchema.parse` throws (file absent or empty), `malformed-completion` → `AgentExperimentCompletionSchema.parse` throws (invalid JSON). Both are directly testable by calling `validateNativeCompletion` with a prepared context that has a missing or malformed completion file. The fixture's `agentFixtureSource` handles these modes at lines 722-723 without calling `finalize-agent-experiment.mjs` — the child process exits successfully, but the supervisor's `validateNativeCompletion` catches the bad file. Retain one real supervisor sentinel for the malformed path (exercises the Zod parse error path).
- evidence: Direct matrix covers: missing file, malformed JSON, valid-schema-mismatch. One supervisor sentinel proves the `catch` block at `run-agent-experiment.mjs:481-484` wires correctly.
- cost drivers: 2× `makeProject()`, 2× `runSupervisor()`. Total: 2 fixture projects, 2 supervisor spawns, ~4 Node subprocesses.

## 5. "launches Interactive as one positional prompt with inherited stdio and no Headless-only flags"
- file:line: `tests/integration/host_tools/run-agent-experiment.test.mjs:543`
- measured: 3.235s (plan row 41, anchor current)
- assertion: Interactive mode produces `effective_outcome=PASS`, `cost_usd=null`, `logs={prompt:null,stdout:null,stderr:null}`, the captured argv has exactly 3 entries (`--setting-sources`, `project,local`, the rendered prompt), `stdio` is inherited (isTTY propagated), and no Headless-only flags (`-p`, `--output-format`, `--no-session-persistence`, `--permission-mode`, `--max-budget-usd`) appear.
- authority: `agent-cli-launcher.mjs:46-58` (`buildInteractiveAgentCliPlan` builds the 3-entry argv, uses `stdio: 'inherit'`), `agent-experiment-supervisor.mjs:516-537` (`runInteractiveAgent` spawns with `stdio: 'inherit'`), `run-agent-experiment.mjs:459-461` (Interactive branch).
- mutation: The Interactive argv contract (no `-p`, no `stream-json`, no `bypassPermissions`, no `--max-budget-usd`, positional prompt, inherited stdio) MUST NOT change. The 128 KiB prompt limit MUST persist.
- neighbors: `tests/host_tools/agent-experiment-autorun.test.mjs:558` ("constructs separate Headless and Interactive Claude argv classes") covers the exact argv construction in-process — arg lists, forbidden flags, prompt size limit. `tests/integration/host_tools/run-agent-experiment.test.mjs:563` ("fails closed when the complete Interactive positional prompt exceeds 128 KiB") covers the size-limit sentinel.
- disposition: **Keep + profile** (P2). This is the only integration test that exercises the Interactive spawn contract with a real supervisor process and inherited stdio. The unit test at `agent-experiment-autorun.test.mjs:558` already proves the argv construction in-process. The Interactive sentinel here proves the supervisor's Interactive branch (`run-agent-experiment.mjs:459-461`) actually spawns and the fixture captures the right diagnostic facts. The real child process is required to verify inherited stdio (isTTY propagation). Could potentially reduce to a single supervisor launch with a minimal fixture that just exits.
- evidence: The plan's Keep + profile disposition is correct. The Interactive spawn with inherited stdio is a unique process boundary that cannot be fully replaced by a direct matrix. The argv construction is already covered by the unit test.
- cost drivers: 1× `makeProject()`, 1× `runSupervisor()` → `runInteractiveAgent()`. The child process is the fixture agent, which spawns `agent-experiment-state.mjs register-bundle` + `finalize-agent-experiment.mjs`. Total: 1 fixture project, 1 supervisor spawn, ~3 Node subprocesses.

## 6. "cannot turn successful generic enqueue/save checks into a Heavy PASS without completion"
- file:line: `tests/integration/host_tools/run-agent-experiment.test.mjs:509`
- measured: 3.194s (plan row 42, anchor current)
- assertion: A Heavy-cost agent-behavior case that performs generic `enqueue`/`save` checks but does NOT write `agent-experiment-completion.json` yields `native_outcome=null`, `effective_outcome=ERROR`, reason matching `/^native_completion_invalid:/`. The trace file confirms the enqueue/save gates were reached.
- authority: `agent-experiment-supervisor.mjs:300-383` (`validateNativeCompletion` — the completion file is absent, so the `assertRegular` at line 319 fails or the `JSON.parse` at line 320 fails). `run-agent-experiment.mjs:481-484` catch block sets the reason. The `agentFixtureSource` line 698-699 shows the heavy-generic-no-completion mode writes `enqueue` and `save` checks but skips the completion file at line 724.
- mutation: The fact that Heavy Subject policy requires a native completion — generic checks alone cannot satisfy it — MUST persist. The `native_completion_invalid` reason MUST persist.
- neighbors: `tests/host_tools/agent-experiment-autorun.test.mjs:234` ("does not allow generic enqueue/save checks to satisfy a Heavy Subject policy") proves the same fact in-process — the unit test checks that the completion schema requires subject-specific evidence that generic checks don't provide. `tests/integration/host_tools/run-agent-experiment.test.mjs:496` ("fails closed when the native completion is missing or malformed") covers the generic missing-completion path.
- disposition: **Share setup** (P2). This case is a variant of the missing-completion case at :496 with a specific policy (Heavy Subject, agent-behavior proof). The same fixture project could be used for both the generic missing-completion case and this Heavy-specific variant if the playbook is cloned from a shared immutable baseline. The unit test at `agent-experiment-autorun.test.mjs:234` already proves the schema-level fact. The integration test here proves the supervisor's catch block fires for the Heavy-specific policy path.
- evidence: The plan's "Keep + profile" can be refined to "Share setup" — the fixture creation cost is identical to :496's missing-completion case and can be shared. The unique proof is the Heavy Subject policy + no-completion interaction.
- cost drivers: 1× `makeProject()`, plus playbook rewriting (read original, replace case id, replace required_checks/durable_evidence/proof_subject/subject_execution/fixture, remove original, write manifest), 1× `runSupervisor()`. Total: 1 fixture project, 1 supervisor spawn, ~3 Node subprocesses.

## 7. "passes the bounded per-case cap to the Headless child"
- file:line: `tests/integration/host_tools/run-agent-experiment.test.mjs:416`
- measured: 3.009s (plan row 43, anchor current)
- assertion: When `maxCaseBudgetUsd=0.3` and `maxTotalBudgetUsd=1`, the Headless child receives `--max-budget-usd 0.3` in its argv (captured in `fixture-invocation.json`).
- authority: `run-agent-experiment.mjs:462-465` (calculates `currentCap = Math.min(opts.maxCaseBudgetUsd ?? remaining, remaining)`), `agent-cli-launcher.mjs:27-44` (`buildHeadlessAgentCliPlan` passes `maxBudgetUsd` as `--max-budget-usd`).
- mutation: The `currentCap` calculation MUST persist. The `--max-budget-usd` wiring in `buildHeadlessAgentCliPlan` MUST NOT change.
- neighbors: `tests/host_tools/agent-experiment-autorun.test.mjs:558` ("constructs separate Headless and Interactive Claude argv classes") proves `buildHeadlessAgentCliPlan` wires `--max-budget-usd` correctly. `tests/integration/host_tools/run-agent-experiment.test.mjs:444` (fails closed for cost) proves the supervisor enforces the cap.
- disposition: **Share setup** (P2). This is a normal success case with a non-default `maxCaseBudgetUsd`. The fixture project is identical to the standard success case at :230 except for the budget parameters. Could share the same fixture project, just calling `runSupervisor` with different options. The proof is a single cap-calculation fact.
- evidence: The unit test already proves the argv construction. The integration test proves the supervisor's `currentCap` calculation reaches the child process. Could be folded into the standard success case at :230 as an additional assertion on the captured argv.
- cost drivers: 1× `makeProject()`, 1× `runSupervisor()`. Total: 1 fixture project, 1 supervisor spawn, ~3 Node subprocesses.

## 8. "accepts remote endpoint and launches fake claude"
- file:line: `tests/integration/host-tools/claude-deepseek.test.mjs:178`
- measured: 3.260s (plan row 40, anchor current)
- assertion: With valid `.env` (DEEPSEEK_API_KEY, DEEPSEEK_ANTHROPIC_BASE_URL, DEEPSEEK_MODEL) and fake `claude` on PATH, the launcher spawns the fake claude process and exits 0.
- authority: `claude-deepseek.mjs:86-116` (main path: parse `.env`, validate, `loadAgentCliBase`, `spawnSync` with `--setting-sources project,local` + passthrough args, `stdio: 'inherit'`, `shell: false`).
- mutation: The launcher's external contract MUST persist: `.env` parsing, endpoint validation, env mapping via `buildChildEnv`, `--setting-sources project,local` prefix, `shell: false`, `stdio: 'inherit'`, exit code passthrough. The fake process proves host supervision (launcher behavior), NEVER Agent behavior.
- neighbors: All other cases in `claude-deepseek.test.mjs`: `:112` (--check passes), `:127` (--check fails missing .env), `:135` (--check fails empty key), `:147` (--check rejects malformed URL), `:159` (--check multiple failures), `:166` (--check fails claude not on PATH), `:190` (rejects URL with embedded credentials), `:202` (passes arguments through), `:218` (preserves exit code), `:230` (removes inherited ANTHROPIC_*, maps .env values), `:251` (rejects caller extras), `:262` (--check does not launch claude), `:274` (does not shell-evaluate .env), `:286` (does not inject --allow-dangerously-skip-permissions).
- disposition: **Keep + profile** (P2). This is the only case that launches the launcher without `--check`. Every other case either uses `--check` or tests a specific failure mode. The fake claude process is the authoritative proof that the launcher spawns the correct binary with the correct environment. The cost is dominated by `setupTemp()` (copies `DEEP_RESEARCH_HARNESS/host_tools/lib` and `claude-deepseek.mjs` + fake `claude` binary into a fresh temp dir) — this is shared across all 14 cases. The `before` hook creates the fake claude fixture once.
- evidence: The plan's Keep + profile is correct. The launcher's spawn contract is a unique process boundary. The primary optimization surface is `setupTemp()` which copies files per test — could be made a shared immutable fixture cloned per case. However, the fake claude fixture is already created once in `before()`. The `setupTemp()` copy cost is proportional to the lib directory size.
- cost drivers: `setupTemp()`: `mkdirSync` host_tools dir, `copyFileSync` launcher, `cpSync` lib/ (recursive), `mkdirSync` fake_bin, `copyFileSync` fake claude. `runLauncher()`: `spawnSync(process.execPath, [launcher, ...args])` — the launcher then `spawnSync` fake claude. Total: 2 levels of Node subprocess (launcher → fake claude). The `before()` hook writes the fake claude once.

---

## File-Level Economics

### `tests/integration/host_tools/run-agent-experiment.test.mjs`

**Distinct test modes/children per heavy test:**

| Case | Modes | Child processes per mode | Total children |
|---|---|---|---|
| malformed/exhausted/over-cap cost (:444) | 3 | 1 supervisor → 1 fixture agent → 2 subprocesses (state + finalizer) | ~9 Node processes |
| lifecycle reasons (:477) | 5 | 1 supervisor → 1 fixture agent → 2 subprocesses | ~15 Node processes |
| missing/extra bundles (:371) | 2 | 1 supervisor → 1 fixture agent → 2 subprocesses | ~6 Node processes |
| missing/malformed completion (:496) | 2 | 1 supervisor → 1 fixture agent (no finalizer) | ~4 Node processes |
| Interactive spawn (:543) | 1 | 1 supervisor → 1 fixture agent → 2 subprocesses | ~3 Node processes |
| Heavy generic no-completion (:509) | 1 | 1 supervisor → 1 fixture agent (no finalizer) | ~3 Node processes |
| per-case cap (:416) | 1 | 1 supervisor → 1 fixture agent → 2 subprocesses | ~3 Node processes |

**Supervisor-vs-direct split feasibility:**

- **Facts genuinely requiring a real supervisor process**: arguments (argv capture), inherited stdio (isTTY), lifecycle outcome wiring (catch blocks in `run-agent-experiment.mjs:478-502`), native completion validation integration, timeout behavior (real process hang), cleanup eligibility chain.
- **Facts testable as direct classification/parser matrix**: `reasonForProcess` pure function (5 codes), `validateNativeCompletion` schema validation (missing/malformed completion), `directObservedBundles` enumeration, `buildHeadlessAgentCliPlan`/`buildInteractiveAgentCliPlan` argv construction, cost cap math (`currentCap` calculation).
- **Source-project creation is repeated per case**: `makeProject()` is called fresh for every mode — it creates a temp dir, symlinks `DEEP_RESEARCH_HARNESS`, writes `.env`, writes the playbook frontmatter, writes the agent fixture `.mjs`, and writes the health checker `.mjs`. The agent fixture `.mjs` is 84 lines of code that is re-written for every mode. P2.1 (shared source-project creation) would save 3-5 fixture creations per case.

**The `agentFixtureSource` function** (lines 682-766) generates a fake agent that:
1. Reads the injected prompt, extracts the run context JSON
2. Writes trace checks to `rb_trace.jsonl`
3. Spawns `agent-experiment-state.mjs register-bundle` (Node subprocess)
4. Optionally spawns `finalize-agent-experiment.mjs` (Node subprocess)
5. Writes `fixture-invocation.json` diagnostics
6. Writes various stdout JSONL events simulating Claude Code stream output

Each fake agent launch spawns 1-2 additional Node subprocesses. The integration test thus exercises 3 levels of Node process: test runner → `runSupervisor()` → `runHeadlessAgent()` spawns fixture agent → fixture agent spawns `agent-experiment-state.mjs` + `finalize-agent-experiment.mjs`.

**Unit test coverage overlap** (`tests/host_tools/agent-experiment-autorun.test.mjs`):
- `:558` already covers Headless/Interactive argv construction (in-process, no child process)
- `:234` already covers Heavy Subject policy vs generic checks (in-process)
- `:503` already covers cost schema invariants (in-process)
- `:625`/`:639` already cover bundle path containment (in-process, with real `spawnSync` to state/finalizer CLIs)
- `:575`/`:591` already cover source isolation (in-process)

### `tests/integration/host-tools/claude-deepseek.test.mjs`

**14 test cases**, all using the same `setupTemp()` → `runLauncher()` pattern. Each `runLauncher()` spawns `node claude-deepseek.mjs` which spawns fake claude (2 levels of Node subprocess).

**What the fake process proves**: The external launcher contract only — `.env` parsing, env mapping via `buildChildEnv`, `--setting-sources project,local` prefix, arg passthrough, exit code preservation, `shell: false`, `stdio: 'inherit'`, `--check` validation, credential redaction, PATH-based `claude` discovery. The fake process **never** proves Agent behavior — it is a host supervision boundary.

**The `before` hook** creates the fake claude once (writes to `tests/.test-tmp/fake-claude.mjs`). The `setupTemp()` function copies `DEEP_RESEARCH_HARNESS/host_tools/claude-deepseek.mjs` and `DEEP_RESEARCH_HARNESS/host_tools/lib/` (recursive) into each test's temp directory. This is the primary cost driver — `cpSync` of the `lib/` directory per test. The `after` hook cleans up all temp dirs.

---

## Open Questions

1. **`:444` anchor**: The plan says "fails closed for malformed, exhausted, or over-cap final cost" at line 444. The test at line 444 is indeed that case. Lines 404-414 cover the single `cost_unknown` path. Lines 460-475 cover the `over-budget` batch-stop path. Are the three P1 "Split matrix" rows for :444, :477, :371 intended to be P1 (as the plan's inventory says) or P2 (as the plan's File Concentration table and §P2 text imply)? The plan's inventory rows 19, 31 say P1; rows 38-43 say P2. The guardrail note next to row 19 says "Split matrix (P1): three process-heavy modes; preserve all outcomes and one full supervisor sentinel." I followed the P2 designation since §P2.2 explicitly names `run-agent-experiment`.

2. **`:477` timeout case irreducible cost**: The `agent_timeout` mode has a 50ms timeout with a hanging child, which triggers `runHeadlessAgent`'s 2-second SIGTERM→SIGKILL cascade. If this is kept as a real sentinel, the minimum per-case time is ~2s. A trivial-sleep child (not the full agent fixture) would still need the 2s cascade.

3. **`:543` Interactive isTTY**: The Interactive sentinel verifies inherited stdio (`isTTY` propagation). In a non-TTY test environment (CI, headless), `process.stdin.isTTY` is `false` — the test already handles this with `Boolean(process.stdin.isTTY)`. The sentinel's value is the argv contract, not the TTY state itself.

4. **claude-deepseek `setupTemp` sharing**: The 14 test cases each call `setupTemp()` which copies `lib/` recursively. The cases that don't mutate the launcher or lib could share a single immutable temp dir. The cases that test `.env` variants could share the same dir with different `.env` writes. This would reduce the file-copy cost from 14× to ~3×.