> req: SNC-007

## MODIFIED Requirements

### Requirement: Sub-agent fetch guidance SHALL distinguish per-URL fallback, multi-URL batching, and JS/Node-first fetch tiers

Wave0, Wave1 and external-evidence Wave2 Sub-agent role guidance SHALL describe page fetching through one canonical shared Agent-facing guidance surface, delivered to the actor through its Engine-derived role/shared guidance refs. Role files SHALL retain role-specific search goals and evidence/cache obligations but SHALL NOT restate an independent fallback chain.

The shared guidance SHALL distinguish two layers:

- for one candidate URL, try the independently permitted fallback chain in order until real page content is fetched or every allowed tier fails;
- across different candidate URLs, use small-batch fetching, or bounded parallel fetching only when the native tool/runtime already supports it and site politeness permits.

Multi-URL batching SHALL be a performance strategy only. It SHALL NOT reduce evidence coverage, cache trail requirements, source claim requirements, accepted URL requirements, or lifecycle receipt requirements. Search snippets SHALL NOT replace fetched page content. A Sub-agent SHALL record an access failure for a URL only after every independently permitted JS/Node-first tier and the bounded CLI fallback for that URL fails.

The canonical guidance SHALL use JS/Node-first page-fetching tiers: available built-in page-fetching surface first, browser fetch when actually available, Node.js `fetch`, then one bounded standalone `curl` fallback for the same URL when independently configured host permission allows it. It SHALL impose finite timeout/redirect/protocol bounds, reject shell composition and unsafe URL interpolation, and SHALL NOT interpret native policy failure as shell permission. It SHALL NOT instruct Python fallback, Python one-liners, Python scripts, `wget`, another fallback tier, repeated automatic retry, policy widening or user command handoff.

Fetched page content, cache leaves, source claims, accepted URLs and receipts remain actor-owned runtime facts. Shared guidance and generated task projections do not fetch on the actor's behalf and do not create evidence, receipt or submit authority. If every legal tier fails or a new host permission/external environment action is required, the actor SHALL record the bounded failure and return that smallest boundary to the Phase Agent; the user SHALL not become the work-unit pipeline co-runner.

#### Scenario: fallback chain applies to one URL
- **WHEN** a Sub-agent tries to fetch `https://example.com/a`
- **THEN** it SHALL try the independently permitted bounded tiers for that same URL before recording access failure
- **AND** failure for that URL SHALL NOT imply other candidate URLs must wait for the full chain serially

#### Scenario: multiple URLs may be fetched in small batches
- **WHEN** a work-unit task has several candidate URLs to evaluate
- **THEN** Sub-agent guidance SHALL permit fetching them in small batches within tool/runtime/site limits
- **AND** it MAY permit bounded parallel fetching when the available tool natively supports parallel URL work
- **AND** each accepted source SHALL still write required cache trail files and structured result declarations

#### Scenario: JS/Node-first fallback replaces Python fallback
- **WHEN** active Sub-agent role/shared docs list page-fetching fallback tools
- **THEN** they SHALL list the canonical built-in/browser/Node.js tiers and bounded same-URL `curl` fallback
- **AND** they SHALL NOT list Python, `wget` or an unbounded alternative tier
- **AND** hygiene or tests SHALL fail if Python fallback, a Python fetch workaround or a role-local duplicate chain reappears in active Wave0/Wave1/Wave2 search roles

#### Scenario: native failure does not create shell permission
- **WHEN** the native surface is blocked or unavailable for one URL
- **THEN** the actor SHALL use the canonical `curl` fallback only when current host shell/network permission independently permits it
- **AND** it SHALL not widen policy, ask the user to run an already authorized command or treat command exit without real content as accepted evidence

#### Scenario: batching does not allow snippet evidence
- **WHEN** a batched fetch attempt cannot retrieve page content for a candidate URL
- **THEN** the Sub-agent SHALL NOT treat search snippets as fetched content for that URL
- **AND** accepted source coverage SHALL require fetched cache content or explicit degraded-capture records as defined by existing contracts

