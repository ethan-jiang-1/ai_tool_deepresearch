## REMOVED Requirements

### Requirement: Submit SHALL remain the only successful delegated completion authority

- Reason: capability identity migration (2026-09 spec-lean mainline C2): this requirement moves to the capability that owns its task question (agent/work-unit-submission).
- Migration: requirement text migrates byte-conserved to agent/work-unit-submission with new requirement ID WSU-001 (DEW-005 is deprecated in req-registry with a successor pointer). Engine `@impl` labels update in the same change; engine module files do not move.

### Requirement: Successful submit SHALL complete queue demand and record contribution boundaries

- Reason: capability identity migration (2026-09 spec-lean mainline C2): this requirement moves to the capability that owns its task question (agent/work-unit-submission).
- Migration: requirement text migrates byte-conserved to agent/work-unit-submission with new requirement ID WSU-002. Engine `@impl` labels update in the same change; engine module files do not move.

### Requirement: Submit canonicalization SHALL stay a narrow bounded stage

- Reason: capability identity migration (2026-09 spec-lean mainline C2): this requirement moves to the capability that owns its task question (agent/work-unit-submission).
- Migration: requirement text migrates byte-conserved to agent/work-unit-submission with new requirement ID WSU-003 (DEW-012 is deprecated in req-registry with a successor pointer). Engine `@impl` labels update in the same change; engine module files do not move.

### Requirement: Accepted submits SHALL persist canonical authority without widening the boundary

- Reason: capability identity migration (2026-09 spec-lean mainline C2): this requirement moves to the capability that owns its task question (agent/work-unit-submission).
- Migration: requirement text migrates byte-conserved to agent/work-unit-submission with new requirement ID WSU-004. Engine `@impl` labels update in the same change; engine module files do not move.

### Requirement: Dry-submit SHALL be a read-only structured preflight mirroring submit semantics

- Reason: capability identity migration (2026-09 spec-lean mainline C2): this requirement moves to the capability that owns its task question (agent/work-unit-preflight).
- Migration: requirement text migrates byte-conserved to agent/work-unit-preflight with new requirement ID WUP-001 (DEW-013 is deprecated in req-registry with a successor pointer). Engine `@impl` labels update in the same change; engine module files do not move.

### Requirement: Dry-submit SHALL keep provenance strict through one neutral target module

- Reason: capability identity migration (2026-09 spec-lean mainline C2): this requirement moves to the capability that owns its task question (agent/work-unit-preflight).
- Migration: requirement text migrates byte-conserved to agent/work-unit-preflight with new requirement ID WUP-002. Engine `@impl` labels update in the same change; engine module files do not move.

### Requirement: Timeout preflight SHALL be a progress-aware read-only recommendation

- Reason: capability identity migration (2026-09 spec-lean mainline C2): this requirement moves to the capability that owns its task question (agent/work-unit-preflight).
- Migration: requirement text migrates byte-conserved to agent/work-unit-preflight with new requirement ID WUP-003 (DEW-014 is deprecated in req-registry with a successor pointer). Engine `@impl` labels update in the same change; engine module files do not move.

### Requirement: Timeout terminalization SHALL run the same guard with explicit audit

- Reason: capability identity migration (2026-09 spec-lean mainline C2): this requirement moves to the capability that owns its task question (agent/work-unit-correction).
- Migration: requirement text migrates byte-conserved to agent/work-unit-correction with new requirement ID WUC-001. Engine `@impl` labels update in the same change; engine module files do not move.

### Requirement: Submit integrity SHALL share one read-only transaction fact

- Reason: capability identity migration (2026-09 spec-lean mainline C2): this requirement moves to the capability that owns its task question (agent/work-unit-correction).
- Migration: requirement text migrates byte-conserved to agent/work-unit-correction with new requirement ID WUC-002 (DEW-023 is deprecated in req-registry with a successor pointer). Engine `@impl` labels update in the same change; engine module files do not move.

### Requirement: Journal disposition SHALL be a closed enum with declared recovery boundaries

