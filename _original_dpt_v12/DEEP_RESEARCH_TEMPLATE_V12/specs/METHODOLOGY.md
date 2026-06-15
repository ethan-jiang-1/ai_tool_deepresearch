---
title: "Deep Research Methodology"
role: "shared research-method authority"
scope: "evidence method, exploration/exploitation, references, artifacts, backfill, trace discipline, and source-intake delegation constraints"
template_version: "<TEMPLATE_VERSION>"
reads:
  - "specs/CONSTANTS.md"
  - "specs/CHARTER.md"
  - "specs/GATES.md"
  - "specs/QUEUE_CONTRACT.md"
writes: []
---

# Deep Research Methodology

This file is part of the shared normative spec set:

- `specs/CONSTANTS.md`
- `specs/CHARTER.md`
- `specs/GATES.md`
- `specs/METHODOLOGY.md`
- `specs/QUEUE_CONTRACT.md`

Control-file creation must encode this method into the five root control files: `PROFILE`, `PLAN`, `STATUS`, `QUEUE`, and `TRACE`. Qualification must judge whether the generated files preserve this method without reading creator playbooks, flows, or output skeletons.

## Evidence-First Rule

Deep Research progresses by landing reusable local evidence, not by accumulating chat impressions.

An accepted source must become an Authoritative Copy under `REFERENCE_DIR` when it supports later reasoning, adds a hard fact, clarifies a mechanism, explains a trend or difficulty, documents a limitation, or anchors a critical claim.

An accepted reference is not an artifact summary. It is the reusable evidence body for later seed backfill, audit, artifacts, and synthesis. A summary-only accepted reference cannot count toward a source floor. Patch the reference to reference quality before counting it.

Filtering removes noise, not qualified evidence. When a source contains hard content, keep the qualified evidence particles in `Core Content Capture`: numbers, dates, scopes, methods, mechanisms, constraints, case details, key definitions or clauses, limitations, counterexamples, disputes, and source-specific context. Do not compress this material into a few vague sentences that require chat memory or routine URL revisits to reuse.

Avoid weak SEO, repeated summaries, and low-relevance material. Do not collect sources merely to raise a count.

## Reference Quality

Each important reference must capture enough structured detail for reuse without chat memory or routine URL revisits:

- source URL or local source file
- source type and trust level
- source family or publisher family
- acceptance status
- tier
- evidence role
- topic-unique status when counted for a Wave 1 topic floor
- accessed date or date scope
- related topic
- why it matters
- key facts, numbers, definitions, mechanisms, and constraints
- risks, limitations, disputes, or failure modes
- claims supported
- excluded reason when the source was reviewed but not accepted or counted
- webpage diagnostic fields when the source is a webpage or webpage-derived source
- content retention decision, especially when source content was partially pruned
- short compliant excerpts only when useful

If a reference has only a thin readable summary, lacks `Core Content Capture`, or omits the hard content that made the source worth accepting, it fails reference quality even when its metadata fields are populated.

Critical claims need Tier 1 or Tier 2 support when available. If only weaker support exists, mark confidence low and keep the gap visible.

References counted toward source floors must expose machine-auditable fields: `acceptance_status`, `source_type`, `trust_level`, `tier`, `evidence_role`, `supports_claims`, `source_date_scope`, `source_family`, `seed_backfill_status`, `web_substance`, `commercial_intent`, `marketing_risk`, `cross_verification_required`, `cross_verification_status`, and `content_retention_decision`. References counted toward a Wave 1 topic floor must also expose `topic_unique_status`. A reviewed source with `acceptance_status` other than `accepted` may still be useful background, but it cannot count toward a gate floor.

Use canonical machine values from `specs/CONSTANTS.md`: `acceptance_status=accepted / reviewed_uncounted / excluded / background`; `tier=tier_1 / tier_2 / tier_3 / tier_4`; `evidence_role=foundation / must_answer / mechanism / trend / difficulty / limitation / comparison / synthesis_backing / discovery_only` as a semicolon-separated list when needed; `topic_unique_status=topic_unique / shared_foundation / both / not_applicable`; `seed_backfill_status=current / deferred_queue_backed / shared_foundation_only / not_applicable`; and `counted_for_floor=yes / no`.

`trust_level` uses the canonical source-family trust categories from `specs/CONSTANTS.md`. Do not use `high / medium / low` as `trust_level`; use synthesis `confidence` for judgment confidence. A high-trust shared reference is normally `trust_level=official` or `trust_level=academic`. Practitioner sources count as high-trust only when the accepted inventory records auditable method/data plus independent verification. Community sources do not count as high-trust for the Wave 0 majority.

## Critical Claim Checks

Critical Claim Checks are the run-specific high-risk claim posture recorded in `PROFILE_PATH -> Configured Profile Parameters.critical_claim_checks` and mirrored into `PLAN_PATH -> Instance Config.critical_claim_checks` for execution readability. The canonical profile presets live in `specs/RESEARCH_PROFILES.md`; this section owns how the selected posture is interpreted during evidence work.

Critical Claim Checks add verification pressure for high-leverage claims. They never replace Wave 0, Wave 1, Wave 2, Readiness, accepted-reference inventory fields, webpage diagnostics, source-family duplicate review, artifact production, or seed backfill.

For P0/P1 claims, management or decision-shaping judgments, security/compliance/legal/financial/medical claims, irreversible action recommendations, and contested or weakly sourced assertions:

- prefer Tier 1 or Tier 2 support when available
- record independent backing or an explicit scarcity exception with confidence downgrade
- require webpage cross-verification when commercial intent or marketing risk could distort the claim
- preserve limitations, counterexamples, and remaining unknowns in local references, topic seeds, status, or artifacts
- keep unresolved critical claim gaps visible in queue work or readiness blockers instead of hiding them behind source-count floors

## Human Decision Checkpoints

Deep Research has two explicit 人工确认（human-in-the-loop / HITL）checkpoints. They are UX decision points, not evidence-quality shortcuts.

`HITL1_profile_and_root_must_answer` happens before execution begins. The user chooses exactly one public `research_profile` and states what the final Deep Research result must answer. The shared profile authority owns must-answer policy and intensity; the generated `PROFILE_PATH` owns the concrete run-specific root must-answer set, configured parameters, overrides, and human decisions. If the user is unsure, `PROFILE_PATH` and the generated plan record a visible `gap_queue_backed` clarification or decomposition route instead of inventing a hidden root lens.

