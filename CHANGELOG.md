# Changelog

## v0.87

- HITL1 now presents a bounded Chinese research-alignment draft before canonical
  writes. When currently answerable, independent material forks would change an
  existing research decision, the first presentation may contain at most three
  questions, each with a recommendation/default and stated impact; direct
  acceptance, natural-language correction, and explicit delegation retain the
  existing HITL1 exit.
- New run templates retain the resolved goal, object/use/scope understanding,
  material forks/defaults, and links to the accepted profile, must-answer, and
  Topic decisions in `## Goal > ### HITL1 Alignment Snapshot`. It is narrative
  reload context only and is written before the existing profile/status/topic
  path; a later canonical-write failure does not make it advancement authority.
- The Engine, PlanSchema, Gate rules, transition chain, controls literal form,
  and legacy-bundle behavior are unchanged. The existing marker scan only finds
  leftover required-fill markers; it does not validate alignment prose.

## v0.86

- HITL1 research access is now a fixed, executor-neutral direct-sample
  observation. The isolated probe directly retrieves the controller-declared
  China and overseas public sample URLs on the current executor's already-
  permitted surface; it uses no search, query, candidate, or provider-selected
  adapter, and no single group's success short-circuits the other.
- A completed schema-valid observation — available or unavailable — records one
  compact terminal outcome per declared sample and satisfies the recorded-
  observation rule. The HITL1 Gate no longer treats `status: available` as an
  admission threshold; absent, unprobed, or malformed access still blocks. A
  material China/overseas limitation is resolved by the Phase in the same HITL1
  conversation: the user may adjust their environment and request a fresh round,
  revise source semantics, or accept the current scope, and the Agent neither
  verifies nor records any network change.
- The Claude CLI launcher is retained only as executor-scoped canary metadata;
  it is not a production HITL1 operation prerequisite and does not select an
  operation for any other Coding Agent. Boundary resolution projects only a
  schema-validated legacy `access_boundary` owner; current sample outcomes are
  Phase semantic input, never an Engine network diagnosis.
- This release makes no provider-support, network-location, coverage, or
  future-availability promise. A fresh probe replaces the prior observation;
  old legacy observations stay readable without migration.

## v0.85

- HITL1 research access is now recorded as a statically bounded source-class
  envelope. A schema-valid available observation requires at least one reachable
  declared class; partial reachability remains available and is disclosed without a
  second HITL decision. Legacy observations without the optional envelope or boundary
  remain readable.
- The isolated probe receives a separate actor-delivered research-access-envelope
  controller. The selected adapter retains only host/launcher/operation facts, while
  structured boundary location and extent replace reason-prefix routing. The Gate
  keeps its existing status admission rule, surfaces classified owners directly, and
  reports an absent boundary as explicitly unclassified.
- This release makes no provider-availability or coverage guarantee. The controller,
  adapter, and deterministic tests define only bounded guidance and validation.

## v0.84

- HITL1 now sends its bounded research-access search/fetch sequence to one
  isolated probe agent. The Phase Agent remains the only
  `rb_profile.yaml#/research_access` writer: it relays one existing compact
  observation, renders the corresponding status message, and reruns the same
  `hitl1-recorded` Gate.
- The isolated probe has no bundle, filesystem, profile, Gate, work-unit,
  ledger, receipt, or research-evidence authority. It uses the existing fixed
  neutral query, bounded native-first/same-URL sequence, and honest unavailable
  branch; this release neither promises provider availability nor claims Engine
  verification of an external call.

## v0.83

- Run profiles now carry the schema-validated `delegated_concurrency_cap`
  policy input (default `12`, accepted range `1..20`) for normal delegated
  work-unit prompt fan-out.
- The Phase Agent uses that profile policy with existing in-flight demand;
  Engine work-unit allocation, actor preflight, queue admission, transactions,
  and fallback authority are unchanged. The value does not claim host capacity
  or physical concurrency.

## v0.82

