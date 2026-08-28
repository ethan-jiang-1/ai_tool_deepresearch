> req: REI-003

## MODIFIED Requirements

### Requirement: Rerun loop protection with max iterations

Rerun loop protection remains mandatory. The distinction between framework-initiated surfacing and a user-initiated reply SHALL NOT weaken the active rerun-count Gate rule. When the active max-rerun boundary is exhausted, the Agent SHALL treat the current rerun path as unpassable rather than bypassing the Gate, resetting the counter, inventing a new route, or treating a user message as override authority.

The concrete boundary SHALL be owned only by the active `gate-rerun-ready.definition.json` rule, interpreted solely by the existing side-effect-free `evaluateRerunAvailability` evaluator. Specs and governance descriptions SHALL state stable max-iteration semantics without duplicating a rule count on another surface. This change raises the active boundary from 10 to 32 rerun cycles by changing the `rerun_count_valid` rule from `operator: less_than, value: 11` to `operator: less_than, value: 33`, and its `failure_message` SHALL describe a maximum of 32 rerun cycles. Any future change to the active boundary value SHALL require a separate accepted behavior change.

#### Scenario: Max reruns exhausted remains unpassable

- **WHEN** `rerun_count` no longer satisfies the active max-rerun Gate rule
- **THEN** the rerun-ready gate SHALL fail
- **AND** the Agent SHALL NOT reset `rerun_count`
- **AND** the Agent SHALL NOT bypass the gate through Markdown prose or a user message

#### Scenario: This change preserves the active boundary

- **WHEN** this change is applied
- **THEN** the active boundary SHALL remain owned solely by the `rerun_count_valid` rule in `gate-rerun-ready.definition.json`, with its `operator: less_than` preserved
- **AND** its `value` SHALL be raised from 11 to 33 (a maximum of 32 rerun cycles)
- **AND** its `failure_message` SHALL describe a maximum of 32 rerun cycles
- **AND** no other spec, governance description, Markdown, registry description, or test SHALL duplicate a concrete numeric limit