HITL1 user-facing wording must be plain Chinese first, with English terms only in bilingual form. Ask: "开始前我需要确认这轮研究的目标。你更想要哪种结果？" Then offer `A. 快速事实答案（quick factual）`, `B. 探索地图（exploratory map）`, and `C. 说法验证（claim verification）`, each with a short non-technical explanation. Also ask the user to write one sentence for "最终报告必须回答什么问题（final must-answer）". Do not show `quick_factual`, `exploratory_map`, or `claim_verification` as raw visible choices; write those canonical enum values only into internal fields.

`HITL2_wave2_readiness_decision` happens after Wave 2 synthesis assessment and before Readiness closeout. The agent first classifies answerability from local Wave 1/2 evidence and the selected profile, writes the local human-decision brief, syncs the HITL2 pending-user state into PROFILE/STATUS/QUEUE, and only then asks the user for the appropriate final-decision input:

- `ready_substantive`: the run can answer the root must-answer contract with local evidence; ask for the final report view or synthesis lens.
- `ready_insufficient_judgment`: the run can responsibly report that a claim cannot be confirmed, evidence is insufficient, or confidence must stay low; ask whether to produce that insufficiency-focused final view or repair/rerun. Only `user_decision=proceed_to_readiness` with a concrete final report view and mapped `final_output_dir` may enter Readiness; repair/rerun keeps the relevant gate open or reopened.
- `blocked_repair_required`: the run cannot responsibly answer because topic topology, evidence, local backing, or synthesis coverage is missing; provide concrete repair advice such as formalize a new topic, refill Wave 1 evidence, rerun Wave 2 synthesis, or adjust profile parameters.

The HITL2 Source of Record is `PROFILE_PATH -> HITL2 Wave 2 Readiness Decision`. `STATUS_PATH -> Human Decision Checkpoints`, `STATUS_PATH -> Wave 2`, and `STATUS_PATH -> Wave 2 Human Decision Brief` are projections and must match it before Readiness passes. The pending-user contract for the actual HITL2 interruption is: `ARTIFACT_DIR/wave2/human-decision-brief.md` exists; `PROFILE_PATH -> HITL2 Wave 2 Readiness Decision.hitl2_checkpoint_status=pending_user`; `STATUS_PATH -> Human Decision Checkpoints.hitl2_wave2_readiness_decision_status=pending_user`; `PROFILE_PATH -> Human Decision Checkpoints` has the `HITL2_wave2_readiness_decision` row `status=pending_user`; `QUEUE_PATH.Active Queue.queue_health=blocked`; `stop_authorization_state=decision_blocker`; `unauthorized_stop_next_action=not_applicable`; and `STATUS_PATH.Resume Checkpoint.safe_to_interrupt=yes`. Before that pending-user state is written, Wave 2 closeout is still `unauthorized_continue_required` and must continue preparing the brief and projections instead of speaking to the user. The recorded-state contract for Readiness is: `PROFILE_PATH -> HITL2 Wave 2 Readiness Decision.hitl2_checkpoint_status=recorded`; `STATUS_PATH -> Human Decision Checkpoints.hitl2_wave2_readiness_decision_status=recorded`; and `PROFILE_PATH -> Human Decision Checkpoints` includes a `HITL2_wave2_readiness_decision` row with `status=recorded`. Human approval cannot override a failed Wave 2 audit, missing local references, uncovered synthesis-phase must-answer entries, a missing topic, or `answerability_class=blocked_repair_required`. If HITL2 selects repair/rerun, keep or restore the affected earlier gate and refill concrete queue work. If HITL2 selects `request_view_revision`, record it only as an intermediate blocked state, queue concrete view-clarification work, and do not enter Readiness until the revised `final_report_view` and `final_output_dir` are recorded with `user_decision=proceed_to_readiness`. If HITL2 selects a final report view, `command_playbooks/create-final.md` must use that recorded view and directory rather than silently inventing a new final lens.

Final output directories are deterministic: `profile_default -> final/`, `executive_brief -> final_executive_brief/`, `evidence_map -> final_evidence_map/`, `claim_judgment -> final_claim_judgment/`, `technical_deep_dive -> final_technical_deep_dive/`, and `custom -> final_custom_{custom_final_report_view_slug}/`. For `custom`, record both `custom_final_report_view_label` and `custom_final_report_view_slug`.

HITL2 user-facing wording must first explain in plain Chinese: what can be answered now, what cannot yet be answered or needs caution, and what continuing repair would add. The visible choices should be "继续生成最终报告（proceed to final report）", "换一种报告视角（change final report view）", "继续补证据/重跑（repair and rerun）", and "停止并保留阻塞原因（stop blocked）". Do not show `ready_substantive`, `ready_insufficient_judgment`, `blocked_repair_required`, `proceed_to_readiness`, `request_view_revision`, `repair_and_rerun`, or `stop_blocked` as raw user choices; write them only into canonical internal fields after the user decision is understood.

## User-Visible Stop Authorization

The long-run UX method has only two normal human decision loops: HITL1 before execution and HITL2 after Wave 2 synthesis assessment. Everything between them is silent autonomous execution unless a concrete decision blocker is recorded.

Do not treat Wave 0 completion, Wave 1 completion, Wave 2 completion, a source-intake batch ending, artifact refresh, status sync, next task discovery, evidence shortage, cost concern, or generic uncertainty as a user stop point. The user's opportunity to adjust direction, request repair/rerun, choose the final view, or stop blocked is HITL2 after Wave 2 synthesis assessment. If Wave 2 will be expensive, difficult, or likely to expose limitations, record that in `STATUS_PATH`, `QUEUE_PATH`, artifacts, or the HITL2 brief when reached; do not stop earlier to ask whether to continue.

`QUEUE_PATH -> Active Queue` is the Source of Record for the current stop authorization state. `STATUS_PATH -> Operator View` mirrors it for recovery. The field-level contract, valid stop states, Queue Work Unit Contract, Pre-Response Gate, and native projection boundary live in `specs/QUEUE_CONTRACT.md`; the step-by-step action loop lives in `flows/queue-agentic-flow.md`.

Methodologically, `decision_blocker` means a persisted blocker, not a milestone. Valid decision blockers are: the prepared HITL2 pending-user decision state described above, another missing user decision that cannot be inferred and is required now by the mainline, missing credential/access/material required for the mainline, a high-risk irreversible external action, or no executable queue item after documented refill, suspend, archive, and redirect attempts. "Wave complete but next wave remains", "evidence is incomplete but queue work exists", "the agent should report progress", and "continue or adjust direction?" are not decision blockers.

Post-gate continuation is mandatory:

- after `wave0_complete`, the next non-chat action must start Wave 1 continuation work such as topic evidence intake, artifact production, or Wave 1 audit preparation, unless a real blocker is recorded.
- after `wave1_complete`, the next non-chat action must start Wave 2 synthesis/action, unless a real blocker is recorded.
- after `wave2_complete`, the next non-chat action must prepare the HITL2 Wave 2 readiness decision path until the brief exists and the PROFILE/STATUS/QUEUE pending-user state is written; only that explicit pending-user decision state may stop for the user. Ordinary summaries that wait for the user are forbidden.

Claude Code Stop hooks, OpenAI Agents SDK HITL, and LangGraph interrupts all point to the same design lesson: HITL is an explicit interruption/resume state. In this framework, progress reporting is not HITL, and a stop attempt before an authorized state must be converted into the next executable Queue work unit defined by `specs/QUEUE_CONTRACT.md`.

### Local Reference Schema

The canonical local reference field names and section names live in `specs/CONSTANTS.md -> Local Reference File Fields` and `Local Reference Section Names`. This section owns the evidence-quality semantics for those fields; output skeletons and reference flows may project the field set into copyable templates for self-contained execution.

`source_url` or `source_file` must identify the source. Excluded or reviewed-but-uncounted references may be thinner than accepted references, but they must preserve enough source identity and `excluded_reason` detail to audit why the source did not count.

### Reference Filename Provenance

Reference filenames are a navigation and provenance surface. They must make the originating research scope visible without opening the file.

Use these filename prefixes under `REFERENCE_DIR`:

- Wave 0 shared foundation references: `00-shared-<source-or-claim-slug>.md`
- Wave 1 topic-specific references: `<topic-id>-<source-or-claim-slug>.md`, where `<topic-id>` is the stable topic id from `PLAN_PATH -> Topic Registry`, usually `01`, `02`, etc.
- Shared foundation material later reused by a topic may keep the `00-shared-` prefix, but it must be explicitly accepted for that topic in the Wave 1 inventory before it counts for the topic.

Do not use global opaque sequencing such as `ref-001-*` for counted references. Global numbering hides whether evidence was created as shared foundation or as topic-specific deepening, making Wave 1 and Wave 2 drift harder to audit. If a migration contains pre-existing `ref-NNN` files, rename or replace them before counting in a new V12 run, and update inventories, `_INDEX.md`, topic seeds, artifacts, and synthesis backing refs together.

### Evidence Quality Ladder

| tier | source type | default use |
| --- | --- | --- |
| Tier 1 | official source, filing, standard, regulation, primary dataset | can support critical claims |
| Tier 2 | industry association, credible research, analyst report with method, patent/product docs | can support important claims |
| Tier 3 | high-quality media, expert interview, practitioner case | use for context, mechanisms, failures |
| Tier 4 | SEO, marketing, weak secondary coverage | discovery only unless no alternative |

Critical claims need Tier 1 or Tier 2 support when available. If only lower-tier support exists, mark confidence low and keep the gap visible.

### Accepted Reference Tests

Before a reference is counted, record in the reference or accepted inventory:

- why this source is accepted rather than only background
- which specific claim, mechanism, trend, difficulty, limitation, or must-answer it supports
- whether another counted source from the same source family already supports the same claim
- whether the source is topic-unique, shared-foundation, or both
- whether webpage material passed the Webpage Material Diagnostic Gate and whether unqualified page content was pruned

For Wave 1 topic floors, avoid letting shared references dominate topic-specific breadth. Unless a scarcity exception is recorded, each topic should have at least half of its counted floor from topic-unique references that are not merely reused shared foundation. If a topic cannot meet that topic-unique target, record the scarcity reason, confidence effect, and queue consequence in the Wave 1 Source Floor Audit.

Unavailable-after-search, scarcity, saturation, suspend, archive, and redirect exceptions must be structured records, not loose prose. Wave 0 comparison/practice/failure gaps belong in `STATUS_PATH -> Unavailable-After-Search Records`; Wave 1 topic stop or scarcity exceptions belong in `STATUS_PATH -> Scarcity / Stop Exception Records`. A bare value such as `yes`, `exception`, `scarcity`, or a rationale paragraph inside an audit note does not authorize a gate transition.

### Webpage Material Diagnostic Gate

Every webpage or webpage-derived source must pass a page-level diagnostic before it can be counted as an accepted reference. The purpose is to prevent SEO filler, marketing copy, commercial-positioning pages, and unverified outcome claims from becoming reusable evidence.

Required diagnostic fields use the canonical enum values from `specs/CONSTANTS.md`:

- `web_substance`
- `commercial_intent`
- `marketing_risk`
- `cross_verification_required`
- `cross_verification_status`
- `content_retention_decision`

Hard count rules:

- `web_substance=thin` or `web_substance=none` cannot count toward source floors.
- `commercial_intent=strong` or `marketing_risk=high` cannot support neutral factual, market-reality, outcome, benchmark, or P0/P1 claims unless independently verified.
- For P0/P1 claims and high-leverage topic judgments, `cross_verification_required=yes` must have `cross_verification_status=verified` before the webpage can count for the claim.
- If verification cannot be obtained, record a scarcity exception with confidence downgrade and queue consequence. The exception preserves a low-confidence gap, but it does not make an unverified high-marketing-risk or strong-commercial-intent webpage count as evidence for neutral factual, market-reality, outcome, benchmark, or P0/P1 claims.
- Marketing pages may be accepted as evidence of the publisher's own messaging, positioning, product claims, or narrative. They cannot be treated as neutral proof of external reality or outcomes without independent verification.

Content retention rule:

- If the whole page fails the diagnostic, do not keep it as a normal accepted reference. Record it in excluded inventory, or keep only a minimal excluded stub when it affected search, exclusion, or gate reasoning.
- If a page is partially useful, keep only qualified, claim-relevant facts, numbers, definitions, mechanisms, constraints, or explicit publisher claims.
- Remove unqualified SEO filler, unsupported promotional claims, repeated slogans, vague market adjectives, and unverifiable outcome claims from `Core Content Capture`.
- `content_retention_decision=prune_partial` must leave a visible note explaining what was pruned and why. Excluded or pruned content remains diagnostic context only; it is not reusable evidence body and cannot support counted claims.

## Seed Topic Origin And Lifecycle

Seed topics normally originate from a larger research topic, final deliverable, or decision problem. The large topic is too broad to search, digest, and validate as one undifferentiated object, so it must be decomposed into smaller seed topics before execution begins.

A seed topic is the smallest useful research handle that can guide a non-generic evidence search while still contributing to the final synthesis. It should isolate one decision-relevant angle, expose one or more `must_answer` entries, mark the boundary, and name the source families or evidence routes that are likely to resolve them.

The lifecycle is:

```text
large topic or deliverable need
-> decompose into seed topics
-> build shared Wave 0 foundation
-> deepen each seed topic in Wave 1
-> reconcile pre-existing questions and append genuine emergent questions
-> produce Wave 2 synthesis
-> pass Readiness when the evidence package is locally reusable
```

Seed topics make evidence digestion possible. Each accepted reference is captured locally, backfilled into affected topic seeds, and later used for artifacts and synthesis. Multi-topic Wave 2 synthesis should compare the digested topic findings rather than summarizing disconnected notes; single-topic Wave 2 synthesis still needs locally backed synthesis rows instead of an empty not-applicable shortcut.

## Seed Topic Intake Standard

A seed topic is ready for Deep Research only when its upper section gives the next agent enough substance to understand what the topic is, why it matters now, and how evidence should be sought before Wave 0 begins.

Minimum upper-section fields:

- title or heading
- `slug`
- `must_answer` seed set, with at least one concrete entry and multiple entries allowed when the topic naturally has several required questions
- initial hypothesis, gap, or tension
- why now, including the time window or trigger that makes the topic current
- research boundary or out-of-scope notes
- evidence anchors or preferred source families
- original context constraints when the seed came from `original_topic/`: source anchor, in-scope limits, out-of-scope limits, search guardrails, and evidence route
- why it matters to the final deliverable or target audience
- optional downstream placement such as chapter, deliverable section, or operator use
- optional future observation window when relevant, kept separate from the current topic scope

These fields do not need to be perfect, but they must be concrete enough to distinguish the topic from adjacent topics and to support a non-generic first evidence search. If a topic has multiple must-answer entries, list them in stable numbered or semicolon-separated form so evidence, artifacts, and Wave 1 audit rows can refer to each entry. If a field is unknowable from the seed material, record an explicit assumption or intake gap rather than inventing facts.

For topics derived from `original_topic/`, the boundary and evidence anchors must preserve the original context constraints that prevent search drift: source anchor, in-scope objects or claims, explicit out-of-scope expansions, required query terms/entities, allowed synonyms, forbidden broadening, and first evidence routes. A topic label that seems accurate but lacks these constraints is not search-ready; record `intake_status=gap` or keep it as a pending candidate until the context is recoverable.

The seed `must_answer` set is the initial hard-question input, not a guarantee that the topic's investigation targets are complete. During Wave 1, each confirmed topic maintains Topic Investigation Targets inside `ARTIFACT_DIR/wave1_topics/<topic-id>-<topic-slug>/question-list.md` and Topic Target Coverage inside `ARTIFACT_DIR/wave1_topics/<topic-id>-<topic-slug>/evidence-summary.md`. Targets may start from seed questions, a root-lens link, or emergent evidence gaps, then split, merge, add, downgrade, retire, or become synthesis inputs as evidence changes the run. `PROFILE_PATH -> Root Must-Answer Set` remains the final Source of Record; topic targets are the topic-level investigation projection.

Every Topic Investigation Target entry must carry:

- stable `target_id`
- `target_question`
- `origin`: `seed / root_lens_link / emergent / profile_critical / evidence_gap`
- `status`: `candidate / confirmed / answered / partial / downgraded / unknown_classified / synthesis_pending / queued / blocked / retired`
- `profile_relevance`: why the selected `research_profile` makes this entry necessary or optional
- `evidence_refs`: local reference paths, or `none` while still unbacked
- `next_action`
- `last_updated_ref_count`

Topic Target Coverage in `evidence-summary.md` records how current evidence covers those target ids: `target_ids`, `coverage_status`, `backing_refs`, `queue_consequence`, and `last_updated_ref_count`. A target that depends on the root lens, comparison, coverage map, or final claim judgment should be marked as synthesis input in `next_action` or `coverage_status`; Wave 1 must preserve it as synthesis-pending or queue-backed, but Wave 2 owns the final answer.

The lower growth tail is separate from intake readiness. A seed topic should normally preserve these stable sections for execution-time backfill:

- `历史摘要（保留，不修改）`
- `本轮新增证据`
- `本轮新增机制理解`
- `本轮新增趋势与难点`
- `当前判断（本轮综合后）`
- `待验证问题`

If the growth tail is missing, execution setup may insert these headings before Wave 0 begins. Missing growth-tail headings are a setup repair, not proof that the seed topic's upper section is inadequate. Missing upper-section substance is different: it must be recorded as a topic intake gap in `PLAN_PATH` and `STATUS_PATH`, and the queue should refill an intake-clarification task before treating the topic as fully ready for Wave 1 deepening.

## Topic Seed Backfill

Reference completion includes:

- reference file
- `REFERENCE_DIR/_INDEX.md` entry
- affected topic seed backfill
- status sync

Every accepted reference that affects a topic must be appended into the affected topic seed before the queue task closes, unless a concrete deferral is recorded in `STATUS_PATH` and `QUEUE_PATH`.

Use stable seed growth sections:

- `本轮新增证据`
- `本轮新增机制理解`
- `本轮新增趋势与难点`
- `当前判断（本轮综合后）`
- `待验证问题`

Every new key judgment added to a topic seed must cite local reference paths.

### Question Reconciliation

After new evidence lands for a topic, the `待验证问题` section must be reconciled before new questions are appended. Reconciliation is a revision operation on existing questions; it removes stale noise and updates question state against newly landed evidence.

Reconciliation states:

- `[已解决]`: fully answered by landed evidence; remove from the active list rather than leaving stale open noise
- `[部分进展]`: partially answered; keep with the local reference path and what was learned
- `[仍开放]`: no material progress from the latest evidence; keep as open
- `[需内部数据]`: requires non-public internal data; keep but mark the internal-data dependency

During topic deepening fan-in, run order is mandatory:

1. backfill `本轮新增证据`, `本轮新增机制理解`, `本轮新增趋势与难点`, and `当前判断（本轮综合后）`
2. reconcile existing `待验证问题`
3. run Emergent Question Protocol
4. append genuinely new questions as `[涌现]` entries

Do not generate new questions during reconciliation itself. Obvious gaps noticed while reconciling should be held for the immediately following Emergent Question Protocol so the diff between revised pre-existing questions and generated new questions remains auditable.

### Question List As Exploration Ledger

The per-topic `question-list.md` artifact is the exploration ledger for Deep Research. It must not be an empty shell, a copied `待验证问题` list, or a generic list of possible questions. It records how evidence changed the topic's uncertainty.

`question-list.md` is not the root must-answer contract. It owns topic-local Topic Investigation Targets and exploration questions. A candidate question can be promoted into Topic Investigation Targets, but that promotion must be reflected in `evidence-summary.md -> Topic Target Coverage` with status, evidence, and queue consequence. A question can remain open in the exploration ledger without blocking a gate; a confirmed topic target cannot be ignored by calling it merely "open".

