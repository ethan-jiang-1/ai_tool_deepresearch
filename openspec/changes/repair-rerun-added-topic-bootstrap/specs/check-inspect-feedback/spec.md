> req: CHI-001, CHI-003

## MODIFIED Requirements

### Requirement: Feedback drives reflection and correction

The diagnostic from Inspect or a formal Gate SHALL be returned to the active Markdown Controller or LLM as structured feedback. Every formal Gate Controller SHALL inspect top-level `hints[]` before using compatible `inspect[]` or `advice[]` prose. A hint SHALL remain a read-only projection of the Engine's direct finding; it SHALL NOT create permission, state authority, a new route, or an automatic mutation.

When a primary hint names an Agent-authorized mutable surface or an existing legal Engine operation and no new semantic/risk decision is needed, the Agent SHALL perform that mechanical action and rerun the exact checkpoint named by `rerun`. The Controller SHALL NOT ask the user to execute ordinary pipeline commands or reconstruct `write_to` from error text, `rule.target`, or source inspection.

When the missing fact requires a new user semantic/risk/permission decision, an external non-delegable action, or a capability that does not exist, the Controller SHALL surface only that smallest boundary. After the decision or external prerequisite is satisfied, legal mechanical execution SHALL return to the Agent. Corrected state SHALL re-enter the same Check/Gate unless an accepted contract explicitly names another checkpoint.

#### Scenario: Controller executes an authorized Gate repair

- **WHEN** a formal Gate fails with one hint whose `write_to` names an authorized Agent surface or existing Engine operation
- **THEN** the active Markdown Controller SHALL have the Agent perform that repair and invoke the exact `rerun` command
- **AND** it SHALL NOT ask the user to run the command or infer a different repair path from generic advice

#### Scenario: User receives only the semantic decision boundary

- **WHEN** a Gate hint identifies a missing recorded human decision rather than a mechanical artifact repair
- **THEN** the Controller SHALL ask only for that decision
- **AND** after the decision is recorded, the Agent SHALL resume the legal Gate workflow

#### Scenario: Hint consumption does not create authority

- **WHEN** a hint names a status, trace, ledger, receipt, hash or queue blocker
- **THEN** the Controller SHALL invoke the accepted Engine-owned operation or report `missing_contract`
- **AND** it SHALL NOT directly edit deterministic authority because the hint exists


### Requirement: Recovery advice SHALL identify one reachable nearest legal action

For each independent root finding, formal Gate and inspect feedback SHALL expose one reachable nearest action through `missing_fact`, authorized `write_to`, and exact `rerun`. Existing transition, handoff, status-window, owner and command-contract helpers SHALL determine whether an Engine operation is currently legal. Feedback SHALL NOT recommend a predecessor, entry, recovery, replacement or mutation command that those same preconditions would reject.

If no sanctioned runtime operation can repair the direct fact, `write_to` SHALL identify the `missing_contract` or external non-delegable boundary instead of offering speculative alternatives. `inspect[]`, `advice[]`, and legacy Gate `failure_message` prose MAY retain bounded context but SHALL NOT contradict the structured repair coordinate or add competing repair branches for the same root. This requirement SHALL NOT create a generic repair CLI, persisted repair plan or Engine-selected semantic strategy.

#### Scenario: Reachable same-check action is returned

- **WHEN** current direct facts prove one existing repair operation is legal
- **THEN** the primary hint SHALL name that operation in `write_to` and the same checkpoint in `rerun`
- **AND** no competing action SHALL be rendered for that root

#### Scenario: Missing capability is explicit

- **WHEN** an actually submitted legacy declaration cannot be reconstructed to its recorded hash and no accepted replacement/rebind operation exists
- **THEN** feedback SHALL expose `missing_contract` as the sole repair boundary
- **AND** it SHALL NOT present manual ledger construction, external backup copying or a new attempt as an accepted action
