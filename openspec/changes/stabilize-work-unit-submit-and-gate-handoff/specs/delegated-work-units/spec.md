> req: DEW-012

## ADDED Requirements

### Requirement: Work-unit submit SHALL canonicalize only bounded LLM-shaped submit drift before strict validation

`operate-work-unit submit` SHALL run a narrow canonicalization step before strict result, receipt, output, cache, nonce, queue, hash, and ledger validation. Canonicalization SHALL be limited to predictable LLM-shaped drift that can be safely tied back to the claimed work-unit record. It SHALL NOT create new authority, bypass work-unit identity, accept path escapes, or relax downstream ledger/gate coverage.

Allowed canonicalization is limited to:

- unwrapping a submitted JSON object whose only top-level key is `result`;
- filling missing receipt identity fields from the claimed work-unit record when the receipt event is otherwise valid JSON and has no conflicting identity values;
- canonicalizing `page-content.md` to `page.md` inside the same declared cache leaf when the canonical page file is missing or identical;
- replacing a stale result/receipt `receipt_nonce` with the Engine record nonce only when `work_id`, `queue_item_id`, and `kind` all match the claimed record and the submitted result path resolves inside that work unit's assigned directory.

Accepted submit transactions SHALL store canonical result and ledger data. Any normalization SHALL be visible through structured diagnostics in submit output, trace, log, or an equivalent Engine diagnostic surface. Invalid submit SHALL remain non-terminal and SHALL NOT append a ledger row or complete queue demand.

#### Scenario: single result wrapper is unwrapped

- **WHEN** a claimed work unit submits `result.json` whose top-level object is exactly `{ "result": { ... } }`
- **AND** the inner object satisfies the normal work-unit result contract after canonicalization
- **THEN** submit SHALL validate the inner object as the canonical result
- **AND** the submitted ledger row SHALL store the flat canonical result binding, not the wrapper
- **AND** diagnostics SHALL record that a result wrapper was unwrapped

#### Scenario: result wrapper with siblings is rejected

- **WHEN** a submitted result object contains top-level `result` plus any sibling key
- **THEN** submit SHALL reject the result before ledger append
- **AND** diagnostics SHALL identify the unsafe wrapper shape

#### Scenario: missing receipt identity is autofilled from record

- **WHEN** `runtime-receipt.jsonl` contains parseable JSON events that omit one or more of `schema_version`, `work_id`, `queue_item_id`, `kind`, or `receipt_nonce`
- **AND** the missing fields can be filled from the claimed work-unit record
- **AND** no present identity field conflicts with that record
- **THEN** submit SHALL validate the canonical receipt events with the filled identity fields
- **AND** diagnostics SHALL identify the receipt line numbers and autofilled fields

#### Scenario: conflicting receipt identity is rejected

- **WHEN** a receipt event contains a `work_id`, `queue_item_id`, `kind`, or `receipt_nonce` that conflicts with the claimed work-unit record
- **THEN** submit SHALL reject the receipt
- **AND** no queue completion or ledger append SHALL occur

#### Scenario: invalid or empty receipt remains invalid

- **WHEN** `runtime-receipt.jsonl` is empty or contains invalid JSONL
- **THEN** submit SHALL reject the receipt
- **AND** identity autofill SHALL NOT be used to synthesize missing events or repair malformed JSON

#### Scenario: page-content cache leaf is canonicalized

- **WHEN** a declared cache leaf contains `websearch.json`, `meta.json`, and `page-content.md`
- **AND** `page.md` is absent in that same leaf directory
- **THEN** submit MAY rename, copy, or otherwise canonicalize `page-content.md` to canonical `page.md`
- **AND** cache validation SHALL continue against `page.md`
- **AND** diagnostics SHALL identify the cache leaf canonicalization

#### Scenario: divergent page files are rejected

- **WHEN** a declared cache leaf contains both `page.md` and `page-content.md`
- **AND** their content differs
- **THEN** submit SHALL reject the cache trail
- **AND** diagnostics SHALL identify the divergent files

#### Scenario: cache authority files remain required

- **WHEN** a declared cache leaf is missing `websearch.json`, missing `meta.json`, or has neither `page.md` nor canonicalizable `page-content.md`
- **THEN** submit SHALL reject the cache trail
- **AND** no fetched-source output SHALL gain ledger coverage from that leaf

#### Scenario: nonce is normalized only under complete binding

- **WHEN** a result or receipt carries a stale `receipt_nonce`
- **AND** `work_id`, `queue_item_id`, and `kind` match the claimed work-unit record
- **AND** the submitted result path resolves inside that work unit's assigned directory
- **THEN** submit MAY normalize the nonce to the Engine record nonce before strict validation
- **AND** diagnostics SHALL record the nonce normalization

#### Scenario: nonce mismatch with unsafe binding is rejected

- **WHEN** a result or receipt nonce differs from the claimed record
- **AND** any other identity field differs or the result path resolves outside the assigned work-unit directory
- **THEN** submit SHALL reject the submission
- **AND** no ledger row SHALL be written
