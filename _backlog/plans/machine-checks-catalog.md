# Deep Research Harness — Machine Checks Catalog

> Provenance: 2026-08-16 负担轴审计子代理的 read-only survey 产物(随第二轮"负担与残留漂移"治疗使用)。用途:后续 change 判断 phase 散文里某条禁令是否"已被机器强制"时,以本目录的 check 名/rule id 为准;gate definition JSON 仍是权威,本目录只是对照投影。

Structured catalog of **deterministic machine checks** that enforce Agent-behavior rules in the Deep Research Harness. Built by read-only survey of `DEEP_RESEARCH_HARNESS/` and `tests/`. Purpose: let another agent classify Markdown guidance sentences as "already enforced by a machine check" (rule/check name match) vs. pure guidance.

Legend: a `check:` name inside a gate definition is the machine check; rule `id`s are the per-target instantiations. `file:line` references point at the validating statement in the implementing module.

---

## Area 1 — Gate Definitions → rule IDs

Source: `DEEP_RESEARCH_HARNESS/schema/gate_definitions/*.definition.json`. Each rule lists its `id`, the `check` it invokes, and the `target` it verifies. Shared preflight (source-gate status window, handoff witness, phase-queue-drained for wave gates) is enforced by the gate CLIs/helpers, not the definition alone.

### instantiation-complete — `DEEP_RESEARCH_HARNESS/schema/gate_definitions/gate-instantiation-complete.definition.json`
- `bundle_dir_exists` — `dir_exists` on bundle root `.` (instantiated bundle dir exists)
- `bundle_entry_exists` — `file_exists` `BUNDLE_ENTRY.md`
- `bundle_map_exists` — `file_exists` `BUNDLE_MAP.md`
- `rb_plan_exists` — `file_exists` `rb_plan.md`
- `rb_profile_exists` — `file_exists` `rb_profile.yaml`
- `rb_status_exists` — `file_exists` `rb_status.json`
- `rb_queue_exists` — `file_exists` `rb_queue.json`
- `rb_trace_exists` — `file_exists` `rb_trace.jsonl`
- `seed_topics_exists` — `dir_exists` `seed_topics/`
- `reference_exists` — `dir_exists` `reference/`
- `artifacts_exists` — `dir_exists` `artifacts/`
- `cache_exists` — `dir_exists` `_cache/`
- `final_exists` — `dir_exists` `final/`
- `work_units_exists` — `dir_exists` `_work_units/`
- `bundle_name_valid` — `pattern_match` bundle dir name against `^(dpt_rb_[a-z0-9][a-z0-9-]*|dpt_disp_[a-z0-9][a-z0-9_-]*_[0-9a-f]+)$`
- `status_current_mode` — `status_value` `rb_status.json#/current_mode` == `execution`
- `status_current_gate` — `status_value` `rb_status.json#/current_gate` == `setup_ready`
- `status_next_gate` — `status_value` `rb_status.json#/next_gate` == `seed_topics_ready`

### hitl1-recorded — `DEEP_RESEARCH_HARNESS/schema/gate_definitions/gate-hitl1-recorded.definition.json`
- `profile_exists` — `file_exists` `rb_profile.yaml`
- `profile_schema_valid` — `schema_valid` ProfileSchema on `rb_profile.yaml`
- `research_access_available` — `field_value` `rb_profile.yaml#/research_access/status` == `available`
- `research_profile_not_default` — `field_value` `rb_profile.yaml#/research_profile` != `not_selected`
- `must_answer_non_empty` — `field_non_empty` `rb_profile.yaml#/root_must_answer_set`
- `hitl1_status_recorded` — `field_value` `rb_profile.yaml#/human_decision_checkpoints/hitl1/status` == `recorded`
- `hitl1_recorded_at_non_empty` — `field_non_empty` `rb_profile.yaml#/human_decision_checkpoints/hitl1/recorded_at`
- `status_current_gate` — `status_value` `rb_status.json#/current_gate` == `hitl1_recorded`
- `status_next_gate` — `status_value` `rb_status.json#/next_gate` == `setup_ready`

### setup-ready — `DEEP_RESEARCH_HARNESS/schema/gate_definitions/gate-setup-ready.definition.json`
- `rb_plan_exists` — `file_exists` `rb_plan.md`
- `rb_profile_exists` — `file_exists` `rb_profile.yaml`
- `rb_status_exists` — `file_exists` `rb_status.json`
- `rb_queue_exists` — `file_exists` `rb_queue.json`
- `rb_trace_exists` — `file_exists` `rb_trace.jsonl`
- `seed_topics_exists` — `dir_exists` `seed_topics/`
- `reference_exists` — `dir_exists` `reference/`
- `artifacts_exists` — `dir_exists` `artifacts/`
- `cache_exists` — `dir_exists` `_cache/`
- `final_exists` — `dir_exists` `final/`
- `work_units_exists` — `dir_exists` `_work_units/`
- `plan_schema_valid` — `schema_valid` PlanSchema on `rb_plan.md`
- `profile_schema_valid` — `schema_valid` ProfileSchema on `rb_profile.yaml`
- `status_schema_valid` — `schema_valid` StatusSchema on `rb_status.json`
- `queue_schema_valid` — `schema_valid` QueueSchema on `rb_queue.json`
- `hitl1_marker_recorded` — `field_value` `rb_profile.yaml#/human_decision_checkpoints/hitl1/status` == `recorded`
- `status_current_gate` — `status_value` `rb_status.json#/current_gate` == `setup_ready`
- `status_next_gate` — `status_value` `rb_status.json#/next_gate` == `seed_topics_ready`
- `basename_consistency` — `cross_field` byte-for-byte equality of normalized bundle-dir basename vs `rb_plan.md#/plan_basename` vs `rb_profile.yaml#/plan_basename` (no case folding/slug rewriting/whitespace trimming)
- `plan_body_non_empty` — `field_non_empty` `rb_plan.md` body
- `plan_body_no_unfilled_marker` — `pattern_match` (negated) `rb_plan.md` contains no `(待填充…` / `(尚无话题…` unfilled required-fill markers

### seed-topics-ready — `DEEP_RESEARCH_HARNESS/schema/gate_definitions/gate-seed-topics-ready.definition.json`
- `seed_topics_dir_non_empty` — `dir_non_empty` `seed_topics/` (`*.md`)
- `slug_consistency` — `cross_field` mode `slug_consistency`, bidirectional set equality of `rb_plan.md#/topic_registry` slugs vs `seed_topics/*.md` slugs (no missing, no extra)
- `per_file_title_non_empty` — `field_non_empty` `seed_topics/<slug>.md#/title`
- `per_file_slug_stem_consistency` — `cross_field` per-file: filename stem == frontmatter `slug`, byte-for-byte
- `seed_initialization_structure` — `seed_initialization_structure` per-file: valid `seed-initialization` boundary, no renderer-owned ghost below it (rejects edits outside the declared initialization region)

### wave0-complete — `DEEP_RESEARCH_HARNESS/schema/gate_definitions/gate-wave0-complete.definition.json`
- `phase_queue_drained` — `phase_queue_drained` on `rb_queue.json` (schema-valid globally quiescent queue: no active/refill/delegated in-flight demand)
- `reference_index_md_exists` — `file_exists` `reference/_INDEX.md`
- `reference_readme_exists` — `file_exists` `reference/README.md`
- `reference_dir_exists` — `dir_exists` `reference/`
- `reference_format` — `reference_format` on `reference/00-shared-*.md` (current UID topic binding metadata + rich-reference format; historical `related_topic` key cannot be current Engine evidence)
- `shared_ref_count_floor` — `count_floor` `reference/00-shared-*.md` ≥ 1 (threshold_source `wave0_shared_ref_total`; degradation-eligible)
- `no_example_com_shared_ref_url` — `pattern_match` (negated) no `source_url: "https?://…example.com"` placeholder
- `per_topic_source_yaml_exists` — `file_exists` `artifacts/wave0/{topic}/source.yaml` per registry topic
- `per_topic_reference_schema_valid` — `schema_valid` ReferenceMetadataArraySchema on `artifacts/wave0/{topic}/source.yaml` (each entry: url, title, retrieved_date YYYY-MM-DD, topic_tag)
- `per_topic_count_floor` — `count_floor` `artifacts/wave0/{topic}/source.yaml` ≥ 1 (threshold_source `wave0_per_topic_source_floor`; degradation-eligible)
- `trace_event_wave0_completion` — `trace_event_present` `wave0_completion` in `rb_trace.jsonl`
- `cache_coverage` — `cache_coverage` on output_declarations (role=reference output files must map to verified `_cache/` leaf dirs; empty cache_trails = Phase 1 warning)
- `wave0_work_unit_ledger_exists` — `work_unit_ledger_exists` on `rb_output_declarations.jsonl` wave0
- `wave0_work_unit_output_coverage` — `work_unit_output_coverage` (expected `artifacts/wave0/{topic}/source.yaml` covered by submitted rows; roles reference/source_yaml)
- `wave0_work_unit_submission_presence` — `work_unit_submission_presence` (index/manifest/result/receipt/beacon/output/cache/hash cross-checks)
- `wave0_delegated_bypass_suspected` — `delegated_bypass_suspected` on `artifacts/wave0` (delegated artifacts without submitted coverage)

### wave1-complete — `DEEP_RESEARCH_HARNESS/schema/gate_definitions/gate-wave1-complete.definition.json`
- `phase_queue_drained` — `phase_queue_drained` (quiescent queue)
- `wave1_dir_exists` — `dir_exists` `artifacts/wave1`
- `per_topic_evidence_summary_exists` — `file_exists` `artifacts/wave1/{topic}/evidence-summary.md`
- `per_topic_question_list_exists` — `file_exists` `artifacts/wave1/{topic}/question-list.md`
- `per_topic_depth_review_contract` — `depth_review_contract` on `artifacts/wave1/{topic}/depth-review.yaml` (submitted rows, exact-new source claims, cache mappings, profile checks)
- `focus_coverage_limit` — `focus_coverage_limit` (valid partial/blocked focus-coverage limitation preserved; degradation-eligible)
- `per_topic_ref_md_count_floor` — `count_floor` `reference/*{topic}*.md` ≥ 1 (threshold_source `wave1_per_topic_ref_floor`; degradation-eligible)
- `no_example_com_ref_url` — `pattern_match` (negated) no `example.com` source_url in `reference/{topic}-*.md`
- `reference_format` — `reference_format` on `reference/*{topic}*.md` (8 common metadata fields, one current UID topic binding, no `related_topic` key, 5 non-empty semantic sections, **no YAML frontmatter**)
- `reference_source_url_parseable` — `reference_source_url_parseable` (non-empty URL-parseable source_url in metadata block format)
- `reference_index_coverage` — `reference_index_coverage` source_layer `wave1_topic` (matching `reference/_INDEX.md` rows required)
- `ledger_coverage` — `reference_ledger_coverage` (submitted delegated outputs OR Phase-owned projections backed by submitted Wave1 source claims / accepted URL surfaces / verified cache trails / degraded-capture records / body backing refs)
- `question_list_has_four_sections` — `semantic_sections` on `question-list.md` (Topic Investigation Targets, Question Reconciliation, Emergent Question Protocol, Exploration / Exploitation Decision)
- `source_url_present` — `pattern_match` `evidence-summary.md` contains ≥1 `[label](https://…)` markdown URL
- `key_findings_non_empty` — `pattern_match` `## Key Findings` section with ≥1 numbered/bold finding
- `trace_event_wave1_completion` — `trace_event_present` `wave1_completion`
- `cache_coverage` — `cache_coverage` on output_declarations
- `wave1_work_unit_ledger_exists` — `work_unit_ledger_exists` wave1
- `wave1_work_unit_output_coverage` — `work_unit_output_coverage` (evidence-summary/question-list rows; roles reference/evidence_summary/question_list; topic reference files may be Phase-owned only with submitted backing)
- `wave1_work_unit_submission_presence` — `work_unit_submission_presence` (full cross-checks)
- `wave1_delegated_bypass_suspected` — `delegated_bypass_suspected` on `artifacts/wave1`

