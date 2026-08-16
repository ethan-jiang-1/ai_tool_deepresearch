## Context

See `proposal.md` for motivation and the ten delta specs for observable
requirements. The current Harness reaches `phases/phase-final.md` through a
legal Readiness Gate/load handoff, writes Final Markdown through
`persist-final-report`, then treats the terminal delivery as non-interactive.
`rb_status.json#/current_node` remains `phases/phase-final.md`, but current
guidance and reentry projection send post-delivery changes toward C5 rather than
distinguishing report presentation from research expansion.

The implementation spans Final guidance, lifecycle header projection,
artifact persistence, reentry, post-final recovery, and verification. It must
preserve the existing authority split: the Agent interprets user feedback and
writes reports; the Engine validates direct filesystem/lifecycle/backing facts;
Markdown places interaction. Final remains lifecycle-terminal even while the
user-facing delivery conversation continues.

## Goals / Non-Goals

**Goals:**

- Publish a report immediately whenever a legal Final delivery lineage has no
  report bound to it: use the base on the bundle's first Final entry and append
  the next global version after a later audited rerun. Then keep the same Final
  node available for as many presentation revisions as the user requests.
- Establish a deterministic pre-publication baseline before each new legal Final
  load: empty primary inventory for the first entry, or the exact event-bound
  prior Final inventory for a post-C5 return.
- Append an immutable, globally ordered primary report series with one
  Engine-owned allocator and one current-report resolution rule.
- Resume clean Final at the Final owner; transfer ownership to C5 only after an
  evidence-expanding request has established accepted C5 lineage/workspace.
- Reuse the existing submitted-backing evaluator and crash-safe persistence
  workspace while closing the concurrent absent-target overwrite race.
- Keep deterministic mechanism evidence separate from real Agent multi-turn
  behavior and user/report-quality judgment.

**Non-Goals:**

- Add a Final Gate, third HITL, outgoing/self transition, interaction state,
  satisfaction field/event, revision counter, current pointer, chat listener,
  daemon, or fixed revision limit.
- Let the Engine classify free-form feedback, score whether a report is
  sufficiently technical, or infer user satisfaction.
- Rewrite HITL2 `final_report_view`, `composition_handoff`, its receipt, verified
  evidence, or research profile for a presentation-only Final revision.
- Overwrite, rename, delete, or renumber a committed primary report.
- Replace audited post-final recovery for new sources, Topics, evidence,
  conclusions, or research-profile changes.

## Decisions

### 1. Lifecycle terminality and delivery interaction are separate dimensions

Final keeps `gate: null`, no `next`, no transition-table source edge, and
`rb_status.json#/current_node: phases/phase-final.md`. Its frontmatter changes
to `stop: "yes"`, but Final receives a specialized interpretation: execute the
current-lineage delivery before waiting, then remain available for artifact
feedback.
Generic `stop: "yes"` HITL behavior remains unchanged elsewhere.

The interaction decision table is explicit and does not create a state
machine:

| Direct Final facts and current input | Owner/action | Durable lifecycle effect |
|---|---|---|
| First legal Final entry, entry admission witnessed a valid empty primary inventory and Readiness status is synchronized | Agent composes; Engine publishes `final/final.md`; Agent presents it | none; `current_node` stays Final |
| Newer legal Final entry after accepted C5, exact prior inventory was admitted, Readiness status is synchronized, and no current-lineage append exists | Agent composes from the new verified lineage; Engine publishes global `latest + 1`; Agent presents it | none; `current_node` stays Final |
| Primary report is bound to the current Final lineage, no current feedback | Agent presents/regrounds latest and waits | none |
| Clear presentation-only feedback | Agent writes one complete staging revision; Engine appends one version; Agent presents and waits again | none |
| Materially ambiguous feedback | Agent asks only the smallest clarification | none |
| User is satisfied or declines another revision | End the current interaction | none; no satisfaction fact |
| Request needs new research/evidence/profile semantics | Agent retains the explicit request and uses existing C5 | existing audited C5 lineage only |
| Accepted publication workspace exists | Existing quiescent sweep/repair owner | existing persistence recovery only |
| Accepted C5 workspace/still-active lineage exists | Existing C5 stage owner | existing C5/normal lifecycle path |

