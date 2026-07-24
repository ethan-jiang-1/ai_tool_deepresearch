> req: DEW-021

## ADDED Requirements

### Requirement: Delegated work contract entry SHALL be constructible from one generated projection

For eligible delegated demand, the Engine SHALL expose the same closed contract lineage at each Agent decision point without creating a second acceptance authority.

Before allocation, after eligible queue-front demand identifies a planned delegated `role_key`, claim SHALL expose an output-only `actor_observation_contract`. It SHALL contain that role and every exact legal `{ outcome, source, reason_code }` tuple with its semantic continuation category: four case shapes expanding to seven tuples. A supplied observation object that is incomplete, enum-invalid, or contradictory SHALL return structured claim feedback naming its supplied field/value conflict, the planned role, this vocabulary, and one same-check action; it SHALL allocate no work ID and write no claim trace, queue, index, batch, or envelope state. At the CLI boundary, an observation is supplied when any `--actor-outcome`, `--actor-source`, `--actor-role-key`, or `--actor-reason` option is present, including an empty string value; it is omitted only when all four options are absent. An omitted observation argument SHALL retain the existing `unknown/not_observed/observation_required` no-claim normalization and its existing audit behavior. The projection SHALL NOT treat generic HITL1 research access, historical trace, chat context, or an unobserved capability as a role-bound native observation, and SHALL NOT choose a probe outcome for the Agent.

After a claim succeeds, the Engine SHALL render one `## Completion Contract` section as the first authoring entry of the existing generated `task.md`; spawn prompt SHALL direct the actor to that same task entry rather than a second contract file or a duplicate attempt-bound instruction set. The section SHALL be regenerated only from the existing attempt authority: manifest/beacon identity and paths, generated result-schema constraints, resolved required outputs and the same direct-output evaluator definitions that validate them, the resolved cache policy and same cache-leaf evaluator definition that validates it, current source policy/lineage, and runtime-receipt event contract. It SHALL state the exact result/receipt bindings, required output path-role-contract tuples, complete validator-owned authoring facts for each required direct output and cache leaf, and the existing dry-submit rerun command. `task.md` and spawn prompt SHALL not retain independently normative-looking duplicate completion fragments for those same facts.

The Completion Contract section is Agent-facing guidance only. It SHALL NOT be a manifest/beacon/result/receipt/ledger field, an acceptance voter, a validator, a recovery operation, a new file/path, or a new persistent state authority. Generation SHALL NOT pre-create `result.json`, runtime receipt event lines, cache leaves, source claims, output content, evidence, or a ledger row. Existing claimed envelopes remain governed by the generated surfaces already bound to their attempt; no backfill or migration is required.

Claimed normal dry-submit and normal formal-submit rejection SHALL use the existing shared candidate root selection. When a candidate has a primary root, the selection SHALL expose one selected member of normalized `violations[]`; every public primary detail on those two candidate checkpoints (`primary_root_code`, `repair_kind`, `missing_fact`, `write_to`, `rerun`, and recommended action) SHALL derive from that same selected root, rather than an unrelated earliest array entry. Timeout-preflight SHALL retain its existing minimal candidate projection from that same selection (`recommended_action` and `primary_root_code`) for timeout advice, SHALL NOT independently select a violation or copy candidate repair detail, and SHALL preserve its own lease/terminal authority. Late-submit SHALL retain its separate historical acceptance semantics. The Engine SHALL evaluate prerequisites before dependent checks and suppress only derived symptoms; independently evaluable roots remain available as structured diagnostic detail with their own repair coordinates. The selected candidate result SHALL expose one nearest legal action and the same dry-submit checkpoint for legal repair, or the existing owner/terminal/missing-contract boundary when no caller repair exists.

This requirement SHALL reuse the existing actor decision, envelope renderer, direct-output evaluator, submit validation, candidate projection, timeout, and formal submit paths. It SHALL NOT add a generic controller, retry branch, actor selector, mutable provenance, ledger amendment, queue recovery operation, Gate/degradation rule, or a general HITL1-to-role proof conversion.

#### Scenario: Invalid observation is discoverable without weakening role proof

- **WHEN** an eligible Wave0 claim for `dpt-source-intake` supplies `available/not_observed/probe_succeeded`
- **THEN** claim SHALL return a structured no-mutation rejection that names the conflicting supplied fields and the complete closed actor-observation vocabulary for `dpt-source-intake`
- **AND** its one next action SHALL be the existing role-bound native-probe claim boundary, not use generic HITL1 access or silently normalize the tuple to available

#### Scenario: Omitted observation remains a truthful no-claim fact

- **WHEN** eligible delegated demand is claimed without an observation argument
- **THEN** claim SHALL retain its existing `unknown/not_observed/observation_required` no-claim normalization and existing audit behavior
- **AND** a supplied partial or malformed observation object SHALL instead take the structured pre-trace rejection path without pretending it is that normalized observation

#### Scenario: Empty CLI observation value is not an omission

- **WHEN** an eligible delegated claim supplies `--actor-outcome=` and no other actor-observation option
- **THEN** it SHALL take the structured pre-trace malformed-input rejection path with no allocation, claim trace, queue, index, batch, or envelope mutation
- **AND** it SHALL NOT normalize to `unknown/not_observed/observation_required` or write that omitted-observation audit event

#### Scenario: Claimed actor receives one constructible completion entry

- **WHEN** a current Wave0 or primary Wave1 delegated work unit is claimed
- **THEN** its generated task SHALL present `## Completion Contract` as the first authoring entry and spawn prompt SHALL direct the actor to that same task
- **AND** that section SHALL agree with the existing manifest, beacon, result schema, required output validator-owned authoring facts, cache-leaf validator-owned authoring facts, source policy, and receipt contract without creating result content, receipt event, cache leaf, output, or ledger authority bytes

#### Scenario: Completion entry exposes Wave0 direct-output and cache construction facts

- **WHEN** a current Wave0 source-intake work unit is claimed
- **THEN** its Completion Contract SHALL expose the validator-owned top-level array and required/optional metadata-field facts for the assigned `source.yaml`, plus the resolved cache leaves, non-placeholder/degraded page rule, and allowed `meta.json` source-mapping fields
- **AND** those facts SHALL be rendered from the same definitions used by direct-output and cache-leaf validation, not a second task-only validator or hand-maintained field list

#### Scenario: Primary feedback matches the recommended action root

- **WHEN** dry-submit can independently observe a mechanical result declaration issue and an actor-owned semantic direct-output issue
- **THEN** the returned recommended action and all public primary repair details SHALL name the same selected primary root
- **AND** the mechanical issue SHALL remain available only as a structured independent diagnostic with its own same-check coordinate

#### Scenario: A failed prerequisite does not manufacture dependent repairs

- **WHEN** a claimed candidate lacks a parseable result or an authoritative manifest/beacon prerequisite
- **THEN** dry-submit SHALL report that direct prerequisite root and SHALL not report output declaration, cache, source-claim, or direct-output symptoms whose evaluation requires the missing prerequisite
- **AND** it SHALL retain any separately evaluable receipt, queue, or identity root without calling it a consequence of the missing candidate surface

#### Scenario: Historical attempt does not need a Completion Contract migration

- **WHEN** an already-claimed work unit predates this generated Completion Contract task section
- **THEN** dry-submit, formal submit, timeout-preflight, terminal handling, and historical ledger reading SHALL continue through their existing attempt-bound contract surfaces
- **AND** no claim, index, manifest, beacon, result, receipt, cache, queue, or ledger byte SHALL be rewritten to retrofit the projection