After a topic has at least one topic-unique accepted reference and active seed backfill, its question list must include:

- `Topic Investigation Targets` table using the canonical fields `target_id`, `target_question`, `origin`, `status`, `profile_relevance`, `evidence_refs`, `next_action`, and `last_updated_ref_count`
- reconciled prior questions with `[已解决]`, `[部分进展]`, `[仍开放]`, or `[需内部数据]` state markers and local reference paths where evidence caused the state change
- `[涌现]` questions generated by the Emergent Question Protocol, or an explicit `no_new_questions_after_protocol` note explaining which checks were run and why no new question emerged
- exploration/exploitation decision for the latest round: `continue / exploit_current_line / explore_new_line / topology_candidate / complete / early_saturation_review / suspend / archive / redirect`
- trigger evidence: local reference paths, excluded-source pattern, contradiction, missing-information gap, or cross-topic dependency that caused the decision
- queue consequence: next search route, artifact refresh, topology triage, stop-exception record, or reason no further public-source work is useful

A blank question list means the topic has not performed Deep Research exploration. A question list with only initial seed questions and no reconciliation/emergence state is stale after new evidence lands. An absence of new questions can support exploitation only when the Emergent Question Protocol was run and recorded; silence is not convergence.

### Wave 1 Exploration Ledger Contract

This is the fixed write contract for the Wave 1 exploration/exploitation mechanism. Do not treat it as optional documentation or as a style suggestion. A produced `question-list.md` is valid only when it exposes all four sections below in this order:

1. `Topic Investigation Targets`
2. `Question Reconciliation`
3. `Emergent Question Protocol`
4. `Exploration / Exploitation Decision`

Every topic-affecting accepted reference, topic artifact initial production, thresholded artifact refresh, and Wave 1 gate audit must run one ledger cycle before the agent closes the task or chooses the next topic search/deepening action. The cycle is:

1. project the topic's hard-question contract into `Topic Investigation Targets`
2. reconcile pre-existing questions against the newly accepted evidence
3. run the Emergent Question Protocol and record either `[涌现]` questions or `no_new_questions_after_protocol`
4. choose one canonical `exploration_exploitation_decision`
5. write the decision's trigger evidence and queue consequence into `question-list.md`, then mirror the same state into `STATUS_PATH`

`Topic Investigation Targets` is the Wave 1 equivalent of the topic-local must-answer contract. It starts from seed `must_answer`, root-lens links, profile-critical claims, and evidence gaps, then evolves as evidence splits, merges, downgrades, retires, or promotes targets. It must not be replaced by a free-form open-question list. A target row can be open, blocked, or synthesis-pending; it cannot disappear unless the row records why it was retired or merged.

`Question Reconciliation` must operate on already-known questions only. Use the state markers `[已解决]`, `[部分进展]`, `[仍开放]`, and `[需内部数据]`; include local reference paths when evidence changed the state. If there were no prior open questions, record `no_prior_questions_to_reconcile` and explain which target rows still own the topic's active uncertainty.

`Emergent Question Protocol` must show that all four checks ran: `new_concept`, `contradiction`, `missing_information_gap`, and `noise_pattern`. If any check creates a new question, append it as `[涌现]` and name the trigger reference, excluded-source pattern, contradiction, or missing-information gap. If none create a question, write `no_new_questions_after_protocol` with the four checks named explicitly. This record is required before claiming exploitation, convergence, or early saturation.

`Exploration / Exploitation Decision` must use exactly one canonical value from `specs/CONSTANTS.md -> exploration_exploitation_decision`. The decision record must include `decision`, `trigger_refs`, `unresolved_questions`, `counterexample_failure_search`, `queue_consequence`, `next_action`, and `last_updated_ref_count`.

Decision consequences are fixed:

- `continue`: preserve or add queued open questions and name the next same-line source route.
- `exploit_current_line`: explain which open questions are now low-yield, name the targeted verification still needed, and queue that verification unless the topic is complete.
- `explore_new_line`: add `[涌现]` questions or a new search route that follows the new signal.
- `topology_candidate`: record the candidate in `STATUS_PATH -> Topology Delta` and queue topology triage; do not mutate the Topic Registry directly.
- `complete`: allowed only when active floors, topic targets, evidence summary, question list, seed backfill, duplicate review, counterexample/failure-mode search, and remaining unknowns are recorded.
- `early_saturation_review`: not a stop by itself; it must record repeated-source evidence, attempted alternate routes, unresolved questions, confidence effect, and a stop-exception or continuation queue consequence.
- `suspend`, `archive`, and `redirect`: require a branch/stop record with reopen trigger or redirect target.

No field may be left as `not_started`, `not_assessed`, `TBD`, or a placeholder in a produced question list. If the agent cannot fill a field from local evidence, the correct value is a concrete gap plus queue consequence, not silence.

### Minimum `question-list.md` Shape

Use this shape for initial production and refresh. Keep the four sections and field names stable; add rows and evidence, but do not rename the contract.

```markdown
# Question List - Topic {topic-id}: {topic-slug}

produced_at_ref_count: {accepted_topic_ref_count}
last_updated: {YYYY-MM-DD}

## Topic Investigation Targets

| target_id | target_question | origin | status | profile_relevance | evidence_refs | next_action | last_updated_ref_count |
| --- | --- | --- | --- | --- | --- | --- | --- |
| {topic-id}-T01 | {topic-local must-answer or promoted target} | seed / root_lens_link / emergent / profile_critical / evidence_gap | candidate / confirmed / answered / partial / downgraded / unknown_classified / synthesis_pending / queued / blocked / retired | {why the active research_profile makes this necessary or optional} | {REFERENCE_DIR path or none} | {next evidence, synthesis, downgrade, retirement, or queue action} | {accepted_topic_ref_count} |

## Question Reconciliation

- [已解决] / [部分进展] / [仍开放] / [需内部数据] {prior question}: {what changed because of local refs; cite REFERENCE_DIR paths}.
- no_prior_questions_to_reconcile: {only when no prior open questions existed; name which target rows still own uncertainty}.

## Emergent Question Protocol

- new_concept: checked; {new object/none}; trigger_refs={REFERENCE_DIR path, excluded-source pattern, or none}.
- contradiction: checked; {contradiction/none}; trigger_refs={REFERENCE_DIR path, excluded-source pattern, or none}.
- missing_information_gap: checked; {gap/none}; trigger_refs={REFERENCE_DIR path, excluded-source pattern, or none}.
- noise_pattern: checked; {systematic source-noise route/none}; trigger_refs={REFERENCE_DIR path, excluded-source pattern, or none}.
- result: [涌现] {new question with trigger evidence} / no_new_questions_after_protocol.

## Exploration / Exploitation Decision

- decision: {continue / exploit_current_line / explore_new_line / topology_candidate / complete / early_saturation_review / suspend / archive / redirect}
- trigger_refs: {local reference paths, excluded-source pattern, contradiction, missing-information gap, or cross-topic dependency}
- unresolved_questions: {active open targets/questions or none-after-protocol with reason}
- counterexample_failure_search: {attempted route, queued route, or why public-source route is exhausted}
- queue_consequence: {next Queue work, artifact refresh, topology triage, stop-exception record, or concrete no-further-public-source reason}
- next_action: {immediate Queue or Wave 2 action}
- last_updated_ref_count: {accepted_topic_ref_count}
```