- Reason: capability identity migration (2026-09 spec-lean mainline C2): this requirement moves to the capability that owns its task question (agent/work-unit-correction).
- Migration: requirement text migrates byte-conserved to agent/work-unit-correction with new requirement ID WUC-003. Engine `@impl` labels update in the same change; engine module files do not move.

### Requirement: Transaction recovery SHALL settle journals without stealing locks

- Reason: capability identity migration (2026-09 spec-lean mainline C2): this requirement moves to the capability that owns its task question (agent/work-unit-correction).
- Migration: requirement text migrates byte-conserved to agent/work-unit-correction with new requirement ID WUC-004. Engine `@impl` labels update in the same change; engine module files do not move.

### Requirement: Current Wave0 work-unit contracts SHALL expose submitted source contributions without a competing rich-reference route

- Reason: capability identity migration (2026-09 spec-lean mainline C2): this requirement moves to the capability that owns its task question (agent/work-unit-submission).
- Migration: requirement text migrates byte-conserved to agent/work-unit-submission with new requirement ID WSU-005 (DEW-025 is deprecated in req-registry with a successor pointer). Engine `@impl` labels update in the same change; engine module files do not move.

### Requirement: Invalid submit SHALL remain non-terminal

- Reason: capability identity migration (2026-09 spec-lean mainline C2): this requirement moves to the capability that owns its task question (agent/work-unit-correction).
- Migration: requirement text migrates byte-conserved to agent/work-unit-correction with new requirement ID WUC-005 (DEW-008 is deprecated in req-registry with a successor pointer). Engine `@impl` labels update in the same change; engine module files do not move.

### Requirement: Terminal attempt transitions SHALL fail closed

- Reason: capability identity migration (2026-09 spec-lean mainline C2): this requirement moves to the capability that owns its task question (agent/work-unit-correction).
- Migration: requirement text migrates byte-conserved to agent/work-unit-correction with new requirement ID WUC-006 (DEW-006 is deprecated in req-registry with a successor pointer). Engine `@impl` labels update in the same change; engine module files do not move.

### Requirement: Audited late-submit SHALL recover eligible timed-out work units

- Reason: capability identity migration (2026-09 spec-lean mainline C2): this requirement moves to the capability that owns its task question (agent/work-unit-correction).
- Migration: requirement text migrates byte-conserved to agent/work-unit-correction with new requirement ID WUC-007 (DEW-015 is deprecated in req-registry with a successor pointer). Engine `@impl` labels update in the same change; engine module files do not move.

### Requirement: Gates SHALL read submitted work-unit ledger coverage

- Reason: capability identity migration (2026-09 spec-lean mainline C2): this requirement moves to the capability that owns its task question (agent/work-unit-submission).
- Migration: requirement text migrates byte-conserved to agent/work-unit-submission with new requirement ID WSU-006 (DEW-007 is deprecated in req-registry with a successor pointer). Engine `@impl` labels update in the same change; engine module files do not move.

### Requirement: Submitted result and ledger hashes SHALL detect post-submit drift before gate pass

- Reason: capability identity migration (2026-09 spec-lean mainline C2): this requirement moves to the capability that owns its task question (agent/work-unit-submission).
- Migration: requirement text migrates byte-conserved to agent/work-unit-submission with new requirement ID WSU-007 (DEW-010 is deprecated in req-registry with a successor pointer). Engine `@impl` labels update in the same change; engine module files do not move.

### Requirement: Successful work-unit submit SHALL verify durable queue postconditions

- Reason: capability identity migration (2026-09 spec-lean mainline C2): this requirement moves to the capability that owns its task question (agent/work-unit-submission).
- Migration: requirement text migrates byte-conserved to agent/work-unit-submission with new requirement ID WSU-008 (DEW-011 is deprecated in req-registry with a successor pointer). Engine `@impl` labels update in the same change; engine module files do not move.

### Requirement: Phase Agent fallback SHALL remain inside the work-unit transaction

