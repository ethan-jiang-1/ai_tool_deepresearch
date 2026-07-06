> req: CRC-002, CRC-004, CRC-005, CRC-006

## MODIFIED Requirements

### Requirement: Cache path delivery via spawn prompt

Cache path delivery for delegated work SHALL be delivered through the work-unit task/spawn prompt and manifest. Cache instructions SHALL bind cache output expectations to `work_id`, `queue_item_id`, `kind`, and the result schema.

#### Scenario: cache path binds to work unit

- **WHEN** a Wave0 source intake work unit is claimed
- **THEN** the prompt SHALL identify the cache policy and expected cache trail shape for that work unit

### Requirement: Cache is non-authority and deletable

Cache files SHALL remain non-authority. Gate pass for delegated work SHALL depend on submitted work-unit ledger rows and required cache trail cross-checks, not raw cache presence alone.

#### Scenario: cache alone cannot pass

- **WHEN** cache files exist but no submitted work-unit ledger row declares them
- **THEN** gate cache coverage SHALL fail for delegated work

### Requirement: cache_trails SHALL be Engine-populated

`cache_trails` for delegated work SHALL be verified and written by `operate-work-unit submit`. The Agent-provided result MAY point to candidate cache files, but the Engine SHALL validate filesystem existence, expected shape, and kind policy before ledger append.

#### Scenario: submit writes verified cache trails

- **WHEN** a result declares valid cache trail files
- **THEN** submit SHALL write verified cache trails to the ledger row

### Requirement: Gate SHALL cross-validate cache trails（两阶段策略）

Gate cache coverage SHALL cross-validate submitted work-unit ledger `cache_trails` against filesystem state and output references. Cache trail checks SHALL fail when ledger/index/result/receipt binding is stale or absent.

#### Scenario: stale cache trail binding fails

- **WHEN** a ledger row declares a cache trail but the referenced result hash no longer matches the submitted result
- **THEN** cache coverage SHALL fail
