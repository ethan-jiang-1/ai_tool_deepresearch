# Research Wave Experiments

> req: RWE-001, RWE-002, RWE-003, RWE-004, RWE-005, RWE-006, RWE-007, RWE-008, RWE-009, RWE-010, RWE-011, RWE-012, RWE-013

> delta-synced: add-audited-late-accept-for-timed-out-work-units (RWE-012); add-degraded-handoff-requalification-case (RWE-013)

## Purpose

定义 workflow-foundation research wave experiments 的 runner-facing acceptance surface。实验必须展示 wave0/1/2 的完整闭环、全链路串联、Wave1 boundary enforcement、repair loop、fault tolerance 和 cross-topic synthesis 的可审查性，同时保持 deterministic verdict 只来自真实 trace JSONL。

**Requirement 与 playbook 映射**：RWE-001~007 各对应一个 playbook 文件（7 个 wave playbook）。RWE-008 和 RWE-009 是横切约束（不产生独立 playbook）：RWE-008 要求所有 Wave1 相关 playbook 在 body 中显式说明 foundation placeholder boundary；RWE-009 要求 wave2 synthesis playbook 的 thin driver 独立验证 cross-artifact reference。seed-topics boundary playbook（test-simple-seed-topics-boundary.md）在 seed-topic-materialization capability 中定义，不属于 RWE capability。
## Requirements
### Requirement: Wave0 happy-path + fail playbook

Wave0 playbooks SHALL verify work-unit source intake happy path and failure cases: missing ledger, missing receipt, invalid result, orphan output, non-work-unit delegated artifact, timeout retry, and gate-failure refill.

#### Scenario: Wave0 happy path drains multiple work units

- **WHEN** Wave0 has three source-intake queue items
- **THEN** the playbook SHALL claim and submit multiple work units before gate pass

### Requirement: Wave1 happy-path + boundary enforcement playbook

Wave1 playbooks SHALL verify topic deepening through work units and SHALL reject placeholder, shallow, cache-thin, or non-work-unit delegated artifacts as pass evidence.

Wave1 controlled E2E SHALL include a negative case where structurally present `evidence-summary.md` and `question-list.md` are insufficient because they reuse Wave0 URLs, omit required depth dimensions, or declare structured accepted source claims without matching submitted cache trails. The repair path SHALL be supplementary `wave1_topic_deepening` work-unit demand, not force-advance.

The real Wave1 Actor batch canary SHALL prove its two claimed `dpt-evidence-extractor` actors through their generated tasks, Subject-owned durable outputs, dry-submit/formal-submit outcomes, submitted ledger, and work-unit inspection. It SHALL stop at that actor checkpoint when its setup does not establish the complete Wave1 Phase projection. It SHALL NOT require a Wave1 Gate, synthesize `evidence-summary.md`/`question-list.md` or other semantic Phase inputs merely to obtain Gate success, or report actor submit success as Wave1 readiness. A Wave1 playbook that claims a Gate pass SHALL establish the full canonical Phase inputs through its declared Phase flow.

#### Scenario: Wave1 boundary rejects non-work-unit artifact

- **WHEN** a Wave1 delegated artifact exists without work-unit ledger coverage
- **THEN** the playbook gate SHALL fail

#### Scenario: Wave1 playbook rejects shallow topic deepening

- **WHEN** a Wave1 fixture-backed topic output mostly summarizes Wave0 and lacks enough new source URLs
- **THEN** the playbook SHALL observe a failed depth-review or gate verdict
- **AND** the playbook SHALL show supplementary work-unit refill as the repair path

#### Scenario: Wave1 playbook rejects cache-thin source claims

- **WHEN** Wave1 submitted `source_claims[]` / `accepted_source_urls[]` declare multiple accepted source URLs
- **AND** submitted cache trails cover only a subset of those URLs
- **THEN** the playbook SHALL observe cache/source mapping failure before Wave1 pass

#### Scenario: real Wave1 actor batch stops before an unestablished Phase Gate

- **WHEN** the real Wave1 actor batch has submitted its declared Subject results and its setup has not established the complete Wave1 canonical projection
- **THEN** the canary SHALL evaluate its actor submit and work-unit inspect checkpoints without a Wave1 Gate required check
- **AND** it SHALL not create Phase-owned semantic artifacts or claim Wave1 Gate readiness

### Requirement: Wave2 happy-path + artifact reference verification playbook

