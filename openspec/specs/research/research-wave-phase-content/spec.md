# Research Wave Phase Content

> req: RWP-001, RWP-002, RWP-003, RWP-004, RWP-005, RWP-006, RWP-007, RWP-008, RWP-009, RWP-010, RWP-011, RWP-012, RWP-013, RWP-014, RWP-015, RWP-016, RWP-017, RWP-018, RWP-019, RWP-020, RWP-021

## Purpose

定义 wave0、wave1、wave2 三个 phase node 的完整 body 内容要求。每个 phase node body 必须满足当前 workflow-node contract 的 9 个 section，严格贴合当前 accepted CLI / schema / bundle contract。Wave0 产出 foundation shared reference；Wave1 标记 placeholder capability boundary；Wave2 从 verified artifacts 派生 cross-topic synthesis。
## Requirements
### Requirement: Wave0 phase body completeness

Wave0 phase body SHALL describe source intake delegated work as work-unit kind `wave0_source_intake`. It SHALL instruct the Agent to claim queue demand through `operate-work-unit`, dispatch prompts, run existing dry-submit on returned candidate work before formal submit, submit passing results by `work_id`, and run inspect/gate after phase drain. The current source-intake actor contract SHALL cover its assigned `artifacts/wave0/{topic.slug}/source.yaml`, cache, result, and receipt facts only; the phase SHALL NOT ask that actor to author `reference/00-shared-*.md` as a delegated completion or shared-reference-floor route.

After formal submit, the Phase Agent SHALL consume the Wave0 submitted-reference convergence result. When it identifies exact materializable submitted backing, the Phase Agent MAY load the existing shared reference template and create one Phase-owned consumer projection through the existing artifact-persistence and index-synchronization boundary. The projection SHALL cite exact submitted source/cache/work-unit backing, then rerun the same inspect. When the Phase Agent elects an allowed deferred outcome, it SHALL use the existing topic-state packet path and its contribution-scoped deferred form; it SHALL not hand-edit a seed, reference index, submitted ledger, source YAML, or cache. No gate or inspect result authorizes a Phase Agent to invent evidence, choose source relevance, or write a reference before submit.

For a sanctioned rerun, Wave0 queue filling SHALL classify current topics from the canonical registry, seed rerun direction and direct queue/work-unit/submitted-ledger facts. A rerun `action:add` topic without current queued, delegated-in-flight or submitted Wave0 coverage SHALL receive the same `source_intake_fan_in` / `wave0_source_intake` delegated demand used by first-run Wave0. An existing topic with valid current-or-previous-layout submitted Wave0 coverage and no supplement intent SHALL NOT be redundantly re-enqueued. An orphan `source.yaml` without submitted coverage SHALL NOT count as completed work.

Before delegated claim, the Phase Agent SHALL read the queue-front role, perform one bounded current native probe for that exact role, and invoke `operate-work-unit claim` with the complete actor observation and execution actor choice. The phase SHALL explicitly forbid `operate-queue claim` and `operate-queue complete` for delegated source-intake demand and SHALL route no-claim feedback back to the same work-unit claim checkpoint.

For returned work, phase guidance SHALL direct the Agent to consume the existing dry-submit disposition before formal submit: `repair_same_candidate` permits only its authorized mechanical candidate repair and a same-check rerun; `return_to_actor` preserves actor-owned semantic work; `fail_and_replace` uses the existing terminal/replacement path; and `inspect_contract` remains at the Engine owner or missing-contract boundary. It SHALL not scan the filesystem to declare or amend backing, and formal submit remains the only transition that unlocks reference materialization.

After a successful Wave0 submit, the Phase Agent SHALL obtain each Seed Projection Packet coordinate from the existing contribution-aware Wave0 inspection/preflight result. `<work_id>/N` means the global ordinal that the submitted work unit's accepted source contribution owns in the current valid source array. A later legal append, including one accepted in a later rerun, has a different work ID and owns only its appended ordinal interval; prior accepted prefix ownership remains readable for reference and Seed Projection backing. The Phase Agent SHALL not recalculate every historical work unit against the mutable full array, assign a suffix to an earlier work ID, hand-edit a seed, or treat `result_hash` as a source-byte snapshot. A contribution-prefix or missing-boundary feedback root is an Engine-owned condition to inspect and rerun through the existing legal path, not a prompt to fabricate provenance.

#### Scenario: Wave0 closeout uses submitted contribution coordinates

- **WHEN** one accepted Wave0 contribution owns source ordinals `1..19` and a legal later contribution owns ordinal `20`
- **THEN** phase guidance SHALL direct the Agent to use the first work ID only for `/1..19` and the later work ID only for `/20`
- **AND** it SHALL not tell the Agent to reconstruct those identities from current file length or result prose

#### Scenario: Wave0 source intake uses work-unit commands

- **WHEN** Wave0 source intake has delegated queue demand
- **THEN** the phase doc SHALL instruct `operate-work-unit claim`, dry-submit, and formal submit in that order
- **AND** it SHALL keep rich shared-reference authoring outside the current actor completion contract

#### Scenario: shared-floor repair uses submitted-backing materialization

- **WHEN** Wave0 inspect identifies a materializable submitted source identity while shared-reference floor coverage is incomplete
- **THEN** the phase doc SHALL direct the Phase Agent to use the exact submitted-backing materialization path and rerun the same inspect
- **AND** it SHALL not direct a new `wave0_source_intake` actor to create a rich-reference output solely to repair the floor

#### Scenario: Wave0 authoring distinguishes reference roots

- **WHEN** Wave0 guidance asks the Agent to create a shared rich reference
- **THEN** it SHALL expose the canonical `00-shared-<slug>.md` path, parser-aligned rich Markdown contract, and submitted backing as separate facts
- **AND** it SHALL not present the file, index row, or bare YAML as evidence authority

#### Scenario: Rerun added topic enters normal Wave0 work-unit path

- **WHEN** a sanctioned rerun adds a topic that has no Wave0 queue, in-flight or submitted coverage
- **THEN** the Wave0 phase doc SHALL instruct the Agent to enqueue one standard delegated source-intake demand for that topic
- **AND** the Agent SHALL perform role-bound probe, `operate-work-unit claim`, real actor execution and the dry-submit/formal-submit loop before gate evaluation

#### Scenario: Rerun keeps valid historical topic coverage

- **WHEN** a current topic resolves to valid historical submitted Wave0 coverage and has no supplement direction
- **THEN** Wave0 rerun guidance SHALL retain that coverage without creating duplicate demand
- **AND** the Wave0 gate SHALL remain the unchanged deterministic verdict owner

#### Scenario: Delegated no-claim feedback stays at one checkpoint

- **WHEN** a delegated Wave0 demand is at the active queue front but actor observation is missing or the non-delegated queue claim command is used
- **THEN** phase guidance SHALL tell the Agent to read the returned root cause
- **AND** the only nearest repair SHALL be to perform the required role probe and rerun `operate-work-unit claim`

### Requirement: Wave1 phase body completeness with subagent boundary

`phase-wave1.md` SHALL remain the Agent-facing controller for Wave1's
queue-driven deepening flow. It SHALL load the shared reference template through
its actual `requires` chain at the Phase-owned reference materialization
decision point. The Sub-agent owns bounded search/fetch, candidate result,
source/cache facts, runtime receipt, and its actor result. The Phase Agent owns
ordinary queue/claim/dry-submit/submit operation, Phase-owned consumer
projection, depth review, Seed Topic packet formation, and same-check repair.
The Phase Agent SHALL not fabricate Sub-agent source/cache/result/receipt
semantics or ask the user to run ordinary pipeline commands.

After a successful formal Wave1 submit with accepted backing, the Phase Agent
SHALL obtain the current Topic's one Wave1 reference-convergence result and
follow its returned legal action. For an authenticated materialization root, it
shall use the shared template and canonical locator to author a consumer
reference only from submitted backing; stage/persist that reference through the
existing artifact-persistence boundary; run `sync-reference-index`; refresh the
affected Seed Topic's concrete reference navigation only through the existing
Projection Packet / `operate-topic-state apply` writer when it changed; and
rerun the same Wave1 inspect. The synchronizer refreshes only its derived
`_INDEX.md` and README navigation projections; the Phase Agent SHALL not hand
write either projection. It SHALL not hand-edit a seed, index, ledger, receipt,
cache trail, declaration, or trace. A successful submit alone does not
authorize a broad filename choice, direct Seed mutation, or an invented source.

