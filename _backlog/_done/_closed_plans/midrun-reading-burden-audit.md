# Mid-Run Reading Burden: Negative-Space Audit (Task A) + C4 Closure Scoping (Task B)

Repo: `ai_tool_deepresearch` · Scope: `DEEP_RESEARCH_HARNESS/workflows/nodes/**` + closure machinery
Date: repo-internal analysis · Status: analysis only (no OpenSpec change proposed in this doc)

> Method: every file under `workflows/nodes/` was read in full (11 phase nodes, 5 sub-agent role
> specs, 12 shared nodes, 2 briefs, 1 template; 5,431 lines total). Negation sites were inventoried
> with the exact keyword set from the task brief — `禁止 / 不得 / SHALL NOT / MUST NOT / do not /
> must not / never` (case-insensitive) — which yields **456 keyword-bearing lines** across the 31
> files (the "~340 sites" in the brief corresponds to sentence-level dedup of long multi-clause
> paragraphs). Each site was classified against machine checks found **first-hand** in
> `schema/gate_definitions/*.json`, `cli/*.mjs`, `engine/*.mjs`, and `engine/helpers/*.mjs`.
> Class (1) is claimed only where the enforcing check was actually located.

> **Cross-reference:** a parallel machine-check catalog (background sub-agent, 785 lines, 5 areas,
> 592 entries) is at `machine-checks-catalog.md`（同目录随附）— gate rule ids, gate-CLI helper
> call chains, ~40 engine helper modules with rejection codes, CLI validators, and all 268 test
> files. Every class-(1) citation in this audit was verified first-hand and is consistent with that
> catalog; none of the citations below uses a non-existent identifier. Authoritative corrections
> and precision notes from the catalog:
> - Topic-state / seed-projection enforcement identifiers: `canonical_binding_mismatch`,
>   `writer_postcondition_failed`, `seed_projection_layout_missing`, `canonical_topic_state_required`
>   (there is no `hand_edit_detected`); `seed_projection_token`, `seed_projection_token_ambiguous`,
>   `__BACKFILL_*` retention checks, and `template_not_expanded` (diagnostic-only, **never** blocks a
>   gate) (there is no `token_replacement`); `ProjectionPacketSchema` zod messages plus
>   `input_invalid`, `projection_source_identity_not_current`, `projection_slot_not_owned`
>   (there is no `invalid_packet_fields`).
> - Floor / index identifiers are exactly: `shared_ref_count_floor`, `per_topic_count_floor`,
>   `per_topic_ref_md_count_floor`, `source_novelty_floor`, `reference_index_coverage`,
>   `reference_ledger_coverage`, `sync_reference_index` (outcome), `reference_navigation_*`
>   (there is no `ref_count_floor` / `citation_coverage` / `index_sync_mismatch`).
> - Bypass detection: exhaustive fall-through is `classifyReferenceAuthority` → `delegated_bypass`
>   at `gate-helpers-checks.mjs:928-936` (there is no `all_handled_else_reject`).
> - `file_exists` / `status_value` / `per_topic_count_floor` resolve in the gate CLIs and
>   `wave-contract-evaluators` via `resolveThreshold` (`gate-helpers-readers.mjs:119-152`), not in
>   `gate-helpers-*.mjs` themselves.
> - `engine/work-unit-transaction.mjs` and `engine/consistency-validator.mjs` live in
>   `DEEP_RESEARCH_HARNESS/engine/` (root), not `engine/helpers/` (this audit's citations already
>   use the correct paths).
> - Gate CLIs add hard checks beyond the definitions (e.g. hitl1 canonical-topic-state
>   prerequisite, setup-ready staged persistence, wave fatigue/degradation threshold = 3, hitl2
>   `composition_handoff_proceed_contract`, readiness `composition_handoff_readiness_consistency`,
>   rerun `rerun_profile_prerequisite`); `advance-status` rejects skipped gates at :208-215 and does
>   not guess loaded-node continuation (:217-236).
> - Tests: 268 real files (tests/e2e 14, tests/engine 43+41 helpers, tests/schema 18,
>   tests/governance 5, tests/host_tools 3, tests/integration/cli 58, tests/integration/md 64,
>   other integration 22); there is **no** `tests/deterministic_e2e/` or `tests/unit/` — the
>   "tests that would lock it" column in Task B should target `tests/integration/cli` +
>   `tests/engine` + `tests/integration/md`.