- New work-unit claims use the immutable `work-unit.assignment.v3` contract:
  supplementary Wave1 work may submit source/cache evidence without a forced
  empty direct-output declaration, while v1/v2 and Wave2 retain their recorded
  interpretation.
- Submit and Wave1 reviewed backing now share exact current-or-authorized-prior
  source-ref authorization; accepted prior evidence retains separate current
  cache/degraded and physical-projection checks.
- Wave1 provenance Gate treats only exact hash-valid superseded predecessors as
  historical context. Raw-only or hash-drift declarations remain blocking
  delegated-bypass evidence.

## v0.81

- sync-reference-index now refreshes a deterministic Reference Evidence Map
  in reference/README.md alongside the existing _INDEX.md inventory. The map
  separates reference relationships (shared, Topic-specific, cross-Topic, or
  unknown) from each canonical Topic's current focus status.
- Both reader targets use their existing independent compare-and-swap
  persistence boundaries. A partial projection reports its committed and
  blocked targets and converges by rerunning the same synchronizer; it does
  not promise an atomic rollback, merge, new Gate rule, or evidence authority.
- Wave1 refreshes this derived projection after a legal current
  focus_coverage update. The deterministic tests cover projection and CLI
  behavior only; they do not claim Subject-Agent research or Agent-flow proof.

## v0.80

- Wave1 depth reviews may now retain an optional, Phase-owned
  `focus_coverage` declaration for the smallest current focus commitments.
  Covered commitments bind only to reviewed, hash-valid current-round submitted
  Wave1 work for the same canonical Topic; visible limitations remain distinct
  from submitted backing.
- Wave1 evaluates `covered`, `partial`, and `blocked` coverage through its
  existing depth contract and Gate path. Malformed or repairable declarations
  remain ordinary depth-contract failures, while a valid limitation uses the
  existing degradation partition through the definition-owned
  `focus_coverage_limit` rule, without a new route, status, or controller.

## v0.79

- HITL1 now frames its initial preview as the minimum independent Topic map:
  one or more proposed Topics, no preset upper cap, and reviewable research
  threads when the map is large. The existing approved-Topic lower bound is
  unchanged.
- Users may optionally express a research focus in ordinary language. HITL1
  retains the user's wording and a separately labelled, correctable Agent
  interpretation in the existing literal controls snapshot; HITL2 retains the
  same narrative distinction in its existing rerun rationale.
- A rerun focus guides only the current per-Topic increment through the
  existing direction path. It adds no parser, profile/Topic field, Gate, route,
  checkpoint, source quota, or claim that historical evidence satisfies the
  new focus.

## v0.78

- Markdown semantic sections now include nested descendant subsection content: a
  `## Key Findings` whose findings live under `###` subsections is no longer judged
  empty by the evidence-summary evaluator (WAI-011).
- `operate-queue check` reports a distinct `drained: true` conclusion when the
  queue is fully drained (empty active window, refill pool, and in-flight work),
  instead of reporting `passed: false` with a refill/blocker advice (AGQ-027).

## v0.77

- Reference frontmatter failures now name the offending key/value and the YAML
  quoting rule (for example `acceptance_status: "accepted :warning:"`); the
  reference template documents the quoting constraint.
- `operate-topic-state schema --context wave_projection` exposes all
  `source_identity` forms (Wave0/1 `submitted_work`, Wave2 `finding`) plus
  per-wave `entry_id` rules, so a valid packet can be authored from the schema
  output alone.
- Wave2 finding-index currentness is documented (`W2F-\d{3}` id,
  `created_in_rerun_count`), and `wave2_judgment` apply feedback names the
  missing/mismatched currentness fact instead of a generic "not current".
- Wave1 reference-floor-deficit feedback names the `depth-review.yaml`
  `reviewed_work_unit_refs` sync when a submitted supplementary work unit is
  missing from it, and the canonical Wave1 locator derivation is documented in
  Agent-facing guidance.

