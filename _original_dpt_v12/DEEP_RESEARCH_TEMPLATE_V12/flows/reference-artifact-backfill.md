---
title: "Reference, Artifact, And Backfill Flow"
role: "evidence and synthesis rules"
scope: "reference capture, indexing, artifact synthesis, backfill"
reads:
  - "specs/CONSTANTS.md"
  - "specs/CHARTER.md"
  - "specs/GATES.md"
  - "specs/METHODOLOGY.md"
  - "flows/source-intake-flow.md"
writes:
  - "<REFERENCE_DIR>/*"
  - "<ARTIFACT_DIR>/*"
  - "<TOPIC_ROOT>/*"
---

# Reference, Artifact, And Backfill Flow

References are the evidence Source of Record. Artifacts are derived synthesis.

`RUN_DIR/_cache/` is source intake staging only. `flows/source-intake-flow.md` owns the replaceable retrieval/provider and normalization policy. A source becomes reusable evidence only after the main agent promotes reviewed material into `REFERENCE_DIR/*.md`.

## Reference Template

This template is a projected capture aid. Canonical field and section names live in `specs/CONSTANTS.md`; reference-quality semantics live in `specs/METHODOLOGY.md -> Reference Quality / Local Reference Schema`.

```markdown
# <Title>

- source_url:
- source_file:
- acceptance_status: `accepted / reviewed_uncounted / excluded / background`
- source_type:
- source_family:
- tier: `tier_1 / tier_2 / tier_3 / tier_4`
- evidence_role: `foundation / must_answer / mechanism / trend / difficulty / limitation / comparison / synthesis_backing / discovery_only`
- topic_unique_status: `topic_unique / shared_foundation / both / not_applicable`
- accessed_at:
- source_date_scope:
- related_topic:
- trust_level:
- why_it_matters:
- related_entities:
- seed_backfill_status: `current / deferred_queue_backed / shared_foundation_only / not_applicable`
- captured_excerpt: `yes / partial / no`
- supports_claims:
- web_substance:
- commercial_intent:
- marketing_risk:
- cross_verification_required:
- cross_verification_status:
- content_retention_decision:
- risks_or_limitations:
- excluded_reason:

## Key Facts

## Core Content Capture

## Relevance To This Research

## Quotable Terms / Concepts

## Risks And Limitations
```

## Reference Filename Rule

Reference filenames carry provenance:

- Wave 0 shared foundation: `00-shared-<source-or-claim-slug>.md`
- Wave 1 topic evidence: `<topic-id>-<source-or-claim-slug>.md`

Do not create new counted references with opaque global filenames such as `ref-001-*`. The filename should make it obvious whether a file was produced as shared foundation or as topic-specific deepening. If a shared `00-shared-*` reference later counts for a topic, record that reuse explicitly in the Wave 1 accepted inventory and backfill the affected topic seed.

## Reference Detail Principle

Capture hard facts, data, mechanisms, and reasoning. A thin summary is not enough for deep research.

`Core Content Capture` must make the local reference useful without chat memory or relying on the original URL for routine reuse. Accepted references are Authoritative Copies, not artifact summaries.

Summary-only accepted references fail reference quality. Patch them before counting. Preserve qualified hard content such as numbers, dates, time scope, methods, mechanisms, constraints, case details, definitions, key clauses, limitations, counterexamples, disputes, and source-specific context. Prune SEO, marketing, unsupported claims, repeated slogans, and low-alignment filler; do not prune the evidence particles that justify acceptance.

Source material should pass through the source intake adapter before reference creation. Use `_cache/intake/<batch-id>/candidate-cards.md` to decide whether a candidate deserves full reference work. Promote only reviewed candidates into `REFERENCE_DIR`; discard or minimally record noisy candidates in `_cache/excluded/`. Direct-reference exception: already-known local/user-provided material may be written directly into `REFERENCE_DIR` only when the Queue task carries `direct_reference_exception` and explicitly says `no retrieval`, `no search`, and `no fetch`. The detailed intake request, provider profile, normalized candidate-card, and promotion contract lives in `flows/source-intake-flow.md`.

