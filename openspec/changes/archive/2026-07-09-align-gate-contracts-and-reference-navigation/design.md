## Context

第一轮 active change 已修正 Agent 在 submit 前看到的 entrance contract。本 change 处理 submit 后的 gate / output judgment layer：gate definition、helper implementation、inspect CLI、phase docs、ledger rows、reference projections、return-map refs 必须对同一份 runtime truth 给出一致判断。

换句话说，本 change 审的是 **出口合同**：Agent/Phase Agent/Sub-agent 已经写出 runtime artifacts 后，Engine 如何把这些 outputs 转成 submitted ledger truth，gate/helper 如何消费这些 truth，inspect/advice 如何把 pass/fail 反馈回 Agent，phase docs 是否提前教了同一份 shape。它要避免历史上的点修模式：已知 bug 是样本，apply 阶段必须横向检查同一 contract family。

项目边界仍按 charter 固定：

- LLM Agent owns search, reading, judgment, and synthesis.
- Markdown controls Agent Flow and must tell the Agent what shape to produce.
- JS/CLI owns deterministic checkpoints, gate verdicts, submit normalization, trace, and diagnostics.
- Runtime truth lives under active bundle root, not `DPT_FRAMEWORK/` and not chat memory.

This change is not a generic quality-upgrade pass. It is a gate/output-alignment change triggered by BUG-068, BUG-070, and the gate/systemic part of BUG-069. Any deterministic mismatch found in the same judgment layer is in scope if it affects gate pass/fail, submitted coverage, reference navigation truth, or blocking/advisory/diagnostic classification.

## Quality Bar

Quality is the primary constraint for this change. The point is not to land the smallest patch that clears the two known failures; the point is to make the judgment layer structurally self-consistent.

Apply work SHALL prefer system coherence over speed. Before declaring the change complete, implementation evidence SHALL show that proposal, design, delta specs, tasks, touched framework surfaces, diagnostics, and tests describe the same contract model. If one surface says "X is authority" and another surface implements "Y is authority", the change is not done even if the focused bug reproduction passes.

The final review should explicitly check for:

- same fact, same Source of Record;
- same required path/ref/role/status across docs, helpers, gate definitions, and tests;
- same blocking/advisory/diagnostic classification across helper return values, CLI output, and pass/fail computation;
- no hidden gate contract that requires reading Engine source to repair a stop:no phase;
- no broadening of gate acceptance just to make historical bad rows pass;
- no advisory research-quality preference silently promoted to blocking deterministic contract.

## Judgment Layer Contract Model

This change treats a gate/output contract as closed only when the same deterministic fact is aligned across five surfaces:

```text
Producer instruction
  Phase docs / task cards / generated schema tell Agent what to write
        |
        v
Runtime authority
  Active bundle artifact / submitted ledger / reference file / trace records truth
        |
        v
Checker implementation
  Gate helper / inspect helper / submit path consumes that exact shape
        |
        v
Diagnostic feedback
  CLI output says what failed, why it matters, and where to repair
        |
        v
Regression guard
  Static audit / helper test / fixture gate test catches future drift
```

A contract is not aligned if any one of these is missing or contradicts another. This is the structural reason BUG-068 and BUG-070 matter: both were places where the Agent could produce a plausible surface, but runtime authority, helper logic, and diagnostics were judging a different shape.

### Judgment-Layer Authorities

When surfaces disagree, apply SHALL resolve by truth type rather than by whichever wording is newest:

| Truth type | Source of record in this change | Notes |
| --- | --- | --- |
| Delegated output coverage | Submitted ledger rows plus gate-consumed canonical role/path selectors | `output_files[].role` is coverage metadata, not research content |
| Artifact existence/schema/format | Active bundle artifact files under `artifacts/`, `seed_topics/`, `reference/`, plus active schema/helper checks | Framework files do not store run truth |
| Work-unit review provenance | Submitted work-unit authority surfaces: `work_id`, `work_unit_ref`, `result_ref`, and submitted ledger rows | Safe spelling normalization may happen before comparison |
| Consumer navigation | Concrete existing `reference/*.md` refs for evidence-bearing map entries | Internal build surfaces may supplement but not replace navigation |
| Evidence authority | Submitted ledgers, reference backing checks, cache trails, and accepted gate surfaces | Return maps help navigate; they do not make evidence count |
| Diagnostic severity | The command/gate pass-fail computation | A finding counted into failure cannot be diagnostic-only |
| Producer guidance | Active phase docs, task cards, generated work-unit surfaces | Guidance must teach the checker-consumed shape but is not pass/fail authority by itself |