For an index-sync root, the Phase Agent SHALL run the narrow synchronizer and
rerun the same inspect. For an existing supplementary demand, it SHALL return
to the existing queue/work-unit loop rather than add a duplicate. For a true
positive reference-floor deficit with no live supplementary demand, it SHALL
form one existing `topic_deepening` supplementary card through the normal queue
operation, with the evaluator-returned snapshot-bound
`payload.reference_floor_deficit`; then claim, dry-submit, submit, run normal
Phase closeout, and rerun the same inspect. The field is an acquisition
objective, not a delegated output or a pass claim. The Phase Agent SHALL not
direct-search Wave1 evidence, create a new queue kind, run a background loop,
or turn a projection/index defect into a research demand.

After successful submit, `depth-review.yaml` SHALL continue to contain only
facts not already owned by submitted authority: version, canonical Topic
binding, reviewed work-unit refs, depth-dimension judgments, profile-check
judgments, decision, and supplementary queue IDs. It SHALL not copy submitted
source/cache arrays, Wave0 URL arrays, derived floor facts, or a second
reference-count authority. The reference-floor deficit may be cited as a
read-only queue objective when the existing supplementary decision records that
queue ID, but depth review shall not create, certify, or recompute it.

When the Phase Agent legally writes or updates a valid current
`focus_coverage` block in that depth review, it SHALL run the same existing
`sync-reference-index` operation before rerunning the named Wave1 inspect. The
operation only refreshes the derived reader projection from direct facts; it
does not make focus coverage a reference-file attribute, evidence authority,
or new closeout transition. A blocked synchronization remains its own
Engine-operation root: the Agent SHALL rerun the same operation from current
bytes and SHALL not hand-edit README, `_INDEX.md`, focus coverage, or a Gate
result to make the map appear current.

At each affected inspect/gate/submit failure, Phase guidance SHALL consume the
Engine-provided `repair_kind`, `missing_fact`, `write_to`, and `rerun` fields.
When `repair_kind` is `agent_action|engine_operation`, `write_to` is an already
authorized mutable surface/legal operation, and no new semantic/risk decision
is needed, the Agent SHALL perform the mechanical repair and rerun the named
checkpoint. `user_decision|external_action|missing_contract` identifies only
the smallest Agent-facing boundary. Because Wave1 is `stop: no`, those
classifications shall not themselves authorize a user-facing wait or escalation.

#### Scenario: Wave1 materializes canonical closeout after submitted backing

- **WHEN** a Wave1 work unit formally submits accepted backing that lacks its
  current canonical consumer projection
- **THEN** phase guidance SHALL direct the Phase Agent to materialize the
  canonical reference, synchronize the navigation projection, refresh an
  affected Seed Topic ref through the existing packet writer, and rerun Wave1
  inspect
- **AND** it SHALL not require the Sub-agent to write a consumer reference or
  the user to run a persistence/index/packet command

#### Scenario: stale index takes the narrow repair path

- **WHEN** current canonical backed references exist but the index table or row
  coverage is stale
- **THEN** phase guidance SHALL direct `sync-reference-index` and the same
  Wave1 inspect
- **AND** it SHALL not direct manual row edits, new source research, or a new
  controller

#### Scenario: true deficit uses the existing supplementary path

- **WHEN** convergence has exhausted materialization and index repair, reports
  a positive deficit, and no same-Topic supplementary demand is live
- **THEN** phase guidance SHALL direct one ordinary supplementary
  `wave1_topic_deepening` card with the returned positive floor objective
- **AND** claim/submit and later closure SHALL remain the existing work-unit
  transaction and same Wave1 inspect loop

#### Scenario: materialization root does not become a research demand

- **WHEN** a legacy/misnamed reference or submitted backing can be repaired by
  canonical Phase-owned materialization
- **THEN** the Phase Agent SHALL perform that legal projection repair first
- **AND** it SHALL not enqueue supplementary search work merely because the
  count is presently low

#### Scenario: Wave1 loads the shared reference template

- **WHEN** the Phase Agent reaches a Wave1 materialization decision
- **THEN** `phase-wave1.md` SHALL load the shared reference template through
  its actual requires chain
- **AND** it SHALL not require the Agent to discover that template indirectly

#### Scenario: Wave1 uses dry-submit before formal submit

- **WHEN** a Wave1 actor returns a candidate result
- **THEN** the Phase Agent SHALL run the existing same-candidate dry-submit
  check before formal submit and after mechanical candidate repair
- **AND** it SHALL not treat chat confirmation or a template as submit authority

#### Scenario: Wave1 materializes closeout after submitted backing

- **WHEN** submitted Wave1 backing is accepted and a consumer projection is
  required
- **THEN** Phase guidance SHALL materialize only through the convergence-guided
  Phase-owned closeout path
- **AND** it SHALL not make reference authoring a Sub-agent required output

#### Scenario: Depth review records judgment instead of ledger copies

- **WHEN** the Phase Agent records `depth-review.yaml` after successful submit
- **THEN** it SHALL record reviewed work-unit refs and Phase-owned judgments
- **AND** it SHALL not make copied source/cache/URL or derived-floor arrays a
  second deterministic authority

#### Scenario: valid focus update refreshes only the derived reader map

- **WHEN** the Phase Agent legally writes or updates valid current focus
  coverage for one Topic
- **THEN** guidance SHALL direct the existing `sync-reference-index` operation
  before the same Wave1 inspect
- **AND** it SHALL not make the focus declaration a reference-file label, Gate
  route, or manual README/index editing task

#### Scenario: Agent performs authorized same-check repair

- **WHEN** Engine feedback names an authorized same-check repair coordinate
- **THEN** the Phase Agent SHALL perform the ordinary mechanical repair and
  rerun that named checkpoint
- **AND** it SHALL not ask the user to run ordinary pipeline commands

#### Scenario: Recorded profile makes missing style parameters mechanical

- **WHEN** Wave1 requires an explicit profile-derived floor or style parameter
- **THEN** Phase guidance SHALL read the recorded profile fact and report a
  missing parameter as a direct mechanical blocker
- **AND** it SHALL not invent a hidden default

#### Scenario: Wave1 deepening uses work-unit kind

- **WHEN** Wave1 needs delegated topic-specific source acquisition
- **THEN** phase guidance SHALL use `wave1_topic_deepening` through the
  existing queue/work-unit path
- **AND** it SHALL not substitute a direct-search or ad hoc task path

#### Scenario: Wave1 requires depth review before topic completion

- **WHEN** a Topic's Wave1 outputs have submitted evidence but no valid depth
  review
- **THEN** Phase guidance SHALL repair or complete the existing depth-review
  projection before Wave1 completion
- **AND** it SHALL not treat reference/index navigation as a substitute

#### Scenario: Shallow Wave1 output routes to supplementary work unit

- **WHEN** direct submitted source/cache/new-source checks remain below their
  accepted floor
- **THEN** Phase guidance SHALL use the existing supplementary
  `wave1_topic_deepening` loop
- **AND** it SHALL not lower the floor or fabricate depth closure

When accepted current focus context calls for additional work, the Phase Agent
SHALL derive the smallest readable commitment set and record it only in the
optional focus-coverage block of the existing depth review. It SHALL bind the
declaration to the current canonical Topic and current rerun count; record a
covered commitment with non-empty submitted-work refs, or a limited commitment
with one visible limitation and an `external_action`, `user_decision`, or
`missing_contract` boundary kind while omitting submitted refs; use existing
`wave1_topic_deepening` demand, claim, dry-submit, submit, and depth-review
update paths for evidence work; and read the same Wave1 inspect after each
legal repair. The Agent SHALL preserve a commitment as a visible limitation
only when the existing feedback exposes an external, decision, or
missing-contract boundary with no currently authorized Wave1 repair; it SHALL
not declare `partial` or `blocked` merely to bypass available supplementary
work.

The Phase Agent SHALL treat user focus wording and its interpretation as
semantic context, not as a command for the Engine. It SHALL not invent a new
focus queue kind, direct-search path, retry controller, Gate command, user
checkpoint, profile field, canonical Topic identity, or historical evidence
label. For an initial run, the coverage declaration binds round 0; for a
rerun, it binds the current accepted rerun count and leaves earlier direction
and submitted evidence as history.

#### Scenario: Phase Agent turns current focus context into bounded commitments

- **WHEN** accepted current focus context calls for additional Wave1 work for
  one Topic
