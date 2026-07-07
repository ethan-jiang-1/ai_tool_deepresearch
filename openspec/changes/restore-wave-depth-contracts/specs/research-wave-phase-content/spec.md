## MODIFIED Requirements

> req: RWP-002, RWP-003

### Requirement: Wave1 phase body completeness with subagent boundary

Wave1 phase body SHALL describe topic deepening delegated work as work-unit kind `wave1_topic_deepening`, with bounded sub-agent execution, lifecycle receipt, submit, submitted ledger coverage, Phase Agent depth review, and supplementary work-unit refill when the submitted output is shallow.

Wave1 phase body SHALL instruct the Phase Agent that Wave0 evidence is foundation context, not completion evidence for Wave1. Each topic deepening task SHALL require topic-specific new source discovery, mechanism analysis, trend/difficulty/limitation analysis, and profile-driven counterexample or cross-verification behavior when enabled by `rb_profile.yaml`.

The phase body SHALL require a per-topic depth review projection at `artifacts/wave1/{topic}/depth-review.yaml` before a topic is treated as done. The review projection SHALL record reviewed submitted work-unit refs, structured source claims reviewed from submitted results, Wave0 source URLs used for novelty comparison, new source URLs, required new-source floor, depth dimensions covered, profile checks, decision, and any supplementary queue item IDs.

Depth review decision values SHALL be closed:
- `accept`: required source novelty, cache mapping, depth dimensions, and profile checks are satisfied.
- `supplement_required`: shallow output, too few new sources, missing depth dimensions, missing cache mapping, or unmet profile-required checks require supplementary `wave1_topic_deepening`.
- `blocked_contract`: bounded supplementary attempts are exhausted, required profile/runtime parameters are missing, or the review cannot establish deterministic coverage; this records a visible blocker and SHALL NOT count as topic completion.

Explicit degraded-capture records MAY satisfy cache mapping for a source that could not be fully fetched after the required fetch chain, but SHALL NOT waive source novelty floors, depth dimensions, or profile checks.

#### Scenario: Wave1 deepening uses work-unit kind

- **WHEN** Wave1 deepening is delegated
- **THEN** the phase doc SHALL identify `wave1_topic_deepening` work units

#### Scenario: Wave1 requires depth review before topic completion

- **WHEN** a Wave1 work unit submits `evidence-summary.md` and `question-list.md`
- **THEN** the Phase Agent SHALL produce `artifacts/wave1/{topic}/depth-review.yaml`
- **AND** the topic SHALL NOT be considered complete until the depth review records `decision: accept`
- **AND** `supplement_required` or `blocked_contract` SHALL keep the topic incomplete for normal Wave1 pass

#### Scenario: Shallow Wave1 output routes to supplementary work unit

- **WHEN** Wave1 depth review finds too few genuinely new source URLs, missing depth dimensions, or unmet profile-required checks
- **THEN** the phase doc SHALL instruct the Agent to enqueue a supplementary `wave1_topic_deepening` queue item with explicit `payload.topic_slug`
- **AND** the Agent SHALL drain that supplementary item through `operate-work-unit claim` and `operate-work-unit submit`

### Requirement: Wave2 phase body completeness

Wave2 phase body SHALL describe pure synthesis as main-agent work and targeted evidence search as optional delegated work-unit kind `wave2_targeted_evidence`.

Pure synthesis SHALL be conditional. Before writing or completing pure synthesis, the Phase Agent SHALL complete cross-topic scan matrix construction, finding confidence triage, gap analysis, and emergent-search decisions in `cross-topic-ledger.md` and `finding-index.yaml`. The phase body SHALL make clear that synthesis prose is the projection after scan/triage/gap analysis, not a substitute for that work.

When scan/triage identifies an unresolved evidence gap that requires new external evidence, the phase doc SHALL route that gap into `wave2_targeted_evidence` queue demand and work-unit submit before the finding can count as resolved by new evidence. If the gap cannot be resolved inside the phase budget, the Agent SHALL explicitly defer it to HITL2 or final limitations through ledger/index fields rather than silently omitting it.

#### Scenario: Wave2 targeted search uses work-unit loop

- **WHEN** Wave2 identifies a gap requiring delegated evidence search
- **THEN** the phase doc SHALL route that gap into queue demand and work-unit submit

#### Scenario: Pure synthesis waits for scan and triage

- **WHEN** the Phase Agent is about to complete `wave2-synthesis`
- **THEN** `cross-topic-ledger.md` SHALL contain scan matrix, confidence triage, gap analysis, and search-decision content
- **AND** `finding-index.yaml` SHALL show that no unresolved search-required finding remains without submitted targeted evidence or explicit deferral
