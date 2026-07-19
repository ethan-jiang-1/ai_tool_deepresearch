# Agent Testing
> req: AGT-001, AGT-002, AGT-003, AGT-005, AGT-006, AGT-007, AGT-008, AGT-009, AGT-010

## Purpose

Agent-assisted command experiment system. Current playbooks live under `experiments_playbook/exp_*/` as `case-<id>-<cost>-<proof-role>.md`, create isolated `dpt_disp_*` disposable bundles, execute real framework commands or thin deterministic checkpoints, and derive PASS/FAIL from root `rb_trace.jsonl` `check` events.
## Requirements
### Requirement: gate-loop command experiment playbooks (AGT-001)

The gate-loop Agent-assisted command experiment family SHALL use current command-experiment case naming and cost/role taxonomy. Current gate-loop playbooks SHALL be `case-<id>-<cost>-<proof-role>.md` files under `experiments_playbook/exp_gate-loop/`, SHALL create isolated disposable bundles, SHALL write verdict-affecting checks to the bundle trace, and SHALL derive PASS/FAIL from trace JSONL `check` events.

Current main spec Purpose SHALL describe command experiments as case/cost playbooks over real disposable bundles and trace-backed verdicts. It SHALL NOT describe the current testing system as simple/medium/complex `test-*` playbooks when those files no longer exist as current runner surfaces.

#### Scenario: gate-loop cases use current case taxonomy

- **WHEN** current gate-loop experiment guidance names runnable playbooks
- **THEN** it SHALL name current case/cost files such as the light three-return case, repair-loop case, and full-pipeline case
- **AND** it SHALL NOT name obsolete simple/medium/complex test filenames as current runnable proof

### Requirement: Trace 系统支持独立 trace 实例 (AGT-001)
`DPT_FRAMEWORK/engine/trace.mjs` 模块 SHALL 提供 `createTrace(filePath, options?)` 工厂函数，每次调用返回独立的 trace 实例（无共享状态）。每个测试脚本 SHALL 调用 `createTrace()` 创建自己的 trace 实例。Node SHALL 通过 `trace.traceEntry()` 自动 trace, 不硬编码文件名。

#### Scenario: 每个测试独立 trace 文件
- **WHEN** simple test 设 `const trace = createTrace('dpt_disp_gl_simple/rb_trace.jsonl')` 且 medium test 设 `const trace = createTrace('dpt_disp_gl_medium/rb_trace.jsonl')`
- **THEN** simple test 的 event 只写其 bundle root `rb_trace.jsonl`, medium 只写其 bundle root `rb_trace.jsonl`, 无交叉污染

### Requirement: gate-fork command experiment playbooks (AGT-002)

The gate-fork Agent-assisted command experiment family SHALL use current command-experiment case naming and cost/role taxonomy. Current gate-fork playbooks SHALL be `case-<id>-<cost>-<proof-role>.md` files under `experiments_playbook/exp_gate-fork/`, SHALL create isolated disposable bundles, SHALL write verdict-affecting checks to the bundle trace, and SHALL derive PASS/FAIL from trace JSONL `check` events.

#### Scenario: gate-fork cases use current case taxonomy

- **WHEN** current gate-fork experiment guidance names runnable playbooks
- **THEN** it SHALL name current case/cost files such as the four-return case, repair-retry case, and full-pipeline case
- **AND** it SHALL NOT name obsolete simple/medium/complex test filenames as current runnable proof

### Requirement: Three-level real subagent test playbooks (AGT-003)

The real subagent test playbook family SHALL exercise sub-agent actor behavior through work-unit claim, bounded prompt execution, submit, submitted ledger coverage, and gate-visible provenance. It SHALL use current case/cost playbook naming and light/standard/heavy cost labels where applicable; production-path assertions SHALL use work-unit artifacts and Engine submit results.

Current runnable real-subagent playbooks SHALL NOT use retired delegated transport mechanisms as proof surfaces. Old delegated transport cases SHALL be migrated when they still prove current work-unit behavior, or removed from current experiment surfaces when they no longer have current proof or diagnostic value.