The section roles are non-interchangeable. `Topic Investigation Targets` projects the topic-local must-answer contract; `Question Reconciliation` revises already-known questions only; `Emergent Question Protocol` generates incremental questions only after reconciliation; `Exploration / Exploitation Decision` routes the next Queue consequence. A summary paragraph can follow these fields, but it cannot replace them.

## Artifacts

This section is the canonical Markdown authority for artifact minimums, lifecycle triggers, freshness, and layout. Output skeletons, reference/artifact flows, and Queue receipt checks may project these rules for run-local execution, but they must preserve this section's meaning.

Artifacts are derived synthesis. They do not replace references or topic seed backfill.

Minimum artifact set for normal completion:

- one evidence summary per topic: `ARTIFACT_DIR/wave1_topics/<topic-id>-<topic-slug>/evidence-summary.md`
- one question list per topic: `ARTIFACT_DIR/wave1_topics/<topic-id>-<topic-slug>/question-list.md`
- one Wave 2 synthesis artifact: `ARTIFACT_DIR/wave2/cross-topic-synthesis.md`
- `ARTIFACT_DIR/README.md`

Use the canonical artifact layout above for every run. Do not mix flat topic artifact files with per-topic directories. Do not encode artifact type into an ad hoc filename such as `<topic-id>-evidence-summary.md` when the topic has a canonical directory. Additional topic artifacts, if needed, go in the same topic directory with descriptive kebab-case filenames; shared or cross-topic artifacts go under `ARTIFACT_DIR/shared/` or `ARTIFACT_DIR/wave2/`.

Artifacts must cite local references. Create or update artifacts after each topic reaches its first topic-unique reference and seed backfill is active, or after an explicit deferral is recorded with a concrete Queue work unit or Refill Pool candidate. Do not defer all artifacts to Wave 1 closeout; produce evidence summaries and question lists progressively per topic as the artifact threshold is met.

Artifact steering is Queue-first. The active mechanism is producer_rule=`topic_ref_count_changed` creating or refreshing Queue-visible work, `hook_wave1_topic_fanin_steering` blocking the next Wave 1 source-intake, cross-topic handoff, or topic deepening until triggered initial artifacts exist or are the current/next foreground task, and the Wave 1 Source Floor Audit verifying freshness as a backstop. Do not use hidden artifact writers, gate-time cleanup, or a parallel trigger namespace.

Artifact existence is not enough. A produced artifact must contain reusable synthesis body, cite local reference paths under `REFERENCE_DIR`, and avoid relying only on short readable ids such as `ref-038`. A topic `evidence-summary.md` must at least expose Key Evidence, Mechanism, Current Judgment, and Topic Target Coverage sections. The Topic Target Coverage section must expose `target_ids`, `coverage_status`, local `backing_refs` or `queue_consequence`, and `last_updated_ref_count`. A topic `question-list.md` must satisfy the full Wave 1 Exploration Ledger Contract above. Thin files, placeholders, copied seed-question dumps, generic brainstorm lists, pathless short-id citations, and question lists without the decision/queue consequence do not satisfy artifact production.

The question-list artifact must also preserve the latest exploration/exploitation decision and Queue consequence. It is the artifact-level copy of the topic's uncertainty ledger; it should be possible to see why the topic is still being explored, why it is being exploited, or why it is eligible for stop/redirect without reading chat history.

### Artifact Lifecycle

Artifacts are not one-shot. Each artifact tracks a `produced_at_ref_count` baseline in `STATUS_PATH`:

1. **initial production**: triggered when `topic_unique_ref_count >= 1` and `produced_at_ref_count = 0`. Shared-foundation-only references do not satisfy the initial topic-artifact threshold. Queue must promote this task at immediate priority; produce progressively per topic as the artifact threshold is met, do not defer all artifacts to floor completion or Wave 1 closeout. No further Wave 1 source-intake, cross-topic handoff, or topic deepening task may run while triggered initial artifacts are missing unless the two-artifact production work is already in `slot_1_current` or `slot_2_next`; a Refill Pool candidate alone is not a valid deferral.
2. **incremental refresh**: triggered when `produced_at_ref_count > 0` and `(accepted_topic_ref_count - produced_at_ref_count) >= 2`. A delta of 1 does not trigger refresh (marginal synthesis change too small). At delta >= 2, Queue promotes a refresh task at high priority.
3. **gate audit refresh**: during Wave 1 Source Floor Audit, every topic must have `produced_at_ref_count = accepted_topic_ref_count` for `evidence_summary` and `question_list`.

An artifact is **stale** when `produced_at_ref_count < accepted_topic_ref_count`. Staleness is detected by the Queue `topic_ref_count_changed` producer rule and the relevant Critical Checkpoint Receipt in `specs/QUEUE_CONTRACT.md`. Refresh is lighter than initial production: read only new refs, update affected Topic Target Coverage rows, update affected evidence summary sections, reconcile Topic Investigation Targets and question list, rerun Emergent Question Protocol, refresh the Exploration / Exploitation Decision, and sync `produced_at_ref_count`. Full rewrite only when delta >= 5. Missing initial artifacts block further Wave 1 evidence/source advancement unless production is foregrounded in `slot_1_current` or `slot_2_next`. Stale artifacts block decisions that depend on the new evidence, thresholded refresh at delta >= 2, and Wave 1 gate-audit freshness; delta 1 may continue through `artifact_refresh_not_due` when both artifacts exist and the next decision does not depend on the new evidence.

## Exploration And Exploitation（探索 / 利用决策框架）

目的：在"探索新方向"和"深挖已知线索"之间做稳定判断，同时建立信号/噪声鉴别能力。互联网信息真假混杂，没有判断的收集就是噪声导入。

### Exploration Signals（探索信号）

出现以下信号时考虑探索新方向：