### Return-Map Activation And Classification

Return-map validation has two different jobs that must not be collapsed:

| Check family | Applies to | Classification |
| --- | --- | --- |
| Consumer navigation | Evidence-bearing `seed_topics/*.md` return-map entries after Wave0/Wave1/Wave2 materialization | Blocking for `inspect-wave*-output` and any active gate/check that declares return-map navigation readiness |
| Concrete reference existence | Extracted `reference/*.md` refs in evidence-bearing return-map entries | Blocking when the command is checking consumer navigation |
| Glob/count summary rejection | Any ref used as consumer navigation, such as `reference/topic-*.md (8 files)` | Blocking when the entry is evidence-bearing |
| Internal-only provenance | Evidence-bearing entries with only `artifacts/`, `_cache/`, or `_work_units/` refs | Blocking; internal refs may supplement but not satisfy navigation |
| Map-shape hygiene | Missing optional fields, awkward prose, or helper hints that do not affect current command pass/fail | Advisory or diagnostic-only, but only when not counted into `check.passed: false` |
| Evidence authority | Whether evidence counts for delegated coverage or research quality | Not decided by return maps; submitted ledgers/backing checks remain authority |

This means a non-gate inspect command may still return `check.passed: false`; for that command, the counted finding is blocking even if it is not itself a gate definition rule. A field such as `return_map_diagnostic_only: true` is invalid when return-map findings are included in `checks_failed`.

### Contract Families To Audit

The apply-time audit SHALL look for drift by family, not by bug id:

| Family | Examples | Drift smell |
| --- | --- | --- |
| Path/role declaration | Wave1 `evidence-summary.md` / `question-list.md` roles, extra `other` outputs | Submit accepts one role while gate coverage selects another |
| Ref spelling/authority | Depth-review refs, work-unit refs, result refs, reference refs | Docs show a ref that exact-match helpers reject |
| Navigation projection | Seed-topic return maps, reference index, wave reference projections | Map points to build scaffolding or globs instead of concrete consumer refs |
| Coverage/backing | Submitted coverage, reference ledger backing, cache coverage, cross-reference coverage | Gate consumes a projection without a clear authority or backing rule |
| Diagnostic classification | `blocking`, `advisory`, `diagnostic-only`, `diagnosticOnly` fields | CLI fails but wording says the finding cannot affect pass/fail |
| Static hygiene | Gate definition rule ids, check names, helper dispatch, phase examples | A rule/check exists without implementation or producer/diagnostic inventory |

### Code-Alignment Guardrails

This change is code-grounded. Apply SHALL audit and adjust the current judgment layer; it SHALL NOT replace it with a parallel mechanism.

Use the existing implementation surfaces as the starting authority map:

- `recordSubmitNormalization` / work-unit submit path for narrow submit-time role normalization;
- `checkWave1DepthReviewContract()` for Wave1 depth-review submitted-ref comparison;
- `return-map.mjs` and `inspect-wave*-output.mjs` for seed-topic and reference return-map classification;
- `classifyReferenceAuthority()` and work-unit provenance helpers for reference backing and Phase-owned projection authority;
- `checkWave2FindingIndexContract()`, `finding_index_contract`, `wave2_cross_reference_index_coverage`, `wave2_work_unit_cross_ref_coverage`, `wave2_work_unit_submission_presence`, and `wave2_delegated_bypass_suspected` for Wave2 `00-cross` authority closure;
- active phase docs and generated work-unit contracts for producer-facing instructions.

The apply implementation SHALL prefer small alignment edits on these surfaces. It SHALL NOT add a replacement gate engine, a broad ledger amend path, a second evidence-authority layer, or a rule that treats `source_layer` / index metadata as enough to establish evidence authority.

### Normalization Policy

Normalization is allowed only for narrow deterministic drift where the intended authority is unambiguous and no research judgment is being changed. Each normalization must be recorded in a visible diagnostic surface.

Allowed in this change:

- Wave1 required output path roles from `other` to the canonical required role before ledger append.
- A harmless trailing slash on safe submitted Wave1 work-unit refs before depth-review comparison.

Not allowed in this change:

- Broad historical submitted-ledger mutation.
- Treating `other` as equivalent to required coverage at gate time.
- Turning internal return-map refs or glob summaries into concrete `reference/*.md` refs without Agent repair.
- Any normalization that chooses evidence meaning, research quality, or synthesis content.

## Goals / Non-Goals

**Goals:**