### wave2-complete — `DEEP_RESEARCH_HARNESS/schema/gate_definitions/gate-wave2-complete.definition.json`
- `phase_queue_drained` — `phase_queue_drained` (quiescent queue)
- `synthesis_exists` — `file_exists` `artifacts/wave2/synthesis.md`
- `synthesis_non_empty` — `field_non_empty` `synthesis.md`
- `ledger_exists` — `file_exists` `artifacts/wave2/cross-topic-ledger.md`
- `ledger_non_empty` — `field_non_empty` `cross-topic-ledger.md`
- `ledger_fixed_sections` — `pattern_match` all 6 required sections present with content (Cross-Topic Scan Matrix, Wave1 Legacy Questions, Cross-Topic Resolutions, Emergent Cross-Topic Questions, Exploration Decisions, HITL2 Handoff; case/level/spacing/order tolerant)
- `index_exists` — `file_exists` `artifacts/wave2/finding-index.yaml`
- `index_yaml_parse` — `yaml_parse` `finding-index.yaml`
- `finding_index_contract` — `finding_index_contract` (scan matrix coverage, confidence/backing consistency, gap_status convergence, synthesis eligibility, targeted-evidence receipt or explicit deferral)
- `synthesis_finding_id_ref` — `pattern_match` `synthesis.md` contains `W2F-\d{3}` finding id
- `cross_artifact_references` — `cross_field` mode `markdown_link_resolution` (≥1 markdown link resolving to an existing Wave0/Wave1 artifact file)
- `wave1_evidence_ref` — `pattern_match` `synthesis.md` links to `../wave1/*/evidence-summary.md` or `question-list.md`
- `rerun_add_full_synthesis` — `rerun_add_full_synthesis` (rerun action:add requires full Wave2 re-synthesis; finding-index pair coverage == canonical pair universe)
- `trace_event_wave2_completion` — `trace_event_present` `wave2_completion`
- `reference_format` — `reference_format` on `reference/00-cross-*.md`
- `wave2_cross_reference_index_coverage` — `reference_index_coverage` source_layer `wave2_cross`
- `wave2_work_unit_cross_ref_coverage` — `work_unit_output_coverage` on `reference/00-cross-*.md` (new fetched evidence needs submitted `wave2_targeted_evidence`; else must classify as existing-backed Phase-owned projection with W2F-xxx + finding-index/ledger refs + prior submitted backing)
- `wave2_work_unit_submission_presence` — `work_unit_submission_presence` (00-cross refs cross-checks)
- `wave2_delegated_bypass_suspected` — `delegated_bypass_suspected` on `reference/00-cross-*.md`

### hitl2-recorded — `DEEP_RESEARCH_HARNESS/schema/gate_definitions/gate-hitl2-recorded.definition.json`
- `decision_brief_exists` — `file_exists` `artifacts/hitl2/decision-brief.md`
- `decision_brief_non_empty` — `field_non_empty` `decision-brief.md`
- `profile_yaml_parseable` — `yaml_parse` `rb_profile.yaml`
- `hitl2_status_recorded` — `field_value` `rb_profile.yaml#/human_decision_checkpoints/hitl2/status` == `recorded`
- `user_decision_non_empty` — `field_non_empty` `rb_profile.yaml#/human_decision_checkpoints/hitl2/user_decision`
- `user_decision_valid_enum` — `field_value` `in` [`proceed_to_readiness`, `request_view_revision`, `repair`, `rerun`, `stop_blocked`]

### readiness-passed — `DEEP_RESEARCH_HARNESS/schema/gate_definitions/gate-readiness-passed.definition.json`
- `seed_topics_non_empty` — `dir_non_empty` `seed_topics/`
- `reference_index_exists` — `file_exists` `reference/_INDEX.md`
- `wave2_synthesis_exists` — `file_exists` `artifacts/wave2/synthesis.md`
- `hitl2_decision_brief_exists` — `file_exists` `artifacts/hitl2/decision-brief.md`
- `all_prior_gates_passed` — `trace_has_all_gates`: every non-terminal prior gate must have `gate_attempt` with `passed: true` in `rb_trace.jsonl`
- `profile_yaml_parseable` — `yaml_parse` `rb_profile.yaml`
- `trace_jsonl_parseable` — `jsonl_parse` `rb_trace.jsonl` (every line valid JSON)

### rerun-ready — `DEEP_RESEARCH_HARNESS/schema/gate_definitions/gate-rerun-ready.definition.json`
- `rerun_rationale_present` — `field_non_empty` `rb_profile.yaml#/human_decision_checkpoints/hitl2/rationale`
- `rerun_count_valid` — `rerun_count_limit` `rerun_count` < 11 (max 10 rerun cycles)
- `rerun_direction_structure` — `rerun_direction_structure` on `rb_plan.md#/topic_registry` (no structurally incomplete/ambiguous current or future rerun direction)
- `bundle_structure_valid` — `structural` (dirs `seed_topics/`, `reference/` exist)

### Chain routing — `DEEP_RESEARCH_HARNESS/workflows/transitions.chain.json`
- phase→phase `passed` routing: instantiation→hitl1→setup→seed-topics→wave0→wave1→wave2→hitl2→readiness→final; `phase-hitl2.md` also has `rerun` → `phase-rerun.md`; `phase-rerun.md` `passed` → `phase-seed-topics.md` (rerun re-enters the wave pipeline)
- `DEEP_RESEARCH_HARNESS/workflows/manifest.json` maps each phase node to its gate: instantiation→instantiation-complete, hitl1→hitl1-recorded, setup→setup-ready, seed-topics→seed-topics-ready, wave0→wave0-complete, wave1→wave1-complete, wave2→wave2-complete, hitl2→hitl2-recorded, readiness→readiness-passed, rerun→rerun-ready, final→(no gate)

---

## Area 2 — Gate check CLIs → engine helpers

Shared skeleton (all 10 CLIs): `parseGateCliArgs` → `tryLoadGateDefinition('<gate>')` (resolves `../../schema/gate_definitions/gate-<gate>.definition.json` inside gate-helpers.mjs) → `checkNodeGateBinding` (mismatch → routing kind `invalid_input`) → `checkPhaseHandoffPreflight` (extraCheck `handoff_preflight:false`) → rule dispatch loop over `definition.rules` → `buildContractEvaluation` → `resolveRouting` → `buildGateResult` → `writeGateAttempt` (strictTrace on passed-with-next) → `emitGateResult` (exit 0/1 by passed, 2 on config error).

### check-gate-instantiation-complete.mjs — `DEEP_RESEARCH_HARNESS/cli/gates/check-gate-instantiation-complete.mjs`
- invokes: `parseGateCliArgs` (:25) → `tryLoadGateDefinition('instantiation-complete')` (:29) → `checkNodeGateBinding` (:33) → `checkPhaseHandoffPreflight` (:49) → `checkCurrentEntryContract` (:72) → rule loop (:96-199): `file_exists` (:104, BUNDLE_ENTRY.md/BUNDLE_MAP.md via `currentEntry.missing_files` :106-109), `dir_exists` (:120, `statSync().isDirectory()` :123), `pattern_match` (:134, bundle basename vs `rule.pattern` :136-137), `status_value` (:146, `"file#/json/path"` split + `value === rule.expected` :160-171) → `buildContractEvaluation` (:201) → `resolveRouting` (:203) → `buildGateResult` (:211) → `writeGateAttempt` (:228, fallback :229-253) → `emitGateResult` (:255)
- extra hard checks: unknown check → `configurationFinding` (:172-175); `writeGateAttempt` throw → forced-failed with `trace_durable:false`/`gate_attempt_write_failed:true` (:227-253)

### check-gate-hitl1-recorded.mjs — `DEEP_RESEARCH_HARNESS/cli/gates/check-gate-hitl1-recorded.mjs`
- invokes: parse/definition/binding/handoff gates (:33-72) → `inspectCanonicalTopicState` prerequisite (:257-289; canonical mode + `passed:true`, 0 topics → `canonical_topic_state:empty_registry`) → rule loop (:291-480): `file_exists` (:299), `schema_valid` (ProfileSchema whitelist :312-316, `hasOnlyResearchStyleProjectionIssues` waiver :328-329), `field_value`/`field_non_empty` (:346-419, operators `equal`/`not_equal` only), `status_value` (:422) → style-projection freshness `evaluateResearchStyleProjectionFreshness` (:482-511, masked when other findings) → `buildContractEvaluation` (:513) → verdict (:527) → `writeGateAttempt` (:544) → `emitGateResult` (:571)
- extra hard checks: `research_access_available` waived by any `sample_observations` (:373-376); `hitl1_recorded_at_non_empty` masked unless `hitl1/status === 'recorded'` (:380-384); style-projection check emits `styleProjectionFinding`/`styleProjectionConfigurationFinding` (repair `buildResearchStyleApplyCommand`) (:496-503)

### check-gate-setup-ready.mjs — `DEEP_RESEARCH_HARNESS/cli/gates/check-gate-setup-ready.mjs`
- invokes: parse/definition/binding/handoff gates (:36-77) → rule loop (:191-524): `file_exists` (:199), `dir_exists` (:211), `schema_valid` (:225, dispatch PlanSchema/ProfileSchema/StatusSchema/QueueSchema :229-279), `field_value` (:299), `field_non_empty` (:324, YAML `#/` or `.md` body via `stripMdFrontmatter` :326-377), `pattern_match` (:382, body after `stripSuppliedControlsForTemplateScan` :396), `status_value` (:423), `cross_field` (:449, `normalizeBundleBasename(bundleName)` == `rb_plan.md#/plan_basename` == `rb_profile.yaml#/plan_basename` :452-479) → `buildContractEvaluation` (:526) → `buildGateResult` (:536) → `writeGateAttempt(..., {setupReadyStaged:true})` (:553; staging failure → forced-failed :554-579) → `emitGateResult` (:586)
- extra hard checks: `cross_field` null-normalization rejection (:453-459); setup-ready passed verdict only after staged persistence succeeds (:552-579); imports `writePlanProgress` but never invokes it

### check-gate-seed-topics-ready.mjs — `DEEP_RESEARCH_HARNESS/cli/gates/check-gate-seed-topics-ready.mjs`
- invokes: parse/definition/binding/handoff gates (:30-69) → `inspectCanonicalTopicState` + `inspectSeedTopicsAuthoringAuthorization` prerequisites (:158-159; failure → `canonical_topic_state_prerequisite`, empty registry → `canonical_topic_state:empty_registry` :203-219; all definition rules masked when prerequisite fails :221-223) → rule loop (:227-354): `dir_non_empty` (:232, glob `*.md`), `cross_field` mode `slug_consistency` per-file (:254-268, `canonical_binding_mismatch` → `slugSetFinding`) and set scope (:269-299, disk filenameStems vs registrySlugs), `field_non_empty` (:301, per-seed canonical title), `seed_initialization_structure` (:322, `evaluateSeedInitializationStructure` per seed :328) → `buildContractEvaluation` (:356) → verdict (:370) → `writeGateAttempt` (:387) → `emitGateResult` (:414)

### check-gate-wave0-complete.mjs — `DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave0-complete.mjs`
- invokes: parse/definition/binding/handoff gates (:29-68) → `buildCanonicalTopicRegistryFact` (:76) → `evaluateWave0Contract(bundlePath, definition, {topicRegistryFact})` (:77) → `evaluateSeedTopicProjectionReadiness(wave:'wave0')` (:78) → `scanTemplateNotExpanded` (:80) → per-rule `trace_event_present` loop (:86-106, `readTraceEvents` must be non-empty else blocking `authority_integrity` finding with `log-event.mjs` repair) → `buildContractEvaluation` (:108) → `engineVisibleAttemptCount` (:122-134) → `maybeDegradedHandoff` (:136-163, `DEGRADATION_FATIGUE_THRESHOLD = 3` :120, `evaluateWaveDegradationEligibility` :141, degraded handoff `extraCheck.degraded:true` :152-162) → `resolveRouting` (:196) → `projectWaveGatePublicVerdict` (:203) → `emitDelegatedBypassDiagnostic` (:208) → `buildGateResult` (:210) → `writeGateAttempt` (:167) → `emitGateResult` (:227)

