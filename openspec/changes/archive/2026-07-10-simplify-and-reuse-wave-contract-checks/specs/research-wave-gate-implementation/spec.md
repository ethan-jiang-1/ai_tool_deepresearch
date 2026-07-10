> req: RWG-018

## MODIFIED Requirements

### Requirement: Blocking judgment contracts SHALL close across producer, authority, checker, diagnostic, and guard

Each blocking deterministic gate/output contract SHALL have a closed and minimal contract chain:

- producer instruction that tells the Agent what direct deterministic shape to write;
- runtime authority surface that stores the truth in the active bundle or submitted ledger;
- one checker implementation that consumes that exact authority shape;
- diagnostic/advice output that exposes the smallest actionable root cause and repair coordinates; and
- regression or static guard that catches future drift.

For in-scope Wave artifact/provenance rules, formal gate and inspect SHALL reuse the same pure evaluator result and rule id. Formal lifecycle checks such as node binding, handoff preflight, routing, degraded eligibility, gate-attempt durability, checkpoint, and `trace_event_*` SHALL remain formal-only and SHALL NOT be duplicated in inspect.

Blocking rules SHALL protect required structure, deterministic authority, provenance, consumer navigation, or explicit accepted floors. Presentation/maintenance preferences SHALL use tolerant parsing or advisory feedback unless they are necessary to locate or parse a direct authority surface.

If a prerequisite authority surface is absent or unparseable, the checker SHALL report that prerequisite as the primary root cause and SHALL short-circuit dependent checks whose results would only be downstream symptoms. The implementation SHALL use local guards rather than a generalized dependency engine.

If a surface is not Agent-produced, the audit MAY record an explicit non-Agent-produced exemption for the producer instruction surface. Otherwise, missing or contradictory closure surfaces SHALL be treated as judgment/output contract drift.

#### Scenario: blocking rule has a closed contract chain

- **WHEN** an active gate rule contributes to pass/fail
- **THEN** apply evidence or maintained audit mapping SHALL identify its producer instruction or explicit non-Agent-produced exemption, runtime authority, checker route, diagnostic surface, and test guard
- **AND** in-scope Wave artifact/provenance rules SHALL identify the shared evaluator route used by formal and inspect
- **AND** static or focused regression coverage SHALL fail when the checker route or contract inventory is missing

#### Scenario: presentation preference is not promoted to authority

- **WHEN** direct structured authority proves a required fact and Markdown differs only in harmless presentation
- **THEN** the command SHALL accept tolerant equivalent parsing or emit advisory feedback
- **AND** it SHALL NOT create an independent blocking rule for the preference

#### Scenario: authority conflict is resolved by truth type

- **WHEN** producer docs, submitted ledger rows, return-map refs, helper checks, or inspect wording disagree about the same deterministic fact
- **THEN** implementation SHALL resolve the conflict using the judgment-layer Source of Record for that truth type
- **AND** the lower-authority surface SHALL be updated or diagnosed rather than silently broadening gate acceptance

#### Scenario: missing prerequisite masks dependent rules

- **WHEN** a parent YAML object, required array, or required field cannot be read
- **THEN** the checker SHALL report the parent/field as the blocking root
- **AND** dependent rules SHALL be recorded as masked or omitted rather than failed independently

#### Scenario: delegated bypass scan has one side-effect owner

- **WHEN** inspect and formal gate evaluate delegated-bypass provenance for the same bundle
- **THEN** both SHALL consume the same pure scan result
- **AND** only the formal wrapper MAY emit durable bypass trace/log evidence
- **AND** one formal invocation SHALL emit that diagnostic at most once

### Requirement: Blocking diagnostics SHALL be self-sufficient for deterministic repair

For in-scope deterministic gate/output failures, gate and inspect diagnostics SHALL provide enough contract information for a Phase Agent in a stop:no run to repair the failed runtime surface without reading Engine helper source. This requirement applies to deterministic shape failures such as required roles, bundle-relative refs, concrete reference navigation, missing artifact/field contracts, explicit floors, submitted provenance, and blocking/advisory/diagnostic classification.

Primary blocking diagnostics SHALL identify the failing rule or finding id, the bundle-relative artifact or ledger/ref/field surface, the expected deterministic shape or canonical value, and one nearest repair target. When a prerequisite failure explains dependent symptoms, primary diagnostics SHALL report the prerequisite root cause and SHALL omit, mask, or group downstream symptoms outside the primary repair list.

Full post-mortem detail MAY remain in existing formal durable diagnostic artifacts. Side-effect-free inspect SHALL not create a new durable surface for this purpose. Diagnostics SHALL NOT require the Engine to choose research strategy, synthesize content, or make semantic evidence judgments.

#### Scenario: role coverage diagnostic names canonical role repair

- **WHEN** Wave1 required output coverage fails because a required path is absent from canonical submitted coverage
- **THEN** diagnostics SHALL name the missing path and expected canonical role
- **AND** diagnostics SHALL direct repair toward submit normalization or a replacement/supplementary submitted work-unit declaration

#### Scenario: missing parent structure suppresses derivative failures

- **WHEN** a required depth-review or finding object is missing or unparseable
- **THEN** diagnostics SHALL identify that parent structure as the primary repair target
- **AND** dependent novelty, cache, eligibility, handoff, enum, or backing checks SHALL not appear as separate primary failures

#### Scenario: reference navigation diagnostic names concrete repair

- **WHEN** a return-map navigation check fails because only internal refs or glob/count summaries are present
- **THEN** diagnostics SHALL name the offending seed-topic entry or ref
- **AND** diagnostics SHALL ask for enumerated existing `reference/*.md` refs or an explicit limitation state

#### Scenario: missing finding field names one nearest repair

- **WHEN** a Wave2 finding lacks required field `hitl2_handoff`
- **THEN** diagnostics SHALL name `artifacts/wave2/finding-index.yaml`, the finding id, the missing field, and expected canonical value/type
- **AND** the nearest repair SHALL be to add or correct that field and rerun the same inspect/gate