1. Produce a gate/output-alignment audit that names every active gate rule id and its current implementation / artifact / Agent instruction relationship.
2. Make every blocking deterministic judgment contract closed across producer instruction, runtime authority, checker implementation, diagnostic feedback, and regression guard.
3. Make Wave1 required delegated output path roles self-sufficient: required paths enter the submitted ledger as `evidence_summary` and `question_list`, either directly or through narrow submit normalization.
4. Make Wave1 depth-review work-unit refs canonical and robust to harmless trailing slashes while still rejecting unsafe or unsubmitted refs.
5. Make evidence-bearing seed-topic return-map refs usable as consumer navigation: concrete existing `reference/*.md` required; internal provenance refs secondary.
6. Remove misleading diagnostic-only wording for failures that affect pass/fail.
7. Add static and regression coverage so future gate definition / helper / phase-doc / inspect wording drift fails before a real run.
8. During apply, fix newly discovered same-family deterministic drift rather than deferring it just because it was not BUG-068 or BUG-070.
9. Publish framework `v0.13`.

**Non-Goals:**

- Do not add a general submitted-ledger amend path for historical bad rows.
- Do not broaden `other` role to satisfy required Wave1 outputs at gate time.
- Do not make `artifacts/`, `_cache/`, or `_work_units/` primary consumer navigation targets in seed-topic return maps.
- Do not add research-quality heuristics as blocking gates unless they already protect an accepted deterministic contract.
- Do not use the broad audit mandate to rewrite unrelated lifecycle mechanics, routing, queue scheduling, or research semantics.
- Do not add npm dependencies or Python.
- Do not move Agent flow into JS controller code.

## Initial Gate-Alignment Audit

This is the design-time gate/output audit artifact required by the change. It inventories active gate rules by rule id and covers the adjacent output/navigation surfaces known to feed those gates. Rows group rules that share the same helper/shape/phase contract; apply must expand or update this matrix in implementation evidence when actual edits reveal extra drift.

The design-time matrix is intentionally compact. The apply-time evidence SHALL expand it into a rule/output contract inventory with these columns for every active rule id or adjacent output/navigation contract touched by the audit:

| Column | Meaning |
| --- | --- |
| Gate / command | Active gate, inspect CLI, submit path, or static validator that consumes the contract |
| Rule id / check id | Gate rule id, helper check name, inspect finding id, or submit normalization id |
| Implementation route | CLI dispatch, helper function, schema validator, or submit path that enforces it |
| Runtime surface | Bundle-relative artifact, ledger row, trace/log entry, reference file, or phase doc surface |
| Producer instruction | Phase doc, task card, sub-agent task, generated schema, or playbook instruction that tells the Agent what to write |
| Diagnostic / advice wording | Gate/inspect/submit output that tells the Agent what failed and where to repair it |
| Pass/fail consequence | Whether the finding is blocking, advisory, diagnostic-only, or submit-normalized |
| Drift status | Aligned, fixed in this change, deferred with reason, or out of scope |
| Test guard | Focused regression, fixture gate test, static audit, or governance check that prevents regression |

For grouped design rows below, the apply-time inventory may keep a shared implementation route, but it SHALL still enumerate each active rule id and prove that no rule id is hidden behind prose-only coverage.

