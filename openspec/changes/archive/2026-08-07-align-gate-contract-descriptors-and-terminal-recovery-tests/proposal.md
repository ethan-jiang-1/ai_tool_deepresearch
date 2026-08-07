## Why

The current Head shows three related truth-path problems, rather than three
reasons to weaken schemas. `BUG-201` is no longer an active presentation false
negative: Wave1 accepts equivalent heading case, order and level, but its
definition still advertises an ordered `pattern_match` regex while runtime
dispatch uses a rule-ID special semantic evaluator. `BUG-202` already masks
downstream depth symptoms behind submitted-evidence roots, but lacks the exact
“no submitted work unit can supply a reviewed ref” regression. `BUG-204`'s six
red terminal tests use an outdated unassigned `reference` output where the
current Wave0 assignment permits only `source_yaml`; they do not yet prove a
hash or snapshot defect.

The accepted Gate audit also conflicts with itself by both rejecting and
requiring a permanent per-rule catalog. This change chooses the executable
derived-audit model: schema-parsed definition descriptors plus behavioral
evaluator tests, with no second permanent rule catalog. Sources are
`_backlog/plans/gate-schema-progressive-gate-schema-queue-remediation.md`,
`_backlog/plans/gate-schema-capability-audit.md`, and
`_backlog/plans/bug-200-204-gate-and-queue-remediation.md`.

## What Changes

- Replace the Wave1 `question_list_has_four_sections` ordered regex descriptor
  with a typed direct semantic-section descriptor that declares its required
  section names. The evaluator dispatches on that descriptor, not the rule ID
  or historical regex, and still accepts equivalent heading presentation.
- Reconcile `GSK-011` audit wording with its executable derived-audit model:
  audit parses active definitions and proves their evaluator behavior; it does
  not create a permanent, competing per-rule catalog.
- Add a real Gate-path regression for tolerant semantic section presentation
  and one for a missing/empty section producing one direct root.
- Add the exact Wave1 depth-review regression in which no submitted work unit
  can legally supply `reviewed_work_unit_refs[]`; it must fail closed at the
  submitted-evidence/binding root and mask derivative depth symptoms.
- Make terminal late-submit/timeout-preflight test candidates derive output
  roles from the current claimed attempt's assignment contract. The current
  Wave0 fixture therefore submits its assigned `source_yaml` output instead of
  inventing an unassigned `reference` role. Only a remaining red Engine-path
  result can justify changing hash, snapshot, or output schema behavior.
- Retain strict submitted-ledger, identity, output-role, hash and snapshot
  protections. This change adds no tolerant provenance route, no fake reviewed
  ref, and no Agent-flow claim.

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `engine/gate-skeleton` | main spec `GSK-004`, `GSK-011`; active audit test and Gate finding dispatch | Modify | It owns the active audit's derived-model contract; `GSK-011` changes while the existing `GSK-004` general definition/evaluator rule remains the governing boundary. |
| `research/research-wave-gate-implementation` | main spec `RWG-005`; Wave1 definition and evaluator/depth contract | Modify | It owns the Wave1 semantic-section descriptor, evaluator dispatch and submitted-depth Gate behavior. |
| `agent/delegated-work-units` | main spec `DEW-006`, dry-submit, timeout-preflight and terminal tests | Verify-only | The assignment/output and terminal protections remain correct; only the test candidate must be derived from their existing contract. |
| `agent/work-unit-provenance-gate` | main spec `WPG-002`, `WPG-003`, `WPG-013` | Verify-only | Submitted evidence stays the authority; this change proves its root ordering rather than changing provenance rules. |
| `engine/check-inspect-feedback` | main spec `CHI-002`, `CHI-004` | Verify-only | Existing structured finding feedback is reused; no new feedback capability is necessary. |
| `engine/schema-core` | main spec `SCO-002`, Gate definition schema | Verify-only | The change uses the current schema parsing boundary; any narrow definition-field validation belongs to the selected Gate capability, not a general schema-core expansion. |
| `verification/test-fixtures` | main spec `TEF-001` | Excluded | `work-unit-terminal.test.mjs` builds its own temporary bundle and does not use the mini Harness fixture capability. |

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `engine/gate-skeleton`: `GSK-011` reconciles executable audit wording with
  its derived definition/evaluator model.
- `research/research-wave-gate-implementation`: `RWG-005` makes the Wave1
  question-list contract declarative, preserves root-first submitted-evidence
  masking, and locks the behavior with direct Gate regressions.

## Impact

- **Direct Sources of Record:** active parsed Gate definitions plus their pure
  evaluator own semantic-section results; submitted work-unit ledger rows and
  the claimed attempt assignment own reviewed-ref and output-role facts.
- **Semantic precision:** a semantic-section descriptor answers the bounded
  question “Are all named required sections present and non-empty?” It retains
  differences that change the answer (missing/empty section) and erases
  presentation-only differences (case, order, heading level and spacing). It
  is in-memory definition metadata, not a persistent verdict or second parser.
- **Shortest legal loops:** definition -> one evaluator -> Gate/inspect ->
  direct repair or submitted-evidence no-path -> rerun the same checkpoint.
  Terminal fixtures read their assignment first, then exercise the same real
  submit/preflight path; no test-only schema bypass is introduced.
- **Net simplification:** remove the historical ordered regex/rule-ID special
  case ambiguity and the conflicting audit catalog wording; do not add an
  extra parser, validator or test-only output contract.
- **Responsibility:** Engine evaluates deterministic definition, evidence and
  assignment facts. The Agent repairs content only at existing authorized
  producer surfaces; a user retains only new research-semantic decisions.
- **Release:** this changes `DEEP_RESEARCH_HARNESS/` behavior and requires
  release `v0.76` after Change A, with `CHANGELOG.md` and `RUN.md` synchronized
  during apply. No dependency is added.