- **THEN** the Phase Agent SHALL record the smallest readable commitment set in
  that Topic's depth review and bind it to the current Topic and round
- **AND** it SHALL not ask the user to choose a source quota, queue kind, or
  coverage enum

#### Scenario: Repairable commitment uses existing supplementary work

- **WHEN** Wave1 inspect returns an existing legal supplementary repair for an
  uncovered commitment
- **THEN** the Phase Agent SHALL use the existing queue/work-unit path and
  rerun the same inspect
- **AND** it SHALL not record partial or blocked as a bypass

#### Scenario: No legal repair records an honest limitation

- **WHEN** current Wave1 feedback identifies an external, user-decision, or
  missing-contract boundary and no authorized Wave1 repair remains
- **THEN** the Phase Agent SHALL retain the explicit limitation in focus
  coverage and consume only the existing degraded/no-path behavior
- **AND** it SHALL not auto-rerun, create a new route, or claim the focus is
  semantically satisfied

#### Scenario: Rerun coverage does not consume historical work as current

- **WHEN** a rerun writes focus coverage for its current round
- **THEN** the Phase Agent SHALL bind covered commitments only to current-round
  submitted work
- **AND** it SHALL preserve earlier submitted evidence and direction as history
  rather than current focus coverage

### Requirement: Wave2 phase body completeness

Wave2 phase body SHALL describe pure synthesis as main-agent work and targeted evidence search as optional delegated work-unit kind `wave2_targeted_evidence`.

Pure synthesis SHALL be conditional. Before writing or completing pure synthesis, the Phase Agent SHALL complete cross-topic scan matrix construction, finding confidence triage, gap analysis, and emergent-search decisions in `cross-topic-ledger.md` and `finding-index.yaml`. The phase body SHALL make clear that synthesis prose is the projection after scan/triage/gap analysis, not a substitute for that work.

The Phase Agent SHALL project checked pair facts into `finding-index.yaml#/synthesis_eligibility/scan_topic_pair_coverage` using the accepted structured entry grammar. The Engine SHALL normalize those entries through canonical topic identity, reject malformed/self/unknown/duplicate pairs, verify that `scan.topic_count` equals the canonical topic count, verify that `scan.pair_count_expected` equals the canonical `C(topic_count,2)` pair universe, and verify that `scan.pair_count_checked` equals observed unique pair entries.

Ordinary first-run and `action:supplement` SHALL NOT be forced to materialize the complete `C(topic_count,2)` pair universe solely by this structural contract. When canonical topic count is greater than one, they SHALL still materialize at least one valid structured checked pair so the deterministic process surface proves scan was not wholly skipped. `wave2_cross_topic_depth: 0` permits zero required material connections; it SHALL NOT make an empty multi-topic scan projection sufficient. The remaining `rb_profile.yaml` reduced-coverage semantics and Agent quality self-check remain in force. The stricter complete-pair policy applies only where an accepted requirement explicitly demands it, including rerun `action:add` below.

When scan/triage identifies an unresolved evidence gap that requires new external evidence, the phase doc SHALL route that gap into `wave2_targeted_evidence` queue demand and work-unit submit before the finding can count as resolved by new evidence. If the gap cannot be resolved inside the phase budget, the Agent SHALL explicitly defer it to HITL2 or final limitations through ledger/index fields rather than silently omitting it.

#### Scenario: Wave2 targeted search uses work-unit loop

- **WHEN** Wave2 identifies a gap requiring delegated evidence search
- **THEN** the phase doc SHALL route that gap into queue demand and work-unit submit

#### Scenario: Pure synthesis waits for scan and triage

- **WHEN** the Phase Agent is about to complete `wave2-synthesis`
- **THEN** `cross-topic-ledger.md` SHALL contain scan matrix, confidence triage, gap analysis, and search-decision content
- **AND** `finding-index.yaml` SHALL show that no unresolved search-required finding remains without submitted targeted evidence or explicit deferral

#### Scenario: Reduced coverage is not upgraded to a universal full-pair Gate

- **WHEN** an ordinary first-run or `action:supplement` uses an accepted profile whose reduced coverage does not require the full canonical pair universe
- **AND** `pair_count_expected` describes the full canonical universe while a non-empty `pair_count_checked` matches the smaller observed structured set
- **THEN** the normalized pair-fact evaluator SHALL NOT fail solely because fewer than `C(topic_count,2)` pairs are present
- **AND** this structural pass SHALL NOT claim that the Agent's profile quality self-check was independently proven by the Engine

#### Scenario: Depth zero does not prove an empty scan

- **WHEN** canonical topic count is greater than one and `wave2_cross_topic_depth` is zero
- **AND** structured pair coverage is empty
- **THEN** the deterministic scan-not-skipped contract SHALL fail
- **AND** the failure SHALL request at least one real structured checked pair, not a fabricated material connection or full pair universe

#### Scenario: Pair structure and counts cannot hide invalid entries

- **WHEN** structured pair coverage contains a malformed, duplicate, self, or unknown-topic pair, or `pair_count_checked` differs from observed unique normalized entries
- **THEN** Wave2 inspect and formal Gate SHALL fail from the same pair-fact evaluator
- **AND** Agent-authored counts or topic-slug prose SHALL NOT override the direct structured failure

### Requirement: Wave1 foundation placeholder boundary enforcement

Wave1 SHALL forbid fake completion claims while allowing topic-specific deepening only when delegated evidence-producing outputs are covered by submitted work-unit ledger rows and pass the Wave1 gate. The boundary is no longer "do not claim deepening"; it is "do not claim deepening without work-unit-backed evidence, declared references, cache trail handling, and gate pass."

#### Scenario: deepening claim requires submitted work-unit coverage

- **WHEN** a Wave1 artifact claims topic-specific deepening completed
- **AND** the corresponding evidence outputs lack submitted work-unit ledger coverage
- **THEN** `wave1-complete` SHALL fail provenance checks or emit delegated bypass diagnostics

### Requirement: Wave2 synthesis artifact references verified artifacts

`phase-wave2.md` body SHALL 指示 Phase Agent 在 synthesis 中使用 Markdown link `[label](relative/path.md)` 引用经过 prior-wave 验证的 artifacts。引用 SHALL 使用相对于 `artifacts/wave2/` 的路径（如 `../wave1/<topic>/evidence-summary.md`、`../../artifacts/wave0/<topic>/source.yaml`）。

Synthesis narrative SHALL 至少引用 1 个 wave1 `evidence-summary.md` 或 `question-list.md`，并 SHALL 引用 finding id（W2F-xxx）以保持从 narrative 到 ledger/index 的可追溯性。Synthesis MAY 同时引用 wave0 thin YAML under `artifacts/wave0/{topic}/source.yaml`，但不强制。

#### Scenario: Synthesis reference format is Markdown links

- **WHEN** `check-gate-wave2-complete.mjs` 执行 `cross_field` check
- **THEN** synthesis 中的 Markdown links SHALL 被解析并验证目标存在
- **AND** 至少 1 条 link 指向 wave1 evidence-summary 或 question-list 时 gate 继续；0 条时 gate SHALL fail

#### Scenario: Synthesis references both wave0 and wave1 artifacts

- **WHEN** Phase Agent writes synthesis.md
- **THEN** synthesis MAY contain links to both `../../artifacts/wave0/<topic>/source.yaml` and `../wave1/<topic>/evidence-summary.md`
- **AND** at least 1 link SHALL point to a wave1 artifact

### Requirement: Anti-cheating rules in wave phase bodies

Wave phase bodies SHALL forbid claims of delegated evidence, search, or reference production unless the claimed outputs are covered by submitted work-unit ledger rows and pass the relevant gate checks. Anti-cheating examples SHALL point to work-unit submit, output declarations, cache trail validation, and gate verdicts as the corrective path.

#### Scenario: delegated evidence claim requires work-unit coverage

- **WHEN** a phase artifact claims delegated evidence production
- **AND** no submitted work-unit ledger row covers the evidence
- **THEN** the phase or gate guidance SHALL treat the claim as invalid

### Requirement: Wave2 rerun full re-synthesis on topic addition

The `phase-wave2.md` Rerun-Aware Behavior section SHALL include a scenario table distinguishing `action: add` (full re-synthesis) and `action: supplement` (delta/append).

`action: add` behavior SHALL align with Wave0 and Wave1 `action: add` semantics: full execution, same as first run.