This table is a reader decision procedure, not a new lifecycle transition map.
The normal reasoning stop is the selected bundle's legal Final lineage, its
entry-admitted pre-publication baseline, route-bound load, Readiness source
Gate/status window, current node, canonical primary inventory, any accepted C5
event-bound prior inventory needed to interpret a later Final return, and the
current user turn. After a new load, the existing status synchronization must
establish the terminal Final window before clean delivery or refinement
projection. Chat history is not runtime authority.

Why: the user's bounded question is “does the latest delivered report need
another presentation of the same verified research?” That question is distinct
from “does research need to expand?” and from “did the lifecycle legally reach
Final?” Keeping those distinctions removes the need for a Final status or Gate.

Alternatives rejected:

- A Final self-transition or hidden retry loop would contradict terminality and
  require new handoff/status evidence.
- Reopening HITL2 for presentation feedback would rewrite the meaning of the
  current lineage's accepted delivery contract and force presentation
  preferences into research profile authority.
- Persisting satisfaction would convert a user conversational judgment into an
  Engine fact with no downstream deterministic consumer.

### 2. Final entry admission establishes the pre-publication baseline

`enter-phase` owns the only deterministic moment at which the framework can
prove that a report did not predate a new Final entry. After normal handoff
authorization and action-core preflight, but before `assessNode()`,
`load_complete`, or `current_node` mutation, a new Final entry applies one of two
closed admissions:

- if no earlier route-bound legal Final load exists, the shared primary-series
  resolver must return a valid empty inventory; a modern base, canonical
  revision, legacy-primary candidate, or invalid/ambiguous primary history
  blocks; or
- if a newer Readiness-to-Final handoff descends from accepted C5, shared
  handoff evaluation must return one unique retired C5 event and the current
  deterministic sorted safe Final inventory must reproduce that event's
  `previous_final.final_inventory_sha256` exactly.

Any new Final handoff after an earlier legal Final load that cannot prove this
unique accepted C5 provenance blocks as unsupported lineage. It cannot fall back
to the first-entry empty rule or treat an old report as the new delivery.

The second check covers canonical and supplementary drift. It therefore proves
that the rerun preserved the old delivery bytes and that no new report was
published before the new Final load. The later immutable-prefix proof answers a
different question: whether publication after that load appended one or more
canonical versions and thereby bound the newest report to the new lineage.

Admission is required only before the first route-bound load for a handoff. An
exact retry after a partial entry uses the already-established load witness.
Bundles with a legal Final load predating this contract, including an
already-entered single-legacy-primary bundle, remain readable; the Engine does
not invent a historical baseline or force another load. New entries never infer
creation order from mtime, filename order, contents, or chat.

Why: once Final has been entered, current files alone cannot distinguish a
canonical-looking report written just before the load from one written just
after it. Entry admission closes that temporal ambiguity at the owner that can
still observe it, without a delivery event, timestamp authority, counter, or
publisher-side lifecycle check.

Alternatives rejected:

- Auditing only after publication cannot recover creation order from current
  inventory.
- Having the publisher validate lifecycle would merge persistence with phase
  entry and still fail to prove the pre-entry baseline.
- Recording file mtimes or a new delivery event adds a weaker or duplicate
  authority when the existing route-bound load is the natural witness.

### 3. Canonical primary inventory is the only version and latest-report authority

Add a focused pure helper, planned as
`engine/helpers/final-report-series.mjs`. A filesystem adapter supplies safe
direct children of `final/`; the pure resolver parses a strict Zod input and
returns a strict Zod result. Cross-entry invariants use `.superRefine()` /
`.refine()` for unique contiguous versions, one base, safe feature labels,
case-fold collision rejection, and legacy ambiguity.

The accepted grammar is:

```text
modern base: final/final.md                         version 0
revision:    final/final_v<N>.md                   N >= 1
labelled:    final/final_<safe_snake_case>_v<N>.md N >= 1
```

Labelled and unlabelled revisions share one contiguous `1..latest` sequence.
The optional feature is presentation metadata in the filename, never a second
series or authority. The latest committed primary report is the base when no
revision exists and otherwise the unique highest `N`.

For compatibility, no modern base plus exactly one other safe direct-root
Markdown report and no canonical revision is a read-only legacy v0. Its first
new revision is `final/final_v1.md` or a labelled v1. Multiple legacy candidates,
an orphan/gapped/duplicate revision, malformed reserved `final*.md`, unsafe
entry, or case-fold collision fails closed. Non-reserved Markdown alongside a
modern base remains supplementary/historical and does not affect allocation.

