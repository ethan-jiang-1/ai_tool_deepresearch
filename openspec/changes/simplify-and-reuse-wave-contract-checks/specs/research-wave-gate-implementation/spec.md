> req: RWG-018

## MODIFIED Requirements

### Requirement: Blocking judgment contracts SHALL close across producer, authority, checker, diagnostic, and guard

Each blocking deterministic gate/output contract SHALL have a closed and minimal contract chain:

- producer instruction that tells the Agent what direct deterministic shape to write;
- runtime authority surface that stores the truth in the active bundle or submitted ledger;
- one checker implementation that consumes that exact authority shape in both inspect and formal gate modes;
- diagnostic/advice output that exposes the smallest actionable root cause and repair coordinates;
- regression or static guard that catches future drift.

Blocking rules SHALL protect required structure, deterministic authority, provenance, or explicit accepted floors. Presentation preferences SHALL use tolerant parsing or advisory feedback unless they are necessary to locate or parse the direct authority surface.

If a prerequisite authority surface is absent or unparseable, the checker SHALL report that prerequisite as the primary root cause and SHALL short-circuit dependent checks whose results would only be downstream symptoms.

#### Scenario: blocking rule has a closed minimal contract chain

- **WHEN** an active gate rule contributes to pass/fail
- **THEN** maintained audit mapping SHALL identify its producer instruction, runtime authority, shared checker route, diagnostic surface, and test guard
- **AND** inspect and formal gate modes SHALL reuse the same checker result for that rule

#### Scenario: presentation preference is not promoted to authority

- **WHEN** direct structured authority proves a required fact and Markdown differs only in harmless presentation
- **THEN** the gate SHALL accept tolerant equivalent parsing or emit advisory feedback
- **AND** it SHALL NOT create an independent blocking rule for the preference

#### Scenario: authority conflict is resolved by truth type

- **WHEN** producer docs, submitted ledger rows, return-map refs, helper checks, or inspect wording disagree about the same deterministic fact
- **THEN** implementation SHALL resolve the conflict using the judgment-layer Source of Record for that truth type
- **AND** the lower-authority surface SHALL be updated or diagnosed rather than silently broadening gate acceptance

### Requirement: Blocking diagnostics SHALL be self-sufficient for deterministic repair

For in-scope deterministic gate/output failures, gate and inspect diagnostics SHALL provide enough contract information for a Phase Agent in a stop:no run to repair the failed runtime surface without reading Engine helper source.

Primary blocking diagnostics SHALL identify the failing rule or finding id, the bundle-relative artifact or ledger/ref surface, the expected direct deterministic shape or canonical value, and one nearest repair target. When a prerequisite failure explains dependent symptoms, primary diagnostics SHALL report the prerequisite root cause and SHALL omit or group downstream symptoms outside the primary repair list. Full post-mortem detail MAY remain in durable diagnostic artifacts.

Diagnostics SHALL NOT require the Engine to choose research strategy, synthesize content, or make semantic evidence judgments.

#### Scenario: role coverage diagnostic names canonical role repair

- **WHEN** Wave1 required output coverage fails because a required path is absent from canonical submitted coverage
- **THEN** diagnostics SHALL name the missing path and expected canonical role
- **AND** diagnostics SHALL direct repair toward submit normalization or a replacement/supplementary submitted work-unit declaration

#### Scenario: missing parent structure suppresses derivative failures

- **WHEN** a required depth-review or finding object is missing or unparseable
- **THEN** diagnostics SHALL identify that parent structure as the primary repair target
- **AND** dependent novelty, eligibility, handoff, or backing checks SHALL not appear as separate primary failures

#### Scenario: reference navigation diagnostic names concrete repair

- **WHEN** a return-map navigation check fails because only internal refs or glob/count summaries are present
- **THEN** diagnostics SHALL name the offending seed-topic entry or ref
- **AND** diagnostics SHALL ask for enumerated existing `reference/*.md` refs or an explicit limitation state