## v0.76

- Wave1 question-list checks now declare their required semantic sections in
  the active Gate definition. The shared evaluator accepts equivalent heading
  presentation while rejecting a missing or empty declared section directly.
- The Gate audit now validates typed definition descriptors plus their focused
  evaluator/Gate behavior, without a second per-rule catalog. Wave1 submitted
  backing failures expose one root and an honest `missing_contract` no-path
  before dependent reference-floor symptoms.
- Terminal late-submit and timeout-preflight fixtures now derive their output
  tuple from the claimed assignment contract; current Wave0 coverage submits
  only its assigned `source_yaml` output while role, hash, snapshot, receipt,
  and provenance protections remain strict.

## v0.75

- Breaking: generic `operate-queue fail` accepts only a current
  `queue_item_id` and non-empty reason. It records a durable
  `terminal_no_successor` failure instead of manufacturing `repair-*` demand;
  delegated failures remain on the existing work-unit terminal/replacement
  boundary.
- Queue inspect, rendered projection, Wave inspect, and the formal
  `phase_queue_drained` Gate now expose the same terminal no-successor root, so
  an otherwise empty Queue cannot masquerade as drained.

## v0.74

- Breaking: `DEEP_RESEARCH_HARNESS/` is the sole reusable Harness source and
  command coordinate.
- Existing run bundles retain `RUN_BUNDLE.md` compatibility; an unreachable
  creation-time Harness coordinate stops continuation before bundle-provided
  commands.

## v0.73

- Renamed the reusable system and canonical source root to Deep Research Harness
  at `DEEP_RESEARCH_HARNESS/`.
- New run bundles use `BUNDLE_ENTRY.md`; existing `RUN_BUNDLE.md` and
  `BUNDLE_MAP.md` entries remain readable through the documented fallback.

## v0.72

- HITL1 now explains its existing bounded research-access probe before it runs,
  uses the fixed neutral query `site:wikipedia.org "Internet protocol suite"`,
  and presents an exact Chinese available/unavailable result after the direct
  `research_access` observation.
- The result is not a HITL1 Gate verdict: the normal silent-execution exit is
  still emitted only after the existing Gate passes, while unavailable access
  preserves the recorded HITL1 choice and returns to the same legal boundary.
- The contract adds framework Markdown only. It neither suppresses nor proves
  selected-host-native tool/error rendering or real Agent adherence; focused
  static integration coverage proves the text and ordering contract only.

## v0.71

- A rejected Wave projection now identifies the exact `source_identity.kind`
  JSON Pointer, the raw schema discriminator vocabulary, and the single kind
  legal for the supplied Wave. The retained packet is the only repair surface
  and reruns the same topic-state apply checkpoint.
- A missing or unknown Wave1 `payload.assignment_mode` now returns structured
  enqueue feedback for the retained unqueued task card, including the exact
  path, closed values, and the same enqueue invocation. Other assignment
  failures retain their existing error path.
- These are additive deterministic feedback projections: they add no aliases,
  automatic repair, Queue edit path, or Actor-behavior proof.

## v0.70

- Final Markdown reports now use `persist-final-report`: a bounded Evidence Map
  binds each declared key finding to an exact submitted `source_yaml` /
  `evidence_summary` output or an existing submitted-backed `reference/`
  projection before the existing CAS/atomic durability path commits its bytes.
- Generic `persist` redirects safe Final Markdown targets to that admission, and
  recovery `sweep` rechecks a prepared Final payload before finalization. The
  check is structural path/provenance feedback only: it adds no Final Gate,
  trace event, ledger, or semantic support verdict.

## v0.69

- Wave0 source intake now submits source/cache facts only. Formal submitted
  backing lets the Phase materialize verified shared references or atomically
  expand one deferred disposition into per-source Seed Projections, then rerun
  the same inspect/Gate; legacy delegated references remain readable and files,
  indexes, or bare work IDs never become authority.

## v0.68