The resolver returns inventory classification, ordered entries, latest target,
next version, and blocker facts. There is no profile counter or separate
`current-final` pointer. Every consumer—publication, C5 inventory binding, and
reentry—uses this resolver rather than sorting paths independently.

Version zero belongs to the bundle-wide primary series, not to every lifecycle
delivery lineage. A later Readiness-to-Final handoff after audited rerun cannot
create another `final/final.md`; its first delivered report appends the next
global version. Within that newer lineage, later presentation revisions continue
the same sequence.

Why: the directory inventory is already the committed delivery fact. Deriving
both version and latest from it avoids counter/file divergence and makes old
bundles readable without migration writes.

Alternatives rejected:

- A counter in profile duplicates the filesystem and creates an atomicity and
  recovery problem.
- Per-feature counters make chronological order ambiguous.
- Selecting a legacy report by mtime, lexical order, or content guesses intent
  from non-authoritative facts.

### 4. `publish-final-report` is the single deep primary-series interface

Extend the artifact-persistence Module with one operation:

```text
publish-final-report --bundle <bundle> --source <retained-staging>
                     [--feature <safe_snake_case>]
```

The caller cannot provide target, version, CAS digest, overwrite, force, or
legacy classification. The operation:

1. validates the selected bundle, retained staging source, and quiescent
   persistence boundary;
2. resolves canonical inventory and allocates base or `latest + 1`;
3. runs the existing Final Evidence Map/submitted-backing evaluator against the
   exact staging bytes and allocated target;
4. prepares the existing artifact-persistence payload/workspace with a
   publication-specific Zod sidecar binding inventory digest,
   base-classification, allocated target/version, optional feature, staging
   digest, and backing result;
5. commits without replacing an existing target; and
6. returns a strict result separating backing check/inspect/advice from the
   mechanical publication verdict and allocation facts.

The publisher neither validates nor establishes legal Final entry, lifecycle
position, handoff, or user-facing delivery. Those facts remain owned by the
existing Readiness-to-Final lineage and lifecycle surfaces. A primary-looking
file committed outside legal Final lineage remains mechanically persisted but
does not become delivery evidence; conversely, legal Final lineage without a
primary report bound to that lineage as the base or a proven append is not
delivery. Final guidance/audit composes those independent facts instead of
moving lifecycle authority into persistence.

`persist-final-report` remains supported for non-primary Final Markdown.
Generic `persist` and caller-targeted `persist-final-report` reject the
case-insensitive direct-root `final/final*.md` reserved namespace and an
inventory-selected legacy base. Only the publisher may create canonical
primary names.

The operation sidecar evolves as a versioned Zod union: existing accepted v1
generic/Final workspaces remain readable by sweep; new primary-publication
workspaces carry their allocation binding. `sweep` dispatches by parsed kind,
reruns backing admission, and finalizes exactly the recorded target without
reallocation.

Why: one narrow interface makes naming, backing admission, immutability,
crash recovery, and caller responsibility inseparable. It deepens the existing
durability Module instead of adding another writer or publication journal.

Alternatives rejected:

- Letting the Agent choose a target/version makes inventory validation advisory
  and allows races or gaps.
- Reusing caller-targeted `persist-final-report` unchanged cannot reserve the
  direct-root namespace or return one allocation truth.
- A new publication ledger duplicates the committed directory inventory.

### 5. Primary publication uses atomic no-clobber commit, not check-then-rename

The current absent-target flow rechecks existence and then calls `renameSync()`.
Two processes can both pass the recheck; POSIX rename may then replace the first
target. Primary publication therefore cannot rely on that check alone.

For the publication kind, after the existing same-device preparation, commit
uses an atomic no-clobber hard-link step from the prepared payload to the absent
target. Link creation succeeds for one caller and fails with target-exists for
the other; successful target-parent fsync is followed by ordinary workspace
cleanup. A crash after link but before cleanup is already recognizable because
target bytes equal the prepared payload. Platforms/filesystems that cannot
provide this same-device no-clobber primitive return an explicit configuration
boundary rather than silently falling back to replacement rename.

