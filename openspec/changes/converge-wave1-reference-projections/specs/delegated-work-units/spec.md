> req: DEW-004

## MODIFIED Requirements

### Requirement: Work-unit envelope SHALL carry binding surfaces

Each work-unit envelope SHALL include the manifest, task, result schema,
beacon, runtime receipt path, status, result surfaces, and optional runtime
refs needed to validate submit and diagnose execution. The Engine SHALL
generate an opaque `receipt_nonce` and require the nonce to agree across index,
manifest, beacon, task, runtime receipt, result, and ledger.

The generated `task.md` SHALL also include one copy-ready Result JSON Starter
and one concise pre-submit checklist derived from the same manifest, output
contract and cache policy that generate `result.schema.json`. The starter SHALL
project the exact result schema version, work-unit identity, receipt nonce,
actor contract version and execution actor class when present, plus the allowed
result fields for that kind. For a source-claim-capable kind, the same output
contract SHALL expose any `source_claims.prior_submitted_output_roles[]`;
Wave1 default guidance SHALL identify prior `evidence_summary` as allowed and
SHALL NOT imply that prior `question_list`, `reference`, or `other` outputs are
compatible. The starter SHALL NOT include `actor_execution` or other fields
that the result schema rejects.

The checklist SHALL identify the assigned immutable envelope files, required
actor-bound receipt fields, allowed output roles and required path-role pairs,
cache leaf directory shape, and any required URL binding between declared
outputs/source claims and `meta.json`. It SHALL direct the actor to write the
assigned result and direct the Phase Agent to run dry-submit before formal
submit or after repairing a rejected candidate. The starter and checklist SHALL
be read-only guidance projections; they SHALL NOT pre-create `result.json`,
count as actor output, satisfy a receipt, append provenance, or weaken submit
validation.

For a snapshot-bound supplementary `wave1_topic_deepening` item with a valid
positive `payload.reference_floor_deficit`, generated `task.md` SHALL render
one read-only acquisition objective that states the exact remaining countable
current-canonical-reference gap for the bound Topic. It SHALL identify the
value as an objective from the queue snapshot, not as a source-acceptance
claim, required output, result-schema field, receipt condition, or promise that
completion will satisfy the Wave1 gate. The envelope SHALL render no such
objective for primary cards or for supplementary cards without the field. The
task renderer SHALL consume the validated snapshot value only; it SHALL not
recompute floors, inspect references, select a direct contract, or read mutable
Phase prose to invent the objective.

Generated task, spawn prompt, shared protocol and role guidance SHALL
distinguish two surfaces explicitly: lifecycle evidence is appended as JSONL to
the assigned `runtime-receipt.jsonl`; `log-event.mjs` emits optional diagnostic
log/trace events and SHALL NOT satisfy or replace runtime receipt evidence.
Guidance SHALL NOT require the user to run dry-submit, submit, receipt repair,
or other ordinary pipeline commands.

For every new claim, the Engine SHALL resolve one closed assignment contract
before mutation. The resolver input SHALL be the registered work-unit kind, the
canonical Topic UID plus recorded current slug in the queue-item snapshot when
the kind is topic-scoped, the snapshot-bound closed `payload.assignment_mode`
when required by that producer, and canonical `file:` entries in
snapshot-bound `required_receipts`. `assignment_mode` SHALL express only
`primary|supplementary` assignment intent and SHALL NOT select roles or
direct-contract IDs. `reference_floor_deficit` SHALL remain a non-selector
task-context fact and SHALL not be a resolver input. `writes_to` SHALL remain
an allowed write surface and SHALL NOT make optional, pattern, or
prior-submitted outputs required. Existing queue/payload kind-contract
customization MAY retain strictly valid result-field, allowed-role, source-claim
and cache-policy semantics. Queue items SHALL reject the closed reserved keys
`required_outputs`, `direct_contract`, `direct_contract_id`,
`assignment_contract_version`, `resolver_version`, and `contract_id` at the
root or recursively under payload/output_contract. The resolver SHALL ignore
all other unknown payload keys rather than interpreting naming or prose as a
selector; Markdown and actors SHALL NOT supply contract selection.

The current resolver/assignment literal SHALL be
`assignment_contract_version: "work-unit.assignment.v1"`, recorded on the
Engine-owned work-unit index record and copied into manifest and beacon binding
surfaces. It SHALL be the only resolver-semantics version marker; no separate
resolver_version field SHALL be created. The index SHALL NOT copy the resolved
contract. The manifest and beacon output_contract SHALL carry one strict
required_outputs array whose entries contain one concrete bundle-relative path,
one canonical role, and one closed direct_contract identity. Claim SHALL reject
unknown versions or IDs, unsafe or duplicate normalized paths, conflicting
roles, unsupported required-receipt sets, unresolved Topic bindings, invalid
reference-floor-deficit shape, and queue-authored direct selectors before
work-ID allocation, queue mutation, or envelope writes.

The v1 resolver SHALL support these direct-output bindings:

- `wave0_source_intake` with the exact canonical source.yaml file receipt
  resolves role `source_yaml` and direct contract
  `wave0.source-metadata-array.v1`;
- `wave1_topic_deepening` with the exact paired evidence-summary and
  question-list receipts resolves roles `evidence_summary` and `question_list`
  with direct contracts `wave1.evidence-summary.v1` and
  `wave1.question-list.v1`;
- explicit `assignment_mode: supplementary` `wave1_topic_deepening` with an
  empty required-receipt set resolves no current required direct output and
  continues to use contract-authorized prior submitted evidence lineage;
- `wave2_targeted_evidence` with its existing empty required-receipt shape
  resolves no direct content blocker in v1.

A primary mode without the exact pair, a supplementary mode with non-empty
receipts, a missing mode, a partial paired set, a receipt for a different
recorded Topic coordinate, or any other unsupported set SHALL fail closed
rather than be inferred from receipt shape, prose, queue ID suffixes, actor
roles, `writes_to`, or a floor objective. A mode-absent unclaimed card SHALL
return to AGQ-013 explicit assignment-mode repair and pass current admission
before claim; only an already-claimed attempt's genuinely absent index marker
may select legacy submit compatibility. The queue-item snapshot hash SHALL bind
every resolver input except the closed resolver version, which is bound by
assignment_contract_version. A rendered task objective SHALL be derived from
that same snapshot but SHALL not alter the resolver hash input set. Submit-side
readers SHALL first recheck the hash and version, rebuild the expected output
contract from the recorded snapshot coordinates, and require exact equality
with manifest and beacon. Current mutable plan presentation or current
framework defaults SHALL NOT silently remap the attempt's recorded output
paths.

The existing default or snapshot-bound customized kind result/cache/source
contract and the resolved required_outputs SHALL be merged into one strict
Zod-validated output_contract. Cross-field refinements SHALL require unique
path-role-contract tuples, closed compatible IDs, and required roles compatible
with allowed roles. Submit reconstruction SHALL reuse the same validated base
customization from the hash-bound snapshot; generated task, starter, checklist
and result schema SHALL be projections from this validated merged contract, not
additional acceptance voters.

Claim SHALL preflight the resolver and merged contract for every item in the
planned contiguous batch on side-effect-free queue/index views before creating
the first work-unit record or entering the work-unit transaction. If any
candidate has missing/mismatched assignment mode, invalid Topic/receipt or
floor-objective shape, direct selector, or invalid merged kind contract, the
entire planned batch SHALL reject without creating a work-unit lock/transaction
record and with zero work-ID, batch, queue, index, envelope, trace-success, or
delegated-in-flight mutation. A non-authoritative rejection diagnostic MAY be
emitted. After the transaction starts, claim SHALL reload queue/index and
verify the exact planned prefix identities and snapshot hashes before its first
claim mutation; concurrent drift MAY leave the existing failed-transaction
diagnostic but SHALL NOT leave any partial claim authority.

#### Scenario: supplementary task renders a read-only floor objective

- **WHEN** a claimed supplementary Wave1 queue snapshot carries valid
  `reference_floor_deficit: 2`
- **THEN** generated `task.md` SHALL state that two additional countable current
  canonical references are the acquisition objective for that bound Topic
- **AND** the Result JSON Starter, required outputs, receipt rules, and formal
  submit contract SHALL remain unchanged

#### Scenario: task objective is not a pass assertion

- **WHEN** a supplementary task with an objective submits valid source/cache
  facts but those facts do not yet yield the requested number of canonical
  countable projections
- **THEN** formal submit SHALL use its existing contract and SHALL not reject
  solely for missing the rendered objective
- **AND** the next Wave1 convergence evaluation SHALL report the remaining
  direct-fact result

#### Scenario: primary or general supplementary task has no invented objective

- **WHEN** a Wave1 task is primary, or it is supplementary without
  `reference_floor_deficit`
- **THEN** task generation SHALL not render a floor objective
- **AND** it SHALL not read filesystem state, Phase prose, or a profile floor to
  synthesize one

#### Scenario: claim resolves paired Wave1 direct outputs

- **WHEN** a primary `wave1_topic_deepening` snapshot contains assignment_mode
  primary plus the exact evidence-summary and question-list file receipts for
  one canonical Topic
- **THEN** the resolved contract SHALL contain exactly those two concrete
  path-role-direct-contract entries
- **AND** Phase-owned reference materialization and any explicitly authorized
  extra output SHALL not enter required_outputs

#### Scenario: supplementary Wave1 has no forced paired rewrite

- **WHEN** a supplementary `wave1_topic_deepening` snapshot has assignment_mode
  supplementary, no required file receipt, and the existing kind contract
  authorizes prior submitted evidence_summary lineage
- **THEN** required_outputs SHALL be empty for that attempt
- **AND** generated guidance and submit validation SHALL not require the
  candidate to redeclare or overwrite the prior evidence-summary or
  question-list

#### Scenario: objective cannot become a direct-contract selector