Retired delegated proof surfaces include non-work-unit directories, retired channel identity fields, retired commit/spawn events, retired dispatch manifests, and old helper APIs.

#### Scenario: light or heavy subagent playbook uses work-unit path

- **WHEN** a current real-subagent playbook runs
- **THEN** it SHALL claim a work unit, spawn a bounded sub-agent task, submit by `work_id`, and verify submitted ledger coverage

#### Scenario: old delegated subagent playbook is not current

- **WHEN** a real-subagent playbook still requires a retired delegated production command or path
- **THEN** it SHALL NOT be listed as a current runnable proof case
- **AND** it SHALL be migrated to work-unit proof or removed from current experiment surfaces

#### Scenario: old delegated identity fields are not current proof

- **WHEN** a real-subagent playbook proves execution using retired delegated channel identity, retired dispatch manifests, or non-work-unit delegated paths
- **THEN** it SHALL be migrated to work-unit identity and submit evidence or removed from current experiment surfaces
- **AND** its old delegated verdict SHALL NOT count as current work-unit proof

### Requirement: Runtime-agent trace events prove real execution path (AGT-003)

Runtime-agent trace evidence SHALL bind to work-unit lifecycle events and submitted work-unit identity. The playbook SHALL prove that the sub-agent actor actually ran by checking Engine and runtime evidence associated with `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`.

Trace, log, and receipt assertions SHALL NOT depend on unsubmitted retired delegated artifacts as current production evidence.

#### Scenario: runtime evidence binds work unit

- **WHEN** a sub-agent result is accepted
- **THEN** the trace and log evidence SHALL identify the submitted work unit
- **AND** the verdict SHALL not depend on unsubmitted filesystem artifacts

### Requirement: Runtime-agent evidence is mandatory (AGT-003)

The real subagent test suite SHALL require sub-agent-written runtime receipts and Engine-validated work-unit submit output for real LLM sub-agent acceptance.

Fixture-backed or old delegated evidence SHALL NOT satisfy real-agent proof unless it is routed through the accepted work-unit submit and ledger path. Obsolete evidence fixtures with no current diagnostic value SHALL be removed rather than kept as current examples.

#### Scenario: missing runtime evidence fails real-agent proof

- **WHEN** a claimed work unit lacks matching runtime evidence for its receipt nonce
- **THEN** the real subagent playbook SHALL NOT claim proof of real sub-agent execution

### Requirement: Verdict output uses ANSI color (AGT-008)

所有 command experiment playbook 的 verdict `console.log` SHALL 使用 ANSI 颜色码区分 PASS/FAIL 结果：
- PASS: `\x1b[32m` (green) 后接 `\x1b[0m` (reset)
- FAIL: `\x1b[31m` (red) 后接 `\x1b[0m` (reset)

此要求适用于每个 playbook 的 verdict 步骤中向终端输出的最终 `console.log`。中间 `check` event 的 trace 条目不受此约束（trace JSONL 是结构化数据，不使用 ANSI 颜色）。

在 bash heredoc `<< 'JS'` 中写入 JS 代码时，escape 写法 SHALL 为 `\x1b`（单反斜杠）——JS 的 hex escape 在运行时产生 ESC 字符。`\\x1b`（双反斜杠）在 JS 中产生字面量 `\x1b` 文本，不会触发颜色。

#### Scenario: Verdict PASS is green

- **WHEN** playbook verdict 步骤输出 PASS
- **THEN** 终端显示绿色 `SIMPLE PASS`（或 `MEDIUM PASS`、`COMPLEX PASS`、`IDENTITY PASS`）

#### Scenario: Verdict FAIL is red

- **WHEN** playbook verdict 步骤输出 FAIL
- **THEN** 终端显示红色 `SIMPLE FAIL`（或 `MEDIUM FAIL`、`COMPLEX FAIL`、`IDENTITY FAIL`）

#### Scenario: Escape syntax is correct in heredoc