---

## TASK A — Negative-space audit

### A.1 Classification rules applied (strict)

| Class | Meaning | Evidence required |
|---|---|---|
| (1) machine-covered | A gate rule, schema validator, CLI check, or test already enforces the same fact | cite the check (rule id / file:line). No citation → not class (1). |
| (2) obsolete-or-duplicate | Restates another rule in the same file or in a file already in the phase's `requires` closure; restates static data (`transitions.chain.json`, gate definition JSON); structural defect (orphaned/renumbered section) | say why |
| (3) agent-discipline-only | Live semantic guidance; no machine check exists (truthfulness of content, interaction placement, UX, method) | — |

Key machine-check corpus (verified first-hand; used throughout):

- Gate rule ids: `schema/gate_definitions/gate-*.definition.json` — e.g. wave gates: `phase_queue_drained`, `waveN_work_unit_submission_presence`, `waveN_work_unit_output_coverage`, `waveN_work_unit_ledger_exists`, `waveN_delegated_bypass_suspected`, `cache_coverage`, `per_topic_count_floor` / `per_topic_ref_md_count_floor`, `reference_format`, `reference_ledger_coverage`, `reference_index_coverage`, `depth_review_contract`, `focus_coverage_limit`, `question_list_has_four_sections`, `finding_index_contract`, `trace_event_present`; readiness: `trace_has_all_gates`, `yaml_parse`, `jsonl_parse`; seed-topics: `slug_consistency`, `per_file_slug_stem_consistency`, `seed_initialization_structure`; setup: `basename_consistency`, `schema_valid`×4, `hitl1_marker_recorded`, `plan_body_no_unfilled_marker`; instantiation: `bundle_name_valid(pattern_match)`; hitl1: `research_profile_not_default`, `must_answer_non_empty`, `hitl1_status_recorded`, `research_access_available`; hitl2: `decision_brief_exists`, `user_decision_valid_enum`, `hitl2_status_recorded`; rerun: `rerun_rationale_present`, `rerun_count_limit(rerun_count_valid)`, `rerun_direction_structure`.
- Submit/ledger: `engine/work-unit-validation.mjs:79,146,229` (result must carry `work_id/queue_item_id/kind/receipt_nonce`, nonce mismatch rejected); `engine/work-unit-submitted-ledger.mjs:75-79` (`ledger_record_hash` mismatch → hand-written `rb_output_declarations.jsonl` rows fail); `engine/helpers/direct-output-contract.mjs` (declared outputs/cache validated).
- Status/route: `engine/helpers/phase-status-audit.mjs:351-370` (`manual_bypass_suspected` when status claims a gate with no witnessed passed gate + route-bound `load_complete`); `engine/helpers/handoff-helpers.mjs:142-202` (only the legal `check.next` target is loadable); `cli/enter-phase.mjs:97-98,179-188` (target authorization + `current_node` write).
- Queue: `cli/operate-queue.mjs:689` (`delegated_requires_work_unit_claim` — delegated items cannot be claimed/completed via the maintenance queue).
- Provenance/facts: `engine/helpers/gate-helpers-provenance.mjs:607-634` (`delegated_bypass_suspected`); `engine/helpers/wave-depth-contracts.mjs:351-363,1178` + `wave1-reference-convergence.mjs:451` (`missing_profile_parameter`); `engine/helpers/projection-entry-contract.mjs:308-326` (`projection_entry_generic_prose`, `refs: none` requires defers); `engine/helpers/return-map.mjs:176-207,341` (glob/count refs rejected; evidence-bearing entries need concrete `reference/*.md`); `engine/helpers/reference-index-sync.mjs:70` (retired `related_topic` metadata rejected); cache leaf contract (`cache-leaf-contract.mjs`, `cache_coverage` gate rule; placeholder-only `page.md` invalid unless degraded — `shared-subagent-protocol.md:201`).

### A.2 Per-file counts

Sites counted per keyword-bearing line/sentence; a long paragraph with several negations is one site where it forms one directive, split where it forms several.

**Required files (detailed):**