| Gate | Rule id(s) | Helper / check implementation | Artifact shape checked | Agent-facing producer instruction | Pass/fail consequence |
| --- | --- | --- | --- | --- | --- |
| instantiation-complete | `bundle_dir_exists`, `bundle_map_exists`, `rb_plan_exists`, `rb_profile_exists`, `rb_status_exists`, `rb_queue_exists`, `rb_trace_exists` | gate CLI rule loop: `dir_exists` / `file_exists` | active bundle root and canonical control files | instantiate-run-bundle command playbook / templates | blocking; bundle cannot enter execution without scaffolds |
| instantiation-complete | `seed_topics_exists`, `reference_exists`, `artifacts_exists`, `cache_exists`, `final_exists`, `work_units_exists` | gate CLI rule loop: `dir_exists` | canonical runtime directories | bundle templates and framework runtime boundary | blocking; missing runtime surfaces |
| instantiation-complete | `bundle_name_valid` | gate CLI pattern check | bundle dir basename | instantiate command naming contract | blocking; active bundle identity invalid |
| instantiation-complete | `status_current_mode`, `status_current_gate`, `status_next_gate` | status-value check | `rb_status.json` values | instantiation status template | blocking; lifecycle window invalid |
| hitl1-recorded | `profile_exists`, `profile_schema_valid`, `research_profile_not_default`, `must_answer_non_empty`, `hitl1_status_recorded`, `hitl1_recorded_at_non_empty` | HITL1 gate CLI + schema/field checks | `rb_profile.yaml` profile and HITL1 checkpoint | HITL1 phase / profile collection | blocking; setup cannot proceed without recorded HITL1 |
| hitl1-recorded | `status_current_gate`, `status_next_gate` | status-value check | `rb_status.json` | `advance-status --to hitl1_recorded` | blocking; lifecycle status drift |
| setup-ready | `rb_plan_exists`, `rb_profile_exists`, `rb_status_exists`, `rb_queue_exists`, `rb_trace_exists`, `seed_topics_exists`, `reference_exists`, `artifacts_exists`, `cache_exists`, `final_exists`, `work_units_exists` | setup gate file/dir checks | instantiated bundle surfaces | setup phase / templates | blocking |
| setup-ready | `plan_schema_valid`, `profile_schema_valid`, `status_schema_valid`, `queue_schema_valid` | setup gate schema dispatch | plan/profile/status/queue schemas | setup phase and templates | blocking; machine state invalid |
| setup-ready | `hitl1_marker_recorded`, `status_current_gate`, `status_next_gate`, `basename_consistency`, `plan_body_non_empty`, `plan_body_no_unfilled_marker` | field/cross-field/pattern helpers | HITL1 marker, status window, basename, plan body | HITL1/setup phase docs | blocking; pre-research handoff unsafe |
| seed-topics-ready | `seed_topics_dir_non_empty`, `slug_consistency`, `per_file_title_non_empty`, `per_file_slug_stem_consistency` | seed gate rule loop + cross-field slug consistency | `seed_topics/*.md` files, frontmatter slug/title, registry set | `phase-seed-topics.md` materialization contract | blocking; seed topic structure invalid |
| wave0-complete | `reference_index_md_exists`, `reference_readme_exists`, `reference_dir_exists`, `shared_ref_count_floor`, `no_example_com_shared_ref_url` | wave0 gate rule loop, `countReferences()` for reference globs, pattern check | flat `reference/` shared refs | `phase-wave0.md` reference creation | blocking; Wave0 reference inventory incomplete |
| wave0-complete | `per_topic_source_yaml_exists`, `per_topic_reference_schema_valid`, `per_topic_count_floor` | wave0 gate file/schema/count checks | `artifacts/wave0/{topic}/source.yaml` top-level YAML array | wave0 work-unit and phase docs | blocking; per-topic source metadata incomplete |
| wave0-complete | `trace_event_wave0_completion`, `cache_coverage`, `wave0_work_unit_ledger_exists`, `wave0_work_unit_output_coverage`, `wave0_work_unit_submission_presence`, `wave0_delegated_bypass_suspected` | trace reader, `checkCacheCoverage()`, work-unit provenance helpers | submitted ledger rows, cache leaves, delegated outputs, trace | wave0 delegated drain loop | blocking except helper-internal warnings explicitly classified advisory |
| wave1-complete | `wave1_dir_exists`, `per_topic_evidence_summary_exists`, `per_topic_question_list_exists` | wave1 gate file/dir checks | required Wave1 artifacts per topic | wave1 work-unit output contract and phase docs | blocking; missing required outputs |
| wave1-complete | `per_topic_depth_review_contract` | `checkWave1DepthReviewContract()` | `artifacts/wave1/{topic}/depth-review.yaml` object | `phase-wave1.md` §3.2.2 | blocking; this change fixes trailing-slash ref drift |
| wave1-complete | `per_topic_ref_md_count_floor`, `reference_format`, `reference_source_url_parseable`, `reference_index_coverage`, `key_facts_min_lines`, `ledger_coverage`, `no_example_com_ref_url` | reference count/format/source/index/backing helpers | `reference/{topic.slug}-*.md`, `_INDEX.md`, backing refs | Wave1 materialization guidance | blocking or degradation-eligible only where already classified; no diagnostic-only ambiguity |
| wave1-complete | `question_list_has_four_sections`, `source_url_present`, `key_findings_non_empty` | pattern checks | Wave1 `question-list.md` and `evidence-summary.md` content structure | `phase-wave1.md` and subagent role task | blocking currently; no scope to add new content heuristics |
| wave1-complete | `no_stale_mechanisms_token`, `no_stale_trends_token`, `no_stale_pending_questions_token` | pattern checks | `seed_topics/{topic}.md` backfill tokens | Wave1 inline backfill guidance | blocking; stale tokens mean phase output incomplete |
| wave1-complete | `trace_event_wave1_completion`, `cache_coverage`, `wave1_work_unit_ledger_exists`, `wave1_work_unit_output_coverage`, `wave1_work_unit_submission_presence`, `wave1_delegated_bypass_suspected` | trace reader, cache helper, work-unit provenance helpers | submitted ledger rows and required Wave1 outputs | Wave1 delegated drain loop | blocking; this change fixes required path role drift |
| wave2-complete | `synthesis_exists`, `synthesis_non_empty`, `ledger_exists`, `ledger_non_empty`, `ledger_fixed_sections`, `index_exists`, `index_yaml_parse` | wave2 gate file/field/pattern/YAML checks | Wave2 artifact group | `phase-wave2.md` pure synthesis guidance | blocking |
| wave2-complete | `finding_index_contract`, `synthesis_finding_id_ref`, `cross_artifact_references`, `wave1_evidence_ref`, `rerun_add_full_synthesis` | `checkWave2FindingIndexContract()`, markdown link resolver, rerun helper, pattern checks | `finding-index.yaml`, `synthesis.md`, `cross-topic-ledger.md` | Wave2 triage and synthesis guidance | blocking; deterministic process evidence only |
| wave2-complete | `backfill_judgment_token_absent`, `backfill_questions_token_absent` | pattern checks | `seed_topics/{topic}.md` Wave2 backfill tokens | Wave2 backfill guidance | blocking; stale tokens mean incomplete backfill |
| wave2-complete | `trace_event_wave2_completion`, `wave2_cross_reference_index_coverage`, `wave2_work_unit_cross_ref_coverage`, `wave2_work_unit_submission_presence`, `wave2_delegated_bypass_suspected` | trace reader, reference index helper, work-unit provenance helpers | `reference/00-cross-*.md`, submitted targeted evidence, trace | Wave2 reference projection / targeted search guidance | blocking when new evidence or unbacked projection is claimed |
| hitl2-recorded | `decision_brief_exists`, `decision_brief_non_empty`, `profile_yaml_parseable`, `hitl2_status_recorded`, `user_decision_non_empty`, `user_decision_valid_enum` | HITL2 gate file/YAML/field checks | decision brief and HITL2 profile decision | HITL2 phase | blocking; readiness cannot proceed |
| readiness-passed | `seed_topics_non_empty`, `reference_index_exists`, `wave2_synthesis_exists`, `hitl2_decision_brief_exists`, `all_prior_gates_passed`, `profile_yaml_parseable`, `trace_jsonl_parseable` | readiness gate file/dir/trace/YAML/JSONL checks | required final preconditions and trace history | readiness phase | blocking; final entry not authorized |
| rerun-ready | `rerun_rationale_present`, `rerun_count_valid`, `bundle_structure_valid` | rerun gate field/count/structural checks | HITL2 rerun request and surviving bundle structure | rerun phase | blocking; rerun branch not authorized |