- **WHEN** playbook 的 bash heredoc `<< 'JS'` 块内写入 ANSI escape
- **THEN** JS 字符串字面量使用单反斜杠 `'\x1b[32m'`（而非 `'\\x1b[32m'`）
- **AND** Node.js 运行时将 `\x1b` 解释为 ESC 字符并产生正确的终端颜色

### Requirement: Evidence extraction experiment suite SHALL use a new case segment

`experiments_playbook/exp_evidence-extraction/` SHALL define the controlled experiment suite for the `implement-evidence-extraction` mechanism. The suite SHALL use the currently empty segment reserved for evidence-chain experiments, distinct from the existing engine-boundary and file-observability experiment families. The specific starting case number is determined by the first available case-number position in the segment and documented in the suite README; specs refer to cases by role, not by number.

The suite SHALL include cases covering these proof roles:

- **Fixture-backed Engine path case** (light): proves work-unit submit cache trail verification, including valid verified trails written to ledger, incomplete-leaf warnings with trail filtering, and unsafe/non-leaf path fail-closed rejection. Reality Distance Ledger SHALL state no Agent actor and no external calls.
- **Disposable-bundle gate+reentry case** (standard): proves `count_floor` scoping, `cache_coverage` over verified+mapped/missing/unmapped/empty trails, file observability `cache_gap` detection without introducing a seventh classification, and `check-reentry` integration. It SHALL verify that countable orphan reference files cannot satisfy gate pass conditions.
- **Real Agent canary case** (heavy): proves that new rerun `action:add` prose/task-card behavior can drive a real Agent/sub-agent to produce cache leaves, reference files, work-unit result `cache_trails`, Engine-verified ledger trails, mapped cache coverage, and gate/reentry feedback. This case MAY record NOT RUN when no real Agent/sub-agent surface is available.

Fixture-backed cases SHALL include a Reality Distance Ledger and MUST NOT claim Agent search, judgment, writing, or repair behavior. The heavy canary case MUST NOT report PASS from fixture data. A NOT RUN heavy case SHALL NOT be interpreted as proof of Agent extraction quality.

The heavy canary case SHALL report these minimum quality metrics when it runs:

- cache trail coverage: percentage of new rerun `action:add` references with non-empty verified and mapped cache trails
- grounding spot-check: sampled Key Facts supported by cached page/source text
- source recoverability: submitted references have parseable source URLs and cache/source trails that let a future Agent recover the evidence
- countable rate: produced declared references versus `isCountable()` pass count
- gap rate: `cache_gap`, orphan, and empty-trail findings for the new run

These metrics SHALL NOT use homepage/shallow URL, duplicate URL, Jaccard, self-reference, or retired `content_dedup` heuristics as pass/fail evidence.

#### Scenario: fixture case uses work-unit submit

- **WHEN** the fixture-backed Engine path case runs
- **THEN** it SHALL exercise `operate-work-unit submit` validation and ledger append semantics
- **AND** its verdict SHALL not depend on non-work-unit delegated completion

#### Scenario: real canary reports work-unit evidence quality

- **WHEN** the real Agent canary runs
- **THEN** it SHALL report cache, grounding, source recoverability, countable-rate, and gap-rate metrics from submitted work-unit outputs
- **AND** it SHALL NOT report homepage/shallow URL heuristics as a quality gate

### Requirement: Handoff witnessing experiment coverage (AGT-010)

The change SHALL add controlled E2E coverage that proves phase handoff witnessing prevents clean laundering of premature phase truncation.

The required standard playbook SHALL use a disposable bundle and real framework CLIs. It SHALL NOT mock gate/status/trace behavior. It SHALL prove:

