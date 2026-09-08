## ADDED Requirements

### Requirement: Reference metadata source_url multi-URL delimiter and binding identity

> req: REF-012

Reference metadata `source_url` SHALL follow one deterministic multi-URL delimiter contract: a `;` opens a new URL only when the text after it (optionally with whitespace) begins with an `http://` or `https://` URL prefix (case-insensitive, mirroring URL scheme parsing); a literal `;` inside a URL path is an opaque path character and SHALL NOT split the value or invalidate parseability. This contract SHALL be the single split authority consumed by every reference `source_url` surface, so a URL that is parseable under one surface is parseable under all of them.

Submitted-backing binding for reference `source_url` SHALL compare the metadata value against the submitted claim URL by the existing normalized URL identity (parseable http(s) URL with the fragment stripped), without percent-decoding: a metadata `source_url` whose path contains a literal `;` SHALL bind when both sides carry the same literal `;`. The Agent SHALL write the projection `source_url` verbatim as the submitted claim URL (or joined with `; ` + `http(s)://` for multiple URLs); percent-encoding a path `;` as `%3B` creates a different URL identity and SHALL NOT bind. This requirement SHALL NOT change which submitted surfaces constitute legal backing, SHALL NOT add a metadata key or index column, and SHALL NOT alter supersede/correction semantics.

#### Scenario: Path semicolon parses and binds as one URL

- **WHEN** a submitted Wave1 claim URL contains a literal `;` in its path (for example `https://www.example.com/article.php/First_dash_Quarter-2026-Net-Profit-Rises-At-DBS;-Wealth-Arm-Helps-Results-`)
- **AND** a canonical consumer projection writes its metadata `source_url` verbatim as that URL
- **THEN** the projection `source_url` SHALL be URL-parseable as one whole URL
- **AND** its normalized identity SHALL bind to the submitted accepted claim URL

#### Scenario: Percent-encoded semicolon is a different URL identity

- **WHEN** a projection metadata `source_url` percent-encodes a path `;` as `%3B` while the submitted claim URL carries the literal `;`
- **THEN** the normalized identities SHALL differ
- **AND** the projection SHALL fail submitted-backing binding with the existing unbacked-projection root rather than silently matching

#### Scenario: Multi-URL metadata stays supported

- **WHEN** a reference metadata `source_url` declares several URLs joined as `https://a.example/one; https://b.example/two`
- **THEN** the value SHALL split into two URLs and each SHALL be parsed and bound independently under the existing rules