Wave2 playbooks SHALL verify pure synthesis artifact references separately from optional delegated targeted evidence work-unit coverage.

Wave2 controlled E2E SHALL include negative coverage for skipped synthesis work: `synthesis.md` exists, but scan matrix, confidence triage, gap analysis, or pure-synthesis eligibility is missing. It SHALL also include targeted evidence coverage where uncertain findings create `wave2_targeted_evidence` demand and pass only after submitted work-unit coverage.

#### Scenario: Wave2 delegated evidence is submitted

- **WHEN** Wave2 targeted evidence search is used
- **THEN** the playbook SHALL submit the delegated result by `work_id`

#### Scenario: Wave2 synthesis without scan matrix fails

- **WHEN** a Wave2 playbook writes synthesis prose without scan matrix and finding-index triage coverage
- **THEN** the playbook SHALL observe a failed Wave2 gate or preflight verdict
- **AND** the diagnostic SHALL direct the Agent to complete scan/triage/gap analysis

#### Scenario: Wave2 uncertain finding triggers targeted work unit

- **WHEN** the finding index marks a finding with `priority: p0` or `priority: p1` as search-required
- **THEN** the playbook SHALL enqueue and submit `wave2_targeted_evidence`
- **AND** Wave2 SHALL pass only after the finding is resolved through submitted evidence or explicitly routed to deferral/internal-data/record-only handling

### Requirement: Full-chain waves sequential playbook

The full-chain playbook SHALL prove work-unit handoff across Wave0, Wave1, and Wave2 where delegated work is used, and SHALL run gates only after phase queue drain.

For report-quality readiness, the full-chain happy path SHALL reach HITL2 with non-shallow Wave1/Wave2 artifacts: Wave1 topics have accepted depth reviews and cache-backed new source claims; Wave2 has scan matrix, confidence triage, gap analysis, and legal pure-synthesis or submitted targeted-search coverage.

#### Scenario: full chain gates after drain

- **WHEN** a wave still has in-flight work units
- **THEN** the playbook SHALL not run the wave gate as a pass attempt

#### Scenario: full chain reaches HITL2 with non-shallow depth artifacts

- **WHEN** the full-chain playbook runs a report-quality happy path
- **THEN** it SHALL reach HITL2 only after Wave1 depth reviews pass and Wave2 scan/triage/gap-analysis coverage is present
- **AND** the verdict SHALL come from real trace/gate outputs, not console summaries or fixture claims alone

### Requirement: Wave repair-loop playbook

The repair-loop playbook SHALL prove gate failure creates repair/refill queue demand and new work-unit attempts with explicit batch reason.

#### Scenario: gate failure opens repair batch

- **WHEN** the gate fails for missing delegated coverage
- **THEN** the repair run SHALL open `b001+` with a repair/refill reason

### Requirement: Wave fault-tolerance playbook SHALL cover work-unit timeout and submit boundaries

The controlled wave fault-tolerance coverage SHALL distinguish normal submit from explicit audited late-submit:

- normal submit after timeout still rejects;
- explicit late-submit may accept an eligible targeted timed-out work unit;
- submitted replacement blocks late-submit;
- queued or claimed retry state can be cleaned up by accepted late-submit;
- failed and abandoned attempts still reject late-submit.

The playbook MAY use fixture-backed result, receipt, output, or cache surfaces to exercise Engine-layer behavior, but verdicts SHALL come from CLI JSON, bundle authority files, gate output, and trace/check entries.

#### Scenario: explicit late-submit is covered

- **WHEN** a controlled case has a targeted timed-out work unit with valid targeted result surfaces
- **THEN** the playbook SHALL verify explicit `operate-work-unit late-submit` success
- **AND** SHALL verify gate coverage comes from the audited submitted ledger row

#### Scenario: replacement submitted still rejects

- **WHEN** a replacement for the same `queue_item_id` already submitted
- **THEN** explicit late-submit for the targeted work unit SHALL reject
- **AND** the playbook SHALL verify no double ledger coverage exists

### Requirement: Wave review-surface playbook

The current manifest-registered Wave review-surface role SHALL expose fixed Wave2 synthesis, Wave0 reference metadata, cross-artifact links and a review checklist directly in Markdown so a human reviewer can assess synthesis quality and citation accuracy without reading inline JS. It SHALL use fixed repeatable inputs rather than claim live Subject Agent generation, run the real applicable gate, record strict case-owned root-trace checks, and finish through native completion. Its V2 proof profile SHALL honestly identify deterministic fixture distance; the playbook SHALL stop before host-side health and cleanup.