| File | lines | sites | (1) machine | (2) dup/obsolete | (3) agent-only |
|---|---|---|---|---|---|
| `phases/phase-wave0.md` | 349 | 44 | 27 | 6 | 11 |
| `phases/phase-wave1.md` | 421 | 57 | 42 | 3 | 12 |
| `phases/phase-wave2.md` | 369 | 40 | 32 | 2 | 6 |
| `shared/shared-anti-cheating-rules.md` | 131 | 19 | 12 | 2 (+2 structural defects) | 5 |
| `shared/shared-silent-execution.md` | 100 | 10 | 3 | 0 | 7 |
| `shared/shared-subagent-protocol.md` | 227 | 20 | 17 | 1 | 5 (the 7-item MUST NOT list → 6 class 1, 1 informational) |

**All nodes (totals):**

| File | sites | (1) | (2) | (3) |
|---|---|---|---|---|
| phases/phase-wave0.md | 44 | 27 | 6 | 11 |
| phases/phase-wave1.md | 57 | 42 | 3 | 12 |
| phases/phase-wave2.md | 40 | 32 | 2 | 6 |
| phases/phase-hitl1.md | 29 | 12 | 3 | 14 |
| phases/phase-hitl2.md | 20 | 12 | 4 | 4 |
| phases/phase-final.md | 18 | 12 | 0 | 6 |
| phases/phase-instantiation.md | 11 | 3 | 1 | 7 |
| phases/phase-setup.md | 10 | 5 | 1 | 4 |
| phases/phase-seed-topics.md | 17 | 8 | 1 | 8 |
| phases/phase-readiness.md | 13 | 7 | 1 | 5 |
| phases/phase-rerun.md | 23 | 12 | 6 | 5 |
| subagent-dpt-claim-verifier.md | 11 | 3 | 0 | 8 |
| subagent-dpt-evidence-extractor.md | 26 | 10 | 0 | 16 |
| subagent-dpt-source-diagnostic.md | 10 | 3 | 0 | 7 |
| subagent-dpt-source-intake.md | 16 | 7 | 0 | 9 |
| subagent-dpt-topic-scout.md | 17 | 7 | 0 | 10 |
| shared/shared-anti-cheating-rules.md | 19 | 12 | 2 | 5 |
| shared/shared-silent-execution.md | 10 | 3 | 0 | 7 |
| shared/shared-subagent-protocol.md | 20 | 17 | 1 | 2 |
| shared/shared-gate-rules.md | 1 | 0 | 1 | 0 |
| shared/shared-profile.md | 1 | 1 | 0 | 0 |
| shared/shared-repair-guidance.md | 5 | 1 | 1 | 3 |
| shared/shared-return-map-authoring.md | 1 | 0 | 0 | 1 |
| shared/shared-page-fetch-guidance.md | 3 | 0 | 0 | 3 |
| shared/shared-agent-ux-guidance.md | 0 | 0 | 0 | 0 |
| shared/shared-hitl1-capability-probe.md | 6 | 0 | 0 | 6 |
| shared/shared-hitl1-research-access-envelope.md | 10 | 2 | 0 | 8 |
| shared/shared-schemas.md | 6 | 3 | 1 | 2 |
| shared/shared-reference-template.md | 5 | 5 | 0 | 0 |
| brief/hitl1.md | 1 | 0 | 0 | 1 |
| brief/hitl2.md | 0 | 0 | 0 | 0 |
| templates/seed-topic-template.md | 8 | 6 | 0 | 2 |
| **TOTAL** | **5,431** | **~448 sites** | **~246 (55%)** | **~34 (8%)** | **~168 (37%)** |

Notes on the totals: ~55% of negation sites are already machine-covered; ~8% are pure duplication/obsolete; ~37% are live agent discipline (of which the largest blocks are the interaction-placement contract in `shared-silent-execution.md` — load-bearing, must be kept — and sub-agent truthfulness rules).

### A.3 Representative class (1) examples — machine check actually found

