> req: SNC-007

## ADDED Requirements

### Requirement: Sub-agent fetch guidance SHALL distinguish per-URL fallback, multi-URL batching, and JS/Node-first fetch tiers

Wave0 and Wave1 Sub-agent role guidance SHALL describe page fetching as two separate layers:

- for one candidate URL, try the allowed fallback chain in order until page content is fetched or every allowed tier fails;
- across different candidate URLs, use small-batch fetching, or bounded parallel fetching only when the native tool/runtime already supports it and site politeness permits.

Multi-URL batching SHALL be a performance strategy only. It SHALL NOT reduce evidence coverage, cache trail requirements, source claim requirements, accepted URL requirements, or lifecycle receipt requirements. Search snippets SHALL NOT replace fetched page content. A Sub-agent SHALL record an access failure for a URL only after all allowed JS/Node-first tiers and existing CLI fallback tiers for that URL fail.

Active Sub-agent role guidance SHALL use JS/Node-first page-fetching fallback tiers. Preferred tiers SHALL be built-in page-fetching tools, browser fetch, or Node.js `fetch` where available. Existing CLI `curl` MAY remain a fallback tier. Active guidance SHALL NOT instruct Python fallback, Python one-liners, or Python scripts for page fetching.

#### Scenario: fallback chain applies to one URL

- **WHEN** a Sub-agent tries to fetch `https://example.com/a`
- **THEN** it SHALL try the allowed fallback tiers for that URL before recording access failure
- **AND** failure for that URL SHALL NOT imply other candidate URLs must wait for the full chain serially

#### Scenario: multiple URLs may be fetched in small batches

- **WHEN** a work-unit task has several candidate URLs to evaluate
- **THEN** Sub-agent guidance SHALL permit fetching them in small batches within tool/runtime/site limits
- **AND** it MAY permit bounded parallel fetching when the available tool natively supports parallel URL work
- **AND** each accepted source SHALL still write required cache trail files and structured result declarations

#### Scenario: JS/Node-first fallback replaces Python fallback

- **WHEN** active Sub-agent role docs list page-fetching fallback tools
- **THEN** they SHALL list JavaScript/Node-compatible fetch tiers such as built-in page-fetching tools, browser fetch, or Node.js `fetch`
- **AND** they SHALL NOT list Python as an allowed fallback
- **AND** hygiene or tests SHALL fail if Python fallback or a Python fetch workaround reappears in active Wave0/Wave1 Sub-agent fetch sections

#### Scenario: batching does not allow snippet evidence

- **WHEN** a batched fetch attempt cannot retrieve page content for a candidate URL
- **THEN** the Sub-agent SHALL NOT treat search snippets as fetched content for that URL
- **AND** accepted source coverage SHALL require fetched cache content or explicit degraded-capture records as defined by existing contracts