On a version collision, the losing fresh call removes its own safe workspace
when possible and returns a retryable inventory-conflict result. The Agent
reruns the same publication command, which re-inspects and allocates the next
version. An accepted or cleanup-blocked workspace remains the existing sweep
owner. No persistent lock, lease, PID inference, lock cleanup, or counter is
introduced.

Why: this is the shortest legal concurrency loop and it gives the filesystem
the compare-and-create verdict. It fixes the one primary-history risk without
changing generic replacement-CAS semantics outside this change.

Alternative rejected: a lock file serializes callers but introduces stale-lock
ownership, cleanup, lease, and crash recovery that add more control complexity
than the report publication itself.

### 6. Every version independently preserves research and backing boundaries

The Final Agent starts from the latest committed primary report, the accepted
composition handoff for the current legal Final lineage, current verified
evidence, and current feedback. It produces a complete report rather than a
patch file. Presentation changes may alter reader, structure, length, wording,
emphasis, appendices, and the explanation/visibility of already verified
evidence. They cannot add a source, Topic, evidence claim, new conclusion, or
research-profile meaning. Presentation revisions do not rewrite that lineage's
handoff; a later audited rerun may reach a new HITL2/Readiness lineage with a new
accepted handoff through the existing pipeline while all earlier handoffs and
reports remain historical truth.

The Agent owns that semantic classification and asks one minimal clarification
when the boundary matters. The Engine never parses feedback. Across the
responsible modules it proves only:

- legal Final lineage and current owner facts;
- primary inventory/allocation/path/immutability;
- submitted-backing admission for each exact report; and
- crash/concurrency outcome.

Every revision runs the existing Report Composition Pass and Evidence Map
admission independently. The report may be stylistically better or worse; no
deterministic success result claims semantic improvement or user satisfaction.
Within one Final lineage, its accepted HITL2 profile/handoff/receipt remain
immutable delivery context; a later accepted pipeline lineage adds new context
without rewriting the old one.

Why: user judgment changes desired presentation; Agent intelligence performs
the rewrite; Engine checks facts it can actually know. This is the
helper-oriented responsibility boundary.

### 7. Reentry resolves mechanical owner without inferring conversational intent

`check-reentry`, C5, and their recovery helpers consume the shared primary
inventory. Across a post-C5 Final return and current terminal Final, precedence
is:

```text
accepted publication/persistence workspace
  > invalid or ambiguous primary inventory blocker
  > accepted C5 workspace or still-active lineage and its exact current stage
  > newer Final handoff without route-bound Final load = enter-phase
  > route-bound Final load without Readiness status sync = advance-status
  > synchronized newer Final with zero append = immediate delivery
  > current Final owner with a bound report = latest refinement
```

A clean Final is not automatically a C5 candidate merely because an inspect
could prove rerun mechanically available. C5 becomes the owner only after the
Agent has classified an evidence-expanding request and `apply` has established
an accepted workspace/lineage. Once established, existing C5 replay/descendant
precedence remains unchanged.

When that accepted C5 lineage later reaches a newer legal Readiness-to-Final
handoff, it retires as the current recovery owner but remains an audit witness.
The new Final load is admitted only while current safe inventory still exactly
matches its event-bound prior Final inventory digest. The existing Readiness
status synchronization remains the next owner after load and before Final work.
Once the terminal Final window is synchronized, that digest distinguishes two
otherwise identical terminal states. Reentry computes the
current safe sorted inventory,
uses the shared primary resolver to identify the highest canonical revisions,
and tests whether removing zero or more highest appended primary entries produces
the exact prior digest while every retained path and byte digest remains
unchanged. A zero-append match means the newer Final lineage still owes its
immediate report; a unique one-or-more append match binds the latest report to
that newer lineage and permits ordinary refinement. No match blocks as lineage/
inventory drift. This reuses the existing C5 event binding and adds no delivery
event, timestamp authority, profile counter, or current pointer.

The existing `enter_phase`, `advance_status`, and `current_owner` recovery action
kinds cover these stages. `current_owner` can target `phases/phase-final.md`; its
detail distinguishes immediate current-lineage delivery from latest-report
refinement. No new action enum or C5 event schema is needed unless implementation
evidence disproves the digest-prefix proof.
Reentry does not read chat, infer pending feedback, publish a report, or record
satisfaction.