### Drift And High-Risk Surfaces Found In This Audit

1. `wave1_work_unit_output_coverage` checks required paths through role-filtered submitted ledger rows, while the work-unit output contract permits `other` and phase/subagent guidance does not bind required paths to `evidence_summary` / `question_list`.
2. `per_topic_depth_review_contract` uses exact submitted refs, while `phase-wave1.md` example includes a trailing slash.
3. Return-map helpers and inspect output mark return-map findings `diagnosticOnly`, but BUG-070 shows concrete `reference/*.md` navigation is part of the consumer map contract and should block when evidence-bearing map entries have only internal refs or globs.
4. No static guard proves all active gate rule ids have a known implementation and artifact contract.
5. Wave2 `reference/00-cross-*.md` authority is a same-family high-risk surface, not a mandate for broad Wave2 rewrite: new fetched evidence must bind to submitted `wave2_targeted_evidence`, while existing-backed Phase-owned projections must bind to prior accepted evidence plus W2F/finding-index/cross-topic-ledger/prior submitted backing. The audit must verify or preserve this split across gate definitions, helpers, phase docs, inspect diagnostics, and tests.

### Apply-Time Audit Expansion Rule

The apply phase SHALL treat the above matrix as a starting audit, not as an exhaustive closed list. Before target-code edits, implementation evidence SHALL add a second-pass matrix for:

- gate selectors and output selectors;
- submitted ledger role/path expectations;
- depth-review, finding-index, source-claim, cache, and reference-backing helpers;
- Wave2 `00-cross` targeted-evidence vs existing-backed projection helpers and diagnostics;
- seed-topic return-map validation and inspect output;
- active phase docs and sub-agent/task instructions that tell the Agent what to write;
- validators and static hygiene that claim to guard these contracts.

