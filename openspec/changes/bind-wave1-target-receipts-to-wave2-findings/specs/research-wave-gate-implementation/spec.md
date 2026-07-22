## ADDED Requirements

> req: RWG-020

### Requirement: Wave Gates SHALL preserve declared target closure through one receipt

The Wave1 Gate evaluator SHALL validate the bounded `carried_targets` declaration using CTS-008's selected review. It SHALL require unique local target IDs and nonempty normalized target text, derive a deterministic target revision for each selected target, and produce an ordered receipt input. Missing or malformed current declarations SHALL fail Wave1 with the depth-review repair coordinate; an explicit empty declaration SHALL pass this part of the contract.

The Wave2 evaluator SHALL select only the receipt on the successful Wave1 `gate_attempt` whose legal handoff and route-bound load entered the current Wave2 path. For a current receipt contract, it SHALL require every receipt target to have at least one exact binding in the existing finding index and a valid existing finding disposition route. It SHALL not treat common topic, prose similarity, origin ref, trigger ref, or a mutable depth review as a binding. A historical selected Wave1 handoff that lacks the contract version is legacy-compatible; a current route with missing or malformed receipt is a blocking trace/handoff fact, not legacy.

#### Scenario: malformed declaration fails at Wave1
- **WHEN** a current depth review omits `carried_targets`, repeats a target ID, or contains an empty target text
- **THEN** Wave1 fails with the direct depth-review field as repair target
- **AND** no Wave1-to-Wave2 receipt is routed

#### Scenario: receipt target requires exact finding binding
- **WHEN** a routed receipt declares one target and finding-index has only the same topic or origin artifact
- **THEN** Wave2 closure fails with that target as the smallest missing fact
- **AND** repair points to the existing finding-index surface

#### Scenario: existing disposition routes remain the only outcomes
- **WHEN** a receipt-bound finding uses a valid existing defer, internal-data, record-only, existing-evidence, or targeted-search route
- **THEN** it satisfies closure according to that existing route
- **AND** the Engine does not infer semantic adequacy or create a target-level status