The visible review checklist SHALL cover at least reference URL/title reality, derivation from Wave0/Wave1 artifacts, reference-chain accuracy, and clear distinction between foundation placeholders and future capability.

#### Scenario: Human can review synthesis quality from playbook body

- **WHEN** a human reviewer opens the current review-surface playbook or its preserved evidence
- **THEN** the synthesis, reference chain and review checklist SHALL be directly visible
- **AND** review SHALL not depend on reading helper internals or interpreting a console-only verdict

### Requirement: Wave experiment playbook writes wave{N}_completion before gate (RWE-010, 横切约束)

Every current manifest-registered Wave0/Wave1/Wave2 case that invokes `check-gate-wave{0,1,2}-complete.mjs` SHALL first use `node DEEP_RESEARCH_HARNESS/cli/log-event.mjs --bundle <B> --event wave{N}_completion` to write the documented phase completion event to that bundle's `rb_trace.jsonl`. This is a Markdown-flow obligation executed by the Headless or Interactive Playbook Agent for the phase role; the gate and Engine SHALL only validate it and SHALL NOT emit the event to satisfy their own rule. Repair/rerun of the same gate MAY reuse the one already-recorded phase-completion event.

#### Scenario: Wave playbook passes gate after writing completion event

- **WHEN** a Wave case writes the qualifying artifact and the required `wave{N}_completion` event before its gate
- **THEN** the `trace_event_present` rule SHALL pass
- **AND** the gate SHALL pass when all other rules also pass

#### Scenario: Omitted completion event fails regardless of artifacts

- **WHEN** qualifying artifacts exist but the event is absent
- **THEN** the gate SHALL fail its `trace_event_present` rule with inspect identifying the missing event
- **AND** no finalizer or Supervisor fallback SHALL manufacture it

#### Scenario: Completion event is Playbook-Agent obligation

- **WHEN** ownership of the event is evaluated
- **THEN** the Playbook Agent SHALL execute the phase-role `log-event.mjs` action from Markdown
- **AND** the gate CLI or Engine SHALL NOT emit the event automatically

#### Scenario: wave playbook passes gate after writing completion event

- **WHEN** a Wave playbook writes the qualifying Wave artifact and `wave{N}_completion` before the gate
- **THEN** the gate's `trace_event_present` rule passes
- **AND** the gate passes when its other rules pass

#### Scenario: omitted completion event fails trace_event_present regardless of artifacts

- **WHEN** qualifying Wave artifacts exist but `wave{N}_completion` is absent before the gate
- **THEN** the gate fails `trace_event_present` and inspect identifies the missing event in `rb_trace.jsonl`
- **AND** no finalizer or Supervisor fallback manufactures it

#### Scenario: completion event is phase-agent obligation, not gate-emitted

- **WHEN** event ownership is evaluated
- **THEN** the phase Playbook Agent writes `wave{N}_completion` with `log-event.mjs` from Markdown
- **AND** the gate CLI and Engine only validate it

### Requirement: Wave1 placeholder not mistaken for full subagent research (RWE-008, 横切约束)

Every current Wave1-related playbook SHALL state its foundation placeholder boundary directly in Markdown so a reviewer can distinguish deterministic foundation structure from full Subject Agent/Sub-agent research. A placeholder such as `subagent: true` SHALL be labeled as a future marker unless the V2 profile and durable runtime evidence prove an independent real Subject actor.

#### Scenario: Reviewer can distinguish foundation from full research

- **WHEN** a reviewer opens a Wave1 playbook or its durable result
- **THEN** the body SHALL list the foundation-stage DO and DON'T boundaries
- **AND** neither Playbook Agent participation nor a marker alone SHALL be reported as Subject Agent behavior

### Requirement: Cross-artifact reference verification in wave2 synthesis (RWE-009, 横切约束)

The current manifest-registered Wave2 synthesis roles SHALL show how synthesis Markdown references Wave0 and Wave1 artifacts. Their thin deterministic driver SHALL resolve each claimed artifact reference against the current bundle, record each verdict-affecting cross-reference fact as a strict `event: check`, `source: playbook` row with explicit boolean `passed`/`expected` and a stable case-owned gate ID in bundle-root `rb_trace.jsonl`, and include the required IDs in native completion. No legacy `_trace.jsonl`, hard-coded old `test-*` path or console summary SHALL be authority.

