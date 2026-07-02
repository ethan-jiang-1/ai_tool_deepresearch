---
title: "Research Profiles"
role: "shared research profile authority"
scope: "public research profile intent contracts, default evidence parameters, must-answer policy, and synthesis posture"
reads:
  - "specs/CONSTANTS.md"
writes: []
---

# Research Profiles

This file is the canonical authority for public research profiles. Production, qualification, runtime qualification, and generated run files compare selected profiles and configured parameters against this file, not against a table copied into a generated plan.

The `research_profile` enum values are named in `specs/CONSTANTS.md`; this file owns the intent contract, Wave 1 pass contract, Wave 2 synthesis contract, must-answer posture, default evidence formulas, and critical-claim posture for each profile.

Profiles are mutually exclusive public run modes. A user chooses exactly one before execution begins. Internal evidence-intensity settings are derived parameters: configured floors, source-family preferences, source filters, and critical-claim posture. They may be tuned later through `command_playbooks/adjust-profile-parameters.md`, but they are not separate public startup profiles.

Profiles do not weaken accepted-reference inventory requirements, bypass webpage diagnostics, bypass cross-verification, replace artifact/backfill requirements, or soften gate audits. They tell Wave 1 which must-answer entries are profile-critical and tell Wave 2 what kind of synthesis judgment the run owes.

This file owns profile policy only. It does not store a run's concrete must-answer list or human decisions. The generated `PROFILE_PATH` records run-specific profile data selected for this run: root must-answer set, configured parameters, manual overrides, and HITL1/HITL2 human decisions.

## Public Profile Contracts

| profile | intent contract | Wave 1 pass contract | Wave 2 synthesis contract |
| --- | --- | --- | --- |
| `quick_factual` | answer a low-risk, narrow factual question quickly relative to heavier profiles | every confirmed `answer_phase=wave1_topic` topic target is answered with local accepted refs, explicitly downgraded, or queue-backed; no unresolved core factual gap is hidden as a normal open question | concise factual conclusion, confidence, limitations, and local backing refs; any `answer_phase=wave2_synthesis` entry must be covered by a synthesis row |
| `exploratory_map` | build a coverage map for an exploratory research area | every confirmed `answer_phase=wave1_topic` topic target is evidence-backed or explicitly classified into unknowns, coverage gaps, failed routes, and priority questions; open questions may remain only when classified by impact and next-step priority | coverage map, discovered structure, unknown zones, tensions, and next-step priorities, each backed by local evidence or explicit gap records; synthesis-phase entries are answered as map judgments |
| `claim_verification` | test whether stated or implied claims are confirmed, weakened, bounded, or unsupported | every confirmed `answer_phase=wave1_topic` claim/subclaim entry maps evidence direction, support, weakening evidence, counterexamples, and limitations; unresolved core claim gaps block or downgrade the topic instead of being treated as harmless open questions | claim judgment ledger with support/weaken direction, confidence, counterexamples, limitations, and local backing refs; synthesis-phase entries receive final claim judgments |

## Must-Answer Parameters

Topic Investigation Targets are dynamic hard-question contracts, not ordinary exploration notes. Each confirmed topic maintains them inside `ARTIFACT_DIR/wave1_topics/<topic-id>-<topic-slug>/question-list.md` once Wave 1 evidence begins, with Topic Target Coverage summarized in `evidence-summary.md`. Targets may start from seed-topic `must_answer` entries, root-lens links, or profile-critical claims, then split, merge, add, downgrade, or become synthesis inputs as evidence changes the run.

Every must-answer row carries `answer_phase`:

- `wave1_topic`: answerable inside one topic's Wave 1 evidence package.
- `wave2_synthesis`: answerable only after topic evidence is synthesized through the root lens in Wave 2.

Wave 1 does not have to answer `wave2_synthesis` entries, but it must preserve them in Topic Investigation Targets as `synthesis_pending` with a concrete synthesis route. Wave 2 cannot pass until those synthesis-phase entries are covered by the Wave 2 artifact and `Cross-Topic Conclusion Matrix`.