1. `phase-wave0.md:35` "do not direct-search from the Phase Agent as a substitute for delegated evidence" → **gate rule `wave0_work_unit_output_coverage` + `wave0_delegated_bypass_suspected`** (`schema/gate_definitions/gate-wave0-complete.definition.json`; impl `engine/helpers/gate-helpers-provenance.mjs:607-634`). Same fact repeated at `phase-wave0.md:336`, `phase-wave1.md:34,406`, `phase-wave2.md:35,357`.
2. `phase-wave0.md:161/346`, `shared-subagent-protocol.md:88,167` "do not overwrite/edit immutable `_beacon.json`" → **submit validates beacon-bound identity** (`engine/work-unit-validation.mjs:79,146,229`; envelope validation in `engine/work-unit-envelope.mjs`).
3. `phase-wave0.md:338`, `phase-wave1.md:408`, `shared-subagent-protocol.md:134,145,162-163` "do not hand-write `rb_output_declarations.jsonl` / receipts / trace" → **`ledger_record_hash` validation** (`engine/work-unit-submitted-ledger.mjs:75-79`) + submit-only ledger append.
4. `phase-rerun.md:108` "不得在 rerun gate 通过前运行 `advance-status --to rerun_ready`" → **advance-status/gate window audit** (`engine/helpers/phase-status-audit.mjs:313-315,351-370`).
5. `phase-wave1.md:290/415`, `shared-profile.md:79` "do not invent a hidden default when `wave1_per_topic_ref_floor`/`topic_unique_ratio` missing" → **`missing_profile_parameter`** (`engine/helpers/wave-depth-contracts.mjs:351-363,1178`; `wave1-reference-convergence.mjs:451`).
6. `phase-wave0.md:343`, `phase-wave1.md:417`, `templates/seed-topic-template.md:96,109,122,135` "do not write generic 'WaveN submitted' / naked list prose" → **`projection_entry_generic_prose` rejection** (`engine/helpers/projection-entry-contract.mjs:308-312`).
7. `phase-wave1.md:300` "do not use globs or count summaries" for refs → **return-map navigation validation** (`engine/helpers/return-map.mjs:176-207` — `glob_or_count_summary` / `unsafe_ref`).
8. `phase-wave0.md:44-45`, `phase-wave1.md:395-396`, `shared-reference-template.md:53`, `subagent-dpt-evidence-extractor.md:209` "do not write `related_topic`" → **engine rejects retired metadata** (`engine/helpers/reference-index-sync.mjs:70`).
9. `phase-wave0.md:337`, `phase-wave1.md:407`, `shared-schemas.md:48` "do not use `operate-queue complete` for delegated success" → **`delegated_requires_work_unit_claim`** (`cli/operate-queue.mjs:689`) + `phase_queue_drained` gate rule.
10. `phase-wave1.md:240-242` "do not copy `source_claims[]`/cache refs into depth-review as blocking truth" → **`depth_review_contract` derives novelty from hash-valid rows, not copied fields** (gate rule + `engine/helpers/wave-contract-evaluators.mjs:553` evaluator set).
11. `phase-readiness.md:141-143`, `shared-anti-cheating-rules.md:68-70` "MUST NOT do content/semantic quality judgment at readiness" → **readiness gate rule set is closed and structural-only** (`schema/gate_definitions/gate-readiness-passed.definition.json`: `dir_non_empty/file_exists/trace_has_all_gates/yaml_parse/jsonl_parse` — no semantic rule exists).
12. `phase-hitl1.md:219` "禁止跳过 HITL1 直接进入 setup" / `phase-setup.md:103` "禁止跳过 setup gate" → **advance-status window + route-bound `check.next` authorization** (`engine/helpers/handoff-helpers.mjs:142-202`; `cli/enter-phase.mjs:97-98`).
13. `phase-hitl2.md:192` "MUST preserve `rerun_count` / MUST NOT reset" → **`rerun_count_valid(rerun_count_limit)` gate rule** (`gate-rerun-ready.definition.json`).
14. `shared-anti-cheating-rules.md:78-88` "output_files[]/cache_trails[] must be declared; leaf dirs only; `meta.json` fields" → **submit output/cache validation + `cache_coverage` gate rule** (`engine/work-unit-validation.mjs`; `engine/helpers/cache-leaf-contract.mjs`).
15. `phase-wave2.md:222,364` "never leave `gap_status: needs_search` while `pure_synthesis_eligible: true`" → **`finding_index_contract` + synthesis-eligibility consistency checks** (wave2 gate; `engine/helpers/wave-contract-findings.mjs`).
16. `phase-final.md:206-208` "MUST NOT overwrite/delete/rename committed primary report" → **`publish-final-report` allocates immutable global versions** (`cli/operate-artifact-persistence.mjs publish-final-report`; `engine/helpers/final-report-series.mjs`).
17. `phase-instantiation.md:81,94` "do not rename/patch an illegal bundle into legality" → **`bundle_name_valid(pattern_match)` + setup `basename_consistency`** gate rules.
18. `phase-wave0.md:252/342`, `phase-seed-topics.md:97`, `shared-schemas.md:93` "never hand-edit a seed / token replacement" → **`seed_initialization_structure` + packet-only `operate-topic-state apply`** (seed-topics gate rule; `engine/helpers/canonical-topic-state.mjs`).