- a gate can pass after multiple real attempts, with Engine-derived attempt diagnostics visible in trace or diagnostic artifacts;
- a controlled Wave0 cascade condition exercises cascade-mask diagnostics without changing gate truth;
- attempting to synchronize status without a witnessed next-phase entry fails closed;
- attempting old-style next-gate synchronization, such as `advance-status --to wave1_complete` immediately after wave0 pass, fails closed with source-gate advice;
- running `enter-phase --node <check.next>` writes a route-bound `load_complete` tied to the latest passed deterministic predecessor gate attempt, including source gate/source node/target node metadata and `handoff_source_attempt_index`;
- stale historical `gate_attempt.next` matches do not authorize a new `enter-phase` witness after a later passed deterministic gate attempt points elsewhere;
- an older passed handoff is rejected when a newer attempt for the same source gate/source node fails or points elsewhere;
- after `enter-phase`, source-gate `advance-status` and subsequent gate operations proceed normally under the source-gate status-window contract;
- the status-window contract is exercised beyond wave0→wave1, covering at minimum wave1→wave2, wave2→HITL2, HITL2→readiness, readiness→final, one HITL2→rerun deterministic branch emitted by the real HITL2 gate CLI, and one rerun→seed-topics multi-incoming predecessor case;
- a forced old-style resume path reports a named handoff failure and remedy instead of silently accepting the state;
- a witnessed entry without subsequent target-phase work is not overclaimed as pipeline completion: the next target gate SHALL still fail its normal content/status rules when required artifacts are absent, and the playbook SHALL NOT claim to prove chat-channel halt prevention.

The playbook verdict SHALL be based on `rb_trace.jsonl`, CLI exit codes, diagnostic artifacts, and bundle files. Console output alone SHALL NOT be verdict authority. The standard playbook SHALL NOT claim to prove real chat-channel behavior; chat-side premature synthesis remains reserved for the optional heavy canary or manual replay evidence.

If the standard playbook deliberately records failed gate attempts to prove fail-closed behavior, post-run health verification MAY report those expected gate-attempt issues. The playbook SHALL distinguish expected health issues caused by deliberate negative cases from unexpected health failures such as schema corruption, missing trace files, ledger parse failures, or timeline parser breakage. Expected health issues SHALL NOT overturn a mechanism verdict that is otherwise proven by real CLI exits and bundle/trace evidence, but they SHALL be documented so archive notes do not overclaim a globally clean bundle health result.

#### Scenario: Standard E2E detects unwitnessed handoff

- **WHEN** a disposable bundle has a prior gate pass but no `load_complete` for the next phase
- **AND** the playbook invokes the next status/gate checkpoint
- **THEN** the checkpoint SHALL fail with inspect/advice naming the missing handoff witness
- **AND** the remedy SHALL name `enter-phase`

#### Scenario: Standard E2E passes after enter-phase

- **WHEN** the playbook runs `enter-phase --bundle <bundle> --node <next-node>`
- **THEN** `rb_trace.jsonl` SHALL contain route-bound `load_complete` for that node after the matching source gate attempt
- **AND** that `load_complete` SHALL expose source gate/source node/target node metadata and `handoff_source_attempt_index`
- **AND** the subsequent status/gate checkpoint SHALL no longer fail for missing handoff witness

#### Scenario: Standard E2E rejects stale route-bound witness

- **WHEN** a disposable bundle contains an old `gate_attempt.next` match for a lifecycle node
- **AND** a later passed deterministic gate attempt points to a different lifecycle node
- **THEN** `enter-phase --node <that-node>` SHALL fail unless the latest passed deterministic gate attempt authorizes that handoff
- **AND** no new `load_complete` SHALL be appended for the stale route

#### Scenario: Standard E2E rejects superseded pass

- **WHEN** a disposable bundle contains an older passed handoff for a source gate/source node
- **AND** a newer attempt for the same source gate/source node fails or points to a different target
- **THEN** `enter-phase` and `advance-status` SHALL reject the older handoff
- **AND** neither command SHALL mutate status or write a misleading witness

#### Scenario: Standard E2E rejects old-style next gate status laundering

- **WHEN** wave0 has passed after multiple attempts and returned `check.next: "phases/phase-wave1.md"`
- **AND** the playbook calls `advance-status --bundle <bundle> --to wave1_complete` before the wave1 gate has passed
- **THEN** the command SHALL fail closed
- **AND** the advice SHALL identify `wave0_complete` as the source gate status synchronization after `enter-phase`