| profile | default must-answer intensity | Wave 1 handling | Wave 2 handling |
| --- | --- | --- | --- |
| `quick_factual` | keep the confirmed set small, usually 1-3 high-value entries per topic unless the user or source material requires more | close or explicitly downgrade factual `wave1_topic` entries; allow only clearly scoped `synthesis_pending` entries | answer synthesis entries as concise factual conclusions with confidence and limits |
| `exploratory_map` | allow a broader evolving set when it improves coverage, gaps, and priority mapping | classify topic-level entries into answered, unknown, coverage gap, failed route, or queued priority; open items are allowed only when classified | answer synthesis entries as coverage-map judgments, unknown zones, tensions, and next-step priorities |
| `claim_verification` | expand as needed to cover explicit claims, implied claims, subclaims, counterclaims, and boundary conditions | unresolved core claim entries fail, block, or force confidence downgrade; weakening evidence and counterexamples are first-class coverage | answer synthesis entries as final claim judgments with evidence direction, confidence, counterexamples, and scope limits |

## Wave 2 Human Decision Posture

At the HITL2 checkpoint, the selected profile determines how answerability is interpreted:

- `quick_factual`: ready means the factual answer, confidence, and limits are locally backed; if not, the repair recommendation usually targets missing facts, date scope, or source verification.
- `exploratory_map`: ready may include visible unknown zones when they are classified by coverage gap and priority; repair usually targets missing topic dimensions or weak map coverage.
- `claim_verification`: ready may be a supported, weakened, bounded, or insufficient judgment; repair targets missing subclaims, counterexamples, independent support, or boundary evidence.

`answerability_class=blocked_repair_required` cannot enter Readiness under any profile. Human approval may choose the repair route, but it cannot override the failed evidence or synthesis condition.

## Default Evidence Parameters

These are default internal parameters derived from the chosen public profile. Generated plans copy the configured values for the run; they do not copy this table as a second authority.

| profile | applicability boundary | `wave0_shared_doc_floor` | `wave1_doc_floor_per_topic` | `primary_source_floor` | `secondary_source_floor` | `recent_source_floor` | `limitation_source_floor` | `critical_claim_checks` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `quick_factual` | low-risk, narrow factual scan where speed matters; not suitable by default for management, decision-shaping, compliance, security, medical, legal, financial, irreversible, contested, or weakly sourced work | `max(5, min(12, 4 + ceil(topic_complexity_factor / 2) + ceil(cross_topic_dependency_factor / 2)))` | `5` | `2` | `1` | `1` | `1` | `targeted P0/P1 factual checks; escalate profile or manually raise parameters when claims are high-risk, compliance, security, medical, legal, financial, irreversible, contested, or weakly sourced` |
| `exploratory_map` | exploratory coverage mapping where the deliverable needs structure, unknowns, and priority paths more than a binary truth judgment | `max(8, min(18, 6 + topic_complexity_factor + cross_topic_dependency_factor))` | `8` | `3` | `2` | `1` | `2` | `coverage and limitation checks; classify unknowns, weak areas, failed routes, and next-step priorities instead of forcing premature closure` |
| `claim_verification` | verification of explicit or implied claims, especially contested, weakly sourced, decision-shaping, or high-consequence claims | `max(10, min(24, 8 + topic_complexity_factor + cross_topic_dependency_factor))` | `10` | `4` | `2` | `1` | `2` | `expanded P0/P1 verification, independent support when available, explicit counterexample/limitation search, and confidence downgrade for scarcity` |

If a run selects `quick_factual` while the seed, user request, final deliverable, or audience indicates management, decision-shaping, compliance, security, medical, legal, financial, irreversible, contested, or weakly sourced work, the run must either choose `claim_verification` or record `research_profile_user_choice=explicit_override`, the risk rationale, the confidence consequence, and the fact that all gate audits still apply to the configured values.

`quick_factual` is quick only relative to the heavier profiles. It is still an anti-shallow-research run profile, not a lightweight chat answer. For example, a two-topic run with `topic_complexity_factor=1` and `cross_topic_dependency_factor=1` configures Wave 0 shared refs to `6` and Wave 1 to `5` refs per topic before Wave 2; once each topic gets topic-unique evidence, the topic artifacts are also required before Wave 1 can pass.