Why: `current_node` and accepted workspaces are direct runtime facts. User intent
is current semantic input owned by the Agent, not recoverable Engine state.

Alternatives rejected:

- Defaulting every clean Final to C5 turns mechanical availability into
  mutation intent and hides the normal delivery owner.
- Persisting pending presentation feedback creates a new request ledger and
  message transport outside the requested feature.

### 8. Existing continuation vocabulary stays compatible

Workflow loading recognizes manifest Final plus `gate: null` before generic
`stop: "yes"` handling and injects a specialized terminal header. It retains
the existing continuation pair:

```text
interaction: terminal_delivery
next_action: deliver_final_artifacts
```

The meaning becomes lineage-and-inventory-aware: an empty first-delivery
inventory or a newer Final lineage with zero proven appended versions requires
immediate publication; a report already bound to the current lineage regrounds
the latest version and handles the current Final interaction. No interaction
enum, transport, or cue-derived state is added. `RUN.md`, `COMMANDS.md`, bundle-
entry template, continuation playbook, Final phase, and effective helper-oriented
constitutional guidance use the same deliver-first wording.

Why: the cue already answers placement and immediate action. Expanding its
meaning is compatible and avoids another controller-visible concept.

### 9. Verification separates mechanisms from observed Agent behavior

The change selects all four accepted classes:

- `unit`: pure primary-series grammar/classification/allocation plus
  publication-sidecar/result truth tables, no-clobber boundaries, and C5 prior-
  inventory append/zero-append lineage classification;
- `integration`: production publication CLI, first-entry and post-C5 Final
  inventory admission, workflow loader/header, Final Markdown/docs parity
  including helper-oriented guidance, C5 request boundary, later-Final delivery-
  pending behavior, and reentry owner precedence;
- `deterministic_e2e`: a temporary-bundle legal Readiness-to-Final chain that
  proves empty admission before publishing base/two revisions, immutable bytes/
  global numbering/current node/reentry, and C5 ownership only through an
  explicit request; plus a focused lineage-continuity chain that returns to
  Final, proves exact prior-inventory admission before load, requires a global
  append, and binds the newer delivery; and
- `agent_flow_e2e`: a new registered case 138 using the existing iterative
  Subject adapter for one no-network Subject session and five supplied turns—
  initial immediate delivery, two presentation revisions, satisfaction, then
  an evidence-expansion request on the same lineage proving C5 selection and
  acceptance without another report.

The Agent-flow claim is procedural only: from supplied feedback, a real Subject
Agent follows the Final guidance, uses the production publisher, keeps
presentation work in Final, and chooses C5 for supplied research expansion.
It does not claim the reports are good, the revisions improved them, or a real
human was satisfied. Missing Agent/runtime/tool capability is `NOT_RUN`, never a
fixture PASS. The case uses one finding, one Evidence Map row, compact reports,
per-turn observers, a snapshot frozen immediately after the satisfaction turn,
and the accepted active-suite hard cap of 120 seconds total Subject runtime.
Only one canonical native run is authorized: timeout, missing health/native
completion, or other failure quarantines retained diagnostics, records
`NOT_RUN`, leaves the selected Agent-flow claim/task open for explicit replan,
and triggers no automatic retry. Historical case 137 remains quarantined
no-evidence and is not reinterpreted.

### 10. Semantic precision, control simplification, and responsibility review

**Semantic precision.** The primary series answers “which immutable report is
the latest presentation?” Final interaction answers “what should be presented
next from the same research?” C5 answers “has an explicit request crossed the
verified research boundary?” Lifecycle evidence separately answers “did the run
legally reach Final?” These questions retain distinctions that change action and
stop at direct bundle facts plus the current turn.

**Simple reliable control.** Legal delivery is the conjunction of the current
Readiness-to-Final lineage, its admitted pre-publication inventory baseline,
route-bound load, synchronized terminal status window, and a mechanically
committed primary report bound to that lineage: the empty
bundle's base for the first lineage, or a proven append over the producing C5
event's exact prior inventory for a later lineage. The
publication path itself is one inventory resolver -> existing backing evaluator
-> one deep publisher -> committed file. Net complexity is lower than the
backlog draft: one change, no profile counter, no current pointer, no handoff
rewrite for presentation feedback, no report-quality validator, no satisfaction
state, no new cue enum, no Final Gate, and no lock recovery tree. One pure
resolver replaces independent filename interpretation across publication,
reentry, and C5.