- **高频未归类概念**：≥2 份独立 reference 指向同一个现有 topic 难以容纳的新概念 → 可能需要拓扑扩展或重划边界
- **未建模维度**：新机制/风险/评价维度/生命周期阶段未被当前框架覆盖 → 最终判断可能缺少关键变量
- **核心问题未回答**：one or more `answer_phase=wave1_topic` must-answer entries still have substantive gaps, or one or more `answer_phase=wave2_synthesis` entries lack a concrete synthesis route; quota completion does not mean the question set is resolved
- **横向依赖变强**：新发现影响多个 topic 的结论 → 需要跨 topic 协调

When any exploration signal appears, write it into the topic seed or question-list artifact before closing the task. If the signal may change the topic topology, also record a `Topology Delta` candidate and queue triage. Do not leave exploration signals only in chat memory.

### Exploitation Signals（利用信号）

出现以下信号时继续深挖或收束已知线索：

- **证据收敛**：新增材料大多重复已知事实，主要价值在交叉验证而非新发现
- **问题清单收敛**：旧问题被回答，新问题产生速度明显下降 — 信号已被充分提取
- **反例搜索饱和**：专门搜索限制/争议/失败模式后未发现新的关键反例
- **机制稳定**：核心机制能用简洁语言解释，有多个高可信来源独立支撑

Exploitation signals require a record too. A topic may claim convergence only when the question list shows that pre-existing questions were answered or downgraded, the Emergent Question Protocol ran, no high-value `[涌现]` question remains unqueued, and counterexample/limitation search has been attempted or queue-backed.

### Signal/Noise Judgment（信号/噪声判断）

每一份材料在被接受为 reference 之前必须经过判断：

**来源可信度锚定**：`official`（官方）默认高可信但仍需交叉验证。`academic`（学术）关注方法论和 limitations 诚实度。`practitioner`（行业）是营销噪声最密集区域 — 区分可验证结果数据与不可验证市场宣称。`community`（社区）默认低权重，仅用于一手经验、交叉验证或失败案例搜索。

**营销/公关识别信号**：最高级形容词无数据支撑、数字过于整齐无方法论、自有"调研"无样本量、PR 风格无负面信息、循环引用链。

**丢弃规则**：纯观点零事实 → 丢弃。营销无独立验证 → 丢弃或标记 excluded。过时信息 → 丢弃旧版。低对齐且无跨 topic 价值 → 丢弃或 suspended。重复已知事实且低可信 → 丢弃，不增加 count。

**交叉验证**：改变 P0/P1 判断的 claim 需要 ≥2 个独立来源。单源头 claim 标注不确定性。矛盾信息保留张力，不强选一边。

### Emergent Question Protocol（问题涌现协议）

探索的本质是"答案激发更好的问题"。每轮探索后执行。

**执行顺序**：先 Question Reconciliation（清理存量），再 Emergent Question Protocol（生成增量）。顺序不能反。两个机制都操作 `待验证问题`，但 reconciliation 是 revision，emergent protocol 是 generation。

1. **新概念涌现**：出现无法归类的概念且 ≥2 份独立 reference → 生成新问题
2. **矛盾涌现**：新证据与之前判断矛盾 → 矛盾本身就是高质量新问题
3. **空白涌现**："应该有但找不到"的信息 → "为什么找不到"是诊断信号
4. **噪声模式反思**：丢弃材料的系统性模式 → 调整搜索策略

涌现的新问题追加到 `待验证问题`，标注 `[涌现]`。

If the protocol produces no new questions, record `no_new_questions_after_protocol` with the checks performed: new-concept, contradiction, missing-information gap, and noise-pattern reflection. This record is required before using "question list converging" as an exploitation or early-saturation signal.

### Runtime Topic Delta Protocol

Evidence digging may show that the instantiated topic set is incomplete. This is handled as runtime topology delta, not by rerunning template creation.

Discovery first records a candidate in `STATUS_PATH -> Topology Delta`, syncs the same unresolved candidate into `Topology Drift Review`, and queues triage. Do not update `PLAN_PATH -> Topic Registry` until the candidate is triaged.

Triage each candidate as exactly one of:

- `merge_existing`: current topics can own the candidate; update affected topic seed, status, and queue
- `formalize_new_topic`: candidate is an independent problem cluster; append the next stable topic id at the end of `PLAN_PATH -> Topic Registry`
- `suspend`: important but blocked or not currently researchable; record branch disposition and reopen trigger
- `archive`: unlikely to change the current deliverable; record branch disposition and reopen trigger
- `redirect`: move work to another topic; formalize first if the redirect target does not exist

Formalized topics are append-only. Never insert before existing registry rows, renumber existing topic ids, artifact paths, reference counters, or historical topic references. A formalized topic is complete only when `PLAN_PATH` Topic Registry / Seed Topic Intake Matrix / Topic Goals, `STATUS_PATH` Topology Delta, `QUEUE_PATH`, the new topic seed file physically under `TOPIC_ROOT`, and `TRACE_PATH` are all synchronized with `topology_sync_state=synced`.

If a formalized topic affects a passed gate, reopen the affected gate and refill concrete same-wave work that names the affected gate or wave and repair target. A substantive topology delta after `readiness_passed` is not post-readiness maintenance; reopen the relevant earlier wave.

### Decision Rules（决策规则）

判断启发，非硬配额。硬性要求在 Stop Conditions。最终以 FINAL_DELIVERABLE、must_answer 和本地证据质量为准。

Decision states use the canonical `exploration_exploitation_decision` enum:

- `continue`: high-value gaps remain on the current line
- `exploit_current_line`: current line is valuable but should narrow into targeted verification, counterexample search, or source-family cross-check rather than broad exploration
- `explore_new_line`: new concept, contradiction, missing-information gap, or noise pattern warrants a new search route inside the current topic
- `topology_candidate`: evidence suggests a topic split, merge, redirect, or new formalized topic might be needed; queue topology triage before changing registry structure
- `complete`: active floors and artifact/backfill requirements are met, remaining unknowns are listed, and no further queue work is required for that topic
- `early_saturation_review`: new sources mostly repeat known facts and the topic needs a structured saturation/stop review before any stop decision
- `suspend`: important but currently access-limited or too costly
- `archive`: low marginal value
- `redirect`: another topic or newly formalized topic is now the better path

Every decision state must have a question-list consequence. `continue`, `explore_new_line`, and `topology_candidate` add or preserve queued `[涌现]` questions or topology triage. `exploit_current_line` explains which open questions are now low-yield and what targeted evidence still needs verification. `complete`, `early_saturation_review`, `suspend`, `archive`, and `redirect` require unresolved questions, search attempts, confidence effect, and queue/branch consequence to be visible in `STATUS_PATH` and the question-list artifact.