### A.4 Representative class (2) examples — obsolete or duplicate

1. **Phase-local `## 9 Anti-Cheating Rules` lists duplicate `shared/shared-anti-cheating-rules.md`** — and that shared file is **already in the same phase's `requires`** for wave0/wave1/wave2 (`phase-wave0.md:19`, `phase-wave1.md:19`, `phase-wave2.md:18`). E.g. wave0 §9 bullets `phase-wave0.md:336` (direct artifacts as evidence), `:338` (hand-write ledger), `:339` (snippets) are verbatim restatements of shared §15/§13/§14 (`shared-anti-cheating-rules.md:90-92,78-88`). The shared file's own authority block even says phase nodes "应包含 phase-specific 禁令并 reference 此 shared node" (`:130`) — the waves keep both.
2. **The `## 7 On Gate Fail` preamble paragraph is near-identical across all 8 `stop: no` phases** (`phase-wave0.md:310`, `phase-wave1.md:377`, `phase-wave2.md:331`, `phase-instantiation.md:61`, `phase-setup.md:77`, `phase-seed-topics.md:198`, `phase-readiness.md:118`, `phase-rerun.md:152`): "先读取 CLI top-level hints[]；inspect[]/advice[] 只提供 compatible forensic detail，不是 action authority…不得主动发起提问…" — duplicates `shared-silent-execution.md:21,23` and the engine-injected `AUTONOMOUS_MODE_HEADER` (`engine/workflow-chain.mjs:77-92`), which is already re-injected on every `stop:no` load.
3. `shared-anti-cheating-rules.md` **structural defects**: two `### 13` headings (`:78` 禁止遗漏 cache_trails vs `:116` "确定性出口原则"), the "正确替代" for §12 is orphaned after §17 (`:114`), and §13-§16 (`:116-125`) is not an anti-cheating prohibition at all — it restates chain-design policy already encoded in `workflows/transitions.chain.json` (only `passed`/`rerun` as deterministic exits) and in `phase-hitl2.md:110,190`.
4. `phase-rerun.md` §9 repeats its own §3 prose: `:170` duplicates `:82` (MUST NOT delete artifacts), `:171` duplicates `:92` (no direct registry/seed edit), `:177` duplicates `:96` (no profile re-parse), `:178` duplicates `:166` (no self-load of seed-topics; all routing from `check.next`).
5. `phase-hitl2.md:190` "MUST NOT 将不确定 branch 的路由编码进 transition chain" duplicates `:110` in the same file and the chain file itself (`transitions.chain.json` has no entry for `request_view_revision/repair/stop_blocked`).
6. `phase-instantiation.md:94` "禁止 rename 已创建的 illegal bundle…" duplicates `:81` in the same file.
7. `shared-schemas.md:188` "不要复制 evaluator 逻辑到 Markdown" duplicates `:107` in the same file.
8. `shared-repair-guidance.md:37` "Do not initiate a question, status, acknowledgement…" duplicates `shared-silent-execution.md:21` and the injected header.
9. `phase-hitl1.md:148` / `:94` "不得再请求确认 / 不得要求笼统的第二次确认" duplicate `shared-agent-ux-guidance.md:27`.
10. `shared-gate-rules.md:34` "…`proceed_to_readiness` selects …; `rerun` selects `phases/phase-rerun.md`… do not default to readiness" restates static chain data (`transitions.chain.json`) — the routing fact is the file, the sentence is a copy.
11. `phase-final.md` §9's first bullet (`:201-203`, MUST NOT wait for first delivery) restates the terminal-delivery header already injected by the engine (`workflow-chain.mjs:94-115`) and `phase-final.md:144-148`.

