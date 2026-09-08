## ADDED Requirements

### Requirement: Dry-submit SHALL reject accepted source claims absent from accepted_source_urls

> req: WUP-007

When a candidate result declares an accepted `source_claims[]` entry whose URL is absent from the same row's `accepted_source_urls[]`, dry-submit and submit SHALL reject the result before ledger append with a claim-membership root, mirroring the existing reverse check that an `accepted_source_urls[]` entry must have a matching accepted claim. The diagnostic SHALL carry, in addition to the claim-side url, the accepted claim urls already declared in `accepted_source_urls[]` (BUG-242-style one-step repair coordinates), so the Agent can either add the URL to `accepted_source_urls[]` or correct the claim's acceptance in one deterministic edit. URL comparison SHALL reuse the existing source-cache URL normalization shared by claim/cache matching.

This check SHALL NOT change which cache/degraded backing, provenance, or coverage checks apply, SHALL NOT relax the existing reverse membership or cache-URL mismatch checks, and SHALL NOT introduce a second acceptance authority: `accepted_source_urls[]` remains a declarative index of the row's accepted claim URLs, and the submitted result remains the only thing this preflight judges.

#### Scenario: Accepted claim URL missing from the declared index

- **WHEN** a candidate result declares an accepted `source_claims[]` entry with url `https://www.example.com/article.php/Title;-Subtitle-`
- **AND** `accepted_source_urls[]` does not contain that URL
- **THEN** dry-submit SHALL reject the result before ledger append
- **AND** the diagnostic SHALL include the claim-side url and the urls already declared in `accepted_source_urls[]`

#### Scenario: Listed index URL keeps passing

- **WHEN** every accepted `source_claims[]` entry's URL appears in `accepted_source_urls[]`
- **THEN** dry-submit SHALL keep the existing verdict for the claim-membership dimension
- **AND** no new diagnostic SHALL be emitted for that row

#### Scenario: Degraded-capture claims follow the same membership rule

- **WHEN** a degraded-capture accepted claim's URL is absent from `accepted_source_urls[]`
- **THEN** dry-submit SHALL reject with the same claim-membership root
- **AND** the repair coordinates SHALL name the degraded claim url so the Agent can declare it in the index or fix the acceptance