- Reason: capability identity migration (2026-09 spec-lean mainline C2): this requirement moves to the capability that owns its task question (agent/work-unit-correction).
- Migration: requirement text migrates byte-conserved to agent/work-unit-correction with new requirement ID WUC-008 (DEW-017 is deprecated in req-registry with a successor pointer). Engine `@impl` labels update in the same change; engine module files do not move.

### Requirement: Submitted correction SHALL use audited supersession and one fresh successor

- Reason: capability identity migration (2026-09 spec-lean mainline C2): this requirement moves to the capability that owns its task question (agent/work-unit-correction).
- Migration: requirement text migrates byte-conserved to agent/work-unit-correction with new requirement ID WUC-009 (DEW-024 is deprecated in req-registry with a successor pointer). Engine `@impl` labels update in the same change; engine module files do not move.

### Requirement: Dry-submit cache-URL mismatch diagnostics SHALL carry the recorded leaf urls

- Reason: capability identity migration (2026-09 spec-lean mainline C2): this requirement moves to the capability that owns its task question (agent/work-unit-preflight).
- Migration: requirement text migrates byte-conserved to agent/work-unit-preflight with new requirement ID WUP-004 (DEW-028 is deprecated in req-registry with a successor pointer). Engine `@impl` labels update in the same change; engine module files do not move.

### Requirement: Dry-submit runtime-receipt schema diagnostics SHALL carry the raw value, all affected lines, and the expected format

- Reason: capability identity migration (2026-09 spec-lean mainline C2): this requirement moves to the capability that owns its task question (agent/work-unit-preflight).
- Migration: requirement text migrates byte-conserved to agent/work-unit-preflight with new requirement ID WUP-005 (DEW-029 is deprecated in req-registry with a successor pointer). Engine `@impl` labels update in the same change; engine module files do not move.

### Requirement: Dry-submit invalid-result SHALL report duplicate accepted claim URLs and their count

- Reason: capability identity migration (2026-09 spec-lean mainline C2): this requirement moves to the capability that owns its task question (agent/work-unit-preflight).
- Migration: requirement text migrates byte-conserved to agent/work-unit-preflight with new requirement ID WUP-006 (DEW-031 is deprecated in req-registry with a successor pointer). Engine `@impl` labels update in the same change; engine module files do not move.

## MODIFIED Requirements

### Requirement: Envelope readers and generated projections SHALL stay consistent with the claim profile

> req: DEW-032

Every Engine reader of a claimed, submitted, timed-out, or superseded attempt
SHALL first classify that complete profile before assignment/output
interpretation, submit, inspection, declaration recovery, late-submit,
supersession, provenance, or a derived attempt projection. An explicit
assignment v1/v2, absent submission marker, legacy hash-mirror representation,
absent actor contract/execution, partial profile, or cross-surface profile drift
SHALL return one `unsupported_current_contract` result identifying the direct
unsupported discriminator. The reader SHALL NOT infer, default, migrate,
normalize, relabel, or silently drop the attempt using a path, current default,
hash mirror, runtime ref, historical guidance, or another profile field.

Generated task, starter, checklist and result-schema projections SHALL continue
to expose the current read-only assignment and actor bindings, but SHALL NOT
offer a legacy interpretation or an actor-selected profile. They remain
guidance projections and SHALL NOT pre-create result bytes, satisfy a receipt,
or weaken submit validation.

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

#### Scenario: v3 supplementary Wave1 has no forced paired rewrite
- **WHEN** a v3 supplementary `wave1_topic_deepening` snapshot has
  assignment_mode supplementary, no required file receipt, and the existing
  kind contract authorizes prior submitted evidence_summary lineage
- **THEN** required_outputs SHALL be empty and `output_files.required` SHALL be
  false for that attempt
- **AND** generated guidance and submit validation SHALL not require the
  candidate to redeclare or overwrite the prior evidence-summary or
  question-list

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
- **AND** index, manifest and beacon SHALL bind `work-unit.assignment.v3`
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

#### Scenario: assignment mode and receipt shape must agree
- **WHEN** primary mode lacks the exact pair, supplementary mode carries any
  receipt, or a current Wave1 card lacks mode