When `action: add`:
- Phase Agent SHALL re-read evidence-summary.md for all topics (including the new topic)
- Phase Agent SHALL rebuild the cross-topic scan matrix covering all topic pairs
- Phase Agent SHALL generate synthesis.md, cross-topic-ledger.md, finding-index.yaml from scratch
- Old synthesis may be preserved as backup (`*.prev-rerun-N.md`) but SHALL NOT serve as baseline

When `action: supplement`, maintain current delta/append behavior.

The wave2-complete Gate SHALL include a rerun add check that forbids `## Delta Synthesis` as the main processing path. Existing shared direction-resolver semantics SHALL continue to decide whether an `action:add` is active, including accepted crash-recovery and legacy behavior; this change SHALL NOT add a second round-state parser. Pair coverage SHALL NOT be reimplemented by rerun-specific slug/text scanning: the rerun add policy SHALL consume the shared normalized pair-fact result and require its observed pair set to equal the complete canonical unordered pair universe. For an activated `action:add`, `scan.pair_count_expected` and `scan.pair_count_checked` SHALL both equal `C(topic_count,2)`. If the shared pair result is unusable because its parent/container/identity contract failed, the full-universe implication SHALL be masked rather than emitting a duplicate rerun pair root. The activated full-pair requirement is accepted completion structure and SHALL NOT be degradation-eligible.

#### Scenario: Wave2 rerun action:add triggers full synthesis

- **WHEN** the existing shared direction resolver activates a seed topic's `action: add`
- **THEN** Phase Agent SHALL perform full re-synthesis, not append a delta section
- **AND** synthesis.md SHALL NOT contain `## Delta Synthesis (Rerun N)` as the main path
- **AND** the shared pair-fact evaluator SHALL fail if any canonical pair is absent

#### Scenario: Slug-only coverage is insufficient for added topic

- **WHEN** the existing shared direction resolver activates a seed topic's `action: add`
- **AND** ledger/index prose lists every topic slug but structured pair coverage omits any added-topic × pre-existing-topic pair
- **THEN** Wave2 Gate SHALL fail with the exact missing pairs and same-check repair coordinate

#### Scenario: Rerun pair coverage has one fact path

- **WHEN** first-run or rerun Wave2 evaluates unchanged plan and finding-index bytes
- **THEN** both paths SHALL use the same normalized pair-fact result
- **AND** `action:add` SHALL add its full-universe policy to that result rather than pass coverage from slug presence or a separate count-only check

#### Scenario: Invalid pair facts mask rerun pair implication

- **WHEN** an activated `action:add` has malformed or unresolvable structured pair coverage
- **THEN** the general pair-fact root SHALL be the actionable failure
- **AND** the rerun policy SHALL NOT emit a second missing-full-pair repair root until normalization succeeds

#### Scenario: Wave2 rerun action:supplement keeps delta mode

- **WHEN** a seed topic file contains current `action: supplement`
- **THEN** Phase Agent SHALL retain existing synthesis as baseline
- **AND** new analysis SHALL be appended with `## Delta Synthesis (Rerun N)` header
- **AND** resulting pair entries and counts SHALL remain structurally self-consistent
- **AND** the supplement path SHALL NOT be upgraded to full-pair coverage unless another accepted contract explicitly requires it

### Requirement: Rerun action:add SHALL include full cache trail

Phase-wave0 §3.3、Phase-wave1 §3.3、and Phase-wave2 §3.2.3 SHALL instruct the Agent to update seed projection sections from current-round submitted authority. When a `__BACKFILL_*__` token is present (first materialization), the Agent SHALL replace it with return-map entries. When no token is present (rerun), the Agent SHALL:

1. Read current-round submitted rows via `operate-work-unit inspect --eligible-rows` for the topic/wave. Eligible rows are those whose work unit index record `rerun_count` matches the current `rb_profile.yaml` value, validated through ledger/index/manifest/queue-snapshot/canonical-topic binding by the Engine.
2. Read submitted outputs at the returned `result_path` locations. Derive return-map entries (evidence_meaning, relationship, refs, status, next_hop) by reading the outputs — NOT by mechanically extracting fields from ledger rows.
3. For Wave0, obtain each new `<work_id>/<n>` entry ID from the existing submitted contribution reader: `n` is the exact global source-array ordinal owned by that accepted work unit's contribution, not a per-work-unit local index or a mutable-array re-read. For Wave1, retain the existing positive ordinal unique within the submitted work unit. For Wave2, retain the exact current-round W2F identity. Use the existing Projection Packet writer to upsert the returned identity; do not append raw Markdown or infer a historical ordinal split.
4. For entries that should not appear in the projection (intermediate outputs, process-only, not consumer-facing), write an explicit no-projection disposition entry with `relationship: defers`, `status: deferred`, and `next_hop` containing a limitation reason.

Wave1 and Wave2 SHALL add a §3.0 “Classify Direct Facts” section implementing the existing RWP-014 classification. Classification SHALL use the shared direction resolver (`resolveRerunDirection`) to determine whether the `## 本轮重跑方向` section's intent is current. Only `matching` or `future` states SHALL activate supplement intent. `stale`/`legacy_unbound`/`invalid` SHALL be treated as no supplement intent.

`phase-wave0.md` 和 `phase-wave1.md` 的 Rerun-Aware Behavior SHALL 明确要求：当 rerun 触发 `action: add`（新增 topic）时，该 topic 的 source intake 流程 SHALL 与首次运行一致——Sub-agent MUST 写入 `_cache/` 目录（含 `websearch.json`/`page.md`/`meta.json`），Phase Agent MUST 在 spawn 前创建 cache 目录，queue task card 的 `action` 字段 MUST 包含 cache 路径指令。

Rerun SHALL classify current demand but SHALL NOT own a separate execution path: an existing topic with valid historical coverage SHALL reuse that coverage, a new topic without coverage SHALL enter the normal Wave0/Wave1 topic pipeline, and supplement intent SHALL create the normal supplementary demand. After classification, the same queue/work-unit/submit/reference-materialization/gate contracts used by first-run execution SHALL apply. No rerun-only gate exception, provenance path, reference namespace, or lifecycle state SHALL be introduced.

For Wave0, “与首次运行一致” SHALL include creation of delegated queue demand, current role-bound actor preflight, Engine-owned work-unit allocation, real result/receipt/output/cache production, and formal submit into the submitted ledger. Direct Phase-Agent search followed by a filesystem-only `source.yaml`, hand-written result/receipt, or hand-written ledger row SHALL NOT satisfy the rerun `action:add` path.

When the accepted actor branch is `phase_agent_fallback`, the Wave0 phase SHALL instruct the Phase Agent to execute the assigned work inside the generated envelope, use the generated exact-binding result starter, run `operate-work-unit dry-submit`, repair the same assigned candidate until preflight passes, and then run formal submit. The phase SHALL NOT describe post-hoc result/receipt construction as a way to grant provenance to work performed outside the claimed envelope.

Rerun 场景表的 `action: add` 行 SHALL 新增一行说明：`_cache/ 写入：与首次运行一致——每个 source 在 sNN_<slug>/ 下保存 3 文件`。

#### Scenario: Wave0 rerun projection keeps contribution ownership

- **WHEN** a prior submitted Wave0 contribution proves nineteen source entries and a later current-round contribution proves the same prefix extended to twenty
- **THEN** Wave0 rerun guidance SHALL use the existing contribution reader to project the first work ID's `/1..19` and the later work ID's `/20`
- **AND** it SHALL not assign `/20` to the earlier work ID or tell the Agent to modify historical ledger data

#### Scenario: Projection updated from current-round rows only

- **WHEN** a topic has submitted Wave1 rows from round 1 (index.rerun_count=1) and round 2 (index.rerun_count=2)
- **AND** profile `rerun_count` is 2
- **AND** the seed projection has no `__BACKFILL_*__` token
- **THEN** `operate-work-unit inspect --eligible-rows` SHALL return only the round-2 rows
- **AND** the Agent SHALL append entries for those rows with new entry_ids

#### Scenario: Entry with no-projection disposition satisfies check

- **WHEN** a submitted row produced process-only output not suitable for consumer projection
- **THEN** the Agent SHALL write an entry with `relationship: defers`, `status: deferred`, `next_hop: “limitation: process-only output, not consumer-facing”`
- **AND** this entry SHALL satisfy the authority reference check (explicit disposition)

#### Scenario: Wave1 classification uses direction resolver