#### Scenario: Cross-artifact references are independently verifiable

- **WHEN** the thin driver parses synthesis artifact links
- **THEN** it SHALL verify every target against current bundle state and append the required strict root-trace checks
- **AND** the applicable gate result and playbook check SHALL agree on the same runtime facts before native completion can PASS

### Requirement: Wave experiments SHALL prove work-unit-only delegated execution

Controlled wave E2E playbooks SHALL use only `operate-work-unit` for delegated work. They SHALL cover multi-work-unit phase drain, out-of-order submit, timeout retry, gate-failure refill, and no mixed provenance pass.

#### Scenario: no mixed provenance path passes

- **WHEN** a playbook creates one work-unit output and one non-work-unit delegated output
- **THEN** the gate SHALL fail for mixed provenance

### Requirement: Wave experiments SHALL cover timeout preflight and progress lease behavior

Controlled Wave fault-tolerance or progress-lease playbook coverage SHALL prove the timeout-preflight behavior that protects delegated work units from premature wall-clock terminalization. Coverage SHALL use fresh contained bundle state and production work-unit CLI/API boundaries after explicitly labeled fixture setup. Bundle creation, validation and inspection SHALL use the current Agent Experiment context when production-path evidence is claimed.

Fixture-backed result, receipt, output or cache surfaces MAY exercise Engine-layer timeout decisions only when labeled as fixture/Engine evidence. A playbook SHALL NOT hand-edit submitted ledger rows, fake runtime receipts as real Subject output, claim fixture checks prove real search/fetch quality, or bypass `operate-work-unit` boundaries for production facts.

Coverage SHALL include at least:

- an expired no-progress claimed attempt that is timeout-eligible and enters the existing retry path;
- a progress-positive claimed attempt whose default timeout is refused without retry mutation;
- candidate results routed by real dry-submit pass/repair/block semantics, including wrong identity, terminal status, invalid binding and ambiguous authority;
- optional `timeout-preflight --result <candidate>` parity and external-candidate mtime non-extension;
- forced-timeout diagnostics including structured `progress_sources[]`; and
- rejection of normal submit after terminal timeout until a separately accepted late-submit path applies.

Verdict-affecting facts SHALL be strict playbook-owned root-trace checks with stable V2 required IDs and native completion; CLI JSON and bundle authority files remain the underlying runtime evidence. The Playbook Agent SHALL stop after finalization. PASS cleanup and failure/health preservation SHALL be performed only by the Autorun Supervisor under explicit cleanup policy and the command-experiments guideline.

#### Scenario: No-progress timeout retry remains valid

- **WHEN** a claimed work unit has no result, progress receipt, output/cache progress and its effective idle lease has expired
- **THEN** timeout-preflight SHALL report eligibility
- **AND** default timeout SHALL requeue through the accepted REDO path

#### Scenario: Progress-positive timeout is refused

- **WHEN** a claimed work unit has recent Engine-observed progress
- **THEN** timeout-preflight SHALL report `timeout_eligible: false`
- **AND** the default timeout path SHALL leave queue/index/status/ledger/retry surfaces unchanged

#### Scenario: Candidate result routing stays fail closed

- **WHEN** timeout preflight evaluates a candidate result
- **THEN** dry-submit-compatible candidates SHALL route to formal submit, repairable candidates to same-work repair, and invalid/ambiguous authority to inspect/block
- **AND** the case SHALL verify the recommendation through CLI JSON plus required runtime trace checks

#### Scenario: no-progress timeout retry remains valid

- **WHEN** a controlled Wave case has a claimed work unit with no result, progress receipt, output/cache progress, and an expired effective idle lease
- **THEN** timeout-preflight reports eligibility
- **AND** default timeout requeues through the accepted REDO path

#### Scenario: progress-positive timeout is refused

- **WHEN** a controlled Wave case has recent Engine-observed work-unit progress
- **THEN** timeout-preflight reports `timeout_eligible: false`
- **AND** default timeout leaves queue, index, status, ledger, and retry surfaces unchanged

#### Scenario: submit-ready candidate routes to submit

- **WHEN** a controlled Wave case provides a candidate result that dry-submit accepts
- **THEN** timeout-preflight recommends formal submit
- **AND** the required CLI and root-trace checks show timeout is not the terminal route

#### Scenario: caller-provided candidate path follows dry-submit semantics