### A.5 Deletion vs compression estimates

Estimates are for the markdown under `workflows/nodes/**` (5,431 lines), **without touching any engine behavior**:

- **Deletable (class 1+2): ~200–260 lines (~4–5%).** Biggest blocks: wave0/1/2 phase-local §9 anti-cheating bullets that duplicate the shared file already in `requires` (~35 of 44 wave bullets), the §7 preamble → one-line pointer (~7 lines × 8 phases ≈ 55 lines), rerun §9 self-duplicates (~6 bullets), anti-cheating structural cleanup (~15 lines), hitl2/final same-file and chain-data restatements (~10 lines). Deleting machine-covered class (1) lines is safe for determinism (the check still enforces the fact) but they do carry some "why" value — prefer deleting the class (2) duplicates first and only then class (1) bullets whose rationale is fully expressed by the check's failure message.
- **Compressible (class 3): ~120–170 lines (~2–3%).** The wave §3.2 drain-loop paragraphs (identical across wave0/1/2, ~30 lines each) can collapse to one shared block; interaction-placement sentences inside §7/§8 can point to `shared-silent-execution.md` (which must remain untouched — it is load-bearing); sub-agent "Do not…" lists can drop redundant explanatory tails.
- **Must NOT be deleted:** every sentence in `shared-silent-execution.md` (the recovery/placement contract), the phase `requires` closures, the AUTONOMOUS header mechanism, and hitl1/hitl2 §9 lists **unless** `shared-anti-cheating-rules.md` is added to those phases' `requires` (currently hitl1/hitl2 do **not** require it — their local §9 is the only in-context copy; deleting it would silently weaken their closure).
- **Net:** ~320–430 lines (6–8%) removable from the static tree; per full run the repeated-prose tax drops by roughly 350–550 lines (each wave phase loses ~20–25 duplicated lines it currently re-reads). This is real but modest — the dominant per-run cost is structural (Task B).

---

## TASK B — C4 scoping (phase-closure dedup)

### B.1 Mechanism facts (with file:line)

**(i) How shared files are injected on `enter-phase` (default vs `--full`).**

- The loader resolves each phase's closure **only** from frontmatter `requires` (DAG walk): `engine/workflow-chain.mjs:377-420` (`resolveDependencyClosure`), executed at `:537`; `--full` is not consulted for the plan.
- `cli/enter-phase.mjs:199-207`: with `--full`, the entire plan (deps first, entry last) is appended, each file wrapped in `<!-- DPT_LOADED_FILE_START/END -->` markers. **Without `--full`, shared content is NOT injected** — the default output is the bounded presentation from `engine/helpers/phase-entry-presentation.mjs:46-69`: continuation cue + exact `advance-status` command + the target's `## 0 Execution Brief` section + a `DPT_SHARED_FILE_MANIFEST` that **lists the closure file refs only**.
- The canonical flow never passes `--full`: `command_playbook/start-research.md:71` and every wave phase §6 instruct plain `enter-phase --bundle <path> --node <check.next>`. So the ~2,600-line "repeated shared prose" tax is realized when the Agent opens the named shared files (the phases instruct reading several of them: e.g. `phase-wave0.md:56-60` §2 Required Inputs) or uses `--full` — it is a **manual-read tax plus the engine-injected header tax**, not an automatic injection tax.
- `workflows/manifest.json#/shared` (7 files) is **not** a loading input. Only `consistency-validator.mjs` consumes it: `:153` (files exist), `:749-753` (role specs must not be in it), `:800-803` (actor fetch guidance must not be in it). Notably `shared-gate-rules.md` and `shared-repair-guidance.md` are in `manifest.shared` but in **no** phase's `requires` — the manifest list and the actual closures have already drifted.
- `suggested_context` is advisory only (validated for existence at `consistency-validator.mjs:299-301`).
- **Engine-injected repeat tax (not in any .md):** WNC-008 injects `AUTONOMOUS_MODE_HEADER` (`workflow-chain.mjs:77-92`, ~15 lines) into every manifest `stop:no` phase on every load (`:552-566`) — 8 phases × ~15 = **~120 lines per full run**, duplicating `shared-silent-execution.md:21` in short form.

