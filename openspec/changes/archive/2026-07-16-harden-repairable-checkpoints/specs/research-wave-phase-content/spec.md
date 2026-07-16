> req: RWP-003, RWP-012, RWP-013

## MODIFIED Requirements

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