- **THEN** claim SHALL reject before allocation or envelope writes
- **AND** a mode-absent unclaimed card SHALL return to AGQ-013 explicit
  assignment-mode repair rather than receive compatibility inference

### Requirement: Task verification and generated guidance SHALL bind required outputs and role contracts

> req: DEW-033

Existing-authority reads SHALL validate their prerequisite before creating work-unit directories. A work-unit index load with `createIfMissing: false`, and inspect/dry-submit/submit or rejection handling built on that read, SHALL NOT create `_work_units`, `_work_units/_transactions`, a lock, trace, log, or other runtime surface when the resolved bundle root has no existing work-unit authority. Explicit create/claim paths MAY initialize work-unit directories only after the current run bundle root itself has been validated.

The required verification SHALL cover declared `writes_to` outputs, `result.json`, `runtime-receipt.jsonl`, cache leaf files required by the work-unit cache policy, unchanged beacon binding, and absence of a same-name nested bundle root created by the actor. A sub-agent that cannot write or verify the files SHALL report work-unit failure rather than returning only research text.

For a current-version work unit, index, manifest and beacon SHALL carry top-level assignment_contract_version. Generated task, spawn prompt and checklist SHALL display that marker plus every resolved required output's exact absolute and bundle-relative path, canonical role, and closed direct_contract identity. Generated result schema SHALL constrain required output declarations and MAY describe the marker as read-only annotation, but SHALL NOT add assignment_contract_version or direct_contract as actor-fillable result fields.

The generated task SHALL require the actor to write and verify every assigned required output before returning work_done. The Phase Agent SHALL run the predictive dry-submit after the actor returns and before formal submit. It MAY repair only a mechanical parseable-candidate declaration: an absent/defaultable identity/schema field with one unambiguous value from the verified envelope, or an omitted/misdeclared required path/role when the exact assigned target passes its direct contract. It SHALL NOT overwrite a conflicting supplied identity or edit artifact, receipt, source or cache facts under that scope. A missing/unparseable candidate, missing target, YAML parse/top-level/schema failure, missing receipt/source/cache/finding/question/enum/semantic fact, or any repair requiring actor-owned fact changes SHALL be semantic_content. Before work_done, the selected actor owns semantic repair. After work_done, the Phase Agent SHALL run `operate-work-unit fail` with normalized reason `semantic_contract:<primary_root_code>` using the Engine-derived field, explicitly enqueue replacement demand under a fresh queue ID preserving the same canonical Topic and assignment_mode/receipt obligation, and obtain a replacement work ID for real actor execution. The reason SHALL NOT use `actor_spawn_unavailable:` or another accepted automatic-retry trigger. The Phase Agent SHALL NOT weaken a failed primary pair into supplementary mode or offer abandon as a competing normal semantic-replacement route.

Generated guidance SHALL distinguish a current supplementary attempt with no required_outputs from a primary paired assignment. It SHALL expose contract-authorized prior submitted paths without instructing the actor to overwrite them. The user SHALL not be asked to run ordinary search/fetch, dry-submit, fail/replacement, claim, or submit commands already permitted to the Agent.

Canonical role/shared guidance SHALL describe capabilities and rich authoring behavior but SHALL not expand the current assignment. Generated kind-specific guidance and role execution steps SHALL condition paired-output instructions on current required_outputs[]: a primary Wave1 pair SHALL write and verify both assigned targets; a supplementary empty-required-output attempt SHALL not recreate or redeclare prior evidence-summary/question-list files and SHALL write only current contract-authorized output/cache/source/result/receipt facts.

#### Scenario: Sub-agent must verify writes before returning
- **WHEN** a sub-agent completes a work-unit task
- **THEN** the task contract SHALL require it to verify every declared output file exists under the exact current run bundle root
- **AND** it SHALL require `result.json` and `runtime-receipt.jsonl` to contain the exact `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`
- **AND** it SHALL require cache trail leaves to contain required files before the sub-agent returns success
- **AND** it SHALL verify that beacon binding is unchanged and no same-name nested bundle root was created