- **WHEN** a topic has direction with `rerun_count: 2` and `action: supplement`
- **AND** profile `rerun_count` is 2
- **THEN** `resolveRerunDirection` returns `matching`
- **AND** wave1 §3.0 SHALL classify the topic as supplement

#### Scenario: Stale direction does not trigger classification

- **WHEN** a topic has direction with `rerun_count: 1` and `action: supplement`
- **AND** profile `rerun_count` is 2
- **THEN** `resolveRerunDirection` returns `stale`
- **AND** wave1 §3.0 SHALL treat the topic as having no supplement intent (reuse if valid coverage exists)

#### Scenario: Rerun adds a topic with full cache trail
- **WHEN** HITL2 rerun 触发 `action: add` 新增 topic 06
- **AND** Wave1 deepening Sub-agent 为 topic 06 搜索 3 个 source
- **THEN** `_cache/wave1/primary/06_topic-slug/` 目录 SHALL 含 3 个 source 子目录
- **AND** 每个 source 子目录 SHALL 含 `websearch.json`/`page.md`/`meta.json`

#### Scenario: Rerun classification returns new topic to normal execution

- **WHEN** a sanctioned rerun adds a topic with no historical Wave0 or Wave1 coverage
- **THEN** the phase docs SHALL route it through the same normal delegated demand, actor execution, submit, reference materialization and gate sequence as an initial topic
- **AND** existing covered topics SHALL remain classified as reuse rather than being redundantly rerun

#### Scenario: Rerun action:supplement respects existing cache
- **WHEN** HITL2 rerun 触发 `action: supplement` 补充已有 topic
- **AND** 该 topic 已有 cache 目录
- **THEN** 补充的 source SHALL 追加到已有 cache 目录（不覆盖）
- **AND** 文件名 SHALL 不与已有 source 冲突（继续递增 NN）

#### Scenario: Rerun added topic cannot bypass provenance with direct artifact

- **WHEN** a rerun-added topic has a Wave0 `source.yaml` but no valid submitted work-unit coverage
- **THEN** the phase SHALL treat the topic as incomplete and route new real work through delegated demand plus work-unit submit
- **AND** it SHALL NOT request a rerun-specific gate exception or count the orphan artifact as historical coverage

#### Scenario: Phase Agent fallback uses generated starter and dry-submit

- **WHEN** a rerun-added topic receives an accepted `phase_agent_fallback` work unit
- **THEN** the Phase Agent SHALL use the generated task/beacon/result starter rather than inventing binding fields
- **AND** it SHALL run side-effect-free dry-submit and repair the same candidate before formal submit
- **AND** only formal submit SHALL create ledger coverage

### Requirement: Wave phases SHALL teach the work-unit drain loop

Wave0, Wave1, and Wave2 phase Markdown SHALL teach the delegated-work loop as queue demand claim, work-unit execution, submit, ledger append, and gate aggregation. Phase docs SHALL say that multiple work units may be claimed and submitted before the gate runs.

#### Scenario: phase doc explains aggregate gate

- **WHEN** a Phase Agent reads a wave phase doc
- **THEN** it SHALL see that the wave gate runs after queue demand and in-flight work units are drained

### Requirement: Gate failure SHALL refill through work units

Wave phase docs SHALL state that gate failure creates repair/refill queue demand that re-enters the same work-unit loop. Gate failure SHALL NOT introduce another delegated mechanism.

#### Scenario: gate repair returns to claim loop

- **WHEN** a wave gate reports missing delegated coverage
- **THEN** the phase instructions SHALL route repair through queue refill and new work-unit claim

### Requirement: Work-unit role guidance SHALL be Phase-Agent-loaded guidance

Role guidance SHALL remain work-unit Sub-agent task guidance. The Phase Agent SHALL load the role guidance selected by the current wave's registered work-unit kind so it can construct demand and interpret returned Engine feedback, while the Engine-derived generated task/spawn prompt SHALL also give the selected actor the same canonical role-guidance ref and resolved read path. The actor SHALL read that guidance and its explicit shared guidance refs before executing search, fetch or output authoring. Role guidance SHALL remain subordinate to the current assignment's exact required_outputs[] and SHALL not turn supplementary work into an implicit primary pair.

Active phase docs SHALL not instruct the Phase Agent to load non-work-unit role protocols as production execution protocol, manually copy a role template into each spawn prompt, choose an arbitrary role file or author direct-contract semantics. The Phase Agent retains queue/claim/dry-submit/repair/submit responsibility; direct role delivery SHALL not give the actor lifecycle, Gate, user-interaction or contract-selection authority.

#### Scenario: role guidance uses work-unit protocol

- **WHEN** delegated task guidance is loaded by the Phase Agent or selected actor
- **THEN** it SHALL describe the same work-unit task/result/receipt expectations and role-specific research/output responsibilities
- **AND** the generated task SHALL bind both readers to the canonical role selected from the registered work-unit kind

#### Scenario: Phase Agent does not hand-author actor contract delivery

- **WHEN** the Phase Agent receives a claim result with generated task and spawn prompt
- **THEN** it SHALL pass the generated actor surface without rewriting headings, role identity or fallback tiers
- **AND** it SHALL run the existing dry-submit/replacement loop after actor return rather than repair actor-owned semantic output or ask the user to operate it

### Requirement: Wave phase bodies SHALL teach batch-poll-submit loops and Phase-owned reference materialization

Wave0, Wave1, and Wave2 phase Markdown SHALL describe delegated work as a
continuous Phase Agent loop: fill queue demand, reconstruct current in-flight
work from bundle truth, claim eligible independent work units as bounded
top-up batches where applicable, spawn bounded Sub-agents, actively poll
runtime work-unit readiness, submit ready attempts, repair or terminalize
rejected/expired attempts, materialize Phase-owned projections where the Phase
owns consumer presentation after successful submit, and run the phase gate only
after queue demand and delegated in-flight work are drained.

After the existing `fail_and_replace` disposition reaches its authorized
terminal boundary, phase Markdown SHALL instruct the Agent to terminalize the
current attempt through the existing terminal operation and invoke
`operate-work-unit replace` for that terminal work ID. For a newly created or
queued successor, it SHALL then perform the existing exact-role native probe
and `operate-work-unit claim`; for an already in-flight idempotent successor,
it SHALL reconstruct and poll the disclosed existing work ID without a second
claim. It SHALL not hand-author an allegedly equivalent replacement task card,
infer a successor queue ID, discover a work ID from the filesystem, rewrite
terminal status, or bypass ordinary claim.

Wave0 and Wave1 phase bodies SHALL not present `claim --count 1` as the normal
strategy for independent Topics. After each successful Wave1 submit, the Phase
Agent SHALL first complete or repair the valid current Phase-owned depth review
bound to the submitted work-unit rows, then run the current Topic's
reference-convergence inspect. It SHALL consume the exact target returned by
that inspect rather than deriving a filename. Wave1's post-review closeout loop
SHALL teach one ordered convergence decision rather than a second controller:
canonical materialize/persist only from the primary hint's exact submitted
backing; then sync the flat index; then update only affected Seed Topic
navigation through the existing packet writer; then rerun the same Wave1
inspect. It SHALL defer only the closeout evaluator's un-emitted later
index/floor outcomes until that rerun, and SHALL keep separately evaluated
primary findings visible rather than using them to claim, supplement, or edit
delegated authority. If no depth-review, projection, or index repair exists,
the loop either continues a disclosed existing supplementary demand or forms
one ordinary supplementary demand for a true floor deficit before returning to
claim/poll/submit. Wave2 retains its existing backed-pure-synthesis versus
targeted-evidence materialization split.

#### Scenario: Wave1 post-submit loop completes depth review before ordered closeout

- **WHEN** a Wave1 Phase Agent completes a successful submit with accepted backing
- **THEN** the phase body SHALL direct it to complete or repair the valid current
  depth review before its first reference-convergence inspect
- **AND** it SHALL not direct materialization, index synchronization, Seed
  navigation mutation, or supplementary acquisition as a substitute for that
  review

#### Scenario: Wave1 post-submit loop follows ordered closeout

- **WHEN** a Wave1 Phase Agent completes a successful submit and receives a
  convergence materialization root with exact canonical target/backing
  coordinates
- **THEN** the phase body SHALL show the exact candidate-bound
  materialize/persist -> index sync -> packet ref refresh when needed -> same
  inspect loop
- **AND** it SHALL not ask the Agent to infer filename/count/index order from
  source code, secondary diagnostics, or separate checkers

#### Scenario: phase gate waits for queue and in-flight drain