## Anti-Stall Degradation

Use bounded attempts on a single detail. Try a small number of alternate queries or source routes, record the limitation, downgrade confidence if needed, and move to the next non-blocked high-value action.

Do not let one missing URL, inaccessible PDF, or unresolved micro-fact hold the mainline.

Do not degrade details that affect high-risk, irreversible, compliance, security, cost, or data-loss decisions. Those require a real blocker or a safer branch.

Anti-stall degradation has a run-level budget: if more than three open limitations affect P0/P1 judgments, or more than 20% of active topic must-answer claims rely on degraded evidence, stop normal advancement and refill queue work for evidence repair or record a blocker.

For the 20% budget, count an active topic target as one confirmed Topic Investigation Target that is needed to answer a topic's hard-question contract or Wave 2 synthesis contract. When a target is split across multiple subclaims, count the smallest claim that could change a P0/P1 judgment. Record the denominator in `STATUS_PATH -> Anti-Stall Budget` before using the percentage.

## Branch Disposition

When a branch no longer belongs on the mainline, record its disposition:

- `discard`: weak or irrelevant; do not land it
- `compress`: low detail but worth remembering
- `suspend`: important but blocked by access, disclosure, repetition, or poor marginal return
- `archive`: unlikely to change the core judgment
- `redirect`: another line is now more valuable

Branch records must include `branch / disposition / why / confirmed_so_far / still_missing / reopen_trigger`. Use the canonical disposition values `discard / compress / suspend / archive / redirect`.

## Stop Conditions

Do not mark a topic saturated until:

- core object list is stable
- confirmed `answer_phase=wave1_topic` must-answer entries are supported by local references, downgraded, classified, or queue-backed under the selected profile
- confirmed `answer_phase=wave2_synthesis` must-answer entries are preserved as `synthesis_pending` with a concrete Wave 2 route
- limitation or failure-mode search was attempted
- counterexample or disconfirming-evidence search was attempted
- official claims were cross-checked where possible
- remaining unknowns are listed

Below-floor topics remain open unless they have a justified stop exception and required status or branch records.

`complete` closes a topic cleanly with no further queue work required. It requires all active floors, topic target coverage, evidence summary and question list, seed backfill, source-family duplicate review, limitation/failure-mode search, counterexample or disconfirming-evidence search, official-claim cross-check where applicable, and remaining unknowns to be recorded.

A `topic_stop_decision=early_saturation` record must explicitly capture the counterexample/failure-mode search attempts and why new sources are repeating known facts rather than changing the mechanism. The ledger value that routes this review is `exploration_exploitation_decision=early_saturation_review`.

## Trace Discipline

`TRACE_PATH` is append-only diagnostic history. Write trace entries only for:

- direction change
- hypothesis reversal
- confound
- structural decision
- premature gate correction
- topology formalization
- reusable execution lesson
- correction of a prior diagnosis

Do not write routine progress, quota progress, or ordinary reference capture to trace.

Trace is not a bulk after-action dump. When a Wave 0 or later gate transition changes the execution state, write the relevant trace checkpoint in the same closeout that updates `STATUS_PATH.current_gate`, and update `STATUS_PATH -> Trace Pointer.last_trace_entry` to the newest trace entry label. Each reached transition requires its own distinct TRACE entry with an exact single `gate_transition` field value: `wave0_complete`, `wave1_complete`, `wave2_complete`, or `readiness_passed`.

Required transition checkpoints:

- entering Wave 1 after `wave0_complete`: record the foundation audit result, shared-reference scope, and any unavailable-after-search exception.
- entering Wave 2 after `wave1_complete`: record the Wave 1 audit result, topic stop/scarcity exceptions, artifact/backfill status, and remaining limitations.
- entering Readiness after `wave2_complete`: record the Wave 2 synthesis artifact path, matrix coverage, high-leverage judgment count, local backing-ref status, and conflict disposition.
- closing `readiness_passed`: record the final retrieval/handoff result and any post-readiness maintenance boundary.

A required transition checkpoint is valid only when it records `gate_transition`, evidence bundle, queue consequence, and status pointer sync. Wave 0, Wave 1, and Wave 2 transition checkpoints must also record the concrete non-chat continuation action that has been promoted or started. A checkpoint that only says the wave passed is incomplete.

Do not wait for a user prompt to notice that trace has not moved. Do not append a large set of backfilled trace entries at the end to simulate continuity; if trace lag is discovered, write one correction trace explaining the lag and continue from the current gate with a valid pointer.

Correction entries are diagnostic, not transition coverage. A `gate_correction`, `correction`, or "missed checkpoints" entry may explain that earlier checkpoints were skipped, but it cannot count as the missing `wave0_complete`, `wave1_complete`, or `wave2_complete` checkpoint. If a run reaches a later gate and earlier transition entries are missing, keep or restore the affected gate path and queue concrete repair or re-earned audit work instead of treating the final correction as proof of continuity.

## Source Intake Delegation

Source intake may use a foreground subagent runner to keep high-noise retrieval, fetch, and triage material out of the main conversation. This is a context-hygiene shape, not a different research method and not a separate execution mode.

Delegated source intake must write only exact assigned run-local `_cache/intake/<batch-id>/intake-request.md`, `_cache/intake/<batch-id>/retrieval-results.md`, `_cache/intake/<batch-id>/candidate-cards.md`, `_cache/intake/<batch-id>/capture-manifest.md`, and `_cache/excluded/<batch-id>-excluded.md` staging paths. Optional concrete captures under `_cache/captures/` must be listed in the batch capture manifest rather than predeclared as placeholder write targets. The main agent owns fan-in, `_cache/promote-log.md`, promotion to `REFERENCE_DIR`, `REFERENCE_DIR/_INDEX.md`, `STATUS_PATH`, `QUEUE_PATH`, `TRACE_PATH`, shared artifacts, and topic seed files.

Direct `REFERENCE_DIR` creation is valid only for already-known local or user-provided sources where the queue task explicitly states that no retrieval, no search, and no fetch was used.

No wave, topic, readiness item, source count, or final citation is complete until the main agent reviews candidate cards, performs fan-in, promotes accepted material, and updates shared files.

## Completion Model

The run model ends at Readiness. If Readiness fails, refill the relevant Wave 2 or earlier queue work. Do not introduce an extra completion stage after Readiness.

After `readiness_passed`, bounded maintenance may repair URLs or metadata for already accepted references only when it improves retrieval of existing evidence. It must not discover new research objects, add new sources, introduce new claims, or change gate passage. If maintenance reveals a substantive evidence problem, reopen the relevant Wave 1 or Wave 2 queue work rather than treating it as post-readiness completion.
