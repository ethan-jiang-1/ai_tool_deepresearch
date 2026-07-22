## ADDED Requirements

> req: RWG-020

### Requirement: Wave Gates SHALL preserve declared target closure through one receipt

The Wave1 Gate evaluator SHALL validate every canonical Topic's CTS-008-selected depth review. Each review SHALL contain `carried_targets`, an explicit array which MAY be empty; every entry SHALL have exactly `target_id` (a declaration-local unique string matching `^[A-Za-z0-9][A-Za-z0-9._-]*$`) and `target_text` (a YAML string scalar that is nonempty after NFC, LF-line-ending and trim normalization). The evaluator SHALL derive each `target_revision` as lowercase-hex `sha256` of canonical JSON `{target_id,target_text}`; derive lowercase-hex `intent_sha256` from canonical JSON of the current Topic's title, stored-order must-answer set, scope role, and stored-order dependencies; and aggregate every selected entry in strict `(topic_uid,target_id)` order with no duplicate pair.

The resulting one Gate input SHALL be `carried_target_receipt` with exact shape `{ contract_version: "wave1-carried-targets/v1", receipt_sha256, targets[] }`; each target SHALL contain `{ topic_uid, intent_sha256, target_id, target_revision }`, every digest SHALL match `^[0-9a-f]{64}$`, and `receipt_sha256` SHALL be the `sha256` of canonical JSON `{contract_version,targets}` excluding the digest field itself. The canonical JSON object key order is the field order shown in this requirement and arrays retain their stated order. The Wave1 CLI SHALL pass this validated object only through `writeGateAttempt(bundlePath, result, { carriedTargetReceipt })`; it SHALL not put it in `extraCheck`. A missing, ambiguous, or malformed review/declaration SHALL fail the whole Wave1 Gate with the exact depth-review repair coordinate; it SHALL not emit a partial receipt. An explicit all-empty declaration set SHALL pass this part of the contract.

The Wave2 evaluator SHALL select only the receipt on the successful Wave1 `gate_attempt` whose legal handoff and route-bound load entered the current Wave2 path. For a receipt that presents the Engine-owned contract version, it SHALL first require every receipt `(topic_uid,intent_sha256)` pair to equal the same current canonical Topic's CTS-008-derived binding. An unknown UID or changed binding is a parent-integrity root cause at the existing Wave1 handoff boundary, and SHALL short-circuit target-coverage checks for that receipt; Wave2 SHALL not direct the Agent to bind an old target in `finding-index.yaml`. Only after that prerequisite passes, it SHALL require every receipt target to have at least one exact binding in the existing finding index and a valid existing finding disposition route. It SHALL not treat common topic, prose similarity, origin ref, trigger ref, or a mutable depth review as a binding. A historical selected Wave1 handoff with no receipt is legacy-compatible; a trace event that presents the contract version but lacks, malforms, or disagrees with its receipt is a blocking trace/handoff fact, not legacy.

#### Scenario: malformed declaration fails at Wave1
- **WHEN** a current depth review omits `carried_targets`, repeats a target ID, or contains an empty target text
- **THEN** Wave1 fails with the direct depth-review field as repair target
- **AND** no Wave1-to-Wave2 receipt is routed

#### Scenario: receipt aggregates every current Topic review
- **WHEN** two current canonical Topics have valid selected depth reviews with carried targets
- **THEN** one Wave1 Gate receipt contains the ordered union of both declarations
- **AND** a missing or invalid declaration for either Topic blocks the whole Gate rather than emitting a partial receipt

#### Scenario: receipt target requires exact finding binding
- **WHEN** a routed receipt declares one target and finding-index has only the same topic or origin artifact
- **THEN** Wave2 closure fails with that target as the smallest missing fact
- **AND** repair points to the existing finding-index surface

#### Scenario: versioned malformed receipt blocks rather than downgrades
- **WHEN** the selected Wave1 trace event presents the carried-target receipt contract version but lacks a complete valid receipt
- **THEN** Wave2 rejects that handoff as a trace persistence boundary
- **AND** it SHALL not classify the event as a legacy no-receipt handoff

#### Scenario: current intent drift blocks before finding coverage
- **WHEN** the selected versioned receipt names a current topic UID but its intent digest no longer equals that Topic's current canonical binding
- **THEN** Wave2 reports the Wave1 handoff parent mismatch as the only receipt-closure root cause
- **AND** it SHALL not treat a matching old finding binding as coverage or direct repair to `finding-index.yaml`

#### Scenario: existing disposition routes remain the only outcomes
- **WHEN** a receipt-bound finding uses a valid existing defer, internal-data, record-only, existing-evidence, or targeted-search route
- **THEN** it satisfies closure according to that existing route
- **AND** the Engine does not infer semantic adequacy or create a target-level status