**(ii) What makes each phase stand-alone for context-loss recovery.**

- Each phase node's frontmatter `requires` declares its **complete closure** (`phase-wave0.md:12-20` etc.), so a fresh agent context can rebuild the full instruction set via `enter-phase --full` (or by opening the named manifest). This is the load-bearing re-injection.
- Route integrity: only the legally-next phase is loadable — `cli/enter-phase.mjs:97-98` (`validateEnterPhaseTarget` → `handoff-helpers.mjs:142-202` `latestLegalPassedHandoff` + route-bound `load_complete` witness); `enter-phase.mjs:179-188` writes `rb_status.json#/current_node`, which `shared-silent-execution.md:96` names as the recovery anchor ("On context recovery, reload `rb_status.json.current_node` and bundle truth").
- Placement semantics: continuation cue derived from frontmatter `stop`/`gate` (`continuation-cue.mjs:43-70`); the injected AUTONOMOUS header re-asserts "do not initiate interaction" in every `stop:no` context.
- **Any Task B change must preserve: (a) per-phase declared closure, (b) route-bound `check.next` → `enter-phase` → `advance-status` witness chain, (c) `current_node` write, (d) do-not-initiate contract present in every `stop:no` load.**

**(iii) Biggest shared repeat cost per full run (requires-driven; unique text = 1,537 lines).**

| shared file | lines | loads/run (phase requires) | lines loaded/run | phases |
|---|---|---|---|---|
| `shared-profile.md` | 179 | 7 | 1,253 | hitl1, hitl2, setup, seed-topics, rerun, wave0, wave1 |
| `shared-silent-execution.md` | 100 | 8 | 800 | instantiation, setup, seed-topics, wave0, wave1, wave2, readiness, rerun |
| `shared-schemas.md` | 242 | 4 (+5 sub-agent loads = 1,210 more) | 968 | seed-topics, wave0, wave1, wave2 (+ all 5 role specs) |
| `templates/seed-topic-template.md` | 181 | 4 | 724 | seed-topics, wave0, wave1, wave2 |
| `shared-subagent-protocol.md` | 227 | 3 (+5 sub-agent loads = 1,135 more) | 681 | wave0, wave1, wave2 |
| `shared-anti-cheating-rules.md` | 131 | 3 | 393 | wave0, wave1, wave2 |
| `shared-reference-template.md` | 124 | 2 (+2 sub-agent) | 248 | wave0, wave1 |
| `shared-return-map-authoring.md` | 29 | 4 | 116 | seed-topics, wave0, wave1, wave2 |
| `shared-agent-ux-guidance.md` | 41 | 2 | 82 | hitl1, hitl2 |
| `shared-hitl1-*.md` (probe+envelope) | 283 | 1 each | 283 | hitl1 |
| **total shared loads** | | **~39** | **~5,548** | — |
| *repeated beyond unique text* | | | **~4,011** | + ~120 header |

Wave phases dominate: wave0/wave1 closures are 1,562/1,634 lines each (8 shared files + entry). The top three repeat offenders are `shared-profile` (7 loads), `shared-silent-execution` (8), and `shared-schemas` (4 phase + 5 role-spec loads).

### B.2 Design options (fewest OpenSpec changes; determinism & recovery preserved)