#### Scenario: Standard E2E exercises full lifecycle status windows

- **WHEN** the playbook advances through witnessed handoffs after wave1 and wave2 gate passes
- **THEN** wave2 SHALL accept `current_gate: "wave1_complete"` and `next_gate: "wave2_complete"` as its active status window before wave2 passes
- **AND** the next covered phase after wave2 SHALL accept `current_gate: "wave2_complete"` and its own gate as `next_gate`
- **AND** no downstream gate SHALL require its own gate enum as `current_gate` before it has passed

#### Scenario: Standard E2E covers rerun alternate predecessor

- **WHEN** a disposable bundle trace contains a real rerun-ready pass whose `next` points to `phases/phase-seed-topics.md`
- **AND** `enter-phase --node phases/phase-seed-topics.md` writes the corresponding post-pass load witness
- **THEN** source-gate `advance-status --to rerun_ready` SHALL establish `current_gate: "rerun_ready"` and `next_gate: "seed_topics_ready"`
- **AND** the seed-topics gate preflight SHALL accept rerun as the legal predecessor for that branch

#### Scenario: Standard E2E covers HITL2 deterministic branch targets

- **WHEN** HITL2 emits a deterministic proceed handoff to `phases/phase-readiness.md`
- **THEN** `enter-phase`, source-gate `advance-status`, and readiness preflight SHALL accept the readiness target
- **WHEN** HITL2 emits a deterministic rerun handoff to `phases/phase-rerun.md`
- **THEN** `enter-phase`, source-gate `advance-status`, and rerun preflight SHALL accept the rerun target
- **AND** neither branch SHALL be replaced by a default outcome target

#### Scenario: Standard E2E does not treat entry witness as work completion

- **WHEN** a disposable bundle has a valid route-bound `load_complete` witness for a target phase
- **AND** the target phase's required artifacts or completion trace are absent
- **THEN** handoff preflight MAY pass for the entry witness
- **AND** the target phase gate SHALL still fail its normal content/status rules
- **AND** the playbook SHALL NOT describe this as proof that an Agent cannot halt in chat after `enter-phase`

#### Scenario: Standard E2E proves HITL2 rerun through real gate output

- **WHEN** the playbook records HITL2 `user_decision: rerun` in the disposable bundle and invokes `check-gate-hitl2-recorded.mjs`
- **THEN** the HITL2 gate CLI SHALL emit `check.next: "phases/phase-rerun.md"` and append a matching `gate_attempt` trace event
- **AND** the playbook SHALL NOT create the HITL2 rerun `gate_attempt` by hand
- **AND** downstream `enter-phase`, `advance-status`, and rerun preflight verdicts SHALL rely on that real gate output

#### Scenario: Standard E2E exercises high-friction diagnostics

- **WHEN** the playbook drives a disposable Wave0 gate through multiple real failed attempts before pass
- **AND** at least one failed attempt includes an upstream schema or parse failure that masks downstream count or dedup diagnostics
- **THEN** diagnostic artifacts SHALL show deterministic attempt delta and cascade-mask diagnostics
- **AND** those diagnostics SHALL NOT be treated as pass/fail authority

#### Scenario: Standard E2E separates mechanism verdict from expected negative-case health issues

- **WHEN** the playbook intentionally creates failed gate attempts to prove fail-closed behavior
- **AND** the standard health checker reports issues that correspond to those intentional failed attempts
- **THEN** the playbook MAY still report a mechanism PASS if all required CLI/trace/bundle checks pass
- **AND** the health issues SHALL be documented as expected negative-case artifacts
- **AND** unexpected health failures such as missing trace, invalid ledger, schema parse failure, or timeline parser failure SHALL still fail or block the E2E verdict

### Requirement: Optional heavy canary cannot substitute for standard proof (AGT-010)

If the change includes a heavy real-Agent canary, that canary SHALL replay high-friction behavior with native Agent/subagent execution and MAY report `NOT RUN` when the runtime surface is unavailable or too costly.

