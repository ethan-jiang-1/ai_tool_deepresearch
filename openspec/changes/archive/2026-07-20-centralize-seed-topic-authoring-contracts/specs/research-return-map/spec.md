> req: RRM-003

## MODIFIED Requirements

### Requirement: Shared guidance SHALL teach the same return-map shape across waves

One focused `shared-return-map-authoring` Markdown contract SHALL own the canonical Agent-facing return-map entry example, Wave-to-section ownership, and one-time token lifecycle. It SHALL state that evidence collection, extraction, synthesis, and seed-topic backfill all carry short meaning statements plus refs so later Agents can navigate the map without rereading the whole bundle blindly. It SHALL expose the same minimum entry-local fields for Wave0, Wave1, and Wave2: `evidence_meaning`, `relationship`, `refs`, `status`, and `next_hop`, plus optional entry-local identity/metadata defined by the accepted return-map contract. It SHALL state that refs are bundle-relative, concrete consumer navigation comes first when materialized, and internal artifact/cache/work-unit refs remain secondary provenance.

Wave0, Wave1, Wave2, and seed-topic materialization phase nodes SHALL load that shared contract through their actual `requires` chain at the backfill/content-production decision point. The applicable role nodes (`subagent-dpt-source-intake`, `subagent-dpt-evidence-extractor`, and `subagent-dpt-topic-scout`) SHALL retain only a static reference or concise cue; generated work-unit task/spawn guidance SHALL remain self-contained. None of these consumers SHALL reproduce a second complete generic entry template or redefine the five common fields, section ownership, evidence-bearing predicate, or ref hierarchy.

Generated work-unit `task.md` and spawn prompts SHALL remain self-contained and MAY repeat the shortest five-field cue rather than runtime-parse a framework Markdown template. Their field set and authority disclaimer SHALL be statically parity-checked against the shared contract. They SHALL NOT reproduce the complete section/token/example contract or instruct a delegated actor to discover a phase-only context indirectly.

The shared authoring surface SHALL distinguish one-time token lifecycle from terminal content: a token is expected before its owning first materialization and absent after replacement. Token absence in a completed section SHALL NOT be described as evidence that backfill was skipped. The change SHALL retain existing section headings, token families and `RRM-007` inspect authority; it SHALL NOT rename sections, re-inject consumed tokens, or create another return-map validator.

When return-map inspect reports an invalid entry or missing current-round projection, guidance SHALL direct the Agent to the exact named seed section/entry and rerun the same Wave inspect. It SHALL NOT ask the Agent to reconstruct validator logic locally or surface an ordinary mechanical repair to the user.

#### Scenario: Wave guidance resolves one canonical entry shape

- **WHEN** a Phase Agent reaches Wave0, Wave1, or Wave2 seed backfill
- **THEN** the loaded shared return-map contract SHALL expose the five common entry fields and wave-to-section mapping
- **AND** phase-local guidance SHALL add only its wave-specific authority and execution details

#### Scenario: Generated work-unit cue remains self-contained and aligned

- **WHEN** Engine generates task/spawn guidance for a work unit that writes research output
- **THEN** the guidance MAY include the concise five-field return-map cue without loading the complete shared Markdown
- **AND** static parity SHALL fail if its canonical field set or authority disclaimer drifts from the shared contract

#### Scenario: Duplicate complete templates are rejected

- **WHEN** workflow package/static validation inspects seed and Wave phase guidance
- **THEN** it SHALL find one complete generic return-map template in the shared authoring contract
- **AND** phase files SHALL not retain independently maintained complete copies of that generic template

#### Scenario: Consumed token absence is normal terminal state

- **WHEN** a Wave has replaced its accepted one-time token with valid return-map entries
- **THEN** shared guidance SHALL describe the token as consumed
- **AND** later Agents SHALL NOT be instructed to reinsert it or infer missing work solely from its absence

#### Scenario: Existing projection verdict remains single-owner

- **WHEN** a seed backfill contains unsupported prose, a malformed entry, or misses current-round projection
- **THEN** the existing Wave return-map inspect SHALL remain the deterministic verdict owner
- **AND** shared authoring guidance SHALL direct repair to the named seed coordinate and rerun that same inspect