The second-pass matrix SHALL explicitly mark the closure state for each in-scope contract family: producer instruction, runtime authority, checker implementation, diagnostic feedback, and regression guard. A row may be declared aligned only when all required closure surfaces are present or an explicit non-Agent-produced exemption is recorded.

If this second-pass audit finds an additional deterministic mismatch in the same family, it SHALL be fixed in this change when all are true:

- it affects gate pass/fail, submitted coverage, reference/navigation truth, or blocking/advisory/diagnostic classification;
- it is on an active current surface, not archived historical record;
- it can be verified by focused regression/static tests without broad architectural redesign.

If a finding is only a research-quality desire, speculative future mechanism, or unrelated lifecycle/queue/routing issue, record it as deferred evidence in `implementation-evidence.md` and do not silently expand implementation scope.

### Implementation Evidence Shape

During apply, `implementation-evidence.md` SHALL be structured enough to prove the change rather than merely narrate it. Use these sections:

1. Scope read before target-code edits.
2. Judgment-layer Source-of-Record decisions.
3. Rule/output contract closure inventory.
4. Drift found and classification.
5. Normalization decisions and diagnostics.
6. Touched surfaces by family: submit, gate definitions, helpers, inspect CLIs, phase docs, static audit, tests.
7. Verification log with exact commands and PASS/FAIL.
8. Deferred findings with explicit out-of-scope reason.
9. Final consistency review across proposal, design, specs, tasks, implementation, diagnostics, and tests.

The evidence SHALL make it possible for a reviewer to answer: "for each blocking deterministic contract, which producer instruction creates it, where is truth stored, what checker consumes it, what feedback repairs it, and what guard prevents drift?"

### Scope Classification Rule

Use this rule when the audit discovers new drift beyond BUG-068 and BUG-070:

| Finding type | Scope decision |
| --- | --- |
| Active gate/helper/submit/inspect consumes a different deterministic path, role, field, ref, status, or check name than producer docs/schema teach | Fix in this change |
| Gate or inspect output fails a command but labels the finding advisory or diagnostic-only | Fix in this change |
| Agent cannot repair a stop:no deterministic failure from phase docs plus CLI output without reading helper source | Fix docs/diagnostics in this change |
| Existing historical bundle rows are wrong but the current contract is aligned | Defer; do not add broad amend tooling |
| Research quality preference, ranking heuristic, style guidance, or semantic judgment not already part of deterministic gate truth | Defer/backlog |
| Queue scheduling, lifecycle routing, HITL UX, or unrelated framework architecture drift | Out of scope for this change |

### Apply Stop Lines

Apply SHALL stop expansion at these lines:

- If a high-risk surface is already aligned, record the evidence and add or keep the smallest useful guard; do not edit framework code just to show activity.
- If Wave2 `00-cross` already preserves the split `new fetched evidence -> submitted wave2_targeted_evidence` and `existing-backed projection -> prior backing + W2F/finding-index/cross-topic-ledger`, keep it aligned; do not replace it with an all-new-row rule or `source_layer`-alone acceptance.
- If a finding is a research-quality preference, ranking heuristic, style issue, or semantic judgment, record it as deferred/backlog rather than promoting it to a blocking deterministic gate.
- If a finding concerns historical bad submitted rows while the current contract is aligned, do not add amend tooling in this change.
- If a finding concerns queue scheduling, lifecycle routing, HITL UX, or unrelated architecture, mark it out of scope.

### Governance Baseline Rule

Apply SHALL make governance failures unambiguous before target-code edits. The current known `check-project-reqs` blockers are this change's pending IDs plus pre-existing orphan IDs `AGQ-023` and `SNC-006`.

Pending IDs from this change SHALL be registered as part of this change. Pre-existing orphan IDs SHALL be resolved or explicitly reported as governance baseline blockers separately from judgment-layer implementation evidence. Final verification still requires governance PASS; unrelated governance cleanup must not be described as judgment-layer drift.

## Decisions

### Decision 1: Required Wave1 paths get narrow submit normalization, not historical ledger amendment

If a `wave1_topic_deepening` submitted result declares:

- `artifacts/wave1/{topic}/evidence-summary.md` with role `other`, submit SHALL normalize the ledger row role to `evidence_summary`.
- `artifacts/wave1/{topic}/question-list.md` with role `other`, submit SHALL normalize the ledger row role to `question_list`.

Normalization happens before ledger append and is recorded in submit diagnostics / trace / log or equivalent Engine diagnostic surface. The assigned result remains a record of what the Agent submitted; the ledger row becomes the gate-consumable canonical declaration.