### check-gate-wave1-complete.mjs — `DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave1-complete.mjs`
- invokes: same skeleton as wave0 (:29-66) → `evaluateWave1Contract` (:75) → seed readiness wave1 (:76) → `scanTemplateNotExpanded` (:77) → `trace_event_present` loop (:81-100, `readTraceEvents(...).length === 0` → blocking) → degradation/fatigue (:112-152, threshold 3 :129) → `resolveRouting` (:190) → `projectWaveGatePublicVerdict` (:197) → `emitDelegatedBypassDiagnostic` (:202) → `emitAfterDurableAttempt` persists `sharedEvaluation.carried_target_receipt` to `writeGateAttempt` on passed-with-next (:154-159) → `emitGateResult` only on success (:221)

### check-gate-wave2-complete.mjs — `DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave2-complete.mjs`
- invokes: parse/definition/binding/handoff gates (:30-67) → `scanTemplateNotExpanded` (:70) → `buildCanonicalTopicRegistryFact` (:73) → `loadWave2FindingIndexFact` (:74) → `evaluateWave2Contract(bundlePath, definition, {topicRegistryFact, findingIndexFact})` (:75) → seed readiness wave2 (:76) → `trace_event_present` loop (:79-98) → degradation/fatigue (:109-151) → `resolveRouting` (:155) → `projectWaveGatePublicVerdict` (:162) → `emitDelegatedBypassDiagnostic` (:167) → `buildGateResult` (:168) → `writeGateAttempt` (:184) → `emitGateResult` (:210)

### check-gate-hitl2-recorded.mjs — `DEEP_RESEARCH_HARNESS/cli/gates/check-gate-hitl2-recorded.mjs`
- invokes: parse/definition/binding/handoff gates (:27-66) → rule loop (:138-302): `file_exists` (:146), `yaml_parse` (:158, rb_profile.yaml target whitelist :159-161), `field_non_empty` (:174, `.md` body via `stripMdFrontmatter` or profile field :199-226; `user_decision_non_empty` empty → masks `user_decision_valid_enum` :224), `field_value` operators equal/not_equal/in (:228-267) → `buildContractEvaluation` (:304) → `evaluateCompositionProceed` (:318, only when passed && decision `proceed_to_readiness`; failure → `composition_handoff_proceed_contract` finding :319-337) → outcome `passed` only when `proceed_to_readiness` && `compositionProceed.ok`; `rerun` when decision `rerun` (:345-353) → `resolveRouting` with outcome possibly `'rerun'` (:355) → `buildGateResult` (:363) → `writeGateAttempt` with `compositionHandoffReceipt` when composition ok && passed && next `phases/phase-readiness.md` (:383-388) → `emitGateResult` (:415)

### check-gate-readiness-passed.mjs — `DEEP_RESEARCH_HARNESS/cli/gates/check-gate-readiness-passed.mjs`
- invokes: parse/definition/binding/handoff gates (:30-69) → rule loop (:192-325): `file_exists` (:200), `dir_non_empty` (:211), `trace_has_all_gates` (:224, `loadManifest` :225, prior gates = manifest phases before current with `gate !== null` :239, every prior gate must have a passing event :240-256, bad trace lines hard-rejected), `yaml_parse` (:258), `jsonl_parse` (:280, every non-empty line must parse) → `buildContractEvaluation` (:327) → if passed: `selectCompositionHandoffWitness` + `evaluateCompositionHandoffConsistency` (:331-337; failure → `composition_handoff_readiness_consistency` finding with `operate-composition-handoff.mjs restore` repair :338-364) → `buildGateResult` (:381, extraCheck `composition_handoff_consistency`) → `writeGateAttempt` (:399) → `emitGateResult` (:424)

### check-gate-rerun-ready.mjs — `DEEP_RESEARCH_HARNESS/cli/gates/check-gate-rerun-ready.mjs`
- invokes: parse/definition/binding/handoff gates (:36-75) → `ProfileSchema.safeParse` (:121) → `evaluateRerunAvailability({definition, profile, includeNextIncrement:false})` (:125-127) → `rerun_profile_prerequisite` blocker (:128-159; masks `rerun_rationale_present`/`rerun_count_valid` :157-158) → `evaluateRerunDirectionStructure` (:279-339; `buildCanonicalTopicRegistryFact` :283, `evaluateCanonicalSeedBindings` :297, per-seed `evaluateRerunDirection` :314; `future` state → `count_sync` finding :328-336) → rule loop (:341-414): `field_non_empty` (:349), `rerun_count_limit` (:366, unavailable → `limit_reached` failure :370-377), `structural` (:379, every `rule.targets` directory exists), `rerun_direction_structure` (:387) → style-projection freshness (:416-449, masked when other findings) → `buildContractEvaluation` (:451) → verdict (:465) → `writeGateAttempt` (:482) → `emitGateResult` (:507)

Note: `DEEP_RESEARCH_HARNESS/cli/gates/README` does NOT exist (dir contains only `.gitkeep` + the 10 check-gate-*.mjs); gate CLI documentation lives in the shared gate-helpers lifecycle, not a README.

---

## Area 3 — Engine helpers → enforced facts

### submit / work-unit transaction / queue — `DEEP_RESEARCH_HARNESS/engine/helpers/direct-output-contract.mjs`
- `evaluateDirectOutputTarget` — rejects non-canonical target path → `direct_target_path_unsafe` (direct-output-contract.mjs:70); unresolvable bundle root → `direct_bundle_root_unreadable` (:82); symlink target → `direct_target_symlink_unsafe` (:96); missing target → `direct_target_missing` (:106); unreadable → `direct_target_unreadable` (:113); realpath escaping bundle → `direct_target_realpath_escape` (:122); non-regular file → `direct_target_not_regular` (:130,:149); >4 MiB → `direct_target_oversize` (:157,:174); read failure → `direct_target_read_failed` (:183); invalid UTF-8 → `direct_target_invalid_utf8` (:201); extra BOM → `direct_target_invalid_bom` (:208-210); unknown contract id → `direct_contract_unknown` (:369)
- `evaluateDirectOutputTarget` wave0 contract `wave0.source-metadata-array.v1` — YAML parse failure → `source_metadata_yaml_parse_invalid` (:225); non-array top level → `source_metadata_top_level_array_missing` (:233); entries failing `ReferenceMetadataArraySchema` → `source_metadata_schema_invalid` (:243); on pass records `validated_array_length` (:253)
- `evaluateDirectOutputTarget` wave1 contract `wave1.evidence-summary.v1` — missing/empty non-comment `Key Findings` section → `key_findings_missing_or_empty` (:269)
- `evaluateDirectOutputTarget` wave1 contract `wave1.question-list.v1` — missing/empty of the 4 required sections (Topic Investigation Targets / Question Reconciliation / Emergent Question Protocol / Exploration / Exploitation Decision) → `question_list_sections_missing_or_empty` (:292)
- `directOutputContractIds` — closed registry of direct contracts `wave0.source-metadata-array.v1`, `wave1.evidence-summary.v1`, `wave1.question-list.v1` (:336-340)
- `semanticOrderedArrayDigest` — re-parses value with `ReferenceMetadataArraySchema.parse` then hashes (:260-262)

### work-unit-transaction — `DEEP_RESEARCH_HARNESS/engine/work-unit-transaction.mjs`
- `WORK_UNIT_TRANSACTION_TRANSITIONS` — closed state machine `started→[committed,rolled_back,suspect]`, `suspect→[rolled_back]` (work-unit-transaction.mjs:35-40)
- `inspectWorkUnitTransaction` — journal `suspect` → projection `suspect_transaction` (:296-303); unpaired/invalid lock owner+journal → `suspect_transaction` (:329-335); held+started → `busy` with repair `wait` (:305-328); no lock + orphan journals → `suspect_transaction` (:338-364); else `none` (:401-410)
- `withWorkUnitTransaction` — rejects callers that don't declare exact mutation targets before mutation (:427); requires ≥1 exact mutation target (:439); rejects non-`none` initial projection via `transactionBlockedResult` (:460); orphan journal after lock → `suspect_transaction` (:486-492); target escaping bundle → `transaction target escapes bundle root` (:81); non-regular-file/symlink target → `transaction target must be one exact regular file` (:96); captures `before_sha256` per target (:98-103); callback writing undeclared target → `transaction ${txId} mutated undeclared targets` with `error.undeclared_targets` (:154-174,:537-543); commit rewrites journal `status:'committed'` + `settled_at` (:553-558); rollback restores exact before-images, journal `rolled_back` only when clean else `suspect` (:577-591)
- `recoverWorkUnitTransaction` — rejects non-string/empty tx_id → `invalid_transaction_id` (:625-634); held lock → blocked (:635-641); missing journal → `suspect_transaction` (:644-658); journal failing v2 proof schema → `suspect_transaction` (:662-678); `currentTargetsMatchManifest` failure (targets must equal declared before-image sha256) → `suspect_transaction` `targets do not match the complete declared before-image` (:696-711); writes `rolled_back` with proof-verified record (:728-734)

### work-unit-submit — `DEEP_RESEARCH_HARNESS/engine/work-unit-submit.mjs`
- `reasonCodeForSubmit` — regex classifier → `unsupported_current_contract` (work-unit-submit.mjs:929), `topic_binding_invalid` (:930), `missing_receipt` (:931), `nonce_mismatch` (:932), `wrong_work_id` (:933), `missing_output` (:934), `missing_cache` (:935), `stale_snapshot` (:936), `duplicate_content_mismatch` (:937), `invalid_result` (:938)
- `submitWorkUnit` — duplicate replay accepted only when re-parsed `result_hash === submitted.result_hash` else `different-content duplicate submit rejected` (:1217-1239,:2233-2244); integrity preflight `evaluateWorkUnitSubmitIntegrity` must pass (:2246-2264); transaction mutation targets declared exactly (result_ref, runtime_receipt_ref, status_ref, cache page.md refs, ledger, index, queue) (:2269-2281); postcondition verify: queue reload ok, no `delegated_in_flight`, terminal `done` row, index marks `submitted`, ledger row with matching queue_item_id; failure → `queue_postcondition_failed` (:142-186,:188-213)
- `lateSubmitWorkUnit` — missing `--reason` → `late_accept_reason_required` (:1426-1436); unreadable ledger → `invalid_ledger` (:1439-1451); rejects normal submitted row (`late-submit rejects normal submitted work`) (:1349); replay result_hash mismatch → audited `late-submit replay result hash mismatch` (:1361-1363); non-`timed_out` status → rejection `late-submit only recovers timed_out work units` (:1471-1481); existing ledger coverage → `target_already_covered` (:1483-1494); submitted replacement (same queue_item_id, different work_id) → `submitted_replacement_conflict` (:1496-1511); postcondition `late_submit_postcondition_failed` (:1984-1992)
- `recoverWorkUnitDeclaration` — requires status `submitted` (:639); reconstructed row hash must equal accepted ledger hash else `missing_contract: no legal recovery can reproduce` (:802-814); ambiguous reconstruction → `missing_contract: declaration reconstruction is ambiguous` (:815-819); Wave0 source-intake derivation failure → `missing_source_contribution_no_legal_recovery` (:751-754,:810-812)