- **WHEN** a controlled Wave case supplies `timeout-preflight --result <candidate-result>`
- **AND** the candidate is valid or invalid under dry-submit rules
- **THEN** timeout-preflight classifies it consistently with dry-submit
- **AND** an external candidate mtime alone does not extend the idle lease

#### Scenario: repairable candidate routes to repair

- **WHEN** a controlled Wave case has a candidate that dry-submit rejects with repair diagnostics
- **THEN** timeout-preflight recommends repair for the same `work_id`
- **AND** the attempt remains claimed

#### Scenario: invalid candidate authority routes to inspect or block

- **WHEN** a controlled Wave case has a wrong identity, terminal status, invalid binding, or ambiguous-authority candidate
- **THEN** timeout-preflight recommends `inspect` or `block`
- **AND** it is not treated as same-`work_id` repair or default-timeout terminalization

#### Scenario: forced timeout records audit evidence

- **WHEN** a controlled Wave case uses `operate-work-unit timeout --force` on a progress-positive attempt
- **THEN** the diagnostics record forced-timeout evidence including structured `progress_sources[]`
- **AND** root-trace checks confirm the terminal attempt remains fail-closed and non-covering

#### Scenario: late submit remains fail closed

- **WHEN** a work unit has already been terminalized as `timed_out`
- **THEN** ordinary `operate-work-unit submit` rejects it
- **AND** the playbook does not claim audited late accept is available

### Requirement: Degraded-handoff requalification case retains one bounded real-Agent observation

The manifest SHALL register one heavy `agent_flow_e2e` case that starts from a
current production degraded Wave0 Gate handoff, loads the legal Wave1 surface,
and reaches the Wave2 new-evidence decision in the same disposable bundle and
one independent real Subject session. The case SHALL preserve the Subject
prompt, transcript, and result together with the Wave0 Gate JSON, before/after
bundle status and trace, and a retained exact Wave2 surface snapshot. The
adapter SHALL re-load that target surface only after the first turn establishes
the legal Wave2 entry; it SHALL not choose a phase or change a lifecycle fact.

For a launched case, native completion SHALL be the only `PASS`, `FAIL`, or
`NOT_RUN` authority. If native completion is absent, the retained Supervisor
report/audit SHALL be the authority for its cancellation, error, or budget
boundary. The case SHALL not treat a static test, launcher configuration,
partial transcript, or Playbook-Agent-authored content as Subject behavior
evidence.
It SHALL NOT change the production handoff, search policy, host behavior,
Engine lifecycle, or delegated-work authority.

#### Scenario: Real Subject reaches the bounded degraded-handoff observation

- **WHEN** the selected host provides the required Subject, child, and external
  research capabilities within the declared envelope
- **THEN** the case SHALL retain the real degraded Wave0 handoff, Wave1 and
  Wave2 entry facts, Subject evidence, and the native terminal completion
- **AND** the retained transcript and tool-call facts SHALL support closeout
  review of whether that Subject initiated a prohibited user choice, phase
  skip, or direct Phase-Agent research call

#### Scenario: Wave2 new evidence remains delegated

- **WHEN** the reloaded Wave2 surface presents the named emergent finding with
  `gap_status: needs_search`
- **THEN** the Subject SHALL retain its `explore_search` or `exploit_search`
  decision and route the finding through one submitted
  `wave2_targeted_evidence` work unit
- **AND** the retained Subject transcript SHALL contain no direct `WebSearch`
  or `WebFetch` invocation; any such direct invocation SHALL make the
  case-owned check fail

#### Scenario: Required capability is unavailable

- **WHEN** the required Subject, child, external research capability, or legal
  bundle path is unavailable
- **THEN** the case SHALL finalize native `NOT_RUN` with a non-empty reason
- **AND** it SHALL not claim Agent compliance, a production defect, or a
  substitute Playbook-Agent result

#### Scenario: Supervisor ends before native completion

- **WHEN** the exact case is cancelled, errors, or exhausts its declared
  budget before native completion
- **THEN** the retained Supervisor report/audit SHALL state that lifecycle
  boundary and native completion SHALL remain absent
- **AND** the outcome SHALL not admit a direct-root repair or claim Subject
  behavior

#### Scenario: Static contract coverage remains non-behavioral

- **WHEN** the case registration and Markdown contract are checked under
  `tests/integration/`
- **THEN** that coverage SHALL verify the declared proof and evidence boundary
- **AND** it SHALL not be reported as `agent_flow_e2e` execution evidence