An accepted reference that counts toward a gate floor must have `acceptance_status=accepted`, `source_type`, `trust_level`, a canonical `tier`, an `evidence_role`, a `source_date_scope`, `supports_claims`, `source_family`, `seed_backfill_status`, `web_substance`, `commercial_intent`, `marketing_risk`, `cross_verification_required`, `cross_verification_status`, `content_retention_decision`, and `counted_for_floor=yes` in the relevant accepted inventory. `trust_level` uses the canonical source-family categories from `specs/CONSTANTS.md`, not `high / medium / low`. A reference counted toward a Wave 1 topic floor must also have `topic_unique_status`. Reviewed-but-not-accepted sources remain background only and should be recorded with `acceptance_status=reviewed_uncounted / excluded / background` plus an explicit `excluded_reason` when they influenced search, exclusion, or gate reasoning.

High-value references should include:

- concrete numbers
- dates and time scope
- source context
- method or mechanism
- important definitions
- constraints and limitations
- implications for the research question

Do not mirror copyrighted sources. Use structured summaries and short compliant excerpts.

Do:

- capture reasoning chains, methods, thresholds, timelines, and causal links
- preserve important numbers and terms faithfully
- mark ambiguity or contradictions explicitly
- note original language when translation matters

Do not:

- turn source capture into your own analysis
- copy irrelevant background
- convert uncertain claims into stronger conclusions
- keep unqualified SEO filler, unsupported promotional claims, repeated slogans, vague market adjectives, or unverifiable outcome claims as reusable evidence body

## Evidence Quality Ladder

The normative tier definitions live in `specs/METHODOLOGY.md`. This flow repeats them only as a capture aid for reference writers.

| tier | source type | default use |
| --- | --- | --- |
| Tier 1 | official source, filing, standard, regulation, primary dataset | can support critical claims |
| Tier 2 | industry association, credible research, analyst report with method, patent/product docs | can support important claims |
| Tier 3 | high-quality media, expert interview, practitioner case | use for context, mechanisms, failures |
| Tier 4 | SEO, marketing, weak secondary coverage | discovery only unless no alternative |

Critical claims need Tier 1 or Tier 2 support. If only lower-tier support exists, mark confidence low.

## What Belongs In References

Prioritize sources that:

- enter later reasoning chains
- add facts, numbers, methods, mechanisms, constraints, or counterexamples
- explain trends, difficulty, disputes, or failure modes
- provide primary or high-quality secondary evidence

Avoid sources that:

- repeat known conclusions
- are weak SEO or ranking pages
- are low relevance
- contain no mechanism, evidence, or useful constraint

## Webpage Material Diagnostic And Pruning

Before a webpage or webpage-derived source can count, diagnose the page in the reference fields listed in `specs/CONSTANTS.md -> Research And Evidence Enums`:

- `web_substance`
- `commercial_intent`
- `marketing_risk`
- `cross_verification_required`
- `cross_verification_status`
- `content_retention_decision`

Do not count a webpage when `web_substance=thin` or `web_substance=none`. Do not use high-marketing-risk or strong-commercial-intent pages as neutral factual evidence for market reality, outcomes, benchmarks, or P0/P1 claims unless independent verification is recorded. Scarcity exceptions may preserve a low-confidence gap, but they do not make unverified high-marketing-risk or strong-commercial-intent webpages count for those claims.

If the whole page fails, do not keep a normal accepted reference file. Record it in excluded inventory, or keep only a minimal excluded stub when the source affected search, exclusion, or gate reasoning.

If the page is partially useful, set `content_retention_decision=prune_partial` and keep only qualified, claim-relevant facts, numbers, definitions, mechanisms, constraints, or explicit publisher claims. Remove unqualified marketing or SEO content from `Core Content Capture`; if it is mentioned, keep it only as a short diagnostic note explaining why it was pruned.

## Index Rules

`REFERENCE_DIR/_INDEX.md` is navigation, not evidence. It should include:

- reference filename
- provenance prefix meaning: `00-shared` or topic id
- source title
- related topics
- trust level
- one-line relevance
- status

## Artifact Types

Artifacts are mandatory derived synthesis for normal Wave 1 and Wave 2 completion. At minimum, create:

- one evidence summary per topic: `<ARTIFACT_DIR>/wave1_topics/<topic-id>-<topic-slug>/evidence-summary.md`
- one question list per topic: `<ARTIFACT_DIR>/wave1_topics/<topic-id>-<topic-slug>/question-list.md`
- one Wave 2 synthesis artifact: `<ARTIFACT_DIR>/wave2/cross-topic-synthesis.md`
- `<ARTIFACT_DIR>/README.md`

Additional artifact types may include:

- readiness summaries

Canonical layout rule: topic artifacts are directory-scoped, not flat. Do not mix `<topic-id>-evidence-summary.md` flat files with `<topic-slug>/` directories. Additional topic-specific artifacts go under the same `<ARTIFACT_DIR>/wave1_topics/<topic-id>-<topic-slug>/` directory. Shared or cross-topic artifacts go under `<ARTIFACT_DIR>/shared/` or `<ARTIFACT_DIR>/wave2/`.

Artifacts must cite local references. They do not replace source capture.

Artifact files must be useful without reopening chat history. An evidence summary must include concrete Key Evidence, Mechanism, Current Judgment, and Topic Target Coverage sections and cite local reference paths under `REFERENCE_DIR`. A question list must satisfy the Wave 1 Exploration Ledger Contract from `specs/METHODOLOGY.md`: `Topic Investigation Targets`, `Question Reconciliation`, `Emergent Question Protocol`, and `Exploration / Exploitation Decision`, in that order. It must reconcile pre-existing questions with state markers (`[已解决]`, `[部分进展]`, `[仍开放]`, `[需内部数据]`) before adding `[涌现]` questions, and it must record the decision, trigger evidence, and queue consequence. Files that merely list short ids, URLs, placeholders, copied seed questions, or generic brainstorm notes are not produced artifacts for gate purposes.

## Artifact Lifecycle

The canonical lifecycle and layout authority lives in `specs/METHODOLOGY.md -> Artifacts / Artifact Lifecycle`. This flow repeats the operational triggers only as execution guidance for reference and artifact writers.

Artifacts are not one-shot. They have a lifecycle:

1. **initial production**: when `topic_unique_ref_count` first reaches >= 1. The queue detects either `evidence_summary` or `question_list` with `produced_at_ref_count = 0` plus `topic_unique_ref_count >= 1`, then promotes an immediate two-artifact production task. Shared-foundation-only references do not trigger initial topic artifacts. Produce progressively per topic; do not defer all artifacts to floor completion or Wave 1 closeout. Do not run the next Wave 1 source-intake, cross-topic handoff, or topic deepening task while any triggered initial topic artifact is still missing. The only valid deferral is foreground: initial production must be in `slot_1_current` or `slot_2_next`; a Refill Pool candidate alone is not a receipt.
2. **incremental refresh**: when `accepted_topic_ref_count` exceeds the last `produced_at_ref_count` by >= 2. A delta of 1 (single new ref after artifact production) does not trigger refresh — the marginal change to synthesis judgments is too small to justify the work. At delta >= 2, the queue promotes a refresh task.
3. **gate audit refresh**: during Wave 1 Source Floor Audit, every topic must have `evidence_summary` and `question_list` `produced_at_ref_count` matching `accepted_topic_ref_count`. Any stale artifact must be refreshed before the audit can pass.

An artifact is **stale** when `produced_at_ref_count < accepted_topic_ref_count`. The queue detects staleness via producer_rule=`topic_ref_count_changed` and promotes production or refresh as QUEUE tasks when the lifecycle threshold requires it. A delta of 1 does not force refresh. Staleness never runs a hidden artifact writer outside the active queue; stale artifact steering blocks decisions that depend on the new evidence, delta >= 2 refresh thresholds, and Wave 1 gate-audit freshness.