### work-unit-validation — `DEEP_RESEARCH_HARNESS/engine/work-unit-validation.mjs`
- `readAndValidateManifest` — manifest/index mismatch on `work_id, queue_item_id, wave, kind, kind_code, receipt_nonce, queue_item_snapshot_hash` (work-unit-validation.mjs:79-81); `queueItemSnapshotHash(manifest.queue_item)` vs record (:90-93); `output_contract` drift → `manifest assignment output_contract drift` (:94-106); missing manifest → `Missing manifest` (:76)
- `validateManifestTopicBinding` — plan frontmatter unreadable / `CanonicalPlanSchema` failure / `resolveStructuredTopicBinding` failure → throws (:126-133)
- `readAndValidateBeacon` — `beacon.bundle_dir` must equal resolved bundleDir (:143-145); beacon/index/manifest equality for `work_id, queue_item_id, kind, receipt_nonce` (:146-149); contract-version drift checks (:150-172)
- `readAndValidateResult` — `--result` required (:178); unsafe wrapper (sibling keys) (:185); `result_binding_mismatch` on work_id/queue_item_id/kind (:222) and receipt_nonce (:229-253); `unrecognized_result_field` for unrecognized keys (:261); `result_schema_${code}` for other zod failures (:268)
- `validateSubmitRuntimeReceipt` — missing/empty lifecycle events (:303-306); per-line invalid JSONL (:313); binding mismatch on work_id/queue_item_id/kind/receipt_nonce (:337-369); every `WORK_UNIT_REQUIRED_RECEIPT_FIELDS` field must equal record (:388-390)
- `validateOutputFiles` — path escapes bundle (:420); declared output missing (:428); reference without `source_url` when required (:434); missing required output path (contract `required_outputs`) (:451); role mismatch → `must use canonical role` (:458)
- `validateCacheTrails` — `cache_trails[]` required by cache policy (:495); path escapes bundle / not under `_cache/` (:498-502); trail dir missing (:507); leaf contract missing files → throw (:524-530)
- `validateSourceClaims` — claims not allowed by contract → throw (:730); unsafe source_ref → `source_ref_unsafe` (:746); not authorized → throws with authorization reason (:772-783); accepted claim requires cache/degraded ref in `cache_trails[]` (:789-812); `accepted_source_urls[]` entry without matching claim → throw (:822)
- `validateQueueBindingForSubmit` — stale manifest snapshot / not delegated in flight / binding mismatch → throws (:839-845)
- `canonicalizeCacheLeafPage` — divergent `page.md`/`page-content.md` → throw; canonicalizes and records `cache_page_content_canonicalized` (:477-489)

### work-unit-submit-integrity — `DEEP_RESEARCH_HARNESS/engine/work-unit-submit-integrity.mjs`
- `evaluateWorkUnitSubmitIntegrity` — read-only preflight: profile failure → root code `profile.reason_code` with `unsupported current work-unit contract` (work-unit-submit-integrity.mjs:37-58); held/blocked transaction → root code `transaction.disposition` (:67-75); manifest/beacon failure → `attempt_binding_invalid` (:82-88); ledger failure → `submitted_ledger_invalid` (:95); ledger-fact failure → `submitted_integrity_invalid` / `submitted_declaration_missing` (repair recover-declaration) (:110-116); existing declaration rows on non-submitted attempt → `unexpected_submitted_declaration` (:119-125); queue in-flight binding missing / snapshot mismatch (:137-141); submitted requires exactly one terminal `done` row and no in-flight (:144-147); queue errors → `queue_binding_invalid` (:153); `ok: roots.length === 0` (:157)

### queue admission / drain — `DEEP_RESEARCH_HARNESS/engine/helpers/queue-demand-admission.mjs`
- `evaluateQueueDemandAdmission` — non-delegated → not applicable (queue-demand-admission.mjs:95); kind not in `DEFAULT_KIND_REGISTRY` → `delegated_kind_required` (:97); `wave1_topic_deepening` without `producer_rule:'topic_deepening'` → `wave1_producer_required` (:102); topic_uid/slug conflict → `topic_uid_conflict`/`topic_slug_conflict` (:30,:33); missing uid+slug → `topic_binding_required` (:48,:69); missing/blocked/non-canonical topic state → `canonical_topic_state_required` (:51-59); non-current uid/slug → `resolved.reason_code` (:64); finding_id conflict → `finding_id_conflict` (:78); unknown finding_id → `finding_id_unknown` (:84); assignment-contract failure → `assignment_contract_rejected` (:134-140)
- `admitQueueDemand` — reads plan `topic_registry` via `CanonicalPlanSchema`, `inspectCanonicalTopicState`, `finding-index.yaml`, delegates to pure evaluator (:167-177)

### phase-queue-drain — `DEEP_RESEARCH_HARNESS/engine/helpers/phase-queue-drain.mjs`
- `checkPhaseQueueDrained` — finding ids: `phase_queue_drained:authority_missing` (missing rb_queue.json) (phase-queue-drain.mjs:38); `authority_unreadable` (:52); `authority_schema` (QueueSchema failure) (:63); `:${terminalFailure.root_id}` (terminal no-successor) (:76); `delegated_in_flight` (non-empty) (:89); `active_front` (non-empty active_window) (:100-111); `refill_only` (refill_pool non-empty with empty active_window) (:114); passes only when none present (:120)

### cli-operation-contract — `DEEP_RESEARCH_HARNESS/engine/helpers/cli-operation-contract.mjs`
- `parseOperationInvocation` — rejects non-string-array args (cli-operation-contract.mjs:55); lone `--help` only (:57); help mixed with args → `help must be supplied as one standalone argument` (:58); unexpected positional / `=`-token → `unexpected argument` (:26); unknown option → `unknown option --${name}` (:30); duplicate option (:31); value option without value (:38); missing required option (:43); no form match → `invocation does not match an accepted operation form` (:66)
- `validateBundleDirectory` — non-option path required; must be a real (non-symlink) directory (:75-85)
- `validateReadableRegularFile` — real regular file (non-symlink) required (:91-101)
- `validateWorkflowPhaseReference` — must match `^phases\/[a-z0-9][a-z0-9-]*\.md$` (:106-108)
- `invocationError` — emits `{status:'error', error:'invalid_invocation', ...}` (:116-125)

### cache-leaf-contract — `DEEP_RESEARCH_HARNESS/engine/helpers/cache-leaf-contract.mjs`
- `CACHE_BASE_LEAF_FILES` — `['websearch.json','page.md','meta.json']` (cache-leaf-contract.mjs:6); `CACHE_SOURCE_MAPPING_FIELDS` `['url','source_url','final_url','fetched_url','source_slug']` (:7); degraded-signal fields (:8-14)
- `inspectCacheLeaf` — missing required leaf files → `missing ...` (:88); empty page.md → `page.md is empty` (:92); placeholder-only page without degraded signal → `page.md is placeholder-only` (:94-98); meta.json without source mapping → `meta.json lacks url/source mapping` (:101-106)
- `hasExplicitDegradedCapture` — regex over page text + signal fields for degraded/fetch-failure/blocked (:73-81)
- `resolveCacheLeafContract` — dedupes base leaf files ∪ policy `leaf_files` (:35-38)

### bundle-identity — `DEEP_RESEARCH_HARNESS/engine/helpers/bundle-identity.mjs`
- `normalizeBundleBasename` — `^dpt_rb_(.+)$` → group (production); `^dpt_disp_(.+)_[0-9a-f]+$` → group minus `case-\d+_` prefix; else `null` (bundle-identity.mjs:5-9)
- `normalizedBundleBasenameFromPath` — applies to `basename(bundlePath)` (:12-14)

### file-observability — `DEEP_RESEARCH_HARNESS/engine/helpers/file-observability.mjs`
- `auditCanonicalTopicFootprint` — reference binding failures → `reference_topic_binding_invalid` (blocking) (file-observability.mjs:543-560); dangling durable identities → `unregistered_durable_topic` (blocking) / non-durable → `dangling_topic_identity` (warning) (:588-601); missing registered-topic surfaces → `registered_topic_surface_gap` (blocking) (:603-621); unknown namespace → `unknown_durable_namespace` (warning) (:624-639)
- `auditFileObservability` — missing bundle → `Bundle directory not found` (:676); `checkCurrentEntryContract` failure → blocking `unsupported_current_entry_contract` (:681-697); accepted topic-layout workspace → blocking `accepted_topic_layout_workspace` (:699-719); per-file classification (`classifyFile` :283-463): `START_FROM_HERE.md`/entry debris → `unplanned_nonblocking` (:286-304); root control files + known engine dirs → `expected` (:307-328); non-work-unit delegated `_subagents/wave_N_/slot_N_/` → `unplanned_needs_explanation` warning (:331-341); stray `runtime-receipt.jsonl` → warning (:344-353); ledger-declared → `declared_authoritative` (:356-364); traced `file_explanation` → `explained_non_authoritative` (:378-387); target-phase pass-condition pattern without authority → `orphan_authority_blocking` blocker (:413-432); any-phase pattern → `unplanned_needs_explanation` (:435-453); emits `[work_unit_ledger_invalid]` (:743), `[non_authoritative_declaration]` (:747), `[cache_gap]` (:835-879), `[cache_source_claim_mismatch]` (:891), `[mixed_delegated_provenance]` (:905)

### canonical topic state / operate-topic-state — `DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs`
- `TOPIC_STATE_SCHEMA_VERSION` `'1.1.0'` (canonical-topic-state.mjs:35); `TOPIC_STATE_ROOT` `'_diagnostics/topic-state'` (:36); `TOPIC_STATE_OPERATIONS` `['inspect','schema','apply','recover']` (:37)
- `TopicApplyPlanSchema` — union of Mutation/Layout/SeedEnrichment/ProjectionPacket plans (:423); HITL1 actions cannot carry rerun `direction` (:278); rerun add/update requires `direction` (:279); `set_rerun_direction` outside rerun rejected (:280); one existing UID may have only one ordered action (:285-288)
- `ProjectionPacketSchema` — `context:'wave_projection'`, `action:'apply_seed_projection'`, wave ∈ {wave0,wave1,wave2}, updates ≥1 (:367-372); rejects duplicate slot_id in packet (:377-380); slot not owned by packet wave → `is not owned by ${packet.wave}` (:381-384); `deferred_contribution` only in Wave0 (:385-389); duplicate entry_id within a slot update (:392-396); source_identity kind per wave (wave0/wave1→submitted_work, wave2→finding) (:397-398); Wave2 entry_id must equal W2F finding_id (:399-402); Wave0/1 entry_id must match `<work_id>/<positive ordinal>` (:403-405); Wave0 packet must update only `wave0_evidence` (:415-416); Wave1 packet must atomically cover mechanisms+trends+pending_questions (:417-418); Wave2 packet must update `wave2_judgment` (:419-421)
- `applyCanonicalTopicState` — rejects imperative layout actions [remove, remove_topic, rename, renumber] and unsupported actions [retire, delete, move, path_move, set_progress, set_status, override] → `layout_mutation_not_supported` (:1829-1839); schema failure → blocked `input_invalid` (:1840-1857); accepted workspace exists → `accepted_workspace` (:1898-1899); lifecycle authorization failures → `hitl1_not_authorized`/`seed_topics_not_authorized`/`wave_projection_not_authorized`/`rerun_not_authorized`/`context_not_authorized` (:1900-1901); rerun direction count ≠ profile count+1 → throw (:1021-1028,:1905); `mutate_layout` sha256 mismatch → `plan_hash_mismatch` (:1908-1910); remove with dependents → `remove_has_dependents` (:1916); slug collision → `layout_slug_collision` (:1917); remove targets with history/artifacts → `remove_has_history`/`remove_history_unresolved` (:1529-1577,:1937-1938); active queue/work-unit work on affected topics → `active_topic_work` (:1499-1527,:1940-1943); unexplained seed targets → `seed_target_exists`/`seed_target_unsafe` (:1952,:1955); enrich post-write authoring failure → `writer_postcondition_failed` (:1965-1982); unchanged verdict when no byte drift (:1983-2002); workspace/plan/seedRoot must be same device (:2007)
- `applyCanonicalTopicState` projection path — non-current topic_uid → `projection_topic_not_current` (:1354); missing seed binding → `projection_seed_binding_invalid` (:1356); missing seed → `projection_seed_missing` (:1358); slot not owned by wave → `projection_slot_not_owned` (:1371); layout targets missing/ambiguous → `seed_projection_layout_missing`/`seed_projection_layout_ambiguous` (:1118,:1233,:1236); non-current source identity → `projection_source_identity_not_current` (:1208,:1221); Wave2: finding-index unreadable → `wave2_finding_index_unavailable` (:1154), round invalid → `wave2_profile_round_invalid` (:1158), finding absent → `wave2_finding_not_found` (:1166), no affected_topics → `wave2_finding_affected_topics_invalid` (:1171), stale finding → `wave2_finding_not_current` (:1174,:1177), topic token unresolved → `wave2_finding_topic_invalid` (:1142), finding not matching packet topic → `wave2_finding_topic_mismatch` (:1181); Wave0 deferred: not retained → `projection_deferred_contribution_not_current` / cross-topic `projection_deferred_contribution_cross_topic` (:1296), limitation rule failure → `projection_deferred_contribution_limitation_invalid` (:1310), conflicting disposition → `projection_deferred_contribution_collision` (:1330); post-write: missing card/parse failure/retained initial token/bad navigation → `writer_postcondition_failed` (:1083-1102)
- `inspectCanonicalTopicState` — accepted workspace → blocked `accepted_workspace` (:1703); non-symlink rb_plan.md required (:1705-1706); frontmatter must pass `CanonicalPlanSchema` else `plan_invalid` (:1710-1717); computes `plan_sha256` (:1718-1738)
- `recoverCanonicalTopicState` — `prepared_manifest_missing` (:2047); `staged_file_missing` (:2052); symlink staged/target → `staged_file_unsafe`/`target_unsafe` (:2053-2054); target hash drift → `late_drift` (:2057,:2071); pre-existing temp → `temporary_target_exists` (:2059); unsafe cleanup target → `cleanup_target_unsafe` (:2070); verdict `committed` on success (:2044-2092)
- `evaluateCanonicalSeedBindings` — `seed_topics/<slug>.md` missing → `seed_missing` (:1584-1586); authoring fails → `seed_mismatch` (:1596-1600)
- `inspectSeedTopicsAuthoringAuthorization` — handoff preflight + status window `setup_ready|rerun_ready`→`seed_topics_ready`; else `seed_topics_not_authorized` (:1421-1438,:1496-1498)