- **WHEN** a phase has unclaimed delegated queue demand or reconstructed
  delegated attempts still in flight
- **THEN** phase guidance SHALL instruct the Agent to keep polling, submitting,
  repairing, terminalizing, or claiming bounded top-ups as appropriate
- **AND** it SHALL not run the phase gate as if delegated work were complete

#### Scenario: Wave1 materializes references after submit

- **WHEN** a Wave1 work unit submits evidence summary, question list, and
  accepted source/cache/degraded-capture backing successfully
- **THEN** the Wave1 phase body SHALL instruct the Phase Agent to complete valid
  depth review and invoke the convergence-guided Phase-owned reference closeout
  before gate
- **AND** it SHALL not require a Sub-agent to be the canonical producer of
  consumer reference files

#### Scenario: Wave0 and Wave1 phase docs teach batched delegated claim

- **WHEN** independent Wave0 or Wave1 demand is eligible to claim
- **THEN** phase guidance SHALL use bounded top-up batch claims as the normal
  posture
- **AND** it SHALL not present `claim --count 1` as the default independent
  Topic strategy

#### Scenario: phase docs teach active polling after spawn

- **WHEN** delegated work has been spawned
- **THEN** phase guidance SHALL actively poll the disclosed runtime/work-unit
  state and submit ready results
- **AND** it SHALL not assume chat completion is an accepted attempt

#### Scenario: phase docs reconstruct in-flight work before claiming

- **WHEN** a Phase resumes with delegated attempts already in flight
- **THEN** it SHALL reconstruct those attempts from bundle truth before a new
  claim
- **AND** it SHALL not create a duplicate claim for the same demand

#### Scenario: terminal replacement returns to the location-correct existing boundary

- **WHEN** an authorized `fail_and_replace` path reaches a terminal attempt
- **THEN** phase guidance SHALL terminalize it through the existing operation,
  use `operate-work-unit replace`, and then claim or reconstruct the disclosed
  successor as its location requires
- **AND** it SHALL not hand-author a replacement card or infer a work ID

#### Scenario: Wave2 pure synthesis materializes existing-backed cross references

- **WHEN** accepted prior evidence supports a Wave2 pure-synthesis reference
- **THEN** Wave2 guidance SHALL preserve its existing Phase-owned
  existing-backed `00-cross-*` materialization path
- **AND** newly fetched evidence SHALL still use targeted-evidence submission

### Requirement: Wave phase docs SHALL teach canonical gate-consumable refs and roles

Wave phase docs SHALL teach the same direct artifact shapes that gate/inspect
helpers consume without reproducing large validator implementations. Wave0,
Wave1, and Wave2 SHALL load `templates/seed-topic-template` through their
actual requires chain as the pure Seed Topic document-shape contract; the
existing `command_playbook/operate-topic-state.md` remains the sole complete
Projection Packet execution contract. Phase bodies shall retain only
Wave-local authority, queue/submit sequence, concrete artifact guidance, and
the command checkpoint. They SHALL not instruct Agents to discover headings,
replace tokens by hand, edit a seed directly, or build a local return-map
validator.

Wave1 docs SHALL separately load `shared/shared-reference-template` as the
pure reference document-shape contract. That template shall teach the accepted
metadata/body shape, canonical locator input/output, current versus legacy
path distinction, candidate-exact metadata/body submitted-backing boundary, and
materialization timing. It SHALL not become a Projection Packet, index writer, evidence authority,
counting algorithm, queue controller, or gate parser. The Wave1 phase body
shall point to the one `sync-reference-index` operation and existing
`operate-topic-state` packet writer at their respective legal decision points.

After successful submitted work or accepted finding materialization, each Wave
phase SHALL teach its existing closeout loop: read direct authority; form a
retained Projection Packet where the Wave owns Seed Topic navigation; invoke
the legal writer in its route-bound window; run the corresponding
side-effect-free non-routing inspect; and repair the smallest named
packet/authority root before completion evidence or formal gate. For Wave1,
the reference convergence result provides the root-first materialize/index/
supplementary distinction. Evidence-bearing refs continue to use concrete
existing `reference/*.md` navigation first, with artifact/cache/work-unit paths
as secondary provenance only.

#### Scenario: Wave1 docs expose one locator and one index operation

- **WHEN** a Phase Agent reads Wave1 reference closeout guidance
- **THEN** it SHALL see the current canonical locator, submitted-backing
  boundary, index synchronization operation, Seed packet writer, and same
  inspect rerun
- **AND** it SHALL not see a competing `0N-*`/`NN-wave1-*` naming rule, a
  manual index-edit protocol, or an instruction to derive a glob count

#### Scenario: reference template remains a document-shape owner

- **WHEN** an Agent reads the shared reference template
- **THEN** it SHALL learn which reference parts are fixed structure and which
  fields/body content the Phase Agent fills from submitted backing
- **AND** it SHALL not be told that template completion creates submitted
  evidence, queue demand, gate pass, or a Seed Topic packet

#### Scenario: phase docs keep artifact authority separate from projection

- **WHEN** a Phase Agent reads Wave1 artifact/reference guidance
- **THEN** it SHALL see that submitted work, index, and ledger remain authority
  while references and Seed entries are navigation projections
- **AND** it SHALL not treat a packet, reference file, or index row as evidence
  coverage by itself

#### Scenario: Wave closeout uses the one legal writer

- **WHEN** a Wave-owned Seed Topic navigation projection must change
- **THEN** phase guidance SHALL form the accepted Projection Packet and invoke
  the route-bound `operate-topic-state` writer
- **AND** it SHALL not direct raw seed edits or invent another writer

#### Scenario: Wave0 closeout enumerates one result-declared source array

- **WHEN** Wave0 closes a submitted source-intake result
- **THEN** Phase guidance SHALL enumerate its one submitted declared source
  array through the existing authority path
- **AND** it SHALL not reconstruct an alternate candidate source list

#### Scenario: Wave0 closeout preserves the one legal writer

- **WHEN** Wave0 needs to refresh a Seed Topic projection
- **THEN** it SHALL retain the existing packet/writer sequence
- **AND** it SHALL not write Seed Topic state directly from a reference/index
  surface

#### Scenario: Later Waves do not inherit Wave0 candidate rules

- **WHEN** Wave1 or Wave2 guidance consumes a prior Wave0 projection
- **THEN** it SHALL use the relevant submitted/projection authority for that
  Wave
- **AND** it SHALL not treat Wave0 candidate authoring rules as a general
  evidence-acceptance path

#### Scenario: Heading card gives the backfiller one constrained action

- **WHEN** a phase handoff/backfill card is shown to an Agent
- **THEN** it SHALL name one bounded legal action and its authoritative input
- **AND** it SHALL not make the Agent discover headings, tokens, or a writer
  from unrelated prose

#### Scenario: Wave1 atomically handles its multiple owned slots

- **WHEN** Wave1 changes multiple Phase-owned navigation slots for one Topic
- **THEN** it SHALL use the existing packet/writer transaction for those slots
- **AND** it SHALL not leave direct partial Seed Topic edits as an alternate
  success path

#### Scenario: Inspect precedes completion evidence

- **WHEN** a Wave Phase believes its materialization/backfill work is complete
- **THEN** it SHALL run the side-effect-free corresponding inspect before
  recording completion evidence or invoking the formal gate
- **AND** it SHALL repair the named root through the same loop first

#### Scenario: Missing writer is an honest boundary

- **WHEN** feedback identifies a surface with no accepted legal writer
- **THEN** phase guidance SHALL expose the owner or missing-contract boundary
- **AND** it SHALL not instruct a raw edit, fake receipt, or user-operated
  workaround

#### Scenario: Phase docs keep artifact authority separate from projection

- **WHEN** Phase guidance describes an artifact alongside its reader-facing
  projection
- **THEN** it SHALL identify the submitted/runtime authority separately from
  the navigation/document view
- **AND** it SHALL not make the projection a competing acceptance authority

#### Scenario: Wave1 docs bind required paths to roles

- **WHEN** Wave1 guidance describes delegated outputs
- **THEN** it SHALL use the Engine-projected path/role contract and result
  schema
- **AND** it SHALL not infer required outputs from reference filenames or prose

#### Scenario: Depth-review example uses canonical ref spelling

- **WHEN** Wave1 docs show a concrete reference in depth-review/closeout
  context
- **THEN** it SHALL use the current canonical full-slug locator spelling
- **AND** it SHALL not teach a legacy `NN-wave1-*` file as current coverage