The heavy canary SHALL NOT be required for archive, and `NOT RUN` SHALL NOT be claimed as proof of real Agent behavior. The standard disposable-bundle E2E remains the required mechanism proof.

#### Scenario: Heavy canary records NOT RUN without blocking archive

- **WHEN** the heavy canary cannot be executed
- **THEN** it SHALL record `NOT RUN` with diagnostic context
- **AND** the change MAY still archive if the standard E2E and regression tests pass
- **AND** the archive notes SHALL NOT claim real Agent high-friction replay passed

### Requirement: Disposable experiment bundles are collision-resistant and host-cleaned

Disposable bundle creation SHALL continue to assign collision-resistant names for repeated same-case runs. During Agent Experiment execution, the approved disposable, production-instantiate and fixture-case creators SHALL place every bundle as a direct child of the validated Supervisor-owned case run root. Outside a valid Agent Experiment context, their accepted ordinary repo/test target behavior SHALL remain available.

Current playbooks SHALL NOT own PASS cleanup, delete by glob, or remove individual bundle paths. For Headless Autorun, the Supervisor SHALL delete only the complete containment-valid case run root after effective PASS, required health CLEAN, explicit cleanup policy, durable transcript and full audit. Interactive replay SHALL use the same host-created run context and post-completion validation/health/audit contract but SHALL preserve its run root in v1.

#### Scenario: Bundle name has random hex suffix

- **WHEN** a Supervisor prepares a repeatable case execution
- **THEN** it creates a collision-resistant case run root and any created disposable bundle has a collision-resistant identity beneath it
- **AND** that identity is recorded through the explicit run context rather than inferred from a filename suffix

#### Scenario: Cleanup uses glob to avoid stale bundles

- **WHEN** a Headless case reaches native completion
- **THEN** neither the playbook nor the Subject Agent uses a cleanup glob
- **AND** only the Supervisor may remove the complete current run root after durable audit and CLEAN effective PASS

#### Scenario: Race-safe re-run

- **WHEN** the same registered case is run twice
- **THEN** each execution receives a different Supervisor-owned run root and contained bundle path
- **AND** neither execution can delete or reuse the other's runtime state

#### Scenario: Same case reruns do not collide inside run roots

- **WHEN** the same registered case runs more than once
- **THEN** each execution has a unique Supervisor-owned run root and collision-resistant bundle name
- **AND** neither execution reuses or deletes the other's path

#### Scenario: Glob cleanup is retired

- **WHEN** an autorun-compatible playbook reaches native completion
- **THEN** it stops before `rm -rf` or a playbook cleanup helper
- **AND** only the Supervisor may later remove the complete current run root

### Requirement: Command experiment bundles use one runtime trace

Every current command experiment bundle SHALL continue to use bundle-root `rb_trace.jsonl` as the only verdict trace sink. V2 playbook frontmatter SHALL NOT repeat a static `trace:` glob or `bundle:` glob: runtime bundle and trace paths SHALL be declared and byte-bound by native completion under the current run root.

#### Scenario: All playbooks write to rb_trace.jsonl

- **WHEN** a registered playbook writes runtime trace events
- **THEN** it writes to the created bundle's root `rb_trace.jsonl`
- **AND** completion binds the exact verdict-boundary bytes for the declared bundle role

#### Scenario: Verdict reads from rb_trace.jsonl

- **WHEN** the native finalizer evaluates a completed playbook
- **THEN** it reads accepted playbook-owned checks from the declared verdict bundle's root `rb_trace.jsonl`
- **AND** arbitrary trace events do not become a Supervisor verdict fallback

#### Scenario: Frontmatter trace field uses unified name

- **WHEN** an operator reads a registered V2 playbook frontmatter
- **THEN** it contains no static `trace:` field
- **AND** dynamic trace coordinates come only from native completion

#### Scenario: Runtime trace path comes from completion

- **WHEN** a registered playbook completes with one or more bundles
- **THEN** each declared bundle uses its root `rb_trace.jsonl` surface or explicitly records an auxiliary invalid/missing trace fault
- **AND** no stale frontmatter glob becomes runtime or cleanup authority