### topic-layout — `DEEP_RESEARCH_HARNESS/engine/helpers/topic-layout.mjs`
- `resolveReferenceTopicBinding` — legacy `related_topic` key → `reference_topic_binding_legacy_unsupported` (topic-layout.mjs:139-141); missing uid(s) → `reference_topic_binding_missing` (:143-146); comma-form uid → `reference_topic_uid_invalid` (:94-99); unknown uid → `reference_topic_uid_unknown` (:100-105); empty array → `reference_topic_uids_empty` (:107-109); invalid/duplicate/unknown array entries (:114-125); both uid forms → `reference_topic_binding_conflict` (:157-164)
- `resolveTopicLayout` — no identifiers → `topic_binding_missing` (:170); unknown slug/uid → `topic_slug_unknown`/`topic_uid_unknown` (:172-174); uid/slug resolving differently → `topic_uid_slug_mismatch` (:175-177); `currentOnly` with stale slug → `previous_layout_not_current` (:182-190)
- `resolveStructuredTopicBinding` — no candidates → `structured_topic_binding_missing` (:194-214); multiple distinct uids → `structured_topic_binding_ambiguous` (:220-221)
- `buildTopicLayoutTarget` — duplicate topic_uid (:241-242); submitted set must cover every current uid exactly once (:243-245); removing a topic with dependents → `remove_has_dependents` (:248-252); slug collision → `layout_slug_collision` (:273-280)

### topic-registry-fact — `DEEP_RESEARCH_HARNESS/engine/helpers/topic-registry-fact.mjs`
- `buildCanonicalTopicRegistryFact` — plan must parse `CanonicalPlanSchema`; else throws `canonical topic_registry invalid: <issues>` (topic-registry-fact.mjs:7-12); returns `{topic_registry, layouts, wave_layouts}` (:13-21)

### seed-topic-authoring-evaluator — `DEEP_RESEARCH_HARNESS/engine/helpers/seed-topic-authoring-evaluator.mjs`
- `SEED_TOPIC_INITIALIZATION` — start/end markers `<!-- seed-initialization:start -->`, appendix heading `═══ 研究轮次追加区 ═══` (seed-topic-authoring-evaluator.mjs:20-50)
- `evaluateSeedInitializationStructure` — no markers → legacy (unjudged) (:102-107); ≠1 start/end marker or appendix heading → `seed_initialization_structure` (:109-118); wrong ordering (:123-130); renderer-owned headings below boundary (:132-141); `pending —` template markers below boundary (:142-149); missing/duplicated/out-of-order section headings (:151-164); passes with `mode:'current'` (:166)
- `evaluateSeedTopicAuthoring` — relativePath ≠ `seed_topics/<slug>.md` → `path_mismatch` (:199-209); frontmatter unparseable/non-object → `frontmatter_invalid` (:211-234); any BINDING_FIELDS [topic_uid, id, slug, title, must_answer, scope_role, depends_on_topic_uids] differing from canonical topic → `canonical_binding_mismatch` with coordinate (:236-246)
- `admitSeedTopicMaterializeDeclaration` — payload.topic_slug missing/not resolving to exactly 1 current topic → fail (`missing_contract`) (:263-270); `writes_to` must be exactly `['seed_topics/<slug>.md']` and `required_receipts` exactly `['file:seed_topics/<slug>.md']` (:272-284)

### return-map / seed projection readiness — `DEEP_RESEARCH_HARNESS/engine/helpers/return-map.mjs`
- `validateReturnMapContent` — missing required fields → `return_map_missing_fields` (return-map.mjs:233,:237-251); bad relationship → `return_map_relationship` (:254-271); bad status → `return_map_status` (:272-289); ≥2 naked evidence lines → `return_map_naked_evidence_list` (:70-76,:292-305); prose-only conclusion → `return_map_unsupported_prose` (:78-84,:307-320); Wave2 backfill lacking W2F id → `return_map_missing_finding_id` (:322-337); evidence-bearing entries lacking wave1 refs → `return_map_missing_wave1_refs` (:339-356); backfill lacking wave2 refs → `return_map_missing_wave2_refs` (:358-372); concrete-reference navigation failures → `return_map_missing_concrete_reference`/`return_map_concrete_reference` (:166-218,:374-379)
- `evaluateSeedTopicProjectionReadiness` — wave2 authority blockers `return_map_finding_index_authority` (:665-681), `return_map_profile_round_authority` (:647-663), `return_map_finding_projection_field` (:628-645); per-topic seed binding failure → `return_map_seed_binding` (:461-479,:794-806); canonical heading without fixed card → `seed_projection_card_missing` (:816-826); demanded slot missing/unusable → `return_map_target_family_unavailable` (repair forbids hand-editing layout) (:481-501,:827-835); retained `__BACKFILL_*` token in demanded slot → `seed_projection_token` (:837-853); generic `WaveN submitted` prose → `seed_projection_generic_prose` (:855-882); identity failures (malformed/out-of-range ordinal/conflicting refs/W2F mismatch) → `seed_projection_entry_identity` (:917-988); omissions → `return_map_current_candidate_omission` (:992-997), `return_map_current_row_omission`/`return_map_current_finding_omission`/`return_map_legacy_finding_omission` (:998-1006)
- `hasBackfillToken` — detects `__BACKFILL_[A-Z0-9_]+__` and wave-scoped initial tokens (:57-68)

### projection-entry-contract — `DEEP_RESEARCH_HARNESS/engine/helpers/projection-entry-contract.mjs`
- `PROJECTION_ENTRY_FIELDS` — `[evidence_meaning, relationship, refs, status, next_hop]` (projection-entry-contract.mjs:6-8)
- `isSafeProjectionRef` — rejects refs starting `/`, Windows drives, or containing `..` (:78-84)
- `isAcceptedDeferredProjectionEntry` — requires relationship `defers` + status `deferred` + empty refs + next_hop matching limitation regex (:86-93)
- `parseProjectionEntries` — flags `dangling_entry_id` and `duplicate_entry_id` metadata issues (:110-177)
- `parseProjectionEntryArea` — rejects non-whitespace gaps → `unparsed_content` (:226-245); inline entry markers → `inline_entry_marker` (:247); blocks not parsing to exactly one entry → `entry_boundary_unparseable` (:249-252,:265); missing entry_id/required fields → `entry_fields_invalid` (:254-262)
- `upsertProjectionEntryArea` — initial token occurring >1× → `seed_projection_token_ambiguous` (:269-283); duplicate entry_id → `seed_projection_duplicate_entry_id` (:286-289)
- `evaluateProjectionEntryNavigation` — generic `Wave[012] submitted` meaning → `projection_entry_generic_prose` (:307-315); empty refs without deferred disposition → `projection_entry_deferred_limitation_missing` (:321-329); unsafe refs → `projection_entry_ref_invalid` (`unsafe_ref`) (:339-341,:363-373); glob/count-summary refs → `projection_entry_ref_invalid` (`glob_or_count_summary`) (:344-347); non-flat `reference/<file>.md` refs → `projection_entry_ref_invalid` (`not_concrete_reference_md`) (:348-351); missing existing files → `projection_entry_ref_missing` (:352-355,:374-383); zero concrete refs → `projection_entry_concrete_ref_missing` (:384-392)
- `contractError` — attaches `reason_code` to thrown errors (:24-26)

### wave gate verdict / findings — `DEEP_RESEARCH_HARNESS/engine/helpers/wave-gate-verdict.mjs`
- `projectWaveGatePublicVerdict` — partitions direct failed rule ids vs degraded; `degraded` requires routeAvailable ∧ ≥1 degraded candidate ∧ 0 remaining blockers (wave-gate-verdict.mjs:23-25); `passed` false when route unavailable or non-degraded failures remain; `failed_rule_ids` revert to all direct failures when not degraded (:28-29)

### wave-contract-findings — `DEEP_RESEARCH_HARNESS/engine/helpers/wave-contract-findings.mjs`
- `makeContractFinding` — blocking findings must carry valid `finding_source`/`blocking_basis`/`repair_kind`/`write_to` (no unresolved `{...}`/`<...>`/`$checked_target` tokens) and `observed`/`missing_fact`; violations → `configuration_integrity:<ruleId>` replacement finding (wave-contract-findings.mjs:92-160)
- `makeDefinitionRuleFinding` — resolves `{bundle}`/`{topic}`/`<slug>`/`$checked_target` coordinates; deterministic `missing_fact`; always `classification:'blocking'` (:167-226)
- `buildContractEvaluation` — dedupes by `classification|rule_id|id|surface|write_to|masked_by_rule_id` (:239-257); `passed: failedRuleIds.length === 0` where blocking = classification 'blocking' && unmasked (:259-289)
- `emitInspectResult` — writes JSON to stdout then `process.exit(exitCode)` (:369-381)

### wave-contract-evaluators — `DEEP_RESEARCH_HARNESS/engine/helpers/wave-contract-evaluators.mjs`
- `evaluateWave0Contract` — unreadable/empty topic registry → `wave0_topic_registry_prerequisite` (wave-contract-evaluators.mjs:601-610); masks declaration-dependent rules when `checkSubmittedDeclarationRecovery` fails (:611-615, :551-561); unknown check/rule-eval error → `configurationFinding` (`configuration_integrity`, `missing_contract`) (:715-719); `shared_ref_count_floor` runs `evaluateWave0ReferenceConvergence` with profile threshold, masked on legacy binding or work-unit blockers (:736-760)
- `evaluateWave1Contract` — registry prereq `wave1_topic_registry_prerequisite` (:786-795); carries `selectWave1CarriedTargetReceipt` findings (:804-805); per-rule dispatch incl. `focus_coverage_limit` → `focusCoverageLimitFinding` blocking `${rule.id}:${topic}` (:984-1000); `reference_ledger_coverage`/`reference_index_coverage`/`depth_review_contract` checks (:972-983); unknown check → `configurationFinding` (:1013-1017)
- `evaluateWave2Contract` — registry prereq `wave2_topic_registry_prerequisite` (:1047-1058); masks missing-file rules and legacy-binding rules (:1081-1105); `rerun_add_full_synthesis` via `checkRerunAddFullSynthesis` (action:add topics, Delta Synthesis ban, exact pair coverage) (:1190-1215); `finding_index_contract` via `checkWave2FindingIndexContract` (:1216-1219); unknown check → `configurationFinding` (:1241-1245)

