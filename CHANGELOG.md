# Changelog

## v0.38

- Bound current delegated assignments to an Engine-derived, versioned exact-output contract and validate fresh bounded Wave0/Wave1 direct facts at dry-submit, timeout preflight, and first acceptance with exact canonical roles.
- Added explicit primary/supplementary Wave1 assignment intent, a narrow repair for genuinely mode-absent unclaimed cards, and root-first same-attempt or fresh-ID replacement guidance without automatic retry.
- Reused one neutral direct-output evaluator across candidate and Wave adapters while preserving replay history and phase-wide provenance, count, depth, return-map, and completeness authority at Wave Gates.

## v0.37

- Hardened production and disposable bundle creators with strict pre-write argv parsing: standalone help is zero-write, malformed names/options are rejected before target creation, and duplicate options cannot silently select a later value.
- Preserved literal `--target-dir` paths by passing derived bundle paths to validation and inspection as child-process arguments, while retaining production no-overwrite and disposable collision/force behavior.

## v0.36

- Centralized the Agent-facing seed-topic skeleton/rerun direction and return-map authoring contracts, while keeping the deterministic renderer, submitted facts, and existing Wave inspect as their respective authorities.
- Made sanctioned rerun add/update/direction-only candidates publish canonical direction through the existing atomic topic-state transaction; rerun-ready now checks plan-bound structural direction and profile-count synchronization without semantic scoring.

## v0.35

- Made Wave seed return-map inspection section-scoped and entry-local, so fields, lineage, refs, and optional projection identity cannot be borrowed across Waves, headings, or sibling entries.
- Enforced exact current-round per-row Wave0/Wave1 projection or identity-bound disposition, plus per-finding/per-topic Wave2 projection with current blocking and legacy advisory behavior.
- Unified Wave inspect inputs around one canonical topic-registry fact, one normalized submitted ledger/index reader, and narrow fail-closed projection prerequisites without expanding formal Gate ownership or full work-unit/topic-state health checks.

## v0.34

- Added Agent Experiment Autorun: the Autorun Supervisor now starts one real Headless Playbook Agent per manifest-selected case, validates the playbook-owned native completion, runs declared health checks, and durably audits or cleans only eligible run roots.
- Added strict run-context, bundle-role, native-completion, prompt/transcript, trace-prefix, and Subject-evidence contracts so PASS, health, lifecycle, cost, and cleanup remain independently auditable.

## v0.33

- Added pre-trigger DeepSeek Claude Code launcher at `DPT_FRAMEWORK/host_tools/claude-deepseek.mjs` that reads three required values from repo-root `.env`, isolates inherited provider environment, validates endpoint URL format, and launches `claude` with transparent argument/stdio/exit-code passthrough.

## v0.32

- Iterative research now uses recommendation-first HITL1 and HITL2 decisions around silent autonomous execution, answers current user-initiated turns without adding authority, keeps Final terminal, and makes lifecycle cues initiation-aware while successful claims stay action-only.
- Rerun availability and research-style projection now have one deterministic interpretation each, and accepted post-Final reruns preserve continuous Gate, handoff, status, and recovery ownership without new control state.

## v0.31

- Wave2 now derives normalized structured pair facts from canonical Topic identity, keeps ordinary reduced coverage compatible, and requires the exact full canonical pair universe only for activated rerun `action:add`.
- Wave0/Wave1/Wave2 inspect and formal Gates now share a degradation-ineligible global queue-quiescence rule over `active_window`, `refill_pool`, and `delegated_in_flight`, with root-first existing-owner feedback and no new queue state or controller.
- Work-unit receipts retain strict lifecycle identity while optional diagnostic `detail` accepts keyed objects or human-readable strings; generated tasks, spawn prompts, shared protocol, and active roles now distinguish assigned receipt JSONL from optional `log-event.mjs` diagnostics.

## v0.30

- Bundle instantiation stamps `framework_version` into `rb_plan.md` frontmatter at creation (sourced from the CHANGELOG version authority, VEM-001), recording the irreplaceable framework version a bundle was created under.

## v0.29

- Phase-rerun binds `## 本轮重跑方向` to target_rerun_count with crash-safe recovery; shared direction resolver (matching/stale/future/legacy_unbound/invalid) used by Wave classification and checkRerunAddFullSynthesis.
- Work unit index record carries Engine-owned `rerun_count` stamped at claim time; `operate-work-unit inspect --eligible-rows` returns current-round submitted rows for Agent consumption.
- Wave phases rebuild seed projection sections from current-round submitted authority instead of grep-replace tokens; per-row authority reference verification with explicit no-projection disposition detection.
- Wave1 and Wave2 implement existing RWP-014 classification (Classify Direct Facts mirroring Wave0 §3.0).
- Wave2 finding-index per-finding carries `created_in_rerun_count` for round identification; legacy findings produce advisory feedback not blocking.