- The selected DeepSeek/Claude launcher now enables its owned tool-discovery setting
  for direct, supervised, and fresh independent-Subject launches. This requests the
  declared native research surface for an ordinary bounded probe; it does not itself
  claim callable search/fetch or available research access.

## v0.67

- Added the bounded `regression` Autorun profile: normal runs select only current matching-v2 deterministic `PASS+CLEAN` results within a fixed `480000` ms / `$3.00` / `$0.60` fast envelope, at most one case per `experiment` group.
- Added explicit `--regression-qualification` for source-matching fast history that needs fresh runtime identity; normal regression never silently launches it, retries it, or substitutes a slower case.
- Regression membership remains a virtual observation. Optional frontmatter recommendation/retry-safety fields are bounded admission input, not outcome, health, budget, or persistent case-class authority.
- Execution-surface identity now follows the actual Supervisor/runtime helper closure and helpers named by the selected control surface, so documentation-only release edits do not invalidate a qualified result while relevant helper drift remains visible.

## v0.66

- Agent Experiment Autorun no longer falls back to filename-Light cases. Headless launch now requires an explicit legacy selector or a bounded `calibration`, `discovery`, `diagnostic`, or `assurance` run profile.
- Run profiles are read-only virtual observations over the current manifest/frontmatter and retained reports. They preserve filename estimate, empirical duration/cost, native outcome, lifecycle, health, source relation, and execution-surface relation as separate facts without moving, renaming, or persistently classifying cases.
- New retained batch reports and audit events use v2 execution-surface and selection observations. Earlier v1 reports remain useful for historical cost/outcome/health while exposing unknown comparability rather than fabricated freshness or current Agent-behavior coverage.

## v0.65

- HITL1 now names one selected Claude CLI / `deepseek_anthropic_compatible`
  research-access adapter. The Phase Agent owns the bounded native
  `WebSearch` -> returned URL -> same-URL `WebFetch` probe; the generic host bridge
  remains non-bypass and does not become a research controller.
- `surface_absent:` and `permission_required:` remain direct unavailable profile
  observations. The existing HITL1 Gate projects their selected-host boundary and
  reruns the same probe/Gate without creating another checker, Setup route, provider
  fallback, or research-evidence authority.
- Case 115 now uses that same generic non-bypass invocation. Its retained Subject
  trace is provider-scoped, and an unavailable or permission-denied outcome is not
  represented as selected-adapter availability proof.

## v0.64

- Work-unit inspect and submit preflight now expose one derived attempt disposition from the exact logical actor, work/queue IDs, receipt nonce, assigned result/receipt coordinates, transaction fact, and ledger-first coverage relation. The binding guides Agent Flow; it does not authenticate a physical writer or prove host/sub-agent liveness.
- Work-unit transaction v2 maps verified contention to structured `busy`, malformed or unresolved proof to `suspect_transaction`, and permits `recover-transaction` only for one unlocked named journal whose complete before-image still matches. Recovery never steals a lock, guesses process death, or edits original target authority.
- Submitted correction now uses exact declaration-recovery precedence or one audited `supersede` relation plus a fresh ordinary successor. Gate counts only the unique current lineage leaf's normal submit/audited late-submit row; predecessor authority and legacy bytes remain immutable.

## v0.63

- Selected Agent-facing operations now provide side-effect-free standalone help and direct code-`2` invocation/configuration feedback before bundle evaluation or mutation. Their exact grammar is documented without falsely normalizing unrelated utilities.
- Canonical topic-state now exposes read-only `schema --context` discovery and bounded safe Zod validation feedback; existing authorization and atomic writer ownership remain unchanged.
- HITL1 controls rendering is a pure public CLI, and phase entry now presents a cue-first bounded action core with the exact source-gate status sync and target-excluding manifest by default; `--full` retains the complete closure.
- Claim and timeout output project existing actor-observation and selected recommendation facts, while Wave0 omission feedback batches only homogeneous current candidate coordinates. No controller, automatic repair service, altered evidence authority, or host-liveness promise is introduced.