**Helper-oriented responsibility.** The user judges satisfaction and supplies
presentation or research intent. The Agent interprets that input, clarifies only
material ambiguity, writes complete reports, and runs ordinary commands. The
Engine decides inventory, backing, path, allocation, commit, recovery, and
lifecycle-owner facts. The user never allocates filenames or becomes a CLI
co-runner.

## Risks / Trade-offs

- **[Feature labels may look semantically authoritative]** -> restrict them to
  safe snake case and state everywhere that they describe presentation only;
  allocation and current selection ignore label meaning.
- **[Legacy bundles may contain multiple plausible primary reports]** -> fail
  closed with candidates; do not mutate history or guess from mtime/content.
- **[Hard-link no-clobber is unavailable on a host filesystem]** -> return an
  explicit unsupported atomic-commit boundary; do not downgrade to overwrite.
- **[A revision subtly introduces unsupported meaning]** -> retain Agent
  self-check and per-version submitted-backing admission; route requests needing
  new evidence through C5. Deterministic checks do not overclaim semantic proof.
- **[Unlimited user turns consume time/cost]** -> revisions are user-driven and
  one-at-a-time; no automatic loop runs. A fixed cap is intentionally omitted
  because satisfaction is a user decision, not an Engine policy.
- **[Changing Final to `stop: "yes"` could receive generic HITL handling]** ->
  match manifest Final plus `gate: null` first and cover header/cue behavior in
  focused loader integration tests.
- **[Clean Final and C5 compete in reentry]** -> use the explicit precedence
  table; C5 wins only after accepted lineage/workspace exists.
- **[A rerun reaches Final before its new report commits]** -> retain the retired
  C5 event's prior inventory digest as the audit witness; zero appended versions
  keeps immediate Final delivery pending, while only a unique immutable-prefix
  match with one or more appended canonical versions establishes the new
  delivery.
- **[A primary-looking report is written before Final entry]** -> make
  `enter-phase` require an empty first primary inventory or the exact C5-bound
  prior inventory before the first load for that handoff; reject without load or
  current-node mutation and never guess order from mtime/name/content.
- **[Real Agent case is unavailable or slow]** -> record `NOT_RUN` honestly and
  keep deterministic claims independently complete; do not reuse case 137 or
  static fixtures as Agent-behavior evidence.

## Migration Plan

1. Add focused resolver/publication tests and characterize current Final,
   persistence, cue, reentry, and C5 behavior before changing targets.
2. Add the primary-series resolver and publication-specific Zod contracts,
   keeping existing accepted persistence workspaces readable.
3. Add `publish-final-report`, reserved-target enforcement, no-clobber commit,
   and exact sweep recovery; no runtime bundle is bulk-migrated.
4. Add Final entry inventory admission, then update Final/header/entry/command
   guidance and reentry/C5 projection to use the shared resolver, admitted
   baseline, prior-inventory append proof, and precedence table.
5. Add deterministic chain coverage and the new registered case 138; retain
   case 137 in quarantine.
6. Run focused, full, OpenSpec, requirement, semantic-closure, verification,
   spec-format, and feedback closeout checks before archive.

Operational rollback stops new refinement/publication initiation only after a
quiescent sweep resolves every accepted persistence workspace. It MUST retain
the canonical inventory resolver, read-only latest-report selection, reserved-
namespace protection, Final entry admission for every new load, and later-Final
prior-inventory binding for every bundle that already contains canonical
history; restoring the former arbitrary-report
or blanket-C5 guidance against those bundles would misread committed state.
Already committed `final/final*.md` history remains immutable readable content,
and rollback does not delete, rename, collapse, or overwrite it. A full code
revert is therefore allowed only before any canonical publication has committed,
or for a deployment that excludes/migrates affected bundles through a separately
approved change. Because no profile counter/state is added, there is no mutable
counter migration to reverse.

## Open Questions

None. Interaction placement, bundle-wide naming grammar, version authority,
legacy classification, Final entry baseline, no-clobber primitive, satisfaction
boundary, C5 boundary, later-Final delivery binding, reentry precedence,
compatibility cue, rollback floor, and proof scope are fixed for Apply.
