## ADDED Requirements

> req: CTS-008

### Requirement: Wave1 review selection SHALL bind canonical topic identity and current intent

Before a Wave1 carried-target declaration can be normalized, the Engine SHALL select the existing `artifacts/wave1/{layout}/depth-review.yaml` through accepted topic-layout facts and resolve it to exactly one current canonical `topic_uid`. It SHALL derive an intent binding from the current registry title, must-answer set, scope role, and dependencies. A current/previous-layout filename fallback alone SHALL NOT establish this binding.

An identifier-only layout change MAY reuse one unambiguous UID-bound review only while the derived intent binding remains equal. A changed binding SHALL require the existing Wave1 Phase owner to refresh the review before the next Wave1 receipt; the selector SHALL NOT fuzzy-match question prose or create a slug alias map.

#### Scenario: layout-only reuse remains bounded
- **WHEN** one prior layout path resolves to the current topic UID and current intent binding
- **THEN** Wave1 MAY normalize that one review for a new Gate receipt
- **AND** it SHALL not copy the review into a second declaration path

#### Scenario: changed intent blocks stale review reuse
- **WHEN** the review resolves to the same UID but its current registry intent binding differs
- **THEN** the Wave1 declaration is not current and the Gate directs repair to that depth review
- **AND** Wave2 SHALL not consume an old receipt as coverage for the changed intent