## v0.62

- Canonical topic-state projection now preserves independently parseable selected-slot entries across identity upsert, and packet admission plus Wave readiness share one concrete-navigation interpretation.
- Current Wave0 source-array ordinals now belong to hash-bound, submission-derived contribution intervals. A legal append owns only its appended ordinals; prefix drift, unsubmitted suffixes, and ambiguous legacy groups return one direct root instead of reassigning mutable history.
- New Seed Topics expose one bounded Agent-editable initialization region above an Engine-owned research appendix. Current marker ghosts fail at the seed Gate, while legacy body history remains read-compatible.
- Registry-length changes return the existing research-style writer as a structured handoff, and HITL1/rerun Gates return one same-check freshness repair when the selected profile projection is absent or stale.
- This release adds no controller, repair service, retry tree, second ledger, or evidence authority; existing Agent work, Engine checkpoints, and Markdown flow ownership remain unchanged.

## v0.61

- Wave inspect now applies return-map validation only to declared Seed Topic projection slots. Rich references and Wave1 evidence/question artifacts retain their own format, submitted-backing, and artifact evaluators.
- Rich references now use canonical YAML frontmatter for new output, with legacy bullet metadata remaining readable through one shared metadata reader and malformed frontmatter reported as a root repair target.
- `check-reentry` now reuses the normal reference-authority classifier: submitted-backed Phase-owned projections are accepted, while unbacked files remain fail-closed with their direct backing fact.

## v0.60

- Wave1 `materialize_projection` feedback now names each existing canonical target together with its exact submitted source URL, work IDs, work-unit refs, source refs, and cache-trail refs. Inspect and formal Gate project that same closeout hint and retain separately evaluated legacy, index, ledger, queue, receipt, provenance, and format roots.

## v0.59

- Wave Gate public summaries now distinguish clean routing passes, blocking failures, and legal degraded handoffs. Carried eligible quality debt is exposed through `degraded_rules`, while only current routing blockers remain in `failed_rule_ids`; durable diagnostics and handoff traces retain the structured debt context.

## v0.58

- Selected DPT research now chooses and reads its continuation or `RUN.md` entry before generic shortcuts, direct request-specific search/fetch, or manual evidence synthesis. Later phase-authorized research remains unchanged; repository guidance does not claim host-level skill suppression.

## v0.57

- Normal witnessed readiness-to-Final status synchronization now commits the authoritative `readiness_passed / none / completed` terminal triple in its existing rollback-protected status/trace transaction. Post-final rerun recovery retains its existing derived status path.

## v0.56

- Wave2 inspect now limits return-map validation to Seed Topic projection entries. `synthesis.md`, `cross-topic-ledger.md`, and `finding-index.yaml` retain their independent narrative, ledger, and structured-index checks without an unsupported `## Return Map` workaround.

## v0.55

- Wave1 reference closeout now converges through one canonical submitted-backing locator and root-first evaluator shared by inspect and the formal gate. Canonical current projections, legacy navigation files, and misnamed current files remain distinct; only a candidate-exact backed canonical projection contributes to the current floor.
- `sync-reference-index` renders the all-family eight-column inventory through the existing artifact-persistence CAS boundary. It preserves valid landed dates, returns `unchanged` for identical bytes, and does not create evidence, queue, or lifecycle authority.
- A true post-repair Wave1 reference-floor deficit can travel on the existing supplementary queue item as a snapshot-bound, read-only task objective. This adds neither a queue controller nor a new evidence authority; closure is always recomputed from current direct facts.

## v0.54

- Wave0 Seed Topic projection now closes at each current result-declared, schema-valid `source.yaml` array coordinate: every `<work_id>/N` has an exact navigation entry or explicit deferred disposition, while duplicate source positions remain distinct.
- `result_hash` continues to authenticate the submitted result declaration rather than freezing source bytes. The shared direct-output cardinality feeds the existing candidate reader, inspect, and formal gate; this adds no source authority, writer, lifecycle state, or control plane.

