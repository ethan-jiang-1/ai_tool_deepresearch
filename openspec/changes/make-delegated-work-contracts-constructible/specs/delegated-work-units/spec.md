> req: DEW-021

## ADDED Requirements

### Requirement: Delegated work contract entry SHALL be constructible from one generated projection

For eligible delegated demand, the Engine SHALL expose the same closed contract lineage at each Agent decision point without creating a second acceptance authority.

Before allocation, claim SHALL project the planned delegated `role_key` and the complete closed actor-observation vocabulary: every legal `{ outcome, source, reason_code }` combination, the semantic boundary of each combination, and the existing next claim action that follows it. A missing, contradictory, or otherwise invalid supplied tuple SHALL return structured claim feedback naming the supplied field/value conflict, the planned role, this vocabulary, and one same-check action; it SHALL allocate no work ID and write no claim trace, queue, index, batch, or envelope state. The projection SHALL NOT treat generic HITL1 research access, historical trace, chat context, or an unobserved capability as a role-bound native observation, and SHALL NOT choose a probe outcome for the Agent.

After a claim succeeds, the Engine SHALL generate one completion-contract projection inside the existing work-unit directory and make it the first authoring entry from both generated `task.md` and spawn prompt. The projection SHALL be regenerated only from the existing attempt authority: manifest/beacon identity and paths, generated result-schema constraints, resolved required outputs and their existing direct-contract descriptors, current output/cache/source policy, and runtime-receipt event contract. It SHALL state the exact result/receipt bindings, required output path-role-contract tuples, bounded construction requirements, and the existing dry-submit rerun command. `task.md` SHALL not retain independently normative-looking duplicate completion fragments for those same facts.

The completion-contract projection is Agent-facing guidance only. It SHALL NOT be a manifest/beacon/result/receipt/ledger field, an acceptance voter, a validator, a recovery operation, or a new persistent state authority. Generation SHALL NOT pre-create `result.json`, runtime receipt lines, cache leaves, source claims, output content, evidence, or a ledger row. Existing claimed envelopes remain governed by the generated surfaces already bound to their attempt; no backfill or migration is required.

Dry-submit, formal-submit rejection, and timeout-preflight SHALL use the existing shared candidate root selection. When a candidate has a primary root, every public primary detail (`primary_root_code`, `repair_kind`, `missing_fact`, `write_to`, `rerun`, and recommended action) SHALL describe that same selected root, rather than an unrelated earliest array entry. The Engine SHALL evaluate prerequisites before dependent checks and suppress only derived symptoms; independently evaluable roots remain available as structured diagnostic detail with their own repair coordinates. The selected primary result SHALL expose one nearest legal action and the same checkpoint for legal repair, or the existing owner/terminal/missing-contract boundary when no caller repair exists.

This requirement SHALL reuse the existing actor decision, envelope renderer, direct-output evaluator, submit validation, candidate projection, timeout, and formal submit paths. It SHALL NOT add a generic controller, retry branch, actor selector, mutable provenance, ledger amendment, queue recovery operation, Gate/degradation rule, or a general HITL1-to-role proof conversion.

#### Scenario: Invalid observation is discoverable without weakening role proof

- **WHEN** an eligible Wave0 claim for `dpt-source-intake` supplies `available/not_observed/probe_succeeded`
- **THEN** claim SHALL return a structured no-mutation rejection that names the conflicting supplied fields and the complete closed actor-observation vocabulary for `dpt-source-intake`
- **AND** its one next action SHALL be the existing role-bound native-probe claim boundary, not use generic HITL1 access or silently normalize the tuple to available

#### Scenario: Claimed actor receives one constructible completion entry

- **WHEN** a current Wave0 or primary Wave1 delegated work unit is claimed
- **THEN** its generated task and spawn prompt SHALL identify the same completion-contract projection as the first authoring entry
- **AND** that projection SHALL agree with the existing manifest, beacon, result schema, required output descriptors, cache/source policy, and receipt contract without creating result, receipt, cache, output, or ledger authority bytes

#### Scenario: Primary feedback matches the recommended action root

- **WHEN** dry-submit can independently observe a mechanical result declaration issue and an actor-owned semantic direct-output issue
- **THEN** the returned recommended action and all public primary repair details SHALL name the same selected primary root
- **AND** the mechanical issue SHALL remain available only as a structured independent diagnostic with its own same-check coordinate

#### Scenario: A failed prerequisite does not manufacture dependent repairs

- **WHEN** a claimed candidate lacks a parseable result or an authoritative manifest/beacon prerequisite
- **THEN** dry-submit SHALL report that direct prerequisite root and SHALL not report output declaration, cache, source-claim, or direct-output symptoms whose evaluation requires the missing prerequisite
- **AND** it SHALL retain any separately evaluable receipt, queue, or identity root without calling it a consequence of the missing candidate surface

#### Scenario: Historical attempt does not need a completion-contract migration

- **WHEN** an already-claimed work unit predates this generated completion-contract projection
- **THEN** dry-submit, formal submit, timeout-preflight, terminal handling, and historical ledger reading SHALL continue through their existing attempt-bound contract surfaces
- **AND** no claim, index, manifest, beacon, result, receipt, cache, queue, or ledger byte SHALL be rewritten to retrofit the projection
