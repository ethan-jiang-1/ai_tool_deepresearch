> req: POF-004

## ADDED Requirements

### Requirement: Focus-bearing post-Final requests SHALL retain wording and interpretation in the existing reason

After the Final Agent classifies explicit feedback as an evidence-expanding
post-Final rerun and resolves any material ambiguity, a request that contains a
new or revised research focus SHALL place two visibly labelled parts in the
existing `reason` string:

`用户的重点原话（逐字保留）：`

and

`Agent 对本轮额外研究方向的理解（可由用户修正）：`.

The first part SHALL faithfully retain the user's accepted focus wording; the
second SHALL contain the concise interpretation the user was allowed to
correct before apply. `requested_scope` SHALL remain a separate bounded field.
The existing LF normalization, outer trim, NUL rejection, profile-rationale
serializer, request digest, event, workspace, and lineage contracts SHALL
remain unchanged. Therefore “verbatim” refers to the accepted normalized
request text and does not promise preservation of CRLF or outer whitespace.

The Engine SHALL continue to validate only the existing request structure and
lineage. It SHALL NOT parse the labels, classify focus semantics, compare the
two parts, or infer permission. A post-Final rerun without a new or revised
focus SHALL retain the existing ordinary non-empty reason contract.

#### Scenario: Focus-bearing request survives current serialization

- **WHEN** the Agent submits an accepted focus-bearing reason with both labelled multiline parts and a separate requested scope
- **THEN** existing apply/recover SHALL preserve the normalized reason in the request, profile rationale, and append-only event
- **AND** requested scope SHALL remain separately recoverable without a new profile field

#### Scenario: Interpretation is corrected before acceptance

- **WHEN** the user corrects the Agent's proposed interpretation in the current Final conversation
- **THEN** the retained reason SHALL contain the accepted corrected interpretation
- **AND** an earlier unaccepted draft SHALL NOT become a Decisions revision or C5 event

#### Scenario: Ordinary rerun reason remains compatible

- **WHEN** an evidence-expanding post-Final request contains no new or revised focus
- **THEN** the existing non-empty reason and requested-scope contract SHALL remain valid
- **AND** no empty focus labels or new schema field SHALL be required