This is intentionally narrow. It does not create a general mutable ledger amend path for already-submitted bad rows. Existing historical rows remain repairable through replacement / supplementary work units or explicit future amend tooling.

Alternative considered: make Wave1 gate accept `other` for required paths. Rejected because `other` is useful only for extra non-blocking outputs; letting it satisfy required paths hides the contract that evidence-summary and question-list are first-class outputs.

### Decision 2: Required path-role binding is part of the gate contract

Wave1 output coverage SHALL treat required path-to-role binding as deterministic gate contract:

```text
artifacts/wave1/{topic}/evidence-summary.md -> evidence_summary
artifacts/wave1/{topic}/question-list.md    -> question_list
```

The gate helper MAY rely on submit normalization so future valid rows are canonical. Tests still SHALL prove the gate fails when required paths are absent from canonical submitted coverage.

### Decision 3: Depth-review refs canonicalize safe trailing slash only

The canonical Agent-facing ref is `_work_units/wave1/<work_id>` without a trailing slash. The validator SHALL canonicalize a single harmless trailing slash before exact submitted-ledger comparison.

The validator SHALL continue to reject:

- absolute paths;
- paths containing `..`;
- refs outside `_work_units/wave1/`, submitted `work_id`, `work_unit_ref`, or `result_ref` authority surfaces;
- refs that do not bind to submitted rows.

Alternative considered: keep exact byte-for-byte comparison. Rejected because the phase doc already taught a trailing slash and this is a harmless path spelling drift, not an authority difference.

### Decision 4: Evidence-bearing return-map refs must include concrete existing `reference/*.md`

For evidence-bearing seed-topic return-map entries, `reference/` is the primary consumer navigation target. Internal runtime/build surfaces are allowed only as secondary provenance.

Validation SHALL:

- use a deterministic evidence-bearing predicate based on return-map fields/status/relationship and ref-bearing lines, not broad semantic reading of arbitrary prose;
- extract concrete `reference/*.md` refs from refs fields or ref-like text;
- reject globs containing `*`;
- reject count summaries such as `(8 files)` and `（8 个）`;
- reject unsafe refs;
- verify each concrete `reference/*.md` exists under the active bundle root;
- require at least one concrete existing `reference/*.md` for every evidence-bearing entry unless the entry explicitly records a limitation / no materializable evidence state.

This does not make return maps evidence authority. Submitted ledgers and backing checks still decide delegated coverage. It makes return maps usable as maps.

### Decision 5: Blocking/advisory/diagnostic-only is part of the output contract

Gate and inspect outputs SHALL describe finding severity accurately:

- `blocking`: affects current command pass/fail or gate pass/fail.
- `advisory`: does not fail this command but names a recommended repair.
- `diagnostic-only`: cannot by itself establish or revoke gate coverage or current command pass/fail.

Helpers SHALL NOT return `diagnosticOnly: true` for findings that the CLI counts toward `check.passed: false`. Inspect CLIs may remain non-gate commands, but their own `check.passed` must match the findings they count as failures.

Return-map output SHALL remove or narrow diagnostic-only wording instead of carrying contradictory summary fields. If a command fails because return-map navigation failed, the command output must not simultaneously claim that return-map findings are diagnostic-only.

### Decision 6: Stop:no diagnostics must be self-sufficient

BUG-069's gate/systemic lesson is that a stop:no phase is not autonomous if the Agent must read Engine helper source to discover the required path, role, ref spelling, or blocking classification. For every in-scope deterministic mismatch fixed by this change, the repaired producer instruction and CLI diagnostic SHALL be enough for the Agent to repair the artifact without source-code archaeology.

Self-sufficient blocking diagnostics SHALL name:

- the failing gate/command and rule or finding id;
- the bundle-relative artifact, ledger declaration, ref, or field that failed;
- the expected deterministic shape or canonical value;
- whether the finding is blocking, advisory, diagnostic-only, or normalized;
- the nearest repair surface, such as phase docs, submitted work-unit result, seed-topic return-map entry, or reference file.

This does not require the Engine to choose research strategy or write content. It only requires deterministic checkpoint feedback to expose the contract it enforces.

### Decision 7: Gate audit becomes executable hygiene

Implementation SHALL add a static audit test or validator that reads active gate definitions and verifies every rule id has:

- a known `check` implementation path in its gate CLI or shared helper;
- an artifact contract category documented in the change design or updated apply evidence;
- a producer instruction surface or explicit reason no Agent-produced artifact is involved;
- no unsupported delegated-provenance check names;
- no diagnostic-only label for a rule that affects pass/fail.