| # | Option | What changes | Specs/contracts touched | Recovery semantics | Tests that would lock it |
|---|---|---|---|---|---|
| **A** | **Markdown-only dedup/compression (recommended)** | Delete class-(2) duplicates (wave §9 lists vs `shared-anti-cheating-rules.md` already in `requires`; rerun §9 self-dups; anti-cheating structural cleanup; same-file dups). Compress §7 preamble → one-line pointer + a single new shared `shared/shared-gate-repair-posture.md` (or reuse `shared-repair-guidance.md`). Compress near-identical wave §3.2 drain prose. Add `shared-anti-cheating-rules.md` to hitl1/hitl2 `requires` before trimming their §9. | **markdown only**; zero engine/schema/CLI lines | none accepted spec; guidance-only surface (same authority as today) | **unchanged** — every phase keeps its declared closure; `--full`, header injection, `current_node` recovery all untouched | `tests/` consistency: extend `consistency-validator` checks to assert phase §9 anti-cheating sections are absent-or-pointer when the shared file is in `requires` (new check class), plus existing `validate-workflow-package` closure tests |
| **B** | **Condensed per-phase shared-brief variants** | Add `shared/briefs/{profile,schemas,silent-execution}-brief.md` (~30–40% size) and repoint the wave `requires` at the briefs; full files stay loadable on demand (`--full` keeps loading `requires`; add full files to `suggested_context`). | **markdown only** for the pointer change; **engine addition** if you want drift-proofing (new `consistency-validator` class `brief_matches_full`) | **weakened unless the brief is provably complete** — a fresh context gets a lossy summary; violates the "re-injection is load-bearing" constraint unless the brief is contract-tested against the full file | new test: brief content must contain every load-bearing directive of the full file (subset/equivalence test); consistency validator cross-check |
| **C** | **Once-per-run loading + on-demand reload** | `enter-phase` emits entry + only not-yet-loaded shared files (already-loaded set derived from trace `file_read` events), plus a `--reload <file>` / explicit reload command for context loss. | **engine change** in `enter-phase.mjs` + `workflow-chain.mjs` (delta plan), touches `load_complete` witness detail, trace event shape, `phase-entry-presentation.mjs` | **changed**: a fresh context after loss must run the reload command before executing; recovery no longer "phase = self-sufficient", it becomes "phase + reload command" — needs the recovery contract (`shared-silent-execution.md:96` area) and `handoff-helpers` witness semantics updated | deterministic e2e: full-run delta accumulation; recovery test: kill context after phase N, reload, assert closure identical; witness/`load_complete` golden tests |
| **D** | **Manifest-level `requires` → shorter pointer file** | Make `manifest.json#/shared` drive injection of one condensed core brief per phase, or shrink the shared files themselves (merge `shared-return-map-authoring.md` 29-line pointer into `templates/seed-topic-template.md`; split `shared-schemas.md` per wave). | **engine change** if manifest.shared starts driving loads (it currently doesn't — only `consistency-validator` reads it); markdown change to merge/split | **unchanged for merges of pure pointers**; **changed if injection semantics move to manifest** (manifest is not in the current load path — risky, touches WNC/WML specs) | new integration tests for manifest-driven injection; closure-golden tests per phase |

### B.3 Recommendation

**Option A — markdown-only dedup/compression, no engine change.**

Rationale:
- It is the only option with **zero determinism risk and zero recovery change**: `requires` closures, `--full`, the WNC-008 header, the route-bound witness chain, and `current_node` recovery are all untouched. Every phase remains stand-alone in a fresh context.
- It removes the *pure noise* first: class (2) duplicates are semantically free deletions (~200–260 lines), and class (3) compression (~120–170 lines) shortens what the agent re-reads each phase without dropping any machine-backed fact.
- It is fully within the current OpenSpec surface: no accepted spec (gate definitions, schemas, chain, WNC/WML contracts) changes — the edits are guidance-only markdown under `workflows/nodes/`, which is the same authority class as today.
- It directly addresses the two structural defects found (`shared-anti-cheating-rules.md` dual `### 13` + orphaned §12 paragraph) and the `manifest.shared` drift (list `gate-rules`/`repair-guidance` that no phase requires) — cheap hygiene wins.
- If the owner later wants the bigger lever, Option C is the honest next step — but it trades recovery semantics for tokens and should be a separate, engine-scoped OpenSpec change with the tests listed above.

Expected impact of Option A: ~320–430 static lines removed (6–8%), per-run repeated prose down ~350–550 lines (the wave phases each stop re-reading ~20–25 duplicated lines), ~120-line engine-injected header left as-is (it is the recovery/placement safety net and is already compact). The structural tax of 5,548 shared-load lines/run is dominated by legitimately-needed files (`shared-profile` ×7, `shared-silent-execution` ×8, `shared-schemas` ×4+5); those should be reduced only via B/C in a separate change, and only after the load-bearing constraint is re-verified against `shared-silent-execution.md:96` and `handoff-helpers.mjs:142-202`.
