> req: DEW-012

## MODIFIED Requirements

### Requirement: Work-unit submit SHALL canonicalize only bounded LLM-shaped submit drift before strict validation

> req: DEW-012

`operate-work-unit submit` SHALL run a narrow canonicalization step before strict result, receipt, output, cache, nonce, queue, hash, and ledger validation. Canonicalization SHALL be limited to predictable LLM-shaped drift that can be safely tied back to the claimed work-unit record. It SHALL NOT create new authority, bypass work-unit identity, accept path escapes, or relax downstream ledger/gate coverage.

Allowed canonicalization is limited to:

- unwrapping a submitted JSON object whose only top-level key is `result`;
- filling a missing receipt `schema_version` with the current receipt-event schema literal. Missing receipt binding identity fields (`work_id`, `queue_item_id`, `kind`, `receipt_nonce`) SHALL NOT be filled or reconstructed: a receipt event that omits any of them SHALL be rejected under the strict current-attempt binding boundary (DEW-004), which every current attempt passes;
- materializing `page-content.md` as canonical `page.md` inside the same declared cache leaf when the canonical page file is missing, or accepting an identical non-authority sidecar when both files exist;
- nonce correction is not canonicalization: a result/receipt `receipt_nonce` that differs from the Engine record nonce SHALL be rejected regardless of binding completeness or where the submitted result path resolves (DEW-004). The historical containment-gated nonce normalization is retired and unreachable for current attempts.

Runtime receipt `detail` is optional diagnostic presentation, not identity or completion authority. The receipt schema SHALL accept either a keyed JSON object or a human-readable string at `detail` without creating a normalization event or rewriting one form into the other. Array, number, boolean, null, malformed JSONL, conflicting identity, and conflicting schema values SHALL remain invalid. Timeout-preflight, submit, inspect and Gate consumers SHALL NOT derive progress/coverage authority from the contents or shape of `detail`.

Accepted submit transactions SHALL persist canonical authority surfaces before reporting success: assigned `result.json` SHALL contain the canonical flat result, assigned `runtime-receipt.jsonl` SHALL contain canonical receipt events, declared cache leaves SHALL contain canonical `page.md`, and ledger rows SHALL be built from canonical data. Any normalization SHALL be visible through structured diagnostics in submit output, trace, log, or an equivalent Engine diagnostic surface. Invalid submit SHALL remain non-terminal and SHALL NOT append a ledger row or complete queue demand.

This requirement SHALL NOT remove the existing ability to submit a candidate `resultPath` from a temporary or caller-provided location when all identity fields already match. Assigned-directory containment no longer gates any canonicalization step; it is validation input only. In every successful case, the Engine SHALL still persist the accepted canonical result to the assigned work-unit `result_ref`.

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

#### Scenario: missing receipt schema or binding identity is canonicalized

- **WHEN** `runtime-receipt.jsonl` contains parseable JSON events that omit the current receipt-event `schema_version` or one or more binding identity fields: `work_id`, `queue_item_id`, `kind`, or `receipt_nonce`
- **THEN** submit SHALL fill only a missing `schema_version` and SHALL reject any event with a missing or conflicting binding identity field under the strict current-attempt binding boundary, before ledger append
- **AND** the assigned `runtime-receipt.jsonl` SHALL be persisted in canonical JSONL form before submit reports success only when every event passed the strict binding check
- **AND** diagnostics SHALL identify the receipt line numbers and the defaulted schema version; the historical receipt binding identity autofill is retired and unreachable for current attempts (the scenario title is retained only as the OpenSpec delta-sync key)

#### Scenario: diagnostic receipt detail accepts object or string

- **WHEN** a receipt event has valid required identity/schema/event fields
- **AND** optional `detail` is either a JSON object or string
- **THEN** dry-submit and formal submit SHALL accept the diagnostic shape without rewriting it
- **AND** object/string choice SHALL NOT change progress, coverage, or Gate authority

#### Scenario: non-message receipt detail shapes remain invalid

- **WHEN** optional receipt `detail` is an array, number, boolean, or null
- **THEN** dry-submit SHALL reject the exact receipt line through the existing receipt repair boundary
- **AND** the Agent SHALL repair the same receipt and rerun dry-submit without a user decision

#### Scenario: conflicting receipt schema version is rejected

- **WHEN** a receipt event contains a `schema_version` that is not the current receipt-event schema literal
- **THEN** submit SHALL reject the receipt through normal schema validation
- **AND** schema version autofill SHALL NOT be used to rewrite a conflicting version

#### Scenario: conflicting receipt binding identity is rejected

- **WHEN** a receipt event contains a `work_id`, `queue_item_id`, `kind`, or `receipt_nonce` that conflicts with the claimed work-unit record
- **THEN** submit SHALL reject the receipt
- **AND** no queue completion or ledger append SHALL occur

#### Scenario: invalid or empty receipt remains invalid

- **WHEN** `runtime-receipt.jsonl` is empty or contains invalid JSONL
- **THEN** submit SHALL reject the receipt
- **AND** receipt canonicalization SHALL NOT be used to synthesize missing events or repair malformed JSON

#### Scenario: page-content cache leaf is canonicalized

- **WHEN** a declared cache leaf contains `websearch.json`, `meta.json`, and `page-content.md`
- **AND** `page.md` is absent in that same leaf directory
- **THEN** submit SHALL materialize canonical `page.md` with the `page-content.md` content before cache validation reports success
- **AND** cache validation SHALL continue against `page.md`
- **AND** diagnostics SHALL identify the cache leaf canonicalization

#### Scenario: identical page sidecar is accepted as non-authority

- **WHEN** a declared cache leaf contains both `page.md` and `page-content.md`
- **AND** their content is identical
- **THEN** submit SHALL validate `page.md` as the canonical authority file
- **AND** `page-content.md` SHALL NOT be treated as an additional fetched-source authority surface

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
- **THEN** submit SHALL still reject the nonce mismatch as non-terminal; the Engine record nonce SHALL NOT be substituted and no nonce normalization SHALL be recorded
- **AND** no assigned `result.json` or `runtime-receipt.jsonl` bytes SHALL be rewritten with a canonical record nonce
- **AND** the historical normalization diagnostics are retired; the scenario title is retained only as the OpenSpec delta-sync key

#### Scenario: nonce mismatch with unsafe binding is rejected

- **WHEN** a result or receipt nonce differs from the claimed record
- **AND** any other identity field differs or the result path resolves outside the assigned work-unit directory
- **THEN** submit SHALL reject the submission
- **AND** no ledger row SHALL be written

#### Scenario: exact-identity candidate result may come from temporary path

- **WHEN** a submitted candidate result path is outside the assigned work-unit directory
- **AND** `work_id`, `queue_item_id`, `kind`, and `receipt_nonce` already match the claimed work-unit record
- **AND** all other result, receipt, output, cache, queue, hash, and ledger validations pass
- **THEN** submit MAY accept the candidate result using the existing submit path semantics
- **AND** the Engine SHALL persist the canonical accepted result to the assigned work-unit `result_ref`