## v0.53

- Seed Topic backfill is now an identity-bound `wave_projection` packet through the existing atomic topic-state writer: it preserves immutable read-only backfill cards, materializes only owned current-Wave slots, and never makes the navigation projection into evidence authority.
- Wave inspect and formal gates share one direct-fact projection-readiness evaluator, so a required missing, generic, or wrongly bound entry blocks the same legal closeout loop without duplicate token rules or degraded handoff.
- `workflows/nodes/templates/seed-topic-template.md` now owns only the instantiable Seed Topic structure, slot cards, timing, and rendered entry format. The existing `command_playbook/operate-topic-state.md` owns packet, authorization, repair, and rerun-input mechanics; Phase guidance uses both surfaces in the same `authority -> packet -> writer -> same inspect -> completion -> formal gate` loop. Legacy headings remain read-compatible and are upgraded only when a valid selected packet targets them.

## v0.52

- Wave0 shared-reference-floor feedback now directs the Agent to the existing `wave0_source_intake` declared-output and formal-submit path, rather than an unsubmitted direct `reference/` write.
- Wave0 source-intake guidance makes that shared reference mandatory only when repairing the shared floor; submitted-ledger counting and direct-orphan rejection retain focused regression coverage.

## v0.51

- Delegated queue demand now has one current-facts admission verdict across enqueue, queue check, work-unit claim, and existing stale repair. Explicit registered kind, canonical Topic/finding binding, and closed assignment-contract inputs are checked before admission.
- Queue check reports rejected unclaimed delegated cards without persisting derived health. `repair --remove-stale` can remove only those rejected unclaimed cards; in-flight attempts retain their existing work-unit terminal owner.

## v0.50

- Seed Topics now uses one structured `enrich_seed` canonical writer. It derives identity and must-answer fields from the registry, preserves existing seed body bytes, and records bounded repair feedback without mutating queue authority.
- Queue completion and the Seed Topics Gate expose the writer only during a validated lifecycle window; generic inspect remains diagnostic-only and legacy duplicate body prose remains compatible.
- New seed skeletons retire duplicate body authoring for must-answer, scope, and evidence route.

## v0.49

- Added `operate-work-unit replace` for an eligible failed or abandoned delegated attempt. It derives one lineage-bound ordinary queue demand from matching terminal authority, without reviving history or allocating a work ID.
- Replacement calls are fail-closed and idempotent: queued successors return the existing probe/claim boundary, while in-flight successors return only their existing work ID for reconstruction and polling. Timed-out and terminal successors retain their established paths.
- Wave0 and Wave1 recovery guidance now terminalizes `fail_and_replace` attempts before using the Engine-owned replacement operation; manual equivalent-card reconstruction and automatic claim remain prohibited.

## v0.48

- Generated work-unit `task.md` now starts its authoring surface with one non-authoritative Completion Contract derived from existing manifest, result-schema, direct-output, cache, source, and receipt owners; spawn points only to that entry and creates no actor-produced authority.
- Claim input now reports supplied malformed actor observations structurally before allocation or trace mutation, while omitted observation keeps its existing audit path. Normal dry-submit and formal rejection expose one selected primary root; timeout advice forwards only its action and code.

## v0.47

- Wave Gates now read degradation eligibility from parsed, default-false rule metadata through one exact-rule-ID helper. The existing Wave0/Wave1 quality-floor policy is preserved; queue, provenance, structure, trace, lifecycle, and checker roots remain fail-closed.
- Wave0/Wave1/Wave2 formal Gate paths retain one evaluator root projection and source-level mask context. Wave2 now consumes the common policy path, while its active definition intentionally declares no eligible rule.

## v0.46