- **WHEN** a queue snapshot contains a valid floor objective alongside an
  unsupported direct selector, receipt shape, or Topic binding
- **THEN** claim SHALL reject before allocation or envelope writes
- **AND** the objective SHALL not bypass or change the existing closed resolver

#### Scenario: nonce mismatch blocks submit

- **WHEN** a result or runtime receipt carries a nonce that differs from the
  work-unit beacon
- **THEN** submit SHALL reject the result as non-terminal
- **AND** no ledger row SHALL be written

#### Scenario: Actor-aware envelope provides exact result starter

- **WHEN** a new actor-aware work unit is claimed
- **THEN** generated `task.md` SHALL contain a result starter with the exact
  schema version, work ID, queue item ID, kind, receipt nonce, actor contract
  version and execution actor class
- **AND** the starter SHALL expose only fields accepted by the generated result
  schema

#### Scenario: Envelope explains submit-sensitive output and cache bindings

- **WHEN** a work-unit kind requires specific output roles, cache leaf files or
  source URL mappings
- **THEN** the generated pre-submit checklist SHALL name those requirements
  from the active output contract and cache policy
- **AND** it SHALL tell the actor not to overwrite manifest, beacon, result
  schema or status authority files

#### Scenario: Result starter is not completion authority

- **WHEN** the Engine generates a copy-ready result starter in task guidance
- **THEN** no assigned result, runtime receipt, output file, cache trail, ledger
  row or queue completion SHALL be created by that projection
- **AND** formal submit SHALL still require real actor-produced surfaces

#### Scenario: Receipt and diagnostic log are not interchangeable

- **WHEN** a work-unit actor records lifecycle progress
- **THEN** Agent-facing guidance SHALL require JSONL receipt events at the
  assigned runtime receipt path
- **AND** any `log-event.mjs` call SHALL be described as optional diagnostic
  mirroring only
- **AND** diagnostic logs without runtime receipt evidence SHALL NOT pass
  dry-submit or formal submit

#### Scenario: Phase Agent owns ordinary submit repair execution

- **WHEN** dry-submit returns an authorized candidate or receipt repair
  coordinate
- **THEN** the Phase Agent SHALL perform or direct the same-candidate
  mechanical repair and rerun dry-submit
- **AND** it SHALL NOT ask the user to operate the pipeline unless a separate
  semantic, permission, or external-action boundary exists

#### Scenario: claim resolves Wave0 direct output before mutation

- **WHEN** a UID-bound wave0_source_intake queue snapshot contains the
  canonical source.yaml file receipt for its recorded Topic slug
- **THEN** claim SHALL resolve one source_yaml required output with direct
  contract `wave0.source-metadata-array.v1`
- **AND** index, manifest and beacon SHALL bind `work-unit.assignment.v1`
  before the actor receives the envelope

#### Scenario: unsupported assignment fails before claim mutation

- **WHEN** required receipts are partial, duplicated, unsafe, cross-Topic, or
  unsupported for the registered kind
- **THEN** claim SHALL reject before allocating a work ID, opening a batch,
  moving queue demand, or writing an envelope
- **AND** diagnostics SHALL name the invalid assignment fact rather than infer
  a contract from writes_to or prose

#### Scenario: queue-authored direct selector is rejected

- **WHEN** a new queue item contains any closed reserved selector key at its
  root or recursively under payload/output_contract
- **THEN** claim SHALL reject the selector before mutation
- **AND** the Engine-owned closed resolver SHALL remain the only contract
  selector

#### Scenario: existing kind customization is merged deterministically

- **WHEN** a hash-bound queue snapshot contains a strictly valid non-selector
  kind output contract customization
- **THEN** claim SHALL merge it with Engine-resolved required_outputs and
  validate the combined contract
- **AND** submit SHALL reconstruct that same merged value rather than discard
  the customization or trust manifest alone

#### Scenario: assignment mode and receipt shape must agree

- **WHEN** primary mode lacks the exact pair, supplementary mode carries any
  receipt, or a current Wave1 card lacks mode
- **THEN** claim SHALL reject before allocation or envelope writes
- **AND** a mode-absent unclaimed card SHALL return to AGQ-013 explicit
  assignment-mode repair rather than receive compatibility inference

#### Scenario: resolver preflights the complete batch

- **WHEN** one later candidate in a planned claim batch has an invalid
  assignment or merged output contract
- **THEN** side-effect-free preflight SHALL reject before entering the claim
  transaction or allocating the first candidate
- **AND** diagnostics SHALL identify the invalid queue item without a work-unit
  lock/transaction record, envelope, index row, batch-counter change, queue
  move, delegated-in-flight binding or claim-success event

#### Scenario: expected contract binds manifest and beacon

- **WHEN** dry-submit or submit loads a current-version attempt
- **THEN** it SHALL verify the embedded queue snapshot hash, rebuild expected
  output_contract with the index-bound assignment version, and compare manifest
  and beacon exactly
- **AND** missing, unknown, or drifting contract surfaces SHALL fail closed
  without falling back to path guessing