### wave-depth-contracts — `DEEP_RESEARCH_HARNESS/engine/helpers/wave-depth-contracts.mjs`
- `evaluateWave1FocusCoverage` — wrong root keys → `focus_coverage_shape_invalid` (wave-depth-contracts.mjs:177-180); topic_uid unresolvable/mismatch → `focus_coverage_topic_invalid`/`focus_coverage_topic_mismatch` (:186-194); rerun_count ≠ current profile round → `focus_coverage_round_mismatch`/`focus_coverage_round_invalid` (:196-204); outcome ∉ {covered,partial,blocked} → `focus_coverage_outcome_invalid` (:206-208); per commitment: state ∈ {covered,limited} (:237-239), duplicate ids (:246-252); `limited` needs non-empty limitation + boundary_kind ∈ {external_action,user_decision,missing_contract} (:259-264); `covered` needs non-empty `submitted_work_unit_refs` (:269-271), refs reviewed (`focus_coverage_ref_not_reviewed` :279-282), hash-valid submitted rows (`focus_coverage_ref_unresolved` :283-288), wave1_topic_deepening kind (:289-292), round match (:293-295); outcome/commitment matrix → `focus_coverage_outcome_matrix_invalid` (:299-305)
- `deriveWave1NewSourceFloor` — missing/invalid `wave1_per_topic_ref_floor`/`topic_unique_ratio` → `missing_profile_parameter` (:341-364); required = `max(1, ceil(perTopicFloor * topicUniqueRatio))` (:368)
- `checkSourceClaimCacheMapping` — accepted source claims must have url, safe source_ref covered by submitted output, `cache_trail_refs[]` or `degraded_capture_ref`; each trail in a submitted ledger row, valid cache leaf, actually degraded, URL matches claim; failures prefixed `[source_claim_cache_mapping] FAIL:` (:394-459)
- `checkWave1DepthReviewContract` — missing file → `:missing` + masks (:481-502); YAML parse → `:yaml_parse` (:508-528); required keys `version, topic_slug, reviewed_work_unit_refs, depth_dimensions, profile_checks, decision, supplementary_queue_item_ids` (:557-565); `decision` ∈ {accept,supplement_required,blocked_contract} (:578-583); `supplement_required` needs non-empty `supplementary_queue_item_ids` (:590-593); depth_dimensions covered+refs (:604-613); profile_checks per profile (:615-627); `reviewed_work_unit_refs[]` must resolve to submitted rows — unsafe → fail (:659-663), not on submitted surfaces → fail (:667-672), binding failure → `:reviewed_work_unit_refs_binding` (`binding_integrity`, `missing_contract`, "no existing legal submitted-work or replacement owner") (:772-791); new-source floor deficit → `[source_novelty_floor] FAIL:` (:723-728); aggregates `:depth_review_content` (:759-771), `:submitted_ledger` (:809-821), `:supplementary_work` (:822-834)
- `evaluateWave2PairFacts` — builds canonical pair universe from topic layouts (:858-883); rejects `pair_scan_parent_invalid` (:888-890), `pair_coverage_parent_invalid` (:891-894), `pair_container_invalid` (:899-912), `pair_entry_invalid` (:915-922), `pair_topic_unknown` (:924-931), `pair_self_invalid` (:932-935), `pair_duplicate_invalid` (:936-941), `pair_topic_count_mismatch` (:949-951), `pair_count_expected_mismatch` (:952-954), `pair_count_checked_bounds`/`pair_count_checked_mismatch` (:955-959), `pair_scan_empty` (:960-962); `usable`/`complete` = no issues + full universe coverage (:966-968)
- `checkWave2FindingIndexContract` — required top-level keys `version, source_layer, ledger, synthesis, scan, findings, synthesis_eligibility` (:1122-1129); `scan_matrix_present === true` (:1147-1150); per-finding required fields incl. `id, type, priority, status, decision, affected_topics, origin_refs, trigger_refs, search_required, subagent_receipt_refs, appears_in_synthesis, hitl2_handoff, confidence, independent_backing_refs, gap_status` (:1196-1203); id regex `W2F-[0-9]{3}` (:1204); enum sets for type/priority/status/decision/confidence/gap_status (:1205-1210); cross_topic_resolution needs origin/trigger refs + `search_required:false` (:1218-1222); emergent question needs ≥2 affected topics (:1223-1225); exploit/explore ⇒ `search_required=true` (:1228-1232); defer/requires_internal_data ⇒ `hitl2_handoff=true` (:1233-1237); confidence=high ⇒ `independent_backing_refs >= p0p1_independent_backing` (:1245-1247); `search_required=true` ⇒ receipt refs backed by submitted Wave2 rows (:1248-1250,:1263-1265); consumer-facing backed findings need `reference/00-cross-*.md` projection or explicit omission → `[cross_reference_materialization] FAIL:` (:1266-1271); p0/p1 + low/uncertain confidence must be routed → `[synthesis_eligibility] FAIL: under-backed priority finding` (:1272-1277); declared eligibility counters must equal engine-derived counts (:1281-1306); carried-target closure via `inspectCarriedTargetClosure` → `wave1_target_bindings:<id>:shape|item_shape|stale|coverage` with `[wave1_target_binding]` prefix (:1028-1043,:1308-1310)
- `loadWave2FindingIndexFact` — missing/non-object/parse-failure → `missing`/`object_shape`/`yaml_parse` with `[finding_index_contract] FAIL:` inspect (:845-856)

### wave0-reference-convergence — `DEEP_RESEARCH_HARNESS/engine/helpers/wave0-reference-convergence.mjs`
- `evaluateWave0ReferenceConvergence` — non-positive-integer floor → `wave0_reference_convergence_profile_floor` (`authority_integrity`, surface `rb_profile.yaml#/research_style_params/wave0_shared_ref_total`, `missing_contract`) (wave0-reference-convergence.mjs:20-35,:150-152); invalid shared-reference files → `wave0_reference_backing:<relPath>:<reason_code|unbacked>` (:37-57,:116-120); >1 Phase-owned projection per submitted source identity → `wave0_projection_identity_collision:<entryId>` (:59-75,:103-105); index coverage under rule `wave0_reference_navigation` (:106-110,:119); `deficit = max(0, floor - observed)` (:170); satisfied when `deficit === 0` (:171-182); else `materialize_projection` (first unprojected+non-deferred submitted candidate with exact backing) (:184-210) or `missing_acquisition`/`reference_floor_deficit` (:212-222)

### wave1-reference-convergence — `DEEP_RESEARCH_HARNESS/engine/helpers/wave1-reference-convergence.mjs`
- `canonicalWave1ReferencePath` — invalid topic slug → `topic_slug_invalid` (wave1-reference-convergence.mjs:43-45); unparseable URL → `source_url_invalid` (:46-49); canonical path `reference/<slug>-<token>-<sha256:12>.md` (:50-58)
- `classifyWave1ReferencePath` — `canonical_current` (exact canonical path) / `legacy` (`reference/\d+-wave1-*.md`) / `misnamed_current` / `other` (:64-71)
- `resolveReviewedWave1SubmittedBacking` — topic binding failure → `wave1_reference_topic_invalid` (:154-155); missing depth review → `reviewed_work_unit_refs_missing` (:157-158); parse failure → `reviewed_work_unit_refs_invalid` (:160-169); invalid ledger → `submitted_backing_ledger_invalid` (:171-176); unsafe ref → `reviewed_work_unit_ref_unsafe` (:181-183); unsubmitted ref → `reviewed_work_unit_ref_unsubmitted` (:184-185); wrong kind → `reviewed_work_unit_kind_invalid` (:187-189); manifest stale → `manifest_snapshot_invalid` (:191-199); manifest not bound to current topic → `manifest_topic_binding_invalid` (:200-203); URL unparseable/not in `accepted_source_urls` → `submitted_backing_url_invalid`/`submitted_backing_url_unaccepted` (:207-212); claim backing invalid → `submitted_backing_source_ref_invalid`/`submitted_backing_source_projection_unavailable`/`submitted_backing_cache_mapping_invalid` (:107-136,:213-216)
- `inspectWave1CandidateProjection` — missing canonical file → `canonical_projection_missing` (:274-284); rejection precedence `canonical_projection_url_unbound` → `canonical_projection_body_unbound` → `canonical_projection_format_invalid` → `canonical_projection_url_invalid` → `canonical_projection_not_countable:<reason>` (:301-315)
- `evaluateWave1ReferenceConvergence` — parent roots for backing/topic/floor failures (:447-453); incomplete projection → `materialize_projection` (:455-465); invalid/stale index → `sync_reference_index` (:466); observed < floor → `existing_supplementary` (live demand) or `reference_floor_deficit` with `enqueue_payload` (:473-483); else `satisfied` (:485)

### ref-count — `DEEP_RESEARCH_HARNESS/engine/helpers/ref-count.mjs`
- `isCountable` — counts only if: file exists (else `file_missing` ref-count.mjs:68-70), parseable metadata (else `unparseable` :71-83), no legacy `related_topic` binding (else `reference_topic_binding_legacy_unsupported` :88-90), `acceptance_status === 'accepted'` (else `acceptance_status_not_accepted:<status|missing>` :99-105), non-empty URL-parseable `source_url` (else `source_url_missing`/`source_url_empty`/`source_url_invalid` :108-127)
- `countReferences` — ledger mode collects `role:'reference'` outputs from `rb_output_declarations.jsonl` + Phase-owned projections via `classifyReferenceAuthority` (:233-264); invalid ledger → count 0 with `invalid_submitted_work_unit_ledger:<msg>` (:237-247); filesystem mode diagnostic-only (:265-268); undeclared reference files → `reference_not_in_count_scope`/`filesystem_only_not_backed:<reason>` (:287-300)

### reference-index-sync — `DEEP_RESEARCH_HARNESS/engine/helpers/reference-index-sync.mjs`
- `renderReferenceIndex` — topic registry invalid → blocked `reference_index_topic_registry_invalid` (reference-index-sync.mjs:98); unreadable file → `reference_index_reference_unreadable` (:108-114); invalid syncDate → `sync_date_invalid` (:122); any unclassifiable reference blocks the render with its reason_code (:126-131); renders `reference/_INDEX.md` rows (source_type, trust_level, tier, related_topic, source_layer, acceptance_status, date_landed) (:46-60,:140)
- `renderReferenceEvidenceMap` — retired legacy reference → blocked `reference_topic_binding_legacy_unsupported` (:307-317); per-topic focus status `depth_review_missing`/`depth_review_shape_invalid`/`depth_review_parse_invalid`/`depth_review_check_failed`/`depth_review_contract_invalid`/`focus_coverage_invalid` (:199-303); unavailable profile round → `profile_round_unavailable` (:332-337)
- `syncReferenceIndex` — unreadable current target → blocked `reference_navigation_target_unreadable` (:401-412); identical bytes → `unchanged` (:413-415); persists via `persistBundleFile` with expected sha256 (:416-425); commit failure → blocked with `persisted.reason_code` (:426-428); write failure → `reference_navigation_sync_failed` (:429-431); verdicts `blocked`/`unchanged`/`committed` (:434-473)

### phase-status-audit — `DEEP_RESEARCH_HARNESS/engine/helpers/phase-status-audit.mjs`
- `PHASE_STATUS_AUDIT_OUTCOMES` — closed set `['passed','post_final_recovery_pending','post_final_reentry_pending_load','post_final_reentry_pending_status_sync','status_drift','manual_bypass_suspected','missing_witness','failed_gate_downstream_status','bootstrap_exception']` (phase-status-audit.mjs:10-20)
- `auditPhaseStatus` — trace witness missing/unreadable → `missing_witness` (:167-189); rb_status.json absent → `missing_witness` (:191-200); invalid JSON → `status_drift` (:202-213); post-final stage `accepted_workspace` → `post_final_recovery_pending` (:215-225); `pre_entry` → `post_final_reentry_pending_load` (:226-234); `loaded_pending_status` → `post_final_reentry_pending_status_sync` (:235-243); latest failed `gate_attempt` with `next:null` while status claims a window at-or-after the failed node → `failed_gate_downstream_status` (rejects advance past failed gate) (:274-294); `final/` has report-like files before legal readiness-to-final handoff → `status_drift` (premature final output is diagnostic only) (:296-310); status window matches witnessed handoff but phase_transition witness missing → `missing_witness` (:312-325); bootstrap windows `setup_ready|seed_topics_ready`→`template_initial_setup_window`, `hitl1_recorded|setup_ready`→`hitl1_to_setup_bootstrap_window` → `bootstrap_exception` (:22-25,:337-348); no witnessed legal window → `manual_bypass_suspected` (:350-361); `next_gate` resolves to node ≠ latest legal handoff target → `manual_bypass_suspected` (:363-375); window mismatch → `status_drift` (:377-386); all outcomes diagnostic_only (advice: "do not hand-edit rb_status.json") (:151-163,:165)