#### Scenario: Return-map docs prioritize reference navigation

- **WHEN** Phase guidance names return-map or navigation references
- **THEN** it SHALL use concrete existing `reference/*.md` navigation first
- **AND** artifact/cache/work-unit refs SHALL remain secondary provenance

#### Scenario: Wave2 docs preserve cross-reference authority split

- **WHEN** Wave2 guidance describes a `00-cross-*` reference
- **THEN** it SHALL distinguish existing-backed Phase projection from newly
  fetched targeted evidence
- **AND** it SHALL not make an index/source-layer label sufficient backing

#### Scenario: Phase docs expose deterministic repair shape

- **WHEN** a Phase document presents a deterministic inspect/gate failure
- **THEN** it SHALL consume the Engine-provided missing fact, write coordinate,
  repair kind, and rerun checkpoint
- **AND** it SHALL not duplicate evaluator logic in Markdown

#### Scenario: Phase Agent runs inspect before completion evidence

- **WHEN** the Phase Agent completes a Wave-local repair
- **THEN** it SHALL rerun the same inspect before adding completion evidence
- **AND** it SHALL not use a prior green result after changed direct facts

#### Scenario: Phase Agent repairs from one inspect root cause

- **WHEN** inspect returns one nearest direct root with an existing legal
  repair path
- **THEN** the Phase Agent SHALL repair that root and rerun the same checkpoint
- **AND** it SHALL not begin competing speculative repair branches

#### Scenario: Wave2 docs expose current finding contract

- **WHEN** Wave2 guidance describes a finding/index repair
- **THEN** it SHALL point to the current accepted finding contract and its
  authoritative evidence boundary
- **AND** it SHALL not treat stale prose/return-map text as a second contract

### Requirement: Wave0 and Wave1 fetch targets SHALL follow profile floors plus conservative margin

Wave0 and Wave1 phase guidance SHALL derive delegated fetch/source candidate
targets from explicit profile/runtime floors plus a conservative small margin.
The margin absorbs duplicates, inaccessible pages, and non-countable sources;
it SHALL not change gate thresholds, reduce required coverage, or become a
hidden quality override.

Wave0 guidance SHALL bind source-intake target planning to explicit
`rb_profile.yaml#/research_style_params` Wave0 floors. Wave1 guidance SHALL
bind initial Topic-deepening target planning to explicit Wave1 floors and
new-source floor semantics, including `wave1_per_topic_ref_floor` and
`topic_unique_ratio` where the depth-review contract uses them. A plan target
is not proof that the reference floor lacks an already submitted backing
projection: after submit, convergence must first distinguish canonical
materialization and index repair from a true need for more evidence.

Active Wave0/Wave1 phase docs SHALL not instruct Agents to use fixed hard-coded
fetch aims unless the number is explicitly derived from active profile/runtime
floor plus a named margin. The margin SHALL remain a planning heuristic, not a
new profile field, gate parameter, quality threshold, or hidden over-fetch
policy. When feedback reaches a true post-projection Wave1 floor deficit,
repair SHALL use the existing supplementary work-unit path with its optional
snapshot-bound objective rather than relying on hidden over-fetching.

#### Scenario: Wave1 target reads profile and convergence preserves repair order

- **WHEN** the Phase Agent prepares Wave1 topic deepening or receives a low
  current reference count after submit
- **THEN** guidance SHALL use profile-bound floor-plus-margin planning for
  initial acquisition and convergence for post-submit repair classification
- **AND** it SHALL not turn a materializable reference/index defect directly
  into another search target

#### Scenario: hard-coded over-fetch aim is rejected

- **WHEN** active Wave0/Wave1 phase or Sub-agent guidance says to fetch a fixed
  number of URLs not tied to an explicit profile/runtime floor plus margin
- **THEN** static tests or hygiene SHALL fail
- **AND** diagnostics SHALL require profile-bound floor-plus-margin wording

#### Scenario: true gate repair still uses supplementary work units

- **WHEN** formal gate or inspect reports a true reference-floor shortfall
  after current projection and index repair are exhausted
- **THEN** phase guidance SHALL route repair through supplementary work-unit
  queue demand
- **AND** it SHALL not silently lower floors or treat the margin as pass
  authority

#### Scenario: Wave0 target reads profile floor

- **WHEN** the Phase Agent plans Wave0 source intake
- **THEN** guidance SHALL derive its target from explicit active Wave0
  profile/runtime floor plus a named conservative margin
- **AND** it SHALL not use a fixed hidden fetch count

#### Scenario: Wave1 target reads profile and novelty floor semantics

- **WHEN** the Phase Agent plans initial Wave1 topic deepening
- **THEN** guidance SHALL read explicit Wave1 reference and new-source floor
  semantics from the active profile/runtime facts plus margin
- **AND** it SHALL keep planning targets distinct from post-submit convergence
  verdicts

#### Scenario: margin is not promoted into a new threshold

- **WHEN** a conservative acquisition margin is used for Wave0 or Wave1
- **THEN** it SHALL remain planning guidance only
- **AND** it SHALL not become a profile field, gate threshold, hidden override,
  or pass condition

#### Scenario: gate repair still uses supplementary work units

- **WHEN** a direct Wave0/Wave1 floor or submitted-backing repair remains after
  the relevant direct checks
- **THEN** phase guidance SHALL use the accepted supplementary work-unit path
  where that contract requires additional evidence
- **AND** it SHALL not silently reduce an accepted floor

### Requirement: Wave delegated drain loops SHALL route timeout through progress-aware preflight

Wave0, Wave1, and Wave2 phase Markdown SHALL instruct the Phase Agent to run progress-aware timeout preflight before terminalizing a delegated claimed work unit as timed out. Phase guidance SHALL not tell the Agent to close a claimed delegated attempt with `operate-work-unit timeout` solely because the initial wall-clock `deadline_at` has elapsed.

The delegated drain loop SHALL reconstruct in-flight work from bundle truth, actively poll or inspect work-unit readiness, submit ready attempts, repair rejected or repairable attempts, and use `timeout-preflight` for expired or stale attempts before terminal timeout. The Phase Agent SHALL follow preflight advice: submit submit-ready results, repair repairable same-`work_id` candidates, wait or continue polling recent-progress attempts, inspect/block invalid bindings, and call timeout only when preflight reports timeout-eligible or an explicit audited force timeout is chosen. Because false timeout eligibility exits non-zero by design, phase guidance SHALL tell the Agent to parse structured `timeout-preflight` stdout before deciding the next action.

Force timeout SHALL be documented as exceptional. Phase guidance SHALL NOT present `timeout --force` as the normal response to progress-positive work. If preflight recommends `block` or reports invalid binding, phase guidance SHALL direct the Phase Agent to inspect/repair through Engine tooling or preserve the smallest deterministic blocker in Agent-facing feedback rather than forcing timeout to make the phase drain. Because every Wave is `stop: no`, `block` and blocker feedback SHALL NOT by themselves authorize a user-facing question, status output, partial delivery, approval request, or acknowledgement wait; the Phase Agent SHALL continue other eligible work or hold silently with the attempt undrained.

This timeout-preflight path SHALL preserve the existing phase boundaries: bounded top-up claim remains an Agent strategy, Sub-agents remain bounded high-I/O actors, formal submit remains the only delegated success boundary, and gates run only after queue demand and delegated in-flight attempts are drained. The guidance SHALL NOT add Engine-owned waiting, daemon polling, user-notification dependency, direct Phase-Agent search for delegated evidence, or an alternate delegated completion path.

#### Scenario: Wave0 timeout uses preflight first

- **WHEN** a Wave0 source-intake work unit appears expired or stale
- **THEN** `phase-wave0.md` SHALL instruct the Phase Agent to run `operate-work-unit timeout-preflight`
- **AND** it SHALL direct the Agent to submit, repair, wait, inspect, block, or timeout according to structured preflight advice

#### Scenario: Wave1 timeout uses preflight first

- **WHEN** a Wave1 topic-deepening work unit appears expired or stale
- **THEN** `phase-wave1.md` SHALL instruct timeout-preflight before terminal timeout
- **AND** submit/repair advice SHALL preserve same-`work_id` repair, depth review, supplementary queue demand, and Phase-owned reference materialization boundaries

#### Scenario: Wave2 timeout uses preflight first

