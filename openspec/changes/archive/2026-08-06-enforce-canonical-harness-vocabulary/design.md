## Context

See `proposal.md` for motivation. The current canonical vocabulary is already
defined in `CONTEXT.md`; the remaining drift is seventeen human-readable
occurrences across one setup guide, two accepted behavior contracts, two JSDoc
comments, and six experiment playbooks. The source files are the direct facts
for this maintenance change. Existing archives and Git history are historical
evidence, not current vocabulary authority.

## Goals / Non-Goals

**Goals:**

- Give a human reader and an Agent one precise current answer: the selected
  reusable entry, execution path, authority boundary, and setup surface belong
  to the Deep Research Harness.
- Preserve the existing distinctions between the project, reusable Harness,
  research run, and current run bundle.
- Lock the ten audited current sources to their canonical statements with a
  focused deterministic integration test.

**Non-Goals:**

- Rewriting archived OpenSpec artifacts, Git history, remote refs, clones,
  backups, or protected runtime data.
- Changing research routing, silent-phase behavior, runtime grammar, Engine
  authority, release version, or `DEEP_RESEARCH_HARNESS/` implementation.
- Renaming accepted structural `dpt_*` bundle grammar, role keys, file
  protocols, or test/runtime fixtures.
- Adding a terminology registry, new state, compatibility resolver, generic
  text scanner, or a second authority path.

## Decisions

### Keep the existing semantic model and replace only live synonym uses

The reader-facing model already answers the bounded question at the needed
level: the project develops the Harness, the Harness is reusable, a research
run is its lifecycle, and a current run bundle owns mutable runtime truth.
Replacing the seventeen ambiguous phrases with canonical wording preserves
those distinctions without adding a new abstraction. In particular,
human-readable `DPT run bundle` becomes `run bundle`; this does not rename the
accepted structural `dpt_*` grammar. Rewriting historical records was rejected
because it would confuse their evidence role while still not erase distributed
Git copies.

### Use positive source contracts instead of a permanent retired-token fixture

The integration test will read the ten audited current sources and assert the
canonical Harness entry and execution-path, research-run, run-bundle,
authority, and current-run-bundle runtime-truth wording. It will not retain a
second name as a durable test token. The test is an `integration` contract: it
proves current source text, not real-Agent behavior or archival/history
erasure.

### Keep verification bounded and explicit

The apply closeout will run a scoped tracked-worktree scan for the retired
naming family outside archived OpenSpec records and the project-protected
runtime/historical locations. This proves the current-system boundary selected
by the user; it does not claim a result for the excluded records or Git
history.

### Preserve responsibility and control boundaries

The user has made the vocabulary decision. The Agent performs the reversible
source and test edits through the approved change. The integration test is the
Engine-owned deterministic verdict only. No decision, mutation permission,
runtime truth, or flow control moves between user, Agent, Markdown, and Engine.

The shortest legal loop is direct source text -> one focused test and bounded
scan -> clear pass/fail result. It removes seventeen live synonym uses and
avoids a new vocabulary state, alias resolver, compatibility path, or layered
checker.

## Risks / Trade-offs

- [Historical records still contain retired vocabulary] -> The proposal,
  scoped scan, and closeout explicitly state that archives/Git history are
  outside the current-system claim. A separate user-authorized history rewrite
  would be required for a different boundary.
- [A future edit can introduce another synonym] -> The focused test protects
  all ten audited source statements; normal OpenSpec review and the bounded
  scan protect the declared current-surface boundary without embedding an
  obsolete term into permanent production vocabulary.
- [Positive assertions do not prove arbitrary future prose] -> The contract is
  intentionally limited to the selected source statements rather than adding a
  broad presentation-format gate.

## Migration Plan

1. Update the two accepted requirement blocks, `SETUP.md`, the queue-lifecycle
   JSDoc, six selected experiment playbooks, and the focused integration
   contract in one apply.
2. Run the focused test, verification-routing asset check, strict OpenSpec
   validation, requirement/spec governance checks, and the bounded current
   vocabulary scan.
3. Sync the accepted specs, complete closeout review, and archive through the
   governed finalizer. Rollback is a normal Git revert of this focused change;
   no runtime data migration is involved.