### recovery-contract — `DEEP_RESEARCH_HARNESS/engine/helpers/recovery-contract.mjs`
- `RecoveryActionSchema` — kind ∈ `['rerun_gate','enter_phase','advance_status','topic_state','post_final_recovery','repair_surface','current_owner','new_bundle_decision']`; target_ref min 1 (recovery-contract.mjs:10-18)
- `RecoveryRootFindingSchema` — superRefine: reachable root requires `recommended_action`; non-reachable root cannot carry one; `missing_contract` root requires `direct_blocker` (:33-50)
- `RecoverySummarySchema` — superRefine: blocking canonical finding must have a root projection with matching `source_ref` (:52-68)
- `assessStructuredRecoveryAction` — `rerun_gate` without node_ref → REJECTS `missing_contract` with direct_blocker `rerun_gate action lacks a deterministic node_ref preflight target` (:79); `enter_phase` preflighted via `validateEnterPhaseTarget` (:70-77); sanctioned kinds → reachable (:85-90); otherwise `not_applicable` with blocker `No existing sanctioned deterministic repair contract applies to this surface.` (:91)
- `buildRecoverySummary` — roots per blocking canonical finding (`recovery:<finding.id>`, `canonical_topic`), existing blockers, and `recovery:post-final-recovery` when a final projection exists; reachable only when post-final verdict ≠ `blocked` (:162-203)

### current-entry-contract — `DEEP_RESEARCH_HARNESS/engine/helpers/current-entry-contract.mjs`
- `checkCurrentEntryContract` — verifies both `BUNDLE_ENTRY.md` and `BUNDLE_MAP.md` exist; missing either → `{passed:false, code:'unsupported_current_entry_contract'}` (current-entry-contract.mjs:18-26); deliberately does not parse Markdown or interpret legacy files (:14-17)

### post-final-reentry-contract — `DEEP_RESEARCH_HARNESS/engine/helpers/post-final-reentry-contract.mjs`
- `PostFinalDigestSchema` — `/^[a-f0-9]{64}$/` (post-final-reentry-contract.mjs:4); `PostFinalOperationIdSchema` — UUID (:5)
- `PostFinalRoutingSchema` — strict: `source_node` literal `phases/phase-hitl2.md`, `outcome` literal `rerun`, `source_gate_enum` literal `hitl2_recorded`, `transition_table_sha256` digest (:26-33)
- `PostFinalRecoveryEventSchema` — strict full event schema: `event` literal `post_final_reentry`, `action` literal `post_final_rerun`, `decision_source` literal `explicit_post_final_request`, `execution_actor` literal `phase_agent`; superRefine rejects event_id not derived from operation_id (:34-58)
- `parsePostFinalRecoveryEvent` — parses via schema, throws on any violation (:60-61)

### consistency-validator — `DEEP_RESEARCH_HARNESS/engine/consistency-validator.mjs`
- `validateWorkflowPackage` — sole export; returns `{passed: issues.length===0, issues}` (consistency-validator.mjs:34,:848-851); issue classes (each `{class, detail, file}`): `manifest_unreadable` (:47), `frontmatter_invalid` (:64), `node_unreadable` (:79), `manifest_missing_node` (:145), `manifest_missing_shared` (:156), `gate_binding_mismatch` (node frontmatter gate ≠ manifest phase.gate) (:172), `gate_definition_missing` (:184), `gate_definition_name_mismatch` (:203), `gate_definition_unreadable` (:211), `transition_missing_current_node` (:227), `transition_missing_next_node` (:239), `transition_missing_entry` (:253), `transition_chain_invalid` (:262), `unresolvable_dependency` (:290), `unresolvable_context` (:310), `execution_contract_missing` (:412,:536,:822), `execution_contract_invalid_surface` (:423), `execution_contract_invalid_search_policy` (:432), `execution_contract_surface_mismatch` (:441), `execution_contract_search_policy_mismatch` (:449), `work_unit_capable_missing_subagent_protocol` (:460), `work_unit_capable_missing_anti_cheating` (:467), `execution_contract_missing_delegated_role_keys` (:478), `lifecycle_execution_brief_invalid` (:491), `lifecycle_execution_brief_fields_invalid` (Objective/Start here/Path field/Completion check/Failure posture) (:500), `lifecycle_phase_body_section_missing` (:510), `missing_role_spec` (:523), `role_spec_wrong_node_type` (:546), `role_spec_id_mismatch` (:553), `role_spec_wrong_shared_scope` (:561), `role_spec_role_mismatch` (:569), `role_spec_wrong_authority` (:577), `role_spec_lifecycle_frontmatter` (:587), `role_spec_requires_invalid` (:598), `role_spec_actor_fetch_dependency_invalid` (:609), `role_spec_kind_registration_mismatch` (:616), `role_spec_suggested_context_invalid` (:624), `role_spec_h1_mismatch` (:634), `role_spec_phase_h1` (:642), `role_brief_invalid` (:653), `role_brief_fields_invalid` (:663), `role_brief_role_key_mismatch` (:669), `role_body_section_missing` (:679), `role_spec_lifecycle_heading` (:690), `role_spec_wrong_surface` (:699), `role_spec_wrong_search_policy` (:707), `role_spec_missing_loaded_by` (:715), `role_spec_missing_delivered_via` (:723), `role_write_capability_missing` (:731), `role_spec_in_manifest_phases` (:742), `role_spec_in_manifest_shared` (:750), `serialization_contract_violation` (artifacts must use `yaml.stringify()`/`JSON.stringify()`) (:768), `missing_actor_fetch_guidance` (:779), `actor_fetch_guidance_identity_invalid` (:793), `actor_fetch_guidance_in_manifest_shared` (:800), `shared_guidance_wrong_surface` (:831), `shared_guidance_search_capable` (:839)

### gate-helpers check library — `DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-*.mjs`
- `gate-helpers.mjs` — pure barrel re-export of gate-helpers-core/readers/checks/provenance/serial + handoff-helpers + wave-depth-contracts + `checkPhaseQueueDrained` + `evaluateRerunAvailability` (gate-helpers.mjs:15-116)
- `parseGateCliArgs` — missing `--bundle` → `gate_invocation_bundle_required` (gate-helpers-core.mjs:132-154, id :135); missing `--current-node` → `gate_invocation_current_node_required` (:156-180, id :159); `--attempt` must be base-10 non-negative int else fallback 0 (:187-199)
- `loadGateDefinition` / `tryLoadGateDefinition` — loads `schema/gate_definitions/gate-<gateKey>.definition.json`; invalid/missing → `gate_definition_contract_invalid` config_error (:222-266, id :245)
- `checkNodeGateBinding` — unregistered node → `gate_node_binding_unknown_node` (:298-314, id :301); gate/node mismatch → `gate_node_binding_mismatch` (:316-336, id :319)
- `resolveRouting` — invalid_input/config_error routing → `gate_routing_invocation_invalid`/`gate_routing_configuration_invalid` (:357-386)
- `buildGateResult` — sets `check.next` only when `routing.kind === 'next'` (:507); fatigue/step_back injected when `!passed && attemptNumber >= fatigueThreshold` (:525-534)
- `emitGateResult` — config errors exit 2; exit 0/1 by `passed`; best-effort `writeGateAttempt` audit on failure (:613-643)
- `writeGateAttempt` — rejects `carriedTargetReceipt` unless a routed wave1 pass (:820-822); rejects routed wave1 pass lacking valid receipt (:823-825); rejects `compositionHandoffReceipt` unless routed hitl2 proceed (:826-828); rejects routed hitl2 proceed lacking receipt (:829-831); appends `gate_attempt` trace event; under `strictTrace`, non-durable trace → `gate_attempt_trace_not_durable` (:882-918, id :769); `setupReadyStaged` route → `setup_ready_route_persistence_failed` (:925-937,:1002-1034)
- `writeCheckpointManifest` — writes `_checkpoints/<iso>-<gate>.json` binding gate_result_ref, status snapshot, topic-registry summary, queue summary, artifact inventory, cursors, control-file sha256/size/mtime hashes (:1064-1218)
- `writeGateFailureDiagnostic`/`writeGatePassDiagnostic` — `_diagnostics/gates/<iso>-<gate>.json` only when failed/passed respectively; failure diagnostic appends `gate_failure_detail` trace pointer (:1241-1290,:1310-1340)
- `writePlanProgress` — flips `- [ ] <gate>` → `- [x] <gate> (<ISO8601>)` in `## Progress` of rb_plan.md; atomic temp+rename (:1380-1416)
- `parseMdFrontmatter` / `stripMdFrontmatter` — parse/strip opening YAML frontmatter (gate-helpers-readers.mjs:31-52)
- `resolveThreshold` — resolves count_floor threshold from `rule.threshold_source` profile path via `Number()`; rejects when source absent/profile missing/no `#/`/empty path/non-finite-non-positive (gate-helpers-readers.mjs:119-152)
- `validateState` / `validateRules` — state must be plain object; rules non-empty array each with `key`/`say` and `schema` or `check` (:158-189)
- `readNormalizedSubmittedWorkUnitDeclarations` — authoritative submitted-ledger reader; throws `invalid submitted work-unit declaration ledger` on invalidity; internal `collectWorkUnitLedgerRowIssues` rejects `ledger_record_hash` mismatch (:288-291), missing index record (:293-296), index status ≠ 'submitted' (:297-299), ledger/index field mismatches (:300-302), path mismatches (:303-305), late-accept conflicts (:313-319) (gate-helpers-readers.mjs:275-343)
- `REQUIRED_REFERENCE_METADATA_FIELDS` — `['source_url','acceptance_status','source_type','tier','evidence_role','trust_level','why_it_matters','accessed_at']` (gate-helpers-checks.mjs:388-397); `REQUIRED_REFERENCE_SECTIONS` — `['Key Facts','Core Content Capture','Relevance To This Research','Quotable Terms / Concepts','Risks And Limitations']` (:401-407)
- `readReferenceMetadata` — invalid frontmatter boundary → `reference_metadata_frontmatter_invalid` (:489-498); YAML parse failure (:500-512); non-mapping (:514-523)
- `classifyReferenceAuthority` — authority classifier: unsafe relPath → `unbacked`/`unsafe_reference_path` (:772-782); invalid ledger → `unbacked`/`submitted_backing_ledger_invalid` (:784-797); delegated_fetched_evidence when submitted reference output (:799-806); missing file → `unbacked`/`reference_file_missing` (:807-817); missing source_url → `unbacked`/`reference_source_url_missing` (:834-844); Wave1 topic refs unbacked → `unbacked_projection`/`submitted_source_backing_missing` (:846-857) or `reference_body_backing_ref_missing` (:858-868); Wave2 cross refs → `wave2_source_backing_missing` (:884-894), `wave2_process_refs_missing` (:895-905), `wave2_submitted_locator_missing` (:906-916); Wave0 shared refs → `wave0_projection_source_url_ambiguous` (:256-266), `wave0_source_identity_missing` (:270-280), `wave0_source_identity_ambiguous` (:281-291), `wave0_submitted_backing_url_mismatch` (:313-323), `wave0_submitted_backing_refs_missing` (:325-342); anything else → `delegated_bypass` fall-through (:928-936); accepted values `delegated_fetched_evidence`/`phase_owned_projection`
- `checkReferenceFormatFiles` — missing/empty metadata fields, unresolvable topic binding (`reference_topic_binding_missing`/`reference_topic_binding_conflict`/`reference_topic_binding_legacy_unsupported`), missing semantic sections, document-markup signatures inside sections — finding ids under check name `reference_format` (:574-679, defaultRuleId :583)
- `checkReferenceSourceUrls` — missing/empty/non-URL-parseable source_url — check name `reference_source_url_parseable` (:691-758, defaultRuleId :693)
- `checkReferenceLedgerCoverage` — materialized reference not declared and classified unbacked → reject with classification root — check name `reference_ledger_coverage` (:944-963, defaultRuleId :950)
- `checkReferenceIndexCoverage` — missing `_INDEX.md` while files exist (:976-996); index failing eight-column `validateIndexMD` contract (:1003-1024); missing per-file row (:1029-1046); `source_layer` cell mismatch (:1047-1063) — check name `reference_index_coverage`
- `checkCacheCoverage` — invalid ledger (:1084-1103); raw reference declarations with zero submitted rows (:1127-1149); empty cache_trails → advisory Phase 1 warning only (:1163-1179); non-empty trails: missing dir (:1186-1189), missing leaf files (:1191-1196), incomplete content (:1198-1201), reference output not mapped to any valid trail via meta.json/source_slug/filename-stem (:1228-1289) — check name `cache_coverage`
- `readYamlArraySafe` — parse failure repaired via unescaped-double-quote repair, logs `yaml_repaired` diagnostic (gate-helpers-serial.mjs:153-202)
- `readJsonFileSafe` — deterministic repair (trailing commas/unquoted keys/single quotes/missing braces), logs `json_repaired` (:243-265)
- `scanTemplateNotExpanded` — diagnostic-only: detects unexpanded `${...}` in `artifacts/{wave0,wave1,wave2}/**/source.yaml` url/source_url and reference frontmatter `source_url`; emits `template_not_expanded` trace events; never fails the gate (:297-376)
- `checkSubmittedDeclarationRecovery` — every submitted non-superseded `_work_units/_index.json` record must have a hash-valid Engine declaration row; gaps → `submitted_declaration_missing:<work_id>` (gate-helpers-provenance.mjs:130-178, id :149)
- `checkWorkUnitLedgerExists` — ≥1 submitted row matching rule scope; invalid ledger → `${rule.id}:ledger_invalid` (:261-279); zero scoped rows → `${rule.id}:submitted_rows_missing` (:282-303)
- `checkWorkUnitOutputCoverage` — expected delegated outputs (from topic-registry templates or globs) covered by submitted rows or `phase_owned_projection`; uncovered → `${rule.id}:output:<expected>` (:384-409, id :389)
- `checkWorkUnitSubmissionPresence` — expected groups covered by submitted rows AND index/manifest/result/receipt/beacon/cache/terminal cross-check passes; binding failure → `${rule.id}:submission_binding` (:453-474, id :462)
- `scanDelegatedBypassSuspicion` — flags hand-written non-submitted declaration rows (:498-503); wave0/1 artifacts not covered and not phase-owned projections (:505-534); wave2 search indicators (`00-cross-*` files, exploit/explore decisions, `search_required`) without submitted coverage (:535-581)
- `emitDelegatedBypassDiagnostic` — appends `delegated_bypass_suspected` trace event when suspected (:604-627)
- `checkDelegatedBypassSuspected` — suspected bypass → `${rule.id}:delegated_bypass` blocking finding (:630-653, id :642)

