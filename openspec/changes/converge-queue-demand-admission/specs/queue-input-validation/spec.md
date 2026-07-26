> req: QIV-001, QIV-004

## MODIFIED Requirements

### Requirement: Enqueue SHALL validate topic_slug against topic_registry

`operate-queue enqueue` SHALL, before writing a task card to the queue, use the shared side-effect-free queue-demand admission evaluator. The evaluator SHALL resolve topic-scoped demand against current `rb_plan.md` frontmatter `topic_registry`, apply the registered kind contract and closed work-unit assignment-contract inputs, and reject a card whose current canonical Topic/finding binding, kind policy, required-receipt shape, assignment mode, or assignment-contract resolution is invalid. It SHALL cover every registered queue-demand kind rather than a Wave1-only subset.

Topic slug resolution SHALL preserve the existing deterministic rules: explicit `payload.topic_slug` wins; explicit payload/lineage disagreement rejects; known queue item templates are fallback only; topic-scoped demand without a resolved slug rejects; finding-scoped demand with no topic slug remains outside Topic validation. For topic-scoped demand, the evaluator SHALL resolve both current canonical UID and current slug and SHALL NOT trust caller-supplied binding when it disagrees with the registry.

Admission SHALL be recomputed from current facts at every consuming boundary and SHALL NOT persist, cache, or trust an enqueue verdict. On rejection, enqueue SHALL return structured stdout feedback with exit code 1 and SHALL NOT write `rb_queue.json`.

`operate-queue check` SHALL use the same evaluator for each unclaimed demand in `active_window` and `refill_pool`. It SHALL report each rejection with its queue item identity and direct reason, fail its check verdict, and SHALL NOT mutate queue bytes, persist a derived health state, or perform repair.

#### Scenario: enqueue and claim share canonical Topic admission

- **WHEN** a topic-scoped task card names a UID/slug pair that does not match current `topic_registry`
- **THEN** enqueue SHALL reject it before queue mutation
- **AND** a legacy unclaimed card with the same pair SHALL produce the same admission rejection at queue check and claim preflight

#### Scenario: a non-Wave1 kind is not admitted by omission

- **WHEN** a registered non-Wave1 queue-demand kind has an invalid closed assignment-contract input
- **THEN** enqueue SHALL reject it through the shared evaluator
- **AND** it SHALL NOT pass merely because a Wave1-only card validator does not apply

#### Scenario: check does not become a queue mutation owner

- **WHEN** queue check finds an unclaimable unclaimed demand
- **THEN** it SHALL return the item identity and direct admission reason
- **AND** it SHALL leave active-window, refill-pool, in-flight and terminal-history bytes unchanged

### Requirement: Queue repair SHALL remove stale task cards

`operate-queue repair --remove-stale` SHALL inspect queue v2 `active_window` and `refill_pool` with the same queue-demand admission evaluator used by enqueue, queue check and claim. It SHALL remove an unclaimed card when either the existing topic/finding staleness checks or current admission rejects it, and SHALL report the `queue_item_id`, location and direct reason. It SHALL not create a terminal-history row, replacement demand, drop permission, or new terminal operation.

For every `delegated_in_flight` entry, repair SHALL check its reconstructed demand against the same evaluator before touching unclaimed locations. An admission rejection for an in-flight entry SHALL fail closed and direct the Agent to existing work-unit terminal handling; repair SHALL NOT remove, rewrite, or terminalize that attempt.

#### Scenario: legacy unclaimable demand has one existing terminal path

- **WHEN** a legacy card in `refill_pool` is rejected by the current assignment-contract admission evaluator and has no in-flight work unit
- **THEN** `repair --remove-stale` SHALL remove the card and report its direct admission reason
- **AND** no direct queue-file edit or new terminal command SHALL be required

#### Scenario: rejected in-flight demand remains a work-unit concern

- **WHEN** an in-flight entry reconstructs to a card rejected by current admission
- **THEN** `repair --remove-stale` SHALL fail before removing any queue demand
- **AND** its feedback SHALL require existing work-unit terminal handling for that attempt