#### Scenario: Chat-only completion is not successful delegated completion
- **WHEN** a sub-agent returns research findings in conversation text but does not write the required result, receipt, output, and cache files
- **THEN** the work unit SHALL remain unsubmitted or submit SHALL reject it
- **AND** the Phase Agent SHALL treat the return as work-unit failure or repair input, not delegated completion

#### Scenario: task projects exact required output bindings
- **WHEN** claim creates a current primary Wave1 work unit
- **THEN** generated task SHALL name the top-level assignment version plus exact evidence-summary and question-list paths, canonical roles and direct contract IDs, while result-schema guidance constrains the exact path-role declarations without an actor-fillable contract field
- **AND** no generated projection SHALL let the actor choose another contract ID

#### Scenario: canonical role and authoring contracts reach the actor
- **WHEN** claim creates a current primary Wave1 work unit for registered role `dpt-evidence-extractor`
- **THEN** generated task and spawn prompt SHALL expose the same canonical role-guidance ref and absolute read path derived by the Engine
- **AND** the paired required outputs SHALL display contract-owned `Key Findings`, `Topic Investigation Targets`, `Question Reconciliation`, `Emergent Question Protocol`, and `Exploration / Exploitation Decision` minimum semantics before actor work begins
- **AND** dry-submit SHALL still obtain its verdict only from the shared direct-output evaluator over fresh target bytes

#### Scenario: unknown role or authoring contract fails before publication
- **WHEN** an actor-authorized registered role resolves to an unknown role key, missing shipped role/dependency file, invalid actor-delivery classification, unknown direct contract or missing contract projection during formal claim generation
- **THEN** read-only claim preflight SHALL fail before queue removal, work-ID allocation, index mutation or envelope publication
- **AND** no persisted role/shared ref or generic transaction-rollback claim SHALL be introduced
- **AND** the nearest action SHALL be to repair the existing kind/role/direct-contract owner rather than ask the actor or user to choose a replacement

#### Scenario: accepted Phase Agent fallback receives the same authoring guidance
- **WHEN** the existing actor decision authorizes one `phase_agent_fallback` claim for a registered kind
- **THEN** its generated task/spawn surface SHALL receive the same Engine-derived canonical role/shared refs and required-output descriptors as delegated execution of that kind
- **AND** the fallback SHALL retain its existing single-work-unit, dry-submit, formal-submit and provenance boundaries without gaining role or contract selection authority

#### Scenario: supplementary task projects no paired rewrite
- **WHEN** a current supplementary Wave1 assignment has no required_outputs and one eligible prior submitted evidence_summary
- **THEN** generated guidance SHALL expose that prior path as source-ref lineage
- **AND** generated task, spawn and canonical role guidance SHALL not list the prior evidence-summary or question-list as current required writes or unconditional role outputs

#### Scenario: Phase Agent repairs mechanical candidate drift
- **WHEN** post-return dry-submit proves the exact assigned target passes its direct contract but reports only an omitted/wrong result declaration path or role
- **THEN** recommended_action SHALL be repair_same_candidate and the Phase Agent MAY repair result.json without changing artifact bytes, then rerun the same dry-submit
- **AND** it SHALL preserve the recorded actor provenance and avoid user pipeline work

#### Scenario: semantic failure requires replacement execution
- **WHEN** post-return dry-submit finds missing real source facts, Key Findings content, or required question semantics after the actor recorded work_done
- **THEN** the Phase Agent SHALL not write the missing research content under that actor's provenance
- **AND** recommended_action SHALL be fail_and_replace, followed by `operate-work-unit fail` reason `semantic_contract:<primary_root_code>` using the Engine-derived field, explicit same-obligation enqueue under a fresh `queue_item_id` absent from every durable queue location, and a replacement attempt with a new work ID for real actor execution

#### Scenario: task projection is not an acceptance voter
- **WHEN** generated Markdown or result-schema guidance drifts from the reconstructed manifest/beacon contract
- **THEN** claim parity tests or submit contract checks SHALL fail
- **AND** runtime acceptance SHALL not use the projection to outvote the Engine-resolved contract