## v0.28

- Routed rerun-added Topics back through the normal Wave0/Wave1 queue, work-unit, submit, reference, depth-review, and Gate pipeline while preserving valid historical submitted coverage.
- Added root-first `hints[]` across all formal Gates and Wave inspect commands so each independent blocker names the direct missing fact, legal action surface or Engine operation, and exact same-check rerun.
- Simplified blocking control by tolerating equivalent Markdown presentation, narrowing reference countability to accepted status plus parseable source URL, deriving depth facts from reviewed submitted rows, and short-circuiting dependent symptoms.
- Allowed Wave1 supplementary attempts to cite exact same-Topic/same-wave/same-kind prior submitted `evidence_summary` outputs without redeclaring them, while keeping current cache/source claims strict.
- Added one explicit existing-owner `recover-declaration` operation that restores only a hash-identical missing row for an already-submitted attempt; no hand-written provenance, shadow ledger, rerun-specific Gate path, controller, or lifecycle was added.

## v0.27

- Added one audited post-Final rerun operation that binds the latest legal Final lineage to the existing HITL2 `rerun` route while preserving Final as terminal delivery history.
- Added event-last, hash-bound `inspect|apply|recover` with exact roll-forward recovery through the existing trace writer, entry/status owners, and canonical topic-state transaction.
- Kept recovery narrow and helper-oriented: no generic override/state-seed, identity or authorization subsystem, Final loop, second lifecycle/status/topic/trace owner, or addendum success namespace.

## v0.26

- Added canonical topic rename, reorder/renumber, and narrowly proven safe remove through one complete rerun layout target while preserving stable topic UIDs.
- Added one shared UID/layout resolver so current and previous slugs retain historical submitted coverage without moving artifact/reference/output paths or rewriting ledger history.
- Kept mutation narrow and recoverable: the existing topic-state CLI and plan+seed workspace commit current seeds first, registry last, then hash-bound old-seed cleanup; no retired state, link rewriter, path mover, second registry, or post-final override.

## v0.25

- Added role-bound actor preflight before work-unit allocation, so unavailable or unobserved delegated actors do not create doomed work IDs or consume queue demand.
- Added explicit single-work-unit `phase_agent_fallback` inside the existing envelope and submit transaction, with actor-bound result/receipt validation and full ledger provenance.
- Kept control narrow: no host-authenticated availability claim, probe service, token, TTL, registry, fallback queue, scheduler, daemon, watcher, or global actor mode.

## v0.24

- Added canonical topic UIDs and minimum durable intent under the single `rb_plan.md#/topic_registry` owner, with explicit legacy migration and UID-bound seed projections.
- Added one `inspect|apply|recover` topic-state CLI with lifecycle authorization, crash-safe plan+seed commit, explicit recovery, and direct-fact progress projection.
- Kept the change narrow: no progress ledger, queue schema migration, remove/rename/renumber, path migration, post-final reentry, override, watcher, daemon, or generic transaction controller.

## v0.23

- Added one crash-safe artifact persistence workspace, helper, and two-operation CLI for completed staging files under `reference/`, `artifacts/`, `final/`, and producer-owned `_cache/`.
- Added absent/SHA-256 compare-and-swap commit plus quiescent sweep verdicts for prepared finalization, stale-workspace cleanup, and non-destructive blockers.
- Kept persistence mechanical and helper-oriented: staging stays available, the Agent performs single-workspace cleanup/retry, and submit, provenance, gate, trace, control state, and delivery authority remain unchanged.

## v0.22

- Added read-only canonical topic-footprint findings and `check-reentry` schema `1.1.0` recovery summaries with one root projection and reachable/missing-contract feedback.
- Fixed H1-tolerant Wave0 metadata inspection and balanced bold return-map field labels without weakening canonical enum/reference checks.
- Unified submit, gate/depth, file-observability, and Agent-facing cache leaf contracts under one Engine-owned base-files/source-mapping projection.

## v0.21

- Added paired Evolution Directions for simple reliable control and helper-oriented Agent responsibility, keeping accepted specs and executable runtime truth authoritative.
- Clarified that ordinary authorized commands and reversible mechanical repair remain Agent-owned while human-directed context identifies decision source without creating permission or missing Engine capability.
- Reconciled HITL2 phase/shared projections and controlled proofs with the current five recorded actions, passing no-transition decisions, deterministic readiness/rerun handoffs, and terminal Final semantics.