---

## Area 4 — CLI validators → enforced facts

### validate-bundle — `DEEP_RESEARCH_HARNESS/cli/validate-bundle.mjs`
- each bundle control file must parse against its mapped schema (rb_status.json→StatusSchema, rb_queue.json→QueueSchema, rb_profile.yaml→ProfileSchema, rb_plan.md→PlanSchema, rb_trace.jsonl→TraceSchema, rb_output_declarations.jsonl→WorkUnitLedgerRecordSchema perLine) — validate-bundle.mjs:22-27,49-75
- missing non-optional control file is a failure → `✗ ${file}: missing` (:39-43); any safeParse failure forces exit 1 (:78)

### validate-workflow-package — `DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs`
- every provided flag path must exist or exit 2 (:37-46); consistency decision delegated to engine `validateWorkflowPackage`; `report.passed` → exit 0 else exit 1 (:48-61)

### validate-phase-templates — `DEEP_RESEARCH_HARNESS/cli/validate-phase-templates.mjs`
- only ```json blocks with a `targets` key are task cards (:28,:72); `targets.controller` must be present and not `"sub-agent"` (:31-36); `targets.delegates` requires `delegates.to === "sub-agent"` and `role_key` (:39-45); `delegates.to "sub-agent"` additionally requires `controller "main-agent"` (:47-49)

### validate-work-unit-hygiene — `DEEP_RESEARCH_HARNESS/cli/validate-work-unit-hygiene.mjs`
- retired token patterns rejected repo-wide over SCAN_ROOTS (RETIRED_PATTERNS :48-69 applied :237-255, e.g. `removed_cli_drive_relay_slot`, `removed_schema_queue_slots`, `removed_subagents_path`, `removed_queue_slot_shape`)
- semantic anti-patterns rejected: `delegated_operate_queue_complete` (:74), `filesystem_pass_coverage_wording` (:79), `index_pass_coverage_wording` (:84), `old_queue_fixed_active_window` (:89), `old_experiment_taxonomy` (:94), `queue_demand_work_id_table` (:99)
- context-sensitive tokens (`runtime_receipt_ref`, `receipt_nonce`, `_beacon.json`) rejected unless in allowed context (:104-109,:202-231,:257-275)
- gate-definition JSON must parse and must not use removed provenance checks (`output_declaration_ledger_exists`, `output_declaration_coverage`, `subagent_slot_presence`, `relay_bypass_suspected`) → `gate_definition_unparseable` (:287) / `unsupported_delegated_provenance_check` (:294-297)
- rb_queue.json.tmpl must not contain `work_id`/`slot_1_current`/`slot_2_next`/`slot_20_tail` → `queue_template_old_identity_or_slot_shape` (:304-321)
- phase .md JSON examples must parse as QueueDemandItemSchema/QueueResultSchema; queue results must not carry work_id → `phase_queue_task_card_schema_mismatch`/`phase_queue_result_schema_mismatch`/`phase_queue_result_uses_work_id` (:363-430)
- work-unit gate wiring: gate-helpers-provenance.mjs must export the 5 work-unit helpers; each check-gate-wave{0,1,2}-complete.mjs must reference evaluateWave{0,1,2}Contract + emitDelegatedBypassDiagnostic; operate-work-unit.mjs must reference claimWorkUnits/submitWorkUnit/closeWorkUnitAttempt/openWorkUnitBatch/inspectWorkUnits → `missing_work_unit_gate_helper`/`gate_cli_missing_wave_contract_evaluator`/`operate_work_unit_missing_helper` etc. (:432-488)

### validate-playbook — `DEEP_RESEARCH_HARNESS/cli/validate-playbook.mjs`
- each playbook file's YAML frontmatter must satisfy `PlaybookFrontmatterSchema` (:70-78); canonical experiments_playbook root validates manifest corpus with `requireExactCorpus: true` (:46-57); directory targets only collect `^case-\d+-(?:light|standard|heavy)-[a-z0-9-]+\.md$` (:29)

### inspect-bundle — `DEEP_RESEARCH_HARNESS/cli/inspect-bundle.mjs`
- current-entry contract preflight (BUNDLE_ENTRY.md + BUNDLE_MAP.md) must pass; failure prints `unsupported_current_entry_contract`, exit 1 (:50-54)
- structural check requires all REQUIRED entries (rb_plan.md, rb_profile.yaml, rb_status.json, rb_queue.json, rb_trace.jsonl, _logs/run.log, seed_topics/, reference/_INDEX.md, reference/README.md, artifacts/wave0..2/, _cache/, final/, _work_units/) (:17-24,:296,:299-302)
- repo-root runtime-looking dirs (_work_units, artifacts, _cache, reference, final) with active-bundle refs → `active_bundle_blocker` exit 1; unassociated → `cleanup_debris` (diagnostic) (:35,:103-151,:309-312)

### audit-phase-status — `DEEP_RESEARCH_HARNESS/cli/audit-phase-status.mjs`
- `--bundle` required; missing → `missing_witness` diagnostic JSON, exit 2 (:20-29); audit logic delegated to engine `auditPhaseStatus`; exit 0 iff `result.ok` (:31-33)

### inspect-wave0-output — `DEEP_RESEARCH_HARNESS/cli/inspect-wave0-output.mjs`
- exactly one `--bundle` pair, no positionals; invalid → blocking `wave0_inspect_invocation_invalid`, exit 2 (:24-56)
- gate definition must load (:61-68); advisory reference checks: `reference_flat_directory`, `reference_filename` (00-shared-<slug>.md), `reference_index_presentation` (via `validateIndexMD`), `reference_readme_non_empty` (:79-121); seed-topic projection readiness → `returnMapClassification` (:123-129)

### inspect-wave1-output — `DEEP_RESEARCH_HARNESS/cli/inspect-wave1-output.mjs`
- same invocation grammar; invalid → blocking `wave1_inspect_invocation_invalid`, exit 2 (:19-51); `evaluateWave1Contract` with topicRegistryFact; seed readiness → `returnMapClassification` (:65-75)

### inspect-wave2-output — `DEEP_RESEARCH_HARNESS/cli/inspect-wave2-output.mjs`
- same invocation grammar; invalid → blocking `wave2_inspect_invocation_invalid`, exit 2 (:23-55); `evaluateWave2Contract` with topicRegistryFact + findingIndexFact; legacy `reference/00_shared/` dir → advisory `legacy_00_shared_directory` (:69-84)

### sync-reference-index — `DEEP_RESEARCH_HARNESS/cli/sync-reference-index.mjs`
- `--bundle` required; missing → `{verdict:'blocked', reason_code:'bundle_required'}`, exit 2 (:7-12); verdict `blocked` → exit 1 else exit 0 (:13-15)

### operate-topic-state — `DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs`
- four forms with exact options: `inspect(--bundle)`, `schema(--context)`, `apply(--bundle+--input)`, `recover(--bundle+--operation-id)`; invalid → invocationError JSON, exit 2 (:31-66)
- `recover --operation-id` must match topic-state UUID regex (:83-85); `apply --input` must be readable regular file AND valid JSON (:91-99); exit 1 iff verdict `blocked` or `passed === false`; thrown error → `operation_failed`, exit 2 (:101-116)

### advance-status — `DEEP_RESEARCH_HARNESS/cli/advance-status.mjs`
- `--bundle + --to` required; invalid → exit 2 (:97-113); manifest.json + transitions.chain.json must load → else `workflow_transition_configuration_unavailable` (:118-126); `--to` must name a declared source-gate enum → else `supported_source_gates` listed (:128-137); chain must have a transition record for the current node → else `workflow_transition_configuration_invalid` (:139-145); rb_status.json must exist and be valid JSON (:147-162)
- covered source-gate handoff validated by `validateSourceGateStatusSync` first; failure → `{status:'error'}` exit 1 (:169-177); next node from witnessed handoff target (covered) or `transitions['passed'] || transitions['rerun']` (bootstrap) (:179-185)
- covered handoff requires `rb_status.json#/current_node === witnessed handoff target` before sync — **rejects skipped/unsynced gates** (:208-215); requires loaded-node continuation via `continuationForLoadedNode` — "advance-status must not guess loaded-node continuation" (:217-236)
- writes `{current_gate, next_gate}` (+ `state:'completed'` only when readiness_passed→none) and appends phase_transition trace; trace-append failure rolls status back; write failure → exit 1 (:238-298)

### log-event — `DEEP_RESEARCH_HARNESS/cli/log-event.mjs`
- surfacing-intent mode requires --bundle/--node/--intent-type/--reason and intent-type ∈ [ask_user, progress_report, partial_delivery, user_choice, wait_for_input, other]; violation → silent exit 0 (:51-59)
- explain-file mode requires --bundle/--status/--reason and status ∈ [explained_non_authoritative, ignored_with_reason]; violation → silent exit 0 (:103-117)
- trace mode (--event) requires --bundle (:165-200); log mode requires --bundle/--level/--msg and level ∈ [debug, info, warn, error] (:205-224); all paths exit 0 — diagnostics never block the agent

---