**Refresh is a lighter operation than initial production**: read only the new refs (those landed since the last `produced_at_ref_count`), update Topic Target Coverage rows affected by the evidence, update evidence summary sections that are affected (Key Mechanisms, Key Trends, Key Difficulties, Synthesis Judgment), reconcile Topic Investigation Targets and the question list against new evidence, rerun the Emergent Question Protocol, refresh the Exploration / Exploitation Decision row, and update `produced_at_ref_count`. Do not rewrite the entire artifact from scratch unless the delta is very large (>= 5 refs), in which case a full rewrite may be warranted to avoid accumulated patchwork.

## Wave 2 Judgment Tags

For high-leverage synthesis judgments, include:

- `claim_type`: `hard_fact / analysis_judgment / trend_speculation`
- `confidence`: `high / medium / low`
- `backing_refs`: local reference paths
- `operator_notes`: optional, only for practical runtime conclusions for the human or downstream team applying the research; never evidence and never a substitute for `backing_refs`

Use tags where they help downstream reasoning; do not tag every sentence.

Wave 2 synthesis is a derived artifact, but it is still an auditable evidence surface. `cross-topic-synthesis.md` must contain substantive Wave 2 synthesis body, local reference paths for backing refs, a conflict/tension reconciliation section, and a Cross-Topic Conclusion Matrix that matches `STATUS_PATH`. Matrix rows that answer `answer_phase=wave2_synthesis` must-answer entries record the covered `must_answer_ids`. In a single-topic run, the body may be within-topic synthesis, but the matrix must still contain at least one locally backed synthesis row with `compared_with=not_applicable_single_topic`. A synthesis artifact that cites only short ids such as `ref-060`, summarizes topic notes without local paths, leaves synthesis-phase must-answer entries uncovered, or uses single-topic not-applicable as an empty shortcut does not authorize `wave2_complete`.

## Topic Backfill

Before Wave 0, if a topic seed file is new or missing stable growth sections, insert the section headings first. This is a write discipline, not a new gate.

Do not confuse growth-tail repair with seed topic intake readiness. The upper section must still provide concrete topic identity, `must_answer`, why-now trigger, research boundary, evidence anchors, and why-it-matters substance. If those are missing, record a topic intake gap and queue clarification instead of treating placeholder growth sections as readiness.

Topic backfill is part of the reference completion unit. A reference that affects a topic is not complete until the affected topic seed growth section is updated and status records the seed backfill.

When execution adds evidence to a topic, append into stable sections:

- historical summary remains unchanged
- new evidence
- new mechanism understanding
- new trends and difficulties
- current judgment after synthesis
- open questions

Every new key judgment must cite local reference paths. If a prior judgment is revised, note the revision in the current judgment section instead of deleting history. Do not rewrite the top of a seed file into a new report unless the queue explicitly assigns a refactor.

Artifacts do not replace topic backfill. Build evidence summaries and question lists from reviewed local references after the topic seed has been updated or after an explicit deferral is recorded in `STATUS_PATH` and `QUEUE_PATH`.

## Post-Readiness URL Repair Rules

After readiness passes, URL repair uses only `source_url` values already recorded in accepted local references. It is bounded maintenance, not a research stage.

Allowed exception: when a `source_url` is missing or broken but the reference has enough stable fingerprints such as title, author, repository path, version, publication date, or distinctive excerpt, one targeted repair search may replace it with a `canonical_url`, `official_mirror`, or `archive_url`. Record `url_repair_reason`, previous URL if any, and new URL type in the reference. Do not use repair as discovery for new sources or new research objects.

Do repair only when it improves retrieval or auditability of evidence already counted before readiness. Limit the same single-detail repair to two attempts. If still unavailable, record the limitation and leave the gate state unchanged.

If repair reveals a substantive evidence problem, do not fix it as post-readiness maintenance. Restore the run to the last valid affected gate, refill Wave 1 or Wave 2 queue work, and write a diagnostic trace entry.