## v0.20

- Added a human pre-trigger setup path for install, Claude Code/Codex permission posture, verification, and DPT_FRAMEWORK entry without turning the autonomous pipeline into a human co-runner flow.
- Tightened user-facing language guidance for HITL dynamic content and Final delivery while preserving silent `stop:no`, Final evidence, and host-permission authority boundaries.

## v0.19

- Gate results, `enter-phase`, covered `advance-status`, and successful work-unit claims now expose short Agent-facing continuation cues at decision points.
- Continuation cues are direct projections only: they add no persistent state and do not replace routing, status, entry/load witnesses, work-unit submit, gate authority, or final delivery evidence.
- `enter-phase` successful Markdown stdout is now written synchronously so the final cue block is durable even for large loaded-node output.

## v0.18

- HITL1 now performs a bounded real search/fetch capability probe before silent waves; unavailable or unprobed research access fails closed at HITL1 instead of drifting into Wave0.
- `rb_profile.yaml` now records a strict `research_access` observation, and `ProfileSchema` validates available/unavailable/unprobed branches without treating probe output as research evidence.
- `apply-research-style.mjs` now preserves unrelated profile sections, including HITL decisions, rerun context, and research-access observations, while replacing only style fields.
- `hitl1-recorded` reuses the existing `field_value` rule path to require `research_access.status: available`, with deterministic tests and a real-Agent canary covering the new fail-fast boundary.

## v0.17

- Wave0/Wave1/Wave2 formal gates and inspect commands now reuse one explicit pure evaluator per wave for artifact, provenance, reference, and accepted floor checks; lifecycle, routing, degraded handoff, attempts, checkpoints, and durable diagnostics remain formal-only.
- Delegated-bypass handling now uses a pure shared scan with at-most-once formal trace/log emission, while inspect remains full-bundle no-write and always reports the raw contract result without degraded pass.
- Wave1 depth-review and Wave2 finding-index checks now short-circuit dependent symptoms at the nearest missing parent/field, and harmless Markdown heading/list/URL presentation is tolerated or advisory instead of becoming a separate blocker.
- Inspect output keeps its existing `{ check, inspect, advice }` contract and adds `failed_rule_ids` plus blocking/advisory/diagnostic classification; formal Wave gate results expose additive failed/masked rule ids.
- Wave producer guidance now names canonical roles, refs, finding fields/enums, authority splits, concrete `reference/*.md` navigation, and runs the corresponding side-effect-free inspect before completion evidence and the formal gate.

## v0.16

- Work-unit timeout recovery now has explicit audited `operate-work-unit late-submit` for eligible `timed_out` attempts whose original result validates after timeout.
- Late-submit preserves the original work-unit identity, records hash-covered audit fields, removes queued retry demand or abandons unsubmitted claimed retries, and rejects submitted replacements.
- Provenance gates and controlled fault-tolerance coverage now count audited late-accepted rows only through normal submitted-ledger validation while normal `submit` stays fail-closed for terminal attempts.

## v0.15

- Delegated work-unit timeout now runs progress-aware `timeout-preflight` before terminalizing, using Engine-observed progress, dry-submit advice, and effective idle leases to recommend submit, repair, wait, inspect, block, or timeout.
- Default timeout refuses progress-positive or candidate-ready attempts without queue/index/status/ledger side effects; explicit forced timeout requires a reason and records durable audit diagnostics.
- Wave phase and Sub-agent guidance now route stale/expired delegated attempts through timeout-preflight and require concise batch-level progress receipts for slow search/fetch/cache work.

## v0.14

- Work-unit submit now has a read-only `operate-work-unit dry-submit` preflight that reports structured repair diagnostics and planned normalizations without ledger, queue, status, receipt, trace, log, transaction, or cache alias side effects.
- Wave0/Wave1 Sub-agent fetch guidance now separates per-URL fallback from multi-URL small-batch or bounded-parallel fetching, uses JS/Node-first tiers, and removes Python fetch fallback.
- Wave0/Wave1 phase guidance now derives delegated candidate targets from explicit profile/runtime floors plus a conservative planning margin, with gate repair/refill handling remaining gaps.

## v0.13

