> req: QIV-004

## MODIFIED Requirements

### Requirement: Queue repair SHALL remove stale task cards

`operate-queue repair --remove-stale` SHALL read `rb_plan.md` topic_registry and inspect queue v2 locations: `active_window`, `refill_pool`, and eligible non-terminal queue demand references. It SHALL resolve each queue item's topic slug using the same deterministic resolver as enqueue and remove task cards whose resolved topic slug is not in the registry. Delegated attempts already claimed into `delegated_in_flight` SHALL require work-unit terminal handling before queue repair mutates their demand binding.

#### Scenario: stale active-window task card removed

- **WHEN** `active_window` contains a queue item whose topic slug is absent from `topic_registry`
- **THEN** repair SHALL remove that queue item
- **AND** the summary SHALL identify the removed `queue_item_id`

#### Scenario: in-flight delegated demand is not silently removed

- **WHEN** a stale topic is bound to a non-terminal work unit in `delegated_in_flight`
- **THEN** repair SHALL fail closed with advice to resolve the work-unit attempt first