The validator SHALL fail closed for unknown check names in active gate definitions. It SHALL NOT require editing archived OpenSpec changes. If implementation discovers repeated drift outside gate definition JSON but inside the same output contract family, the validator or companion tests SHALL be extended to cover that class.

## Risks / Trade-offs

- Narrow submit normalization may hide an Agent wording issue if diagnostics are not visible. Mitigation: require normalization diagnostics and tests.
- Return-map concrete-ref validation can become too strict for legitimate limitation entries. Mitigation: allow explicit limitation / no materializable evidence states, but not silent internal-only refs.
- Evidence-bearing return-map classification can drift into semantic judgment. Mitigation: require a deterministic predicate based on return-map fields/status/relationship/ref presence and document limitation markers.
- Static gate audit may become noisy if it tries to infer too much from prose. Mitigation: keep the executable check to known rule ids/check names and a maintained artifact-contract inventory.
- Self-sufficient diagnostics can become verbose. Mitigation: require artifact/ref/expected-shape/repair-surface fields for blocking findings, not long prose.
- Existing bundles with historical bad submitted rows may still fail. Mitigation: explicitly out of scope; repair via supplementary work unit or future targeted amend change.
- Scope can drift into quality heuristics. Mitigation: only deterministic pass/fail mismatches are in scope.

## Migration Plan

1. Register pending IDs in `openspec/governance/req-registry.yaml`.
2. Run governance checks after registering pending IDs and before target-code edits; resolve or explicitly block on pre-existing orphan IDs separately from judgment-layer implementation.
3. Record an apply-time gate/output-alignment matrix update before target-code edits, including contract closure state and any newly discovered same-family deterministic drift.
4. Resolve Source-of-Record conflicts according to the judgment-layer authorities table before changing code.
5. Audit Wave2 `reference/00-cross-*.md` authority closure against existing helpers and docs, preserving the targeted-evidence / existing-backed projection split.
6. Implement Wave1 submit role normalization and diagnostics.
7. Update Wave1 output coverage helper/tests for required canonical roles.
8. Canonicalize safe depth-review refs and update phase examples.
9. Implement concrete `reference/*.md` extraction/existence/glob rejection in return-map helper.
10. Update phase docs to teach reference-first return-map navigation and Wave2 `00-cross` authority repair shape.
11. Update inspect/gate output classification wording.
12. Make blocking diagnostics self-sufficient for stop:no deterministic repair.
13. Add static gate-rule audit coverage.
14. Add focused regression and fixture-level gate tests.
15. Update `CHANGELOG.md` and `DPT_FRAMEWORK/RUN.md` to `v0.13`.
16. Run focused tests, static hygiene, governance checks, and OpenSpec validation before archive.

Rollback is code-level revert before archive. No runtime migration is required for newly submitted rows. Historical bad ledgers are intentionally not amended by this change.

## Apply Readiness / Definition of Done

This change is apply-ready when implementation can show:

- gate/output-alignment evidence records every active gate rule id, adjacent output/navigation surfaces, and any same-family drift found;
- in-scope blocking deterministic contracts are closed across producer instruction, runtime authority, checker implementation, diagnostic feedback, and regression guard;
- Wave1 required outputs land in submitted ledger with canonical roles or fail before gate;
- `other` remains allowed only for extra non-blocking outputs;
- depth-review trailing slash refs pass after canonicalization, while unsafe/unsubmitted refs fail;
- seed-topic return-map entries with only `artifacts/` / `_cache/` / `_work_units/` fail when evidence-bearing;
- globbed/count-summary `reference/` refs fail;
- concrete existing `reference/*.md` refs pass;
- Wave2 `reference/00-cross-*.md` checks preserve the distinction between submitted targeted evidence for new fetched sources and existing-backed Phase-owned projections for prior-backed synthesis;
- `source_layer: wave2_cross` / index coverage alone never establishes evidence authority for `00-cross` references;
- gate/inspect wording accurately labels blocking, advisory, diagnostic-only findings;
- blocking diagnostics name the failed deterministic surface, expected shape, and repair target without requiring helper-source reading;
- static audit proves active gate rule ids have known implementation and documented artifact contract;
- governance baseline blockers are resolved or explicitly recorded before target-code edits, and unrelated governance cleanup is not classified as judgment-layer drift;
- focused regression / fixture tests and governance checks pass;
- `CHANGELOG.md` and `DPT_FRAMEWORK/RUN.md` publish `v0.13`.

## Open Questions

None. If apply discovers an advisory research-quality desire that is not an active gate requirement, record it as a backlog item rather than broadening this change.