- **WHEN** a Wave2 targeted-evidence work unit appears expired or stale
- **THEN** `phase-wave2.md` SHALL instruct timeout-preflight before terminal timeout
- **AND** the guidance SHALL preserve pure-synthesis versus targeted-evidence authority boundaries

#### Scenario: progress-positive attempts are not treated as drained

- **WHEN** timeout-preflight recommends submit, repair, wait, inspect, or block for an in-flight work unit
- **THEN** the phase guidance SHALL treat the phase as not drained
- **AND** the wave gate SHALL NOT be run as if delegated work were complete

#### Scenario: force timeout is exceptional

- **WHEN** timeout-preflight reports a progress-positive or invalid-binding attempt as not timeout-eligible
- **THEN** phase guidance SHALL NOT present `timeout --force` as the default drain action
- **AND** it SHALL instruct the Phase Agent to prefer submit, repair, wait, inspect, or Agent-facing blocker retention according to preflight advice without initiating user interaction from a `stop: no` Wave

#### Scenario: no-progress timeout still returns to REDO

- **WHEN** timeout-preflight reports a no-progress attempt as timeout-eligible
- **THEN** phase guidance SHALL allow normal `operate-work-unit timeout`
- **AND** the retry path SHALL continue through queue demand, new work-unit claim, Sub-agent execution, submit, ledger, and gate

### Requirement: Wave delegated execution SHALL use one visible actor decision loop

Wave0, Wave1, and Wave2 phase guidance and the shared work-unit protocol SHALL instruct the Phase Agent to use this order at each delegated claim decision: inspect the queue-front planned delegated role, make one small real host/native observation for that exact role, invoke the existing claim checkpoint with the normalized observation and chosen execution actor class, then either spawn a normal delegated batch, execute one explicitly allowed `phase_agent_fallback`, or stop that claim attempt on the returned no-claim blocker. Guidance SHALL NOT tell the Agent to claim a batch first and discover availability by spawning every attempt, and SHALL NOT reuse one role observation for different delegated roles.

When fallback is accepted by claim, the Phase Agent SHALL execute the single claimed work unit itself without asking the user to run work-unit commands, then submit or terminalize it before claiming another fallback. When the kind policy prohibits fallback or the blocker is an external account, host policy, or permission that the Agent cannot change, guidance SHALL identify only the smallest external-action boundary in Agent-facing feedback and preserve the same claim checkpoint. Because Wave0, Wave1, and Wave2 are `stop: no`, that blocker SHALL NOT by itself authorize a framework-initiated question, status output, or acknowledgement wait; the Agent SHALL continue other eligible work or hold silently. A relevant user-initiated normal conversation turn SHALL receive an answer from direct facts and, if it reaches that blocker, only the smallest external-action boundary without changing authority. After the external prerequisite is satisfied through an accepted surface, the Agent SHALL rerun the same claim checkpoint. `human-directed` SHALL NOT be presented as availability evidence, actor-policy override, or fallback permission.

#### Scenario: Wave0 probes before bounded source-intake claim

- **WHEN** Wave0 has independent source-intake demand and no current actor observation
- **THEN** phase guidance SHALL direct one bounded native observation before `operate-work-unit claim`
- **AND** it SHALL not create multiple claimed attempts merely to test availability

#### Scenario: Wave2 targeted evidence uses the same role-bound decision loop

- **WHEN** Wave2 has `wave2_targeted_evidence` demand
- **THEN** phase guidance SHALL observe the planned `dpt-topic-scout` actor before claim
- **AND** any accepted fallback SHALL remain a single work-unit attempt under the kind actor policy

#### Scenario: Phase Agent executes accepted fallback mechanically

- **WHEN** claim returns work units bound to `phase_agent_fallback`
- **THEN** the Phase Agent SHALL read each generated task/beacon, perform the bounded work, emit actor-bound receipts, and run dry-submit/formal submit
- **AND** it SHALL submit or terminalize that attempt before claiming another fallback
- **AND** it SHALL not ask the user to execute those ordinary commands

#### Scenario: External host blocker escalates minimally

- **WHEN** the delegated actor is unavailable, fallback is not selected, and resolution requires a non-delegable host/account action
- **THEN** guidance SHALL identify only that external action or decision as the Agent-facing escalation boundary
- **AND** in a `stop: no` Wave the classification alone SHALL NOT authorize a user question, status output, or acknowledgement wait
- **AND** after the prerequisite is satisfied through an accepted surface, the Agent SHALL rerun the same claim checkpoint itself

### Requirement: Work unit index record SHALL carry Engine-owned rerun_count

`operate-work-unit claim` SHALL read the current `rerun_count` from `rb_profile.yaml` and write it into the work unit index record's `rerun_count` field at claim time. The field SHALL be a non-negative integer or absent (legacy records). This field SHALL be Engine-owned — the Agent SHALL NOT write or modify it.

`operate-work-unit inspect` SHALL accept an `--eligible-rows` flag. When present, it SHALL return all submitted rows for the bundle whose index `rerun_count` matches the current profile `rerun_count`, validated through ledger/index/manifest/queue-snapshot/canonical-topic binding. Each returned row SHALL include `work_id`, `result_path`, `rerun_count`, and resolved topic binding. Legacy rows without `rerun_count` in the index record SHALL be treated as `legacy_unbound` and excluded from eligible rows (they are not current-round authority).

#### Scenario: Claim stamps current rerun_count into index

- **WHEN** profile `rerun_count` is 2 and `operate-work-unit claim` creates a new work unit
- **THEN** the index record SHALL have `rerun_count: 2`
- **AND** the Agent SHALL NOT be able to modify this field

#### Scenario: Eligible rows filtered by round

- **WHEN** a bundle has submitted rows with index.rerun_count values 1, 2, and one legacy row without the field
- **AND** profile `rerun_count` is 2
- **THEN** `operate-work-unit inspect --eligible-rows` SHALL return only the row with `rerun_count: 2`
- **AND** legacy rows and round-1 rows SHALL be excluded

### Requirement: Wave2 finding SHALL carry created_in_rerun_count

`finding-index.yaml`'s per-finding contract SHALL include an optional `created_in_rerun_count` field (non-negative integer). The Phase Agent SHALL write this field when creating new findings in Wave2 synthesis, reading the current value from `rb_profile.yaml`. Existing findings without this field SHALL be treated as `legacy_unbound` — they SHALL always be included in projection and authority verification regardless of round.

#### Scenario: New finding carries round marker

- **WHEN** Wave2 synthesis creates finding W2F-015 in round 2
- **THEN** the finding SHALL have `created_in_rerun_count: 2`

#### Scenario: Legacy finding without round marker is preserved

- **WHEN** a pre-v0.29 finding has no `created_in_rerun_count` field
- **AND** Wave2 authority verification runs in round 2
- **THEN** the finding SHALL be treated as legacy_unbound and included in verification
- **AND** no blocking finding SHALL be produced solely due to the missing field

### Requirement: Wave phases SHALL operate one receipt-bound carried-target loop

Wave1 guidance SHALL direct the Phase Agent, after reading submitted evidence, question-list reasoning, current Topic/profile, and optional user controls, to make the semantic carry-forward decision in the Phase-owned depth review. The review SHALL contain an explicit `carried_targets` declaration, which MAY be empty; prose, a slug-looking target ID, or a question-list line outside that declaration SHALL not create carry-forward authority.

The declaration SHALL NOT weaken the existing `decision: accept` requirement for Wave1 submitted evidence, source floors, cache mapping, depth dimensions, or profile checks. It records only what remains material for Wave2 after those existing direct facts are satisfied.

Wave2 guidance SHALL direct the Agent to consume the receipt from the exact routed Wave1 Gate handoff, bind its selected targets only in the existing finding index, and use existing finding decision/gap-status routes for resolution, new targeted evidence, limitation, `defer_hitl2`, `requires_internal_data`, or `record_only`. It SHALL not reread a mutable depth review as a second parent, hand-edit trace, or ask the user to perform ordinary repair.

#### Scenario: empty declaration keeps the normal Wave2 path
- **WHEN** Wave1 explicitly declares `carried_targets: []`
- **THEN** the Wave1 receipt contains an empty selected set
- **AND** Wave2 has no added target-binding work while its existing synthesis contract remains active

#### Scenario: missing target binding repairs the existing consumer
- **WHEN** Wave2 inspect reports receipt targets without valid finding bindings
- **THEN** the Phase Agent repairs `artifacts/wave2/finding-index.yaml` and reruns the same inspect/Gate
- **AND** it SHALL not invent a new queue authority or user checkpoint