- Wave0 source-intake guidance now delivers the existing shared rich-reference template through the actual producer `requires` chain, while retained direct Sub-agent `reference` output and formal submitted backing remain authoritative.
- Wave1 returned-work guidance now makes the existing dry-submit disposition explicit before formal submit, then points the Phase Agent to its existing submitted-backed reference/index, depth-review, return-map, and inspect closeout sequence.

## v0.45

- HITL1 now makes the existing recorded-status-to-canonical-topic apply order explicit, and keeps its real capability observation to one neutral search with at most three returned-order eligible candidates and one final profile observation.
- Non-delegated seed-topic completion now reuses the final Gate's deterministic frontmatter and canonical-binding evaluation before terminal queue mutation, returning a direct declared-file repair when that local authoring contract fails.
- The release adds deterministic pre-Wave readiness coverage; real Agent/search/fetch behavior remains separately provider- and runtime-scoped.

## v0.44

- New run bundles now carry `RUN_BUNDLE.md` as a minimal entry point: bundle name, framework path, and a delegation statement pointing to `BUNDLE_MAP.md` (layout) and `COMMANDS.md` (operations).
- `BUNDLE_MAP.md` reverts to a pure passive directory map; its v0.43 continuation section is removed. The continuation playbook is simplified to a 5-step bridge from `RUN_BUNDLE.md` through `BUNDLE_MAP.md` to `COMMANDS.md`.
- Old bundles without `RUN_BUNDLE.md` remain fully compatible; `inspect-bundle.mjs` warns but does not fail.

## v0.43

- New run bundles now carry a passive continuation card with source-relative framework navigation, and explicitly supplied reachable bundle maps reload through one existing-bundle playbook rather than creating a second run.
- Continuation remains bounded by current bundle facts, reentry diagnostics, Final terminal semantics, and the existing post-Final recovery path; no card gains runtime or mutation authority.

## v0.42

- Wave1 now records an Engine-normalized carried-target receipt from its explicit depth-review declaration, and Wave2 closes each selected target through an exact finding-index binding and existing disposition route.
- The receipt follows the existing routed Gate/load lineage, preserves historical no-receipt handoffs, and rejects malformed receipt or current-intent drift without adding a queue, controller, or evidence-quality score.

## v0.41

- Added one optional, durable HITL1 user-research-controls snapshot in the plan host file, with bounded literal handling for Topic Registry, Progress, and required-fill consumers.
- Bound setup-ready Progress, pending checkpoint, and consumable route trace to the same final plan bytes before downstream phase entry.

## v0.40

- Delivered closed role guidance and direct-output authoring requirements to actor-bound work-unit task and spawn surfaces while preserving the existing claim, submit and Gate authorities.
- Consolidated delegated page-fetch guidance into one shared Node-first, bounded same-URL curl contract for active research roles.

## v0.39

- Added one bounded native-first, same-URL `curl` fallback to the HITL1 research-access probe when independently configured host permission already allows it, while keeping the Agent responsible for ordinary mechanics and preserving the existing observation and Gate authority.

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

- Added pre-trigger DeepSeek Claude Code launcher at `DEEP_RESEARCH_HARNESS/host_tools/claude-deepseek.mjs` that reads three required values from repo-root `.env`, isolates inherited provider environment, validates endpoint URL format, and launches `claude` with transparent argument/stdio/exit-code passthrough.

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

- Added a human pre-trigger setup path for install, Claude Code/Codex permission posture, verification, and canonical Harness entry without turning the autonomous pipeline into a human co-runner flow.
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

- Repo-root agent behavior files now suppress built-in research shortcuts when `DEEP_RESEARCH_HARNESS/` is the selected or relevant research entry path.
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
- Repo-root `CHANGELOG.md` is the single version-history source, aligned with the `DEEP_RESEARCH_HARNESS/RUN.md` banner.

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

- 初始版本。Deep Research Harness 入口 `RUN.md` 支持 drag-trigger，Agent 读到即启动多阶段 gate 驱动的 Deep Research 流程。