- Judgment-layer contracts now align Wave1 required-output role coverage, submit-time normalization diagnostics, and depth-review work-unit ref canonicalization across submit, gate, phase docs, and tests.
- Return-map navigation now requires evidence-bearing entries to enumerate concrete existing `reference/*.md` refs, keeps internal refs as secondary provenance, and labels inspect failures according to command pass/fail.
- Wave2 `00-cross` authority now has focused guards for submitted targeted evidence versus existing-backed Phase-owned projections, while active gate definitions are covered by a static rule-id audit.

## v0.12

- Work-unit claim now emits truthful `result.schema.json` projections for wave0/wave1/wave2, including const-bound identity, strict output/source item shapes, role enums, and omitted unsupported source fields.
- Submit now enforces assigned kind output-role contracts and required-result metadata before ledger append while preserving existing receipt/output/cache/source validation.
- Phase queue examples and hygiene now use schema-parsed `queue_item_id` task-card/result contracts, covering seed-topics and active phase Markdown drift.

## v0.11

- Repo-root agent behavior files now suppress built-in research shortcuts when `DPT_FRAMEWORK/` is the selected or relevant research entry path.
- New production and disposable bundles now use `BUNDLE_MAP.md` as the passive root map; legacy `START_FROM_HERE.md` is diagnostic compatibility only.
- Instantiation gate, inspect/reentry advice, file-observability, docs, and tests now use the bundle-map contract.

## v0.10

- Wave0/Wave1 delegated execution guidance now uses bounded top-up batch claims, active polling, submit/repair/terminalize loops, and drain-before-gate ordering for independent work units.
- Wave1 topic references and Wave2 existing-backed `00-cross` references are now Phase-owned consumer projections backed by submitted source/cache/degraded/work-unit evidence, while new fetched evidence remains ledger-bound.
- Gate, provenance, inspect, and file-observability diagnostics now distinguish projection backing drift, delegated bypass, missing index rows, and cache/source-claim mismatches.

## v0.9

- Work-unit submit now canonicalizes bounded LLM-shaped drift for result wrappers, runtime receipts, cache `page-content.md`, and constrained nonce repair while keeping ledger/receipt authority fail-closed.
- `operate-queue.mjs` and `operate-work-unit.mjs` now handle help and suspicious positional bundle arguments before runtime side effects, avoiding flag-named bundle directories.
- Phase handoff auditing and lifecycle gate coverage were hardened so failed or missing source-gate handoffs, manual status edits, and premature final files cannot authorize downstream delivery.

## v0.8

- Restored Wave1 depth contracts with per-topic depth reviews, exact new-source floors, structured source claims, supplementary repair loops, and cache-backed accepted source coverage.
- Restored Wave2 synthesis depth contracts with scan matrix, confidence triage, gap analysis, finding-index eligibility, and targeted evidence receipt checks before synthesis pass.

## v0.7

- Wave gates now support trace-durable degraded handoff for eligible repeated quality-threshold failures while runtime-truth blockers still fail closed.
- Retired historical content-similarity and URL-shape heuristics from active gates, health checks, playbooks, and Agent guidance in favor of ledger, provenance, hash, cache, and root-cause diagnostics.

## v0.6

- Runtime position and queue truth are more durable: `rb_status.json.current_node` records the loaded phase node, work-unit submit verifies queue postconditions before success, and explicit topic slugs unblock supplementary queue tasks with iteration labels.
- Repo-root `CHANGELOG.md` is the single version-history source, aligned with the `DPT_FRAMEWORK/RUN.md` banner.

## v0.5

- Autonomous work-unit return handling, provenance checks, cache evidence trails, phase-status diagnostics, and silent-execution surfacing logs were hardened around the v0.4 work-unit lifecycle.
- Wave guidance, inspect tools, and regression/playbook coverage were expanded for return-map diagnostics, premature final output detection, and cache/ledger consistency.

## v0.4

- Delegated sub-agent execution moved to the production work-unit lifecycle, with `queue_item_id` as queue demand identity and Engine-allocated `work_id` for delegated attempts.
- Phase handoff witnessing, HITL2/rerun routing, and controlled playbook coverage were tightened around route-bound `enter-phase` and source-gate `advance-status`.

## v0.3

- Agent-facing command surfaces made HITL-only interaction boundaries, terminal Final delivery, phase-boundary terminology, main-spec bridge deltas, and CLI exit-code conventions discoverable and regression-tested.

## v0.2

- Sub-agent relay logging and provenance forensics were introduced, with nonce-anchored lifecycle evidence, diagnostic gate guidance, and controlled E2E verdict records.

## v0.1

- 初始版本。DPT_FRAMEWORK 入口 `RUN.md` 支持 drag-trigger，Agent 读到即启动多阶段 gate 驱动的 Deep Research 流程。
