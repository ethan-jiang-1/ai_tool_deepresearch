> req: WPG-014

## MODIFIED Requirements

### Requirement: Gate SHALL verify submitted work-unit ledger rows

Work-unit provenance gates SHALL continue to read Engine-written rows in bundle-root `rb_output_declarations.jsonl` as delegated coverage authority.

Audited late-accepted rows SHALL count as submitted work-unit ledger rows only when the row is schema-valid, hash-valid, marked with valid late-accept audit fields, bound to a submitted original work-unit index record, and not in conflict with any submitted replacement for the same `queue_item_id`.

#### Scenario: audited late-accepted row can count

- **WHEN** an audited late-accepted row passes normal row hash, result, receipt, output, cache, nonce, and index checks
- **AND** no submitted replacement exists for the same `queue_item_id`
- **THEN** work-unit provenance SHALL count the row as submitted delegated coverage

#### Scenario: malformed or double-submitted late accept fails

- **WHEN** a late-accepted row has malformed audit fields
- **OR** another work unit for the same `queue_item_id` is submitted
- **THEN** work-unit provenance SHALL fail closed
- **AND** diagnostics SHALL identify the late-accept conflict
