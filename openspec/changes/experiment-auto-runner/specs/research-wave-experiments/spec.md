# research-wave-experiments

> req: RWE-007, RWE-008, RWE-009, RWE-010, RWE-011

## MODIFIED Requirements

### Requirement: Wave review-surface playbook

The current manifest-registered Wave review-surface role SHALL expose fixed Wave2 synthesis, Wave0 reference metadata, cross-artifact links and a review checklist directly in Markdown so a human reviewer can assess synthesis quality and citation accuracy without reading inline JS. It SHALL use fixed repeatable inputs rather than claim live Subject Agent generation, run the real applicable gate, record strict case-owned root-trace checks, and finish through native completion. Its V2 proof profile SHALL honestly identify deterministic fixture distance; the playbook SHALL stop before host-side health and cleanup.

The visible review checklist SHALL cover at least reference URL/title reality, derivation from Wave0/Wave1 artifacts, reference-chain accuracy, and clear distinction between foundation placeholders and future capability.

#### Scenario: Human can review synthesis quality from playbook body

- **WHEN** a human reviewer opens the current review-surface playbook or its preserved evidence
- **THEN** the synthesis, reference chain and review checklist SHALL be directly visible
- **AND** review SHALL not depend on reading helper internals or interpreting a console-only verdict

### Requirement: Wave experiment playbook writes wave{N}_completion before gate (RWE-010, 横切约束)

Every current manifest-registered Wave0/Wave1/Wave2 case that invokes `check-gate-wave{0,1,2}-complete.mjs` SHALL first use `node DPT_FRAMEWORK/cli/log-event.mjs --bundle <B> --event wave{N}_completion` to write the documented phase completion event to that bundle's `rb_trace.jsonl`. This is a Markdown-flow obligation executed by the Headless or Interactive Playbook Agent for the phase role; the gate and Engine SHALL only validate it and SHALL NOT emit the event to satisfy their own rule. Repair/rerun of the same gate MAY reuse the one already-recorded phase-completion event.

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
